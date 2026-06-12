export type Vec3 = [number, number, number]
export type Quat = [number, number, number, number]
export type Mat4 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

export type AssimpNode = {
  name: string
  transformation?: number[]
  meshes?: number[]
  children?: AssimpNode[]
}

export type AssimpChannel = {
  name: string
  positionkeys?: [number, Vec3][]
  rotationkeys?: [number, Quat][]
  scalingkeys?: [number, Vec3][]
}

export type AssimpAnimation = {
  duration?: number
  tickspersecond?: number
  channels?: AssimpChannel[]
}

export type AssimpScene = {
  rootnode: AssimpNode
  meshes?: AssimpMesh[]
  animations?: AssimpAnimation[]
}

export type AssimpMesh = {
  bones?: {
    name: string
    offsetmatrix: Mat4
    weights: [number, number][]
  }[]
  name: string
  numuvcomponents?: number[]
  texturecoords?: number[][]
  vertices: number[]
  faces: number[][]
}

export type CharacterClip = {
  duration: number
  ticksPerSecond: number
  channels: Map<string, AssimpChannel>
}

export type HairMesh = {
  index: number
  name: string
  localTriangleCenters: Float32Array
  localTriangleNormals: Float32Array
  localTriangles: Float32Array
}

export type TreeMesh = {
  points: Vec3[]
  faces: number[][]
  color: Vec3
}

export type VideoZone = 'inside' | 'loft' | 'outside' | 'tent' | 'upstairs'

export type VideoPreview = {
  id: string
  zone: VideoZone
}

export type YouTubePlayer = {
  cueVideoById(options: { videoId: string; startSeconds: number }): void
  cuePlaylist(options: { index: number; list: string; listType: 'playlist'; startSeconds: number }): void
  getCurrentTime(): number
  getDuration(): number
  getVideoData(): { video_id: string }
  getPlaylist(): string[] | undefined
  getPlaylistIndex(): number
  loadVideoById(options: { videoId: string; startSeconds: number }): void
  loadPlaylist(options: { index: number; list: string; listType: 'playlist'; startSeconds: number }): void
  nextVideo(): void
  pauseVideo(): void
  playVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  setLoop(loopPlaylists: boolean): void
  setShuffle(shufflePlaylist: boolean): void
}

export type YouTubeConstructor = new(
  element: HTMLElement,
  options: {
    events: {
      onReady: () => void
      onStateChange: (event: { data: number }) => void
    }
    playerVars: Record<string, number>
  },
) => YouTubePlayer

export type YouTubeWindow = Window & {
  YT?: {
    Player: YouTubeConstructor
  }
  onYouTubeIframeAPIReady?: () => void
}

export type CharacterRig = {
  root: AssimpNode
  nodes: RigNode[]
  clips: Record<CharacterMode, CharacterClip> & {
    dances: CharacterClip[]
  }
}

export type RigNode = {
  name: string
  parent: number
  helper: boolean
  transform: Mat4
  origin: Vec3
}

export type CharacterMode = 'stand' | 'run' | 'jump' | 'manSitting' | 'womanSitting' | 'wave' | 'waveOut' | 'breakdance'
export type BottomMode = 'pants' | 'skirt'
export type TopMode = 'shirt' | 'sleeveless' | 'skin' | 'chest'
export type CharacterPart = {
  from: string
  to: string
  width: number
  depth: number
  color: Vec3
  glow?: number
  start?: number
  end?: number
  top?: 'torso' | 'sleeve'
  armOffset?: number
  lift?: number
  bottom?: true
}

export type PlayerStyle = {
  topStyleIndex: number
  bottomStyleIndex: number
  hairIndex: number
  hairColorIndex: number
  skinColorIndex: number
  accessoryIndex: number
}

export type ResolvedPlayerStyle = {
  topMode: TopMode
  bottomMode: BottomMode
  shirt: Vec3
  shirtLight: Vec3
  pants: Vec3
  pantsDark: Vec3
  pantsDim: Vec3
  pantsLight: Vec3
  shoe: Vec3
  hairColor: Vec3
  skin: Vec3
  accessory?: Vec3
  accessoryKind?: 'glowstick' | 'spray' | 'cigarette' | 'jetpack'
}

export type PlayerDestination = {
  kind: 'dj' | 'foodTruck' | 'kiosk' | 'lounge' | 'photoWall' | 'random' | 'restroom' | 'stool' | 'tree'
  outside: boolean
  position: Vec3
  zone: VideoZone
  lookAt?: Vec3
  linger?: [number, number]
}

export type Player = {
  position: Vec3
  turn: number
  motionBlend: number
  mode?: CharacterMode
  modeTime?: number
  poseUp?: Vec3
  idleClipIndex: number
  input: Vec3
  nextDecision: number
  npcUpdateDelta?: number
  nextPauseDecision?: number
  nextTravelTargetAt?: number
  pauseUntil?: number
  sidestepUntil?: number
  travelLateralUntil?: number
  travelLateralDirection?: -1 | 1
  travelSpeed: number
  travelTarget?: Vec3
  travelPath?: Vec3[]
  travelPathTarget?: Vec3
  destinationUntil?: number
  doorTarget?: Vec3
  leavingSeatUntil?: number
  destination: PlayerDestination
  seat?: string
  sittingUntil?: number
  lingeringUntil?: number
  style: PlayerStyle
  resolvedStyle: ResolvedPlayerStyle
  seed: number
  sunglasses?: boolean
  bubbling?: boolean
  foaming?: boolean
  jetpacking?: boolean
  actionTurn?: number
}

export type BeachBall = {
  id: number
  position: Vec3
  velocity: Vec3
}

export type GraffitiSplat = {
  id: number
  wall: number
  x: number
  y: number
  seed: number
  colorIndex: number
  radius: number
}

export type SampledPose = {
  run?: Vec3[]
  stand: Vec3[]
}

export type PoseBlendCache = Map<number, Vec3[]>
export type CharacterLight = (color: Vec3, point: Vec3, normal: Vec3, target: Vec3) => Vec3

export type CharacterBoxGeometry = {
  data: Float32Array
  count: number
}

export type StrobeLight = {
  id: number
  x: number
  z: number
  zone: VideoZone
  top: number
  floor: number
  color: Vec3
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export type StrobeReflectionLight = {
  light: StrobeLight
  lightX: number
  lightZ: number
  target: Vec3
  targetX: number
  targetZ: number
}

export type Vertex = [
  x: number,
  y: number,
  z: number,
  r: number,
  g: number,
  b: number,
  glow: number,
  strobe: number,
  u: number,
  v: number,
  haze: number,
]

export type Target = {
  frame: WebGLFramebuffer
  color: WebGLTexture
  depth: WebGLRenderbuffer
  width: number
  height: number
}

export type SceneTarget = Target & {
  bloom: WebGLTexture
}

export type Bounds = {
  x: number
  z: number
  width: number
  depth: number
}

export type CircleBounds = {
  x: number
  z: number
  radius: number
}

export type HairRenderMesh = {
  array: WebGLVertexArrayObject
  vertexBuffer: WebGLBuffer
  instanceBuffer: WebGLBuffer
  vertexCount: number
  instanceCount: number
}

export type ClubGlobal = typeof globalThis & {
  clubFrameId?: number
  clubPixelRatio?: number
  clubMultiplayerClose?: () => void
  clubCharacterRigLoad?: Promise<CharacterRig>
  clubSetDuckPosition?: (x: number, z: number, y?: number) => void
}
