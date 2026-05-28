import { loadCharacterAssets, loadCharacterDances, loadCharacterDetails,
  loadCheapCharacterDances } from './character-assets.ts'
import { buildCharacterDrawData } from './character-draw.ts'
import type { CharacterDrawCache } from './character-draw.ts'
import type { VertexWriter } from './character-geometry.ts'
import { uploadFloatBuffer } from './character-gpu.ts'
import type { NumberBufferCache } from './character-gpu.ts'
import { createCharacterHairController } from './character-hair-control.ts'
import { updateHairInstances } from './character-hair.ts'
import type { HairInstanceUploadCache } from './character-hair.ts'
import { createCharacterStyleController } from './character-style.ts'
import { createLocalCharacter } from './local-character.ts'
import type { CharacterRig, HairRenderMesh, Player, Vec3 } from './types.ts'

export function createCharacterRenderSystem(options: {
  boxInstanceBuffer: WebGLBuffer
  boxInstanceSize: number
  buffer: WebGLBuffer
  camera: {
    position: Vec3
    target: Vec3
  }
  canvas: HTMLCanvasElement
  characterPosition: Vec3
  gl: WebGL2RenderingContext
  hairController: ReturnType<typeof createCharacterHairController>
  idleClipIndex: () => number
  light: (color: Vec3, point: Vec3, normal: Vec3) => Vec3
  localCharacter: ReturnType<typeof createLocalCharacter>
  players: Player[]
  styleController: ReturnType<typeof createCharacterStyleController>
  vertexSize: number
}) {
  let rig: CharacterRig | undefined
  let hairRenderMeshes: HairRenderMesh[] = []
  let rigLoad: Promise<CharacterRig> | undefined
  let detailLoad: Promise<void> | undefined
  let danceLoad: Promise<void> | undefined
  let boxInstanceCount = 0
  let assetsLoaded = false
  let detailsLoaded = false
  let renderPlayers = false
  const boxInstanceCache: NumberBufferCache = { data: new Float32Array(0) }
  const vertexUploadCache: NumberBufferCache = { data: new Float32Array(0) }
  const drawCache: CharacterDrawCache = {
    basePose: undefined,
    basePoses: new Map(),
    boxInstances: { data: new Float32Array(0), length: 0 },
    hairInstances: { data: new Float32Array(0), length: 0 },
    npcBlendCache: new Map(),
    poses: [],
    usedBasePoseKeys: new Set(),
    usedNpcBlendKeys: new Set(),
    vertices: { data: new Float32Array(0), length: 0 },
  }
  const hairInstanceCache: HairInstanceUploadCache = { buffers: [], counts: [], uploads: [] }
  const vertexWriter: VertexWriter = drawCache.vertices

  async function loadAssets() {
    const assets = await loadCharacterAssets()

    assetsLoaded = true

    return assets.rig
  }

  function loadOnce(onLoaded?: () => void) {
    rigLoad ??= loadAssets().then(next => {
      rig = next
      onLoaded?.()

      return next
    })

    return rigLoad
  }

  function update(time: number) {
    if (!rig) {
      return 0
    }

    const activeRig = rig
    const data = buildCharacterDrawData({
      cameraPosition: options.camera.position,
      cameraTarget: options.camera.target,
      character: {
        position: options.characterPosition,
        turn: options.localCharacter.turn,
        motionBlend: options.localCharacter.motionBlend,
        mode: options.localCharacter.mode,
        idleClipIndex: options.idleClipIndex(),
        style: {
          topStyleIndex: options.styleController.topStyleIndex,
          bottomStyleIndex: options.styleController.bottomStyleIndex,
          hairIndex: options.hairController.index,
          hairColorIndex: options.hairController.colorIndex,
          skinColorIndex: options.styleController.skinColorIndex,
        },
      },
      hairMeshes: options.hairController.meshes,
      height: options.canvas.height,
      light: options.light,
      players: renderPlayers ? options.players : [],
      rig: activeRig,
      time,
      drawCache,
      vertexWriter,
      width: options.canvas.width,
    })

    updateHairInstances(options.gl, hairRenderMeshes, data.hairInstances, hairInstanceCache)
    boxInstanceCount = data.boxInstances.length / options.boxInstanceSize
    uploadFloatBuffer(options.gl, options.boxInstanceBuffer, data.boxInstances, boxInstanceCache)

    uploadFloatBuffer(options.gl, options.buffer, data.vertices, vertexUploadCache)

    if (!renderPlayers) {
      renderPlayers = true
          detailLoad ??= loadCharacterDetails(options.gl, activeRig, options.hairController.index)
        .then(details => {
          hairRenderMeshes = details.hairRenderMeshes
          options.hairController.setMeshes(details.hairMeshes, details.hairIndex)
          detailsLoaded = true
          options.hairController.log()
        })
        .catch((error: unknown) => {
          console.error(error)
        })
    }
    else {
      danceLoad ??= (detailLoad ?? Promise.resolve())
        .then(() => loadCheapCharacterDances(activeRig))
        .then(() => loadCharacterDances(activeRig))
        .catch((error: unknown) => {
          console.error(error)
        })
    }

    return data.vertices.length / options.vertexSize
  }

  return {
    get assetsLoaded() {
      return assetsLoaded
    },
    get detailsLoaded() {
      return detailsLoaded
    },
    get boxInstanceCount() {
      return boxInstanceCount
    },
    get hairRenderMeshes() {
      return hairRenderMeshes
    },
    loadOnce,
    update,
  }
}
