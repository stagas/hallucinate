import { createAdaptivePixelRatio } from './adaptive-pixel-ratio.ts'
import { createCameraController } from './camera-controller.ts'
import { idleClipNames } from './character-assets.ts'
import { characterFloor } from './character-data.ts'
import { createCharacterHairController } from './character-hair-control.ts'
import { createCharacterRenderSystem } from './character-render-system.ts'
import { createCharacterStyleController } from './character-style.ts'
import { createChatUi } from './chat-ui.ts'
import { restoreClubState, saveClubState } from './club-persistence.ts'
import { renderClubFrame } from './club-renderer.ts'
import { createSaveTimer, readClubState } from './club-state.ts'
import { createDjVideoUi } from './dj-video-ui.ts'
import { getDomElements } from './dom-elements.ts'
import { createHelpUi } from './help-ui.ts'
import { addRoom, addRoomSmoke, addWallStrips } from './environment-object.ts'
import { bindKeyboardInput } from './input.ts'
import { createLocalCharacter } from './local-character.ts'
import { lengthSq } from './math.ts'
import { createMultiplayer, updateRemotePlayers } from './multiplayer.ts'
import { createPlayers, takeNpcSeat, updatePlayers } from './player-system.ts'
import { createWallProjector } from './projection.ts'
import { outsideBuddha, roomBounds } from './scene-data.ts'
import { createSceneLighting } from './scene-lighting.ts'
import {
  isOutside,
  seatAt,
  usesSkyBackground,
} from './scene.ts'
import {
  characterBoxFragment,
  characterBoxVertex,
  fragment,
  hairFragment,
  hairVertex,
  lightFragment,
  postFragment,
  postVertex,
  smokeFragment,
  smokeVertex,
  strobeVertex,
  vertex,
} from './shaders.ts'
import { loadStaticFbxObject } from './static-fbx-object.ts'
import { createStrobeDrawController } from './strobe-draw.ts'
import { createStrobeLights } from './strobe-object.ts'
import { loadOutsideTree } from './tree-world.ts'
import type {
  CircleBounds,
  ClubGlobal,
  Player,
  Vertex,
} from './types.ts'
import {
  setupCharacterBoxArray,
  setupPostArray,
  setupStrobeArray,
  setupVertexArray,
} from './vertex-array-setup.ts'
import {
  createCharacterBoxGeometry,
  createProgram,
  createSmokeMap,
  createStrobeGeometry,
  createTarget,
  createTreeShadowMap,
  resizeTarget,
} from './webgl.ts'

const clubGlobal = globalThis as ClubGlobal

if (clubGlobal.clubFrameId !== undefined) {
  cancelAnimationFrame(clubGlobal.clubFrameId)
}

const { canvas, djVideo, chatForm, chatInput, chatBubble, intro, introBar, introProgress, introStart } = getDomElements()

const gl = canvas.getContext('webgl2', {
  antialias: false,
  alpha: false,
})!

if (!gl) {
  throw new Error('WebGL2 is not available')
}

const vertices: Vertex[] = []
const lights: Vertex[] = []
const smoke: Vertex[] = []
const vertexSize = 11
let frameId = 0
const saveKey = 'club-state'
const helpSeenKey = 'club-help-seen'
const bloomScale = 0.5
const keys = new Set<string>()
const occupiedSeats = new Set<string>()
const remoteSeats = new Set<string>()
let idleClipIndex = 0
const localCharacter = createLocalCharacter(keys)
const characterPosition = localCharacter.position
const hairController = createCharacterHairController()
const styleController = createCharacterStyleController()
const chatUi = createChatUi(chatForm, chatInput, chatBubble, characterPosition)
const djVideoUi = createDjVideoUi(djVideo, characterPosition)
const helpUi = createHelpUi()
const helpSeen = localStorage.getItem(helpSeenKey) === 'true'
const cameraController = createCameraController(canvas, characterPosition)
function cycleIdle(direction: number) {
  idleClipIndex = (idleClipIndex + direction + idleClipNames.length) % idleClipNames.length
  // console.log(`idle animation: ${idleClipNames[idleClipIndex]}`)
}
const idleClipState = {
  set(value: number) {
    idleClipIndex = value
  },
}
const wallProjector = createWallProjector({ eye: [0, 0, 1], center: [0, 0, 0] }, canvas)
const pixelRatio = createAdaptivePixelRatio()
let outsideTree: CircleBounds = { x: 0, z: 20.5, radius: 0.75 }
let lastStamp = 0
let buddhaLoaded = false
let treeLoaded = false
let introHidden = false
let videoPlaying = false

introStart.addEventListener('click', () => {
  videoPlaying = djVideoUi.play()
  introStart.dataset.playing = String(videoPlaying)
})
let wasOutside = isOutside(characterPosition)
let doorCoverReleased = true
const savedState = readClubState(saveKey)
let activeRoom = savedState?.room === 1 ? 1 : savedState ? Number(!isOutside(savedState.character)) : 0
let requestedRoom = activeRoom
let lastPoseLog = 0
const saveTimer = createSaveTimer(0.5)
const roomStarts = [
  { x: -8.61, z: 9.64, angle: 0.505 },
  { x: -4.75, z: roomBounds.front - 0.85, angle: 0 },
]

addRoom(vertices)
addWallStrips(lights)
addRoomSmoke(smoke)

let points = new Float32Array(vertices.flat())
let lightPoints = new Float32Array(lights.flat())
const smokePoints = new Float32Array(smoke.flat())
const program = createProgram(gl, vertex, fragment)
const lightProgram = createProgram(gl, vertex, lightFragment)
const strobeProgram = createProgram(gl, strobeVertex, lightFragment)
const characterBoxProgram = createProgram(gl, characterBoxVertex, characterBoxFragment)
const hairProgram = createProgram(gl, hairVertex, hairFragment)
const smokeProgram = createProgram(gl, smokeVertex, smokeFragment)
const postProgram = createProgram(gl, postVertex, postFragment)
const smokeMap = createSmokeMap(gl)
const treeShadowMap = createTreeShadowMap(gl)
const viewProjection = gl.getUniformLocation(program, 'viewProjection')
const cameraEye = gl.getUniformLocation(program, 'cameraEye')
const renderZone = gl.getUniformLocation(program, 'renderZone')
const bloomPass = gl.getUniformLocation(program, 'bloomPass')
const doorCoverVisible = gl.getUniformLocation(program, 'doorCoverVisible')
const treeShadowSampler = gl.getUniformLocation(program, 'treeShadowMap')
const characterBoxViewProjection = gl.getUniformLocation(characterBoxProgram, 'viewProjection')
const characterBoxRenderZone = gl.getUniformLocation(characterBoxProgram, 'renderZone')
const lightTime = gl.getUniformLocation(lightProgram, 'time')
const lightSmokeMap = gl.getUniformLocation(lightProgram, 'smokeMap')
const lightRenderZone = gl.getUniformLocation(lightProgram, 'renderZone')
const lightViewProjection = gl.getUniformLocation(lightProgram, 'viewProjection')
const strobeTime = gl.getUniformLocation(strobeProgram, 'time')
const strobeSmokeMap = gl.getUniformLocation(strobeProgram, 'smokeMap')
const strobeRenderZone = gl.getUniformLocation(strobeProgram, 'renderZone')
const strobeViewProjection = gl.getUniformLocation(strobeProgram, 'viewProjection')
const hairViewProjection = gl.getUniformLocation(hairProgram, 'viewProjection')
const hairRenderZone = gl.getUniformLocation(hairProgram, 'renderZone')
const roomSmokeTime = gl.getUniformLocation(smokeProgram, 'time')
const roomSmokeMap = gl.getUniformLocation(smokeProgram, 'smokeMap')
const roomSmokeViewProjection = gl.getUniformLocation(smokeProgram, 'viewProjection')
const roomSmokeCameraRight = gl.getUniformLocation(smokeProgram, 'cameraRight')
const roomSmokeCameraUp = gl.getUniformLocation(smokeProgram, 'cameraUp')
const postScene = gl.getUniformLocation(postProgram, 'scene')
const postBloom = gl.getUniformLocation(postProgram, 'bloom')
const postBloomResolution = gl.getUniformLocation(postProgram, 'bloomResolution')
const postRenderSky = gl.getUniformLocation(postProgram, 'renderSky')
const postSkyForward = gl.getUniformLocation(postProgram, 'skyForward')
const postSkyRight = gl.getUniformLocation(postProgram, 'skyRight')
const postSkyUp = gl.getUniformLocation(postProgram, 'skyUp')
const array = gl.createVertexArray()
const buffer = gl.createBuffer()
const lightArray = gl.createVertexArray()
const lightBuffer = gl.createBuffer()
const strobeArray = gl.createVertexArray()
const strobeGeometryBuffer = gl.createBuffer()
const strobeInstanceBuffer = gl.createBuffer()
const smokeArray = gl.createVertexArray()
const smokeBuffer = gl.createBuffer()
const characterArray = gl.createVertexArray()
const characterBuffer = gl.createBuffer()
const characterBoxArray = gl.createVertexArray()
const characterBoxGeometryBuffer = gl.createBuffer()
const characterBoxInstanceBuffer = gl.createBuffer()
const postArray = gl.createVertexArray()
const postBuffer = gl.createBuffer()
const target = createTarget(gl, 1, 1)
const bloomTarget = createTarget(gl, 1, 1)
const stride = vertexSize * Float32Array.BYTES_PER_ELEMENT
const strobeGeometry = createStrobeGeometry()
const strobeInstanceSize = 14
const strobeInstanceStride = strobeInstanceSize * Float32Array.BYTES_PER_ELEMENT
const characterBoxGeometry = createCharacterBoxGeometry()
const characterBoxInstanceSize = 17
const characterBoxInstanceStride = characterBoxInstanceSize * Float32Array.BYTES_PER_ELEMENT

if (!viewProjection || !cameraEye || !renderZone || !bloomPass || !doorCoverVisible || !treeShadowSampler
  || !characterBoxViewProjection
  || !characterBoxRenderZone || !lightTime || !lightSmokeMap || !lightRenderZone || !lightViewProjection
  || !strobeTime || !strobeSmokeMap || !strobeRenderZone || !strobeViewProjection || !hairViewProjection
  || !hairRenderZone || !roomSmokeTime || !roomSmokeMap || !roomSmokeViewProjection || !roomSmokeCameraRight
  || !roomSmokeCameraUp || !postScene || !postBloom || !postBloomResolution || !postRenderSky
  || !postSkyForward || !postSkyRight || !postSkyUp || !array
  || !buffer || !lightArray || !lightBuffer || !strobeArray || !strobeGeometryBuffer || !strobeInstanceBuffer
  || !smokeArray || !smokeBuffer || !characterArray || !characterBuffer
  || !characterBoxArray || !characterBoxGeometryBuffer || !characterBoxInstanceBuffer || !postArray || !postBuffer)
{
  throw new Error('Failed to initialize WebGL resources')
}

const characterBoxUniforms = {
  renderZone: characterBoxRenderZone,
  viewProjection: characterBoxViewProjection,
}
const hairUniforms = {
  renderZone: hairRenderZone,
  viewProjection: hairViewProjection,
}

setupVertexArray({ array, buffer, data: points, gl, stride, usage: gl.STATIC_DRAW })

function refreshRoomBuffer() {
  points = new Float32Array(vertices.flat())
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW)
}

setupVertexArray({ array: lightArray, buffer: lightBuffer, data: lightPoints, gl, stride, usage: gl.DYNAMIC_DRAW })
setupStrobeArray({
  array: strobeArray,
  geometry: strobeGeometry,
  geometryBuffer: strobeGeometryBuffer,
  gl,
  instanceBuffer: strobeInstanceBuffer,
  instanceStride: strobeInstanceStride,
})
setupVertexArray({ array: smokeArray, buffer: smokeBuffer, data: smokePoints, gl, stride, usage: gl.STATIC_DRAW })
setupVertexArray({ array: characterArray, buffer: characterBuffer, data: 0, gl, stride, usage: gl.DYNAMIC_DRAW })
setupCharacterBoxArray({
  array: characterBoxArray,
  geometry: characterBoxGeometry,
  geometryBuffer: characterBoxGeometryBuffer,
  gl,
  instanceBuffer: characterBoxInstanceBuffer,
  instanceStride: characterBoxInstanceStride,
})
setupPostArray({ array: postArray, buffer: postBuffer, gl })

gl.enable(gl.DEPTH_TEST)
gl.clearColor(0.01, 0.01, 0.014, 1.0)

restoreClubState({
  camera: cameraController,
  characterPosition,
  djVideoUi,
  hairController,
  idleClipCount: idleClipNames.length,
  idleClipIndex: idleClipState,
  key: saveKey,
  localCharacter,
  styleController,
})
djVideoUi.setZoneFromPosition()
djVideoUi.load()

function moveToRoom(room: number) {
  const start = roomStarts[room]!

  characterPosition[0] = start.x
  characterPosition[1] = characterFloor
  characterPosition[2] = start.z
  localCharacter.turn = start.angle
  cameraController.turn = start.angle
  localCharacter.velocityY = 0
  djVideoUi.setZoneFromPosition()
  logPlayerPose(`room ${room}`)
}

function logPlayerPose(label: string) {
  console.log(
    `${label}: x=${characterPosition[0].toFixed(2)} y=${characterPosition[1].toFixed(2)} z=${
      characterPosition[2].toFixed(2)
    } angle=${localCharacter.turn.toFixed(3)}`,
  )
}

function logPlayerPoseEvery(stamp: number) {
  if (stamp >= lastPoseLog + 250) {
    lastPoseLog = stamp
    logPlayerPose(`room ${activeRoom}`)
  }
}

if (activeRoom !== Number(!isOutside(characterPosition))) {
  moveToRoom(activeRoom)
}
else {
  logPlayerPose(`room ${activeRoom}`)
}

function localMoveAngle() {
  const input = localCharacter.input
  const sin = Math.sin(cameraController.turn)
  const cos = Math.cos(cameraController.turn)
  const x = sin * input[2] - cos * input[0]
  const z = cos * input[2] + sin * input[0]

  return Math.atan2(x, z)
}

let multiplayer: ReturnType<typeof createMultiplayer>

multiplayer = createMultiplayer({
  localPosition: characterPosition,
  localTurn: () => localCharacter.turn,
  localMoveAngle,
  localInput: localCharacter.input,
  localMode: () => localCharacter.mode,
  localIdleClipIndex: () => idleClipIndex,
  localStyle: () => ({
    topStyleIndex: styleController.topStyleIndex,
    bottomStyleIndex: styleController.bottomStyleIndex,
    hairIndex: hairController.index,
    hairColorIndex: hairController.colorIndex,
    skinColorIndex: styleController.skinColorIndex,
  }),
  initialRoom: activeRoom,
  onRoomState: room => {
    activeRoom = room
    requestedRoom = room
    saveClubState({
      camera: cameraController,
      characterAssetsLoaded: true,
      characterPosition,
      djVideoUi,
      hairController,
      idleClipIndex,
      key: saveKey,
      localCharacter,
      room,
      styleController,
    })
    chatUi.clear()
  },
  onMessage: (id, text) => {
    const position = id === multiplayer.selfId ? characterPosition : multiplayer.players.get(id)!.position

    chatUi.show(id, text, position, performance.now())
  },
  onLeave: id => chatUi.remove(id),
})

bindKeyboardInput({
  activeInput: chatInput,
  keys,
  openChatInput: () => chatUi.open(),
  toggleHelp: () => {
    const open = helpUi.toggle()

    if (!open) {
      localStorage.setItem(helpSeenKey, 'true')
    }
  },
  cycleHair: direction => {
    hairController.cycleHair(direction)
    multiplayer.sendMotion()
  },
  cycleHairColor: direction => {
    hairController.cycleColor(direction)
    multiplayer.sendMotion()
  },
  cycleIdle: direction => {
    cycleIdle(direction)
    multiplayer.sendMotion()
  },
  cycleShirt: direction => {
    styleController.cycleShirt(direction)
    multiplayer.sendMotion()
  },
  cyclePants: direction => {
    styleController.cyclePants(direction)
    multiplayer.sendMotion()
  },
  cycleSkin: direction => {
    styleController.cycleSkin(direction)
    multiplayer.sendMotion()
  },
})

chatForm.addEventListener('submit', event => {
  event.preventDefault()
  multiplayer.sendMessage(chatUi.submit())
})

const resize = () => {
  const ratio = pixelRatio.ratio()
  const width = Math.floor(canvas.clientWidth * ratio)
  const height = Math.floor(canvas.clientHeight * ratio)

  if (canvas.width === width && canvas.height === height) {
    return
  }

  canvas.width = width
  canvas.height = height
  resizeTarget(gl, target, width, height)
  resizeTarget(gl, bloomTarget, Math.max(1, Math.floor(width * bloomScale)),
    Math.max(1, Math.floor(height * bloomScale)))
  gl.viewport(0, 0, width, height)
}

const draw = (stamp: number) => {
  const delta = lastStamp === 0 ? 0 : Math.min((stamp - lastStamp) / 1000, 0.05)
  const frame = Math.floor(stamp / 16.6667)

  strobeController.setFrame(frame)
  lastStamp = stamp
  pixelRatio.update(delta, stamp)
  clubGlobal.clubPixelRatio = pixelRatio.ratio()
  resize()
  localCharacter.update(delta, cameraController.turn, outsideTree, styleController.bottomMode, occupiedSeats,
    seat => takeNpcSeat(npcPlayers, seat, stamp * 0.001, outsideTree, occupiedSeats))
  // logPlayerPoseEvery(stamp)
  const room = Number(!isOutside(characterPosition))

  if (room !== requestedRoom) {
    requestedRoom = room
    multiplayer.sendMotion()
    multiplayer.sendRoomChange(room)
  }
  else {
    multiplayer.sendMotionIfKeysChanged()
  }

  updatePlayers(npcPlayers, delta, stamp * 0.001, outsideTree, occupiedSeats)
  updateRemotePlayers(multiplayer.players.values(), delta, outsideTree)
  takeRemoteSeats()
  renderPlayers.length = 0
  renderPlayers.push(...npcPlayers, ...multiplayer.players.values())
  cameraController.update(delta, localCharacter.input, localCharacter.turn, lengthSq(localCharacter.input) > 0
    || (localCharacter.mode === 'stand' && idleClipIndex > 0))
  saveTimer.update(delta, () =>
    saveClubState({
      camera: cameraController,
      characterAssetsLoaded: characterRenderSystem.assetsLoaded,
      characterPosition,
      djVideoUi,
      hairController,
      idleClipIndex,
      key: saveKey,
      localCharacter,
      room: activeRoom,
      styleController,
    }))
  const camera = cameraController.get()
  strobeController.updateInstances(stamp * 0.001, djVideoUi.zone)
  const lightCount = lightPoints.length / vertexSize

  const projector = createWallProjector(camera, canvas, wallProjector)

  if (introHidden) {
    djVideoUi.update(camera, projector)
  }
  chatUi.update(projector, stamp)

  const outside = isOutside(characterPosition)
  const moving = lengthSq(localCharacter.input) > 0

  if (outside && !wasOutside && moving) {
    doorCoverReleased = false
  }
  if (outside && !moving) {
    doorCoverReleased = true
  }
  if (!outside) {
    doorCoverReleased = true
  }

  wasOutside = outside
  const sky = outside && usesSkyBackground(camera)

  const characterCount = characterRenderSystem.update(stamp * 0.001)
  updateIntro()

  renderClubFrame({
    arrays: {
      character: characterArray,
      characterBox: characterBoxArray,
      light: lightArray,
      post: postArray,
      room: array,
      smoke: smokeArray,
    },
    bloomTarget,
    camera,
    character: {
      boxGeometry: characterBoxGeometry,
      boxInstanceCount: characterRenderSystem.boxInstanceCount,
      boxProgram: characterBoxProgram,
      boxUniforms: characterBoxUniforms,
      count: characterCount,
      hairProgram,
      hairRenderMeshes: characterRenderSystem.hairRenderMeshes,
      hairUniforms,
    },
    characterPosition,
    gl,
    height: canvas.height,
    light: {
      count: lightCount,
      program: lightProgram,
      uniforms: {
        renderZone: lightRenderZone,
        smokeMap: lightSmokeMap,
        time: lightTime,
        viewProjection: lightViewProjection,
      },
    },
    doorCoverVisible: outside && doorCoverReleased,
    outside,
    points,
    post: {
      bloom: postBloom,
      bloomResolution: postBloomResolution,
      program: postProgram,
      renderSky: postRenderSky,
      scene: postScene,
      skyForward: postSkyForward,
      skyRight: postSkyRight,
      skyUp: postSkyUp,
    },
    program,
    roomUniforms: {
      bloomPass,
      cameraEye,
      doorCoverVisible,
      renderZone,
      treeShadowSampler,
      viewProjection,
    },
    sky,
    smoke: {
      map: smokeMap,
      points: smokePoints,
      program: smokeProgram,
      uniforms: {
        cameraRight: roomSmokeCameraRight,
        cameraUp: roomSmokeCameraUp,
        smokeMap: roomSmokeMap,
        time: roomSmokeTime,
        viewProjection: roomSmokeViewProjection,
      },
    },
    strobeController,
    target,
    time: stamp * 0.001,
    treeShadowMap,
    vertexSize,
    width: canvas.width,
  })

  frameId = requestAnimationFrame(draw)
  clubGlobal.clubFrameId = frameId
}

function updateIntro() {
  const progress = Math.round((
    Number(characterRenderSystem.assetsLoaded)
    + Number(characterRenderSystem.detailsLoaded)
    + Number(buddhaLoaded)
    + Number(treeLoaded)
  ) / 4 * 100)

  introProgress.textContent = `${progress}%`
  introBar.style.transform = `scaleX(${progress / 100})`
  introStart.dataset.ready = String(progress >= 75 && !videoPlaying)

  const ready = progress === 100 && videoPlaying

  if (ready && !introHidden) {
    introHidden = true
    intro.dataset.hidden = 'true'

    if (helpSeen) {
      helpUi.hide()
    }
  }

  return progress
}

function takeRemoteSeats() {
  for (const seat of remoteSeats) {
    occupiedSeats.delete(seat)
  }

  remoteSeats.clear()

  for (const player of multiplayer.players.values()) {
    if (lengthSq(player.input) === 0) {
      const seat = seatAt(player.position, occupiedSeats, 0.46, true)

      if (seat) {
        occupiedSeats.add(seat.id)
        remoteSeats.add(seat.id)
      }
    }
  }
}

import.meta.hot?.dispose(() => {
  cancelAnimationFrame(frameId)
  multiplayer.close()
})

const strobeLights = createStrobeLights()
const strobeController = createStrobeDrawController({
  array: strobeArray,
  characterPosition,
  geometry: strobeGeometry,
  gl,
  instanceBuffer: strobeInstanceBuffer,
  instanceSize: strobeInstanceSize,
  lights: strobeLights,
  program: strobeProgram,
  smokeMap,
  uniforms: {
    renderZone: strobeRenderZone,
    smokeMap: strobeSmokeMap,
    time: strobeTime,
    viewProjection: strobeViewProjection,
  },
})
const { addLocalReflection, addSunLitTriangle } = createSceneLighting({
  getTree: () => outsideTree,
  strobeReflection: (point, normal) => strobeController.reflection(point, normal),
})
const npcPlayers = createPlayers(150, outsideTree, occupiedSeats)
const renderPlayers: Player[] = [...npcPlayers]
const characterRenderSystem = createCharacterRenderSystem({
  boxInstanceBuffer: characterBoxInstanceBuffer,
  boxInstanceSize: characterBoxInstanceSize,
  buffer: characterBuffer,
  camera: cameraController,
  canvas,
  characterPosition,
  gl,
  hairController,
  idleClipIndex: () => idleClipIndex,
  light: addLocalReflection,
  localCharacter,
  players: renderPlayers,
  styleController,
  vertexSize,
})

frameId = requestAnimationFrame(draw)
clubGlobal.clubFrameId = frameId

characterRenderSystem.loadOnce().catch((error: unknown) => {
  console.error(error)
})

loadOutsideTree(gl, treeShadowMap, vertices, outsideTree, addSunLitTriangle)
  .then(nextTree => {
    outsideTree = nextTree
    treeLoaded = true
    refreshRoomBuffer()
  })
  .catch((error: unknown) => {
    console.error(error)
  })

loadStaticFbxObject(vertices, {
  color: [0.46, 0.42, 0.36],
  height: 2.9,
  lightBounds: { x: outsideBuddha.x, z: 29.3, radius: 0.95 },
  path: '/buddha.fbx',
  position: [outsideBuddha.x, characterFloor, outsideBuddha.z],
  sourceUp: 'z',
  turn: Math.PI,
}, addSunLitTriangle)
  .then(() => {
    buddhaLoaded = true
    refreshRoomBuffer()
  })
  .catch((error: unknown) => {
    console.error(error)
  })
