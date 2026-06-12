import {
  danceIdleClipLoadOrder,
  loadCharacterDance,
  loadCharacterDetails,
} from './character-assets.ts'
import { loadCharacterCoreAssets } from './character-core-loader.ts'
import { characterGroundJoints, characterScale } from './character-data.ts'
import {
  buildCharacterDrawData,
  characterHeadBasisInto,
  headPoseIndex,
  setPoseJetpackNozzles,
  setPoseCigaretteGeometry,
} from './character-draw.ts'
import type { CharacterDrawCache, CharacterHeadBasis } from './character-draw.ts'
import type { VertexWriter } from './character-geometry.ts'
import { uploadFloatBuffer } from './character-gpu.ts'
import type { NumberBufferCache } from './character-gpu.ts'
import { createCharacterHairController } from './character-hair-control.ts'
import { createHairRenderMeshes, updateHairInstances } from './character-hair.ts'
import type { HairInstanceUploadCache } from './character-hair.ts'
import { characterPoseJoints, characterPoseJointSet } from './character-parts.ts'
import { sampleBasePose, sampleCharacterPose } from './character-rig.ts'
import { createCharacterStyleController } from './character-style.ts'
import { createCigaretteGeometry, setCigaretteMouth as setCigaretteMouthPoint } from './cigarette.ts'
import { createLocalCharacter } from './local-character.ts'
import { afterNextPaint } from './startup.ts'
import { createObjectTurnBasisCache } from './turn-basis.ts'
import type { CharacterLight, CharacterMode, CharacterRig, HairRenderMesh, Player, SampledPose, Vec3 } from './types.ts'

type CigarettePoseInput = {
  position: Vec3
  turn: number
  motionBlend: number
  idleClipIndex?: number
  mode?: CharacterMode
  modeTime?: number
}
const cigaretteGroundJointIndices = characterGroundJoints.map(name => characterPoseJoints.indexOf(name))

export function createCharacterRenderSystem(options: {
  boxInstanceBuffer: WebGLBuffer
  boxInstanceSize: number
  buffer: WebGLBuffer
  camera: {
    firstPerson: boolean
    position: Vec3
    target: Vec3
  }
  canvas: HTMLCanvasElement
  characterPosition: Vec3
  gl: WebGL2RenderingContext
  hairController: ReturnType<typeof createCharacterHairController>
  idleClipIndex: () => number
  jetpacking?: () => boolean
  light: CharacterLight
  loft?: () => boolean
  localCharacter: ReturnType<typeof createLocalCharacter>
  localPoseUp?: () => Vec3 | undefined
  players: Player[]
  styleController: ReturnType<typeof createCharacterStyleController>
  sunglasses: () => boolean
  vertexSize: number
}) {
  let rig: CharacterRig | undefined
  let hairRenderMeshes: HairRenderMesh[] = []
  let coreLoad: Promise<CharacterRig> | undefined
  let detailLoad: Promise<void> | undefined
  let remainingDanceLoad: Promise<void> | undefined
  const danceLoads = new Map<number, Promise<void>>()
  let boxInstanceCount = 0
  const faceOffset: Vec3 = [0, 1.1, 0]
  const facePosition: Vec3 = [0, 0, 0]
  const faceBasis: CharacterHeadBasis = {
    forward: [0, 0, 1],
    side: [1, 0, 0],
    up: [0, 1, 0],
  }
  const face = {
    position: facePosition,
    forward: faceBasis.forward,
    up: faceBasis.up,
  }
  let assetsLoaded = false
  let coreProgress = 0
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
    npcPoseFrames: new WeakMap(),
    poses: [],
    usedBasePoseKeys: new Set(),
    usedNpcBlendKeys: new Set(),
    vertices: { data: new Float32Array(0), length: 0 },
  }
  const hairInstanceCache: HairInstanceUploadCache = { buffers: [], counts: [], uploads: [] }
  const vertexWriter: VertexWriter = drawCache.vertices
  const cigarettePose = Array.from({ length: characterPoseJoints.length }, () => [0, 0, 0] as Vec3)
  const cigaretteGeometry = createCigaretteGeometry()
  const cigaretteTurnBasis = createObjectTurnBasisCache<CigarettePoseInput>()
  let cigaretteBasePose: SampledPose | undefined

  function loadCoreOnce(onLoaded?: () => void) {
    coreLoad ??= loadCharacterCoreAssets(options.hairController.index, progress => {
      coreProgress = Math.max(coreProgress, progress)
    }).then(async details => {
      rig = details.rig
      options.hairController.setMeshes(details.hairMeshes, details.hairIndex)
      await afterNextPaint()
      hairRenderMeshes = createHairRenderMeshes(options.gl, details.hairMeshes)
      options.hairController.log()
      coreProgress = 1
      assetsLoaded = true
      onLoaded?.()

      return details.rig
    })

    return coreLoad
  }

  function loadDetailsOnce() {
    detailLoad ??= loadCoreOnce()
      .then(activeRig => loadCharacterDetails(activeRig))
      .then(() => {
        detailsLoaded = true
      })

    return detailLoad
  }

  function loadDanceOnce(idleIndex: number) {
    if (idleIndex <= 0) {
      return Promise.resolve()
    }

    let load = danceLoads.get(idleIndex)

    if (!load) {
      load = loadCoreOnce().then(activeRig => loadCharacterDance(activeRig, idleIndex))
      danceLoads.set(idleIndex, load)
    }

    return load
  }

  function loadRemainingDancesIdle() {
    remainingDanceLoad ??= loadCoreOnce().then(async () => {
      for (const idleIndex of danceIdleClipLoadOrder) {
        await loadDanceOnce(idleIndex)
      }
    })

    return remainingDanceLoad
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
        input: options.localCharacter.input,
        mode: options.localCharacter.mode,
        modeTime: options.localCharacter.modeTime,
        poseUp: options.localPoseUp?.(),
        hideHead: options.camera.firstPerson,
        sunglasses: options.sunglasses(),
        jetpacking: options.jetpacking?.() === true,
        idleClipIndex: options.idleClipIndex(),
        style: {
          topStyleIndex: options.styleController.topStyleIndex,
          bottomStyleIndex: options.styleController.bottomStyleIndex,
          hairIndex: options.hairController.index,
          hairColorIndex: options.hairController.colorIndex,
          skinColorIndex: options.styleController.skinColorIndex,
          accessoryIndex: options.styleController.accessoryIndex,
        },
      },
      hairMeshes: options.hairController.meshes,
      height: options.canvas.height,
      light: options.light,
      loft: options.loft?.() === true,
      players: renderPlayers ? options.players : [],
      rig: activeRig,
      time,
      drawCache,
      vertexWriter,
      width: options.canvas.width,
    })

    const localPose = drawCache.poses[0]
    const localHead = localPose?.[headPoseIndex]

    if (localHead) {
      faceOffset[0] = localHead[0] - options.characterPosition[0]
      faceOffset[1] = localHead[1] - options.characterPosition[1]
      faceOffset[2] = localHead[2] - options.characterPosition[2]
      characterHeadBasisInto(localPose, faceBasis)
    }
    updateHairInstances(options.gl, hairRenderMeshes, data.hairInstances, hairInstanceCache)
    boxInstanceCount = data.boxInstances.length / options.boxInstanceSize
    uploadFloatBuffer(options.gl, options.boxInstanceBuffer, data.boxInstances.data, boxInstanceCache,
      data.boxInstances.length)

    uploadFloatBuffer(options.gl, options.buffer, data.vertices.data, vertexUploadCache, data.vertices.length)

    if (!renderPlayers) {
      renderPlayers = true
    }

    return data.vertices.length / options.vertexSize
  }

  function setCigaretteTip(player: CigarettePoseInput, time: number, target: Vec3, forward: Vec3) {
    if (!rig) {
      return false
    }

    const cigaretteTurn = cigaretteTurnBasis(player, player.turn)
    setPoseCigaretteGeometry(cigaretteGeometry, sampleCigarettePose(rig, player, time), cigaretteTurn, time)
    target[0] = cigaretteGeometry.emberTip[0]
    target[1] = cigaretteGeometry.emberTip[1]
    target[2] = cigaretteGeometry.emberTip[2]
    forward[0] = cigaretteGeometry.forward[0]
    forward[1] = cigaretteGeometry.forward[1]
    forward[2] = cigaretteGeometry.forward[2]

    return true
  }

  function setCigaretteMouth(player: CigarettePoseInput, time: number, target: Vec3, forward: Vec3) {
    if (!rig) {
      return false
    }

    const cigaretteTurn = cigaretteTurnBasis(player, player.turn)
    setCigaretteMouthPoint(target, sampleCigarettePose(rig, player, time)[headPoseIndex]!, cigaretteTurn)
    forward[0] = cigaretteTurn.sin
    forward[1] = 0
    forward[2] = cigaretteTurn.cos

    return true
  }

  function setJetpackNozzles(player: CigarettePoseInput, time: number, left: Vec3, right: Vec3) {
    if (!rig) {
      return false
    }

    const turn = cigaretteTurnBasis(player, player.turn)

    setPoseJetpackNozzles(left, right, sampleCigarettePose(rig, player, time), turn)

    return true
  }

  function sampleCigarettePose(activeRig: CharacterRig, player: CigarettePoseInput, time: number) {
    const includeRun = player.motionBlend > 0 || player.mode === 'wave' || player.mode === 'waveOut'

    cigaretteBasePose = sampleBasePose(activeRig, time, characterPoseJoints, characterPoseJointSet,
      player.idleClipIndex ?? 0, cigaretteBasePose, includeRun)

    return sampleCharacterPose(activeRig, time, player, characterPoseJoints, characterPoseJointSet,
      cigaretteGroundJointIndices, characterScale, cigaretteBasePose, undefined, cigarettePose)
  }

  return {
    get assetsLoaded() {
      return assetsLoaded
    },
    get coreProgress() {
      return assetsLoaded ? 1 : coreProgress
    },
    get detailsLoaded() {
      return detailsLoaded
    },
    get boxInstanceCount() {
      return boxInstanceCount
    },
    get face() {
      facePosition[0] = options.characterPosition[0] + faceOffset[0]
      facePosition[1] = options.characterPosition[1] + faceOffset[1]
      facePosition[2] = options.characterPosition[2] + faceOffset[2]

      return face
    },
    get hairRenderMeshes() {
      return hairRenderMeshes
    },
    loadCoreOnce,
    loadDanceOnce,
    loadDetailsOnce,
    loadOnce: loadCoreOnce,
    loadRemainingDancesIdle,
    setCigaretteMouth,
    setCigaretteTip,
    setJetpackNozzles,
    update,
  }
}
