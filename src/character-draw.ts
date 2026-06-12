import { handSideSign } from './character-accessory.ts'
import type { TurnBasis } from './character-accessory.ts'
import { characterGroundJoints, characterScale, shoe, skin } from './character-data.ts'
import {
  addCharacterBox,
  addCharacterQuad,
  addReservedFlatTriangle,
  reserveFloats,
  resetVertexWriter,
} from './character-geometry.ts'
import type { VertexWriter } from './character-geometry.ts'
import { characterParts, characterPoseJoints, characterPoseJointSet } from './character-parts.ts'
import { sampleBasePose, sampleCharacterPose } from './character-rig.ts'
import { resolvePlayerStyle } from './character-style.ts'
import { characterView, characterVisibilityInto } from './character-visibility.ts'
import { raiseCigaretteArm, setCigaretteGeometry } from './cigarette.ts'
import type { CigaretteGeometry } from './cigarette.ts'
import { clamp, lengthSq, normalizeIndex } from './math.ts'
import { roomAt, walkHeight, walkLoftHeight } from './scene.ts'
import { createObjectTurnBasisCache } from './turn-basis.ts'
import type {
  CharacterLight,
  CharacterMode,
  CharacterPart,
  CharacterRig,
  HairMesh,
  Player,
  PlayerStyle,
  PoseBlendCache,
  ResolvedPlayerStyle,
  SampledPose,
  Vec3,
} from './types.ts'

type CharacterInput = {
  position: Vec3
  turn: number
  motionBlend: number
  input?: Vec3
  mode?: CharacterMode
  modeTime?: number
  poseUp?: Vec3
  hideHead?: boolean
  sunglasses?: boolean
  jetpacking?: boolean
  idleClipIndex: number
  style: PlayerStyle
  resolvedStyle?: ResolvedPlayerStyle
}

type BuildOptions = {
  cameraPosition: Vec3
  cameraTarget: Vec3
  character: CharacterInput
  hairMeshes: HairMesh[]
  light: CharacterLight
  loft?: boolean
  players: Player[]
  rig: CharacterRig
  time: number
  drawCache?: CharacterDrawCache
  vertexWriter?: VertexWriter
  width: number
  height: number
}

export type CharacterHeadBasis = {
  side: Vec3
  up: Vec3
  forward: Vec3
}

type CachedNpcPose = {
  frame: number
  key: number
  pose: Vec3[]
}

type ThrottledNpcPose = {
  pose: Vec3[]
  update: boolean
}

export type CharacterDrawCache = {
  basePose?: SampledPose
  basePoses: Map<number, SampledPose>
  boxInstances: VertexWriter
  hairInstances: VertexWriter
  npcBlendCache: PoseBlendCache
  npcPoseFrames: WeakMap<Player, CachedNpcPose>
  poses: Vec3[][]
  usedBasePoseKeys: Set<number>
  usedNpcBlendKeys: Set<number>
  vertices: VertexWriter
}

const poseJointIndices = new Map(characterPoseJoints.map((name, index) => [name, index]))
const groundJointIndices = characterGroundJoints.map(name => poseJointIndices.get(name)!)
const spine2Index = poseJointIndices.get('mixamorig:Spine2')!
const neckIndex = poseJointIndices.get('mixamorig:Neck')!
const hipsIndex = poseJointIndices.get('mixamorig:Hips')!
const leftArmIndex = poseJointIndices.get('mixamorig:LeftArm')!
const rightArmIndex = poseJointIndices.get('mixamorig:RightArm')!
const leftForeArmIndex = poseJointIndices.get('mixamorig:LeftForeArm')!
const rightForeArmIndex = poseJointIndices.get('mixamorig:RightForeArm')!
const leftHandIndex = poseJointIndices.get('mixamorig:LeftHand')!
const rightHandIndex = poseJointIndices.get('mixamorig:RightHand')!
const leftUpLegIndex = poseJointIndices.get('mixamorig:LeftUpLeg')!
const rightUpLegIndex = poseJointIndices.get('mixamorig:RightUpLeg')!
const leftLegIndex = poseJointIndices.get('mixamorig:LeftLeg')!
const rightLegIndex = poseJointIndices.get('mixamorig:RightLeg')!
const leftFootIndex = poseJointIndices.get('mixamorig:LeftFoot')!
const rightFootIndex = poseJointIndices.get('mixamorig:RightFoot')!
const leftToeIndex = poseJointIndices.get('mixamorig:LeftToe_End')!
const rightToeIndex = poseJointIndices.get('mixamorig:RightToe_End')!
const headIndex = poseJointIndices.get('mixamorig:Head')!
const headTopIndex = poseJointIndices.get('mixamorig:HeadTop_End')!

export const headPoseIndex = headIndex
const characterPartPlans = characterParts.map(part => ({
  part,
  fromIndex: poseJointIndices.get(part.from)!,
  toIndex: poseJointIndices.get(part.to)!,
}))
const hairLightPoint: Vec3 = [0, 0, 0]
const hairLightNormal: Vec3 = [0, 1, 0]
const hairShade: Vec3 = [0, 0, 0]
const partA: Vec3 = [0, 0, 0]
const partB: Vec3 = [0, 0, 0]
const chestA: Vec3 = [0, 0, 0]
const chestB: Vec3 = [0, 0, 0]
const skirtA: Vec3 = [0, 0, 0]
const skirtB: Vec3 = [0, 0, 0]
const skirtC: Vec3 = [0, 0, 0]
const skirtD: Vec3 = [0, 0, 0]
const skirtE: Vec3 = [0, 0, 0]
const skirtF: Vec3 = [0, 0, 0]
const skirtG: Vec3 = [0, 0, 0]
const skirtH: Vec3 = [0, 0, 0]
const hairSide: Vec3 = [0, 0, 0]
const hairUp: Vec3 = [0, 0, 0]
const hairForward: Vec3 = [0, 0, 0]
const glowstickA: Vec3 = [0, 0, 0]
const glowstickB: Vec3 = [0, 0, 0]
const glowstickSide: Vec3 = [0, 0, 0]
const cigaretteA: Vec3 = [0, 0, 0]
const cigaretteB: Vec3 = [0, 0, 0]
const cigaretteEmberB: Vec3 = [0, 0, 0]
const cigaretteSide: Vec3 = [0, 0, 0]
const cigaretteForward: Vec3 = [0, 0, 0]
const cigaretteGeometry: CigaretteGeometry = {
  base: cigaretteA,
  tip: cigaretteB,
  emberTip: cigaretteEmberB,
  side: cigaretteSide,
  forward: cigaretteForward,
}
const hairBasis: CharacterHeadBasis = {
  forward: hairForward,
  side: hairSide,
  up: hairUp,
}
const cigaretteEmber: Vec3 = [1, 0.36, 0.05]
const sprayCanNozzleSide: Vec3 = [0, 1, 0]
const sprayCanCapA: Vec3 = [0, 0, 0]
const sprayCanCapB: Vec3 = [0, 0, 0]
const sprayCanNozzleA: Vec3 = [0, 0, 0]
const sprayCanNozzleB: Vec3 = [0, 0, 0]
const jetpackBodyA: Vec3 = [0, 0, 0]
const jetpackBodyB: Vec3 = [0, 0, 0]
const jetpackNozzleA: Vec3 = [0, 0, 0]
const jetpackNozzleB: Vec3 = [0, 0, 0]
const jetpackNozzleGlowA: Vec3 = [0, 0, 0]
const jetpackNozzleGlowB: Vec3 = [0, 0, 0]
const jetpackHandleA: Vec3 = [0, 0, 0]
const jetpackHandleB: Vec3 = [0, 0, 0]
const jetpackAxis: Vec3 = [0, 1, 0]
const jetpackSide: Vec3 = [1, 0, 0]
const jetpackBack: Vec3 = [0, 0, -1]
const jetpackNozzleColor: Vec3 = [0.08, 0.085, 0.1]
const jetpackNozzleGlow: Vec3 = [1, 0.32, 0.04]
const jetpackHandleColor: Vec3 = [0.035, 0.04, 0.055]
const jetpackHandleForearmEnd = 1.22
const sunglassesA: Vec3 = [0, 0, 0]
const sunglassesB: Vec3 = [0, 0, 0]
const sunglassesLens: Vec3 = [0.035, 0.018, 0.01]
const sunglassesFrame: Vec3 = [0.07, 0.038, 0.018]
const playerVisibility = { depth: 0, distanceSq: 0, visible: false }
const maxCachedBasePoses = 960
const maxCachedBlendPoses = 1440
const midPoseThrottleDistanceSq = 16 * 16
const farPoseThrottleDistanceSq = 26 * 26
const characterTurnBasis = createObjectTurnBasisCache<CharacterInput>()

export function buildCharacterDrawData(options: BuildOptions) {
  const cache = options.drawCache
  const vertices = cache?.vertices ?? options.vertexWriter ?? { data: new Float32Array(0), length: 0 }
  const boxInstances = cache?.boxInstances ?? { data: new Float32Array(0), length: 0 }
  const hairInstances = cache?.hairInstances ?? { data: new Float32Array(0), length: 0 }
  const npcBlendCache = cache?.npcBlendCache ?? new Map()
  const npcPoseFrames = cache?.npcPoseFrames ?? new WeakMap()
  const poses = cache?.poses ?? []
  const basePoses = cache?.basePoses ?? new Map()
  const usedBasePoseKeys = cache?.usedBasePoseKeys ?? new Set<number>()
  const usedNpcBlendKeys = cache?.usedNpcBlendKeys ?? new Set<number>()
  const localNeedsRun = options.character.motionBlend > 0 || options.character.mode === 'wave'
    || options.character.mode === 'waveOut'
  const basePose = sampleBasePose(options.rig, options.time, characterPoseJoints, characterPoseJointSet,
    idleClipIndex(options.character), cache?.basePose, localNeedsRun)

  if (cache) {
    cache.basePose = basePose
  }
  let poseIndex = 0

  resetVertexWriter(vertices)
  resetVertexWriter(boxInstances)
  resetVertexWriter(hairInstances)
  usedBasePoseKeys.clear()
  usedNpcBlendKeys.clear()

  addRenderedCharacter(vertices, boxInstances, hairInstances, options.character, options, true, basePose, undefined,
    poseCache(poses, poseIndex))
  poseIndex++

  const view = characterView(options.cameraPosition, options.cameraTarget)

  for (const player of options.players) {
    const visibility = characterVisibilityInto(player, view, options.width, options.height, playerVisibility)

    if (visibility.visible) {
      const sampledTime = bodySampleTime(options.time, visibility.distanceSq)
      const playerIdleClipIndex = idleClipIndex(player)
      const sampleKey = playerIdleClipIndex * 1000000 + Math.round(sampledTime * 60)
      const blendKey = sampleKey * 100 + Math.round(player.motionBlend * 60)
      const directClip = usesDirectClip(player)
      const cachedPose = directClip || usesBlendedPoseCache(player)
      const poseKey = directClip ? directClipPoseKey(player, sampledTime) : sampleKey
      const includeRun = player.motionBlend > 0 || player.mode === 'wave' || player.mode === 'waveOut'
      let sampledBasePose = directClip
        ? undefined
        : basePoses.get(sampleKey)
          ?? sampleAndCacheBasePose(options.rig, sampledTime, basePoses, sampleKey, playerIdleClipIndex, includeRun)

      if (sampledBasePose && includeRun && !sampledBasePose.run) {
        sampledBasePose = sampleAndCacheBasePose(options.rig, sampledTime, basePoses, sampleKey, playerIdleClipIndex,
          true)
      }

      if (!directClip) {
        usedBasePoseKeys.add(sampleKey)
      }
      if (cachedPose) {
        usedNpcBlendKeys.add(directClip ? poseKey : blendKey)
      }

      const frame = Math.floor(options.time * 60)
      const throttle = npcPoseThrottle(player, directClip, visibility.distanceSq)
      const npcPose = throttledNpcPose(npcPoseFrames, player, frame, throttle, directClip ? poseKey : blendKey)
      const placedPose = npcPose?.pose ?? poseCache(poses, poseIndex)
      const npcDetail = visibility.distanceSq <= farPoseThrottleDistanceSq

      addRenderedCharacter(vertices, boxInstances, hairInstances, player, options, false, sampledBasePose,
        cachedPose ? npcBlendCache : undefined, placedPose, sampledTime, poseKey,
        npcDetail, npcPose && !npcPose.update ? npcPose.pose : undefined, npcDetail)
      poseIndex++
    }
  }

  prunePoseCache(basePoses, usedBasePoseKeys, maxCachedBasePoses)
  prunePoseCache(npcBlendCache, usedNpcBlendKeys, maxCachedBlendPoses)

  return {
    vertices,
    boxInstances,
    hairInstances,
  }
}

function npcPoseThrottle(player: Player, directClip: boolean, distanceSq: number) {
  const style = player.resolvedStyle ?? resolvePlayerStyle(player.style)

  if (directClip || player.mode === 'wave' || player.mode === 'waveOut'
    || (style.accessoryKind === 'cigarette' && distanceSq <= farPoseThrottleDistanceSq))
  {
    return 1
  }
  if (distanceSq > farPoseThrottleDistanceSq) {
    return 4
  }
  if (distanceSq > midPoseThrottleDistanceSq) {
    return 2
  }

  return 1
}

function throttledNpcPose(
  poses: WeakMap<Player, CachedNpcPose>,
  player: Player,
  frame: number,
  throttle: number,
  key: number,
): ThrottledNpcPose | undefined {
  if (throttle === 1) {
    return undefined
  }

  let pose = poses.get(player)

  if (!pose || pose.key !== key) {
    pose = {
      frame: frame - throttle,
      key,
      pose: Array.from({ length: characterPoseJoints.length }, () => [0, 0, 0] as Vec3),
    }
    poses.set(player, pose)
  }

  if (frame - pose.frame >= throttle) {
    pose.frame = frame

    return { pose: pose.pose, update: true }
  }

  return { pose: pose.pose, update: false }
}

function prunePoseCache<T>(cache: Map<number, T>, used: Set<number>, max: number) {
  if (cache.size <= max) {
    return
  }

  for (const key of cache.keys()) {
    if (!used.has(key)) {
      cache.delete(key)
      if (cache.size <= max) {
        return
      }
    }
  }
}

function idleClipIndex(character: CharacterInput) {
  return roomAt(character.position) === 'tent' ? 0 : character.idleClipIndex
}

function poseCache(poses: Vec3[][], index: number) {
  let pose = poses[index]

  if (!pose) {
    pose = Array.from({ length: characterPoseJoints.length }, () => [0, 0, 0] as Vec3)
    poses[index] = pose
  }

  return pose
}

function usesDirectClip(character: CharacterInput) {
  return character.mode === 'jump' || character.mode === 'breakdance' || character.mode === 'manSitting'
    || character.mode === 'womanSitting'
}

function usesBlendedPoseCache(character: CharacterInput) {
  return character.mode !== 'wave' && character.mode !== 'waveOut'
}

function directClipPoseKey(character: CharacterInput, time: number) {
  return -(directClipModeKey(character.mode) * 1000000 + Math.round((character.modeTime ?? time) * 60))
}

function directClipModeKey(mode: CharacterMode | undefined) {
  if (mode === 'manSitting') {
    return 1
  }
  if (mode === 'womanSitting') {
    return 2
  }
  if (mode === 'breakdance') {
    return 4
  }

  return 3
}

function addRenderedCharacter(
  target: VertexWriter,
  boxInstances: VertexWriter,
  hairInstances: VertexWriter,
  player: CharacterInput,
  options: BuildOptions,
  detailedHair: boolean,
  basePose?: SampledPose,
  blendCache?: PoseBlendCache,
  placedPose?: Vec3[],
  time = options.time,
  cacheFrame = 0,
  renderHair = true,
  poseOverride?: Vec3[],
  renderAccessory = true,
) {
  const pose = poseOverride
    ?? sampleCharacterPose(options.rig, time, player, characterPoseJoints, characterPoseJointSet, groundJointIndices,
      characterScale, basePose, blendCache, placedPose, cacheFrame)
  const style = player.resolvedStyle ?? resolvePlayerStyle(player.style)
  const localReflection = detailedHair
  const turn = characterTurnBasis(player, player.turn)
  const hideHead = player.hideHead === true

  if (renderAccessory && style.accessoryKind === 'cigarette') {
    raisePoseCigaretteArm(pose, turn, options.time)
  }
  else if (renderAccessory && style.accessoryKind === 'jetpack') {
    setJetpackArmPose(pose, turn)
  }
  setAirborneLegInertia(pose, player, turn, options.loft === true)

  for (const part of characterPartPlans) {
    if ((style.bottomMode === 'pants' || !part.part.bottom) && (!hideHead || part.toIndex !== headTopIndex)) {
      addCharacterPart(target, boxInstances, pose, part, player, turn, style, options.light, localReflection)
    }
  }

  if (style.bottomMode === 'skirt') {
    addCharacterSkirt(target, pose, player, turn, style, options.light, localReflection)
  }

  if (style.topMode === 'chest') {
    addCharacterChest(target, boxInstances, pose, player, turn, style, options.light, localReflection)
  }

  if (renderAccessory && style.accessory) {
    if (style.accessoryKind === 'glowstick') {
      addGlowsticks(target, boxInstances, pose, player, turn, style, options.light, localReflection)
    }
    else if (style.accessoryKind === 'cigarette') {
      addCigarette(target, boxInstances, pose, player, turn, style, options.light, localReflection, options.time)
    }
    else if (style.accessoryKind === 'jetpack') {
      addJetpack(target, boxInstances, pose, player, turn, style, options.light, localReflection)
    }
    else {
      addSprayCan(target, boxInstances, pose, player, turn, style, options.light, localReflection)
    }
  }

  if (renderAccessory && player.sunglasses && !hideHead) {
    addSunglasses(target, boxInstances, pose, player, turn, options.light, localReflection)
  }

  const hair = playerHair(options.hairMeshes, player.style.hairIndex)

  if (hair && detailedHair && !hideHead) {
    addCharacterHair(target, pose, hair, style.hairColor, options.light)
  }
  else if (hair && renderHair && !hideHead && options.hairMeshes.length > 0) {
    addNpcHairInstance(hairInstances, pose, hair, style.hairColor)
  }
}

function addSunglasses(
  target: VertexWriter,
  boxInstances: VertexWriter,
  pose: Vec3[],
  player: { turn: number },
  turn: TurnBasis,
  light: CharacterLight,
  localReflection: boolean,
) {
  const basis = characterHairBasis(pose)
  const head = pose[headIndex]!
  const centerSide = 0.052
  const lensHeight = 0.074
  const lensWidth = 0.082
  const centerUp = 0.072
  const centerForward = 0.105

  addSunglassesLens(target, boxInstances, head, basis, -centerSide, centerUp, centerForward, lensHeight, lensWidth,
    player, turn, light, localReflection)
  addSunglassesLens(target, boxInstances, head, basis, centerSide, centerUp, centerForward, lensHeight, lensWidth,
    player, turn, light, localReflection)
  addSunglassesBridge(target, boxInstances, head, basis, centerUp, centerForward, player, turn, light, localReflection)
  addSunglassesTopBar(target, boxInstances, head, basis, centerUp + lensHeight * 0.5, centerForward, player, turn,
    light, localReflection)
  addSunglassesArm(target, boxInstances, head, basis, -1, centerUp + 0.01, centerForward, player, turn, light,
    localReflection)
  addSunglassesArm(target, boxInstances, head, basis, 1, centerUp + 0.01, centerForward, player, turn, light,
    localReflection)
}

function addSunglassesLens(
  target: VertexWriter,
  boxInstances: VertexWriter,
  head: Vec3,
  basis: CharacterHeadBasis,
  side: number,
  up: number,
  forward: number,
  height: number,
  width: number,
  player: { turn: number },
  turn: TurnBasis,
  light: CharacterLight,
  localReflection: boolean,
) {
  setSunglassesPoint(sunglassesA, head, basis, side, up - height * 0.5, forward)
  setSunglassesPoint(sunglassesB, head, basis, side, up + height * 0.5, forward)
  addCharacterBox(target, boxInstances, sunglassesA, sunglassesB, width, 0.026, sunglassesLens, 0.04, player.turn,
    localReflection, light, 0, turn.sin, turn.cos, { side: basis.side })
}

function addSunglassesBridge(
  target: VertexWriter,
  boxInstances: VertexWriter,
  head: Vec3,
  basis: CharacterHeadBasis,
  up: number,
  forward: number,
  player: { turn: number },
  turn: TurnBasis,
  light: CharacterLight,
  localReflection: boolean,
) {
  setSunglassesPoint(sunglassesA, head, basis, -0.03, up, forward + 0.006)
  setSunglassesPoint(sunglassesB, head, basis, 0.03, up, forward + 0.006)
  addCharacterBox(target, boxInstances, sunglassesA, sunglassesB, 0.018, 0.018, sunglassesFrame, 0.06, player.turn,
    localReflection, light, 0, turn.sin, turn.cos, { side: basis.up })
}

function addSunglassesTopBar(
  target: VertexWriter,
  boxInstances: VertexWriter,
  head: Vec3,
  basis: CharacterHeadBasis,
  up: number,
  forward: number,
  player: { turn: number },
  turn: TurnBasis,
  light: CharacterLight,
  localReflection: boolean,
) {
  setSunglassesPoint(sunglassesA, head, basis, -0.104, up, forward + 0.006)
  setSunglassesPoint(sunglassesB, head, basis, 0.104, up, forward + 0.006)
  addCharacterBox(target, boxInstances, sunglassesA, sunglassesB, 0.018, 0.018, sunglassesFrame, 0.06, player.turn,
    localReflection, light, 0, turn.sin, turn.cos, { side: basis.up })
}

function addSunglassesArm(
  target: VertexWriter,
  boxInstances: VertexWriter,
  head: Vec3,
  basis: CharacterHeadBasis,
  sign: -1 | 1,
  up: number,
  forward: number,
  player: { turn: number },
  turn: TurnBasis,
  light: CharacterLight,
  localReflection: boolean,
) {
  setSunglassesPoint(sunglassesA, head, basis, sign * 0.102, up, forward)
  setSunglassesPoint(sunglassesB, head, basis, sign * 0.132, up + 0.005, forward - 0.13)
  addCharacterBox(target, boxInstances, sunglassesA, sunglassesB, 0.016, 0.016, sunglassesFrame, 0.04, player.turn,
    localReflection, light, 0, turn.sin, turn.cos, { side: basis.up })
}

function setSunglassesPoint(
  target: Vec3,
  head: Vec3,
  basis: CharacterHeadBasis,
  side: number,
  up: number,
  forward: number,
) {
  target[0] = head[0] + basis.side[0] * side + basis.up[0] * up + basis.forward[0] * forward
  target[1] = head[1] + basis.side[1] * side + basis.up[1] * up + basis.forward[1] * forward
  target[2] = head[2] + basis.side[2] * side + basis.up[2] * up + basis.forward[2] * forward
}

function addGlowsticks(
  target: VertexWriter,
  boxInstances: VertexWriter,
  pose: Vec3[],
  player: { jetpacking?: boolean; turn: number },
  turn: TurnBasis,
  style: ResolvedPlayerStyle,
  light: CharacterLight,
  localReflection: boolean,
) {
  const torso = pose[spine2Index]!

  addGlowstick(target, boxInstances, torso, pose[leftForeArmIndex]!, pose[leftHandIndex]!, player, turn, style, light,
    localReflection)
  addGlowstick(target, boxInstances, torso, pose[rightForeArmIndex]!, pose[rightHandIndex]!, player, turn, style, light,
    localReflection)
}

function addGlowstick(
  target: VertexWriter,
  boxInstances: VertexWriter,
  torso: Vec3,
  foreArm: Vec3,
  hand: Vec3,
  player: { turn: number },
  turn: TurnBasis,
  style: ResolvedPlayerStyle,
  light: CharacterLight,
  localReflection: boolean,
) {
  const dx = hand[0] - foreArm[0]
  const dy = hand[1] - foreArm[1]
  const dz = hand[2] - foreArm[2]
  const sideX = turn.cos
  const sideZ = -turn.sin
  const handSide = handSideSign(hand, torso, sideX, sideZ)
  const crossX = -dy * sideZ
  const crossY = dz * sideX - dx * sideZ
  const crossZ = dy * sideX
  const crossLength = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ)
  const stickX = crossX / crossLength
  const stickY = crossY / crossLength
  const stickZ = crossZ / crossLength
  const centerX = hand[0] + sideX * handSide * 0.08 + dx * 0.08
  const centerY = hand[1] + 0.007 + dy * 0.08
  const centerZ = hand[2] + sideZ * handSide * 0.08 + dz * 0.08
  const half = 0.08

  glowstickA[0] = centerX - stickX * half
  glowstickA[1] = centerY - stickY * half
  glowstickA[2] = centerZ - stickZ * half
  glowstickB[0] = centerX + stickX * half
  glowstickB[1] = centerY + stickY * half
  glowstickB[2] = centerZ + stickZ * half
  glowstickSide[0] = sideX * handSide
  glowstickSide[1] = 0
  glowstickSide[2] = sideZ * handSide
  addCharacterBox(target, boxInstances, glowstickA, glowstickB, 0.025, 0.025, style.accessory!, 1.4, player.turn,
    localReflection, light, 0, turn.sin, turn.cos, { side: glowstickSide })
}

function addSprayCan(
  target: VertexWriter,
  boxInstances: VertexWriter,
  pose: Vec3[],
  player: { turn: number },
  turn: TurnBasis,
  style: ResolvedPlayerStyle,
  light: CharacterLight,
  localReflection: boolean,
) {
  const torso = pose[spine2Index]!

  addSprayCanAtHand(target, boxInstances, torso, pose[rightForeArmIndex]!, pose[rightHandIndex]!, player, turn, style,
    light, localReflection)
}

function addSprayCanAtHand(
  target: VertexWriter,
  boxInstances: VertexWriter,
  torso: Vec3,
  foreArm: Vec3,
  hand: Vec3,
  player: { turn: number },
  turn: TurnBasis,
  style: ResolvedPlayerStyle,
  light: CharacterLight,
  localReflection: boolean,
) {
  const dx = hand[0] - foreArm[0]
  const dy = hand[1] - foreArm[1]
  const dz = hand[2] - foreArm[2]
  const sideX = turn.cos
  const sideZ = -turn.sin
  const handSide = handSideSign(hand, torso, sideX, sideZ)
  const centerX = hand[0] + sideX * handSide * 0.16 + dx * 0.04
  const centerY = hand[1] - 0.08 + dy * 0.04
  const centerZ = hand[2] + sideZ * handSide * 0.16 + dz * 0.04
  const color = style.accessory!

  glowstickA[0] = centerX
  glowstickA[1] = centerY - 0.14
  glowstickA[2] = centerZ
  glowstickB[0] = centerX
  glowstickB[1] = centerY + 0.12
  glowstickB[2] = centerZ
  glowstickSide[0] = sideX * handSide
  glowstickSide[1] = 0
  glowstickSide[2] = sideZ * handSide
  addCharacterBox(target, boxInstances, glowstickA, glowstickB, 0.13, 0.13, color, 0.12, player.turn, localReflection,
    light, 0, turn.sin, turn.cos, { side: glowstickSide })
  addCharacterBox(target, boxInstances, glowstickA, glowstickB, 0.145, 0.035, color, 0.12, player.turn, localReflection,
    light, 0, turn.sin, turn.cos, { side: glowstickSide })

  sprayCanCapA[0] = centerX
  sprayCanCapA[1] = centerY + 0.12
  sprayCanCapA[2] = centerZ
  sprayCanCapB[0] = centerX
  sprayCanCapB[1] = centerY + 0.18
  sprayCanCapB[2] = centerZ
  addCharacterBox(target, boxInstances, sprayCanCapA, sprayCanCapB, 0.1, 0.1, color, 0.12, player.turn, localReflection,
    light, 0, turn.sin, turn.cos, { side: glowstickSide })

  sprayCanNozzleA[0] = centerX + sideX * handSide * 0.035
  sprayCanNozzleA[1] = centerY + 0.19
  sprayCanNozzleA[2] = centerZ + sideZ * handSide * 0.035
  sprayCanNozzleB[0] = centerX + sideX * handSide * 0.13
  sprayCanNozzleB[1] = centerY + 0.19
  sprayCanNozzleB[2] = centerZ + sideZ * handSide * 0.13
  addCharacterBox(target, boxInstances, sprayCanNozzleA, sprayCanNozzleB, 0.035, 0.035, color, 0.12, player.turn,
    localReflection, light, 0, turn.sin, turn.cos, { side: sprayCanNozzleSide })
}

function addJetpack(
  target: VertexWriter,
  boxInstances: VertexWriter,
  pose: Vec3[],
  player: { jetpacking?: boolean; turn: number },
  turn: TurnBasis,
  style: ResolvedPlayerStyle,
  light: CharacterLight,
  localReflection: boolean,
) {
  setJetpackReferenceBox(pose, turn)
  addCharacterBox(target, boxInstances, jetpackBodyA, jetpackBodyB, 0.26, 0.13, style.accessory!, 0.08,
    player.turn, localReflection, light, 0, turn.sin, turn.cos, { side: jetpackSide })
  addJetpackNozzle(target, boxInstances, pose, player, turn, light, localReflection, -0.075, player.jetpacking === true)
  addJetpackNozzle(target, boxInstances, pose, player, turn, light, localReflection, 0.075, player.jetpacking === true)
  addJetpackHandle(target, boxInstances, pose, player, turn, light, localReflection, -0.2,
    pose[rightForeArmIndex]!, pose[rightHandIndex]!)
  addJetpackHandle(target, boxInstances, pose, player, turn, light, localReflection, 0.2,
    pose[leftForeArmIndex]!, pose[leftHandIndex]!)
}

function addJetpackNozzle(
  target: VertexWriter,
  boxInstances: VertexWriter,
  pose: Vec3[],
  player: { turn: number },
  turn: TurnBasis,
  light: CharacterLight,
  localReflection: boolean,
  sideOffset: number,
  active: boolean,
) {
  setJetpackBoxPoint(jetpackNozzleA, sideOffset, 0.02, 0.02)
  setJetpackBoxPoint(jetpackNozzleB, sideOffset, -0.03, 0.02)
  addCharacterBox(target, boxInstances, jetpackNozzleA, jetpackNozzleB, 0.055, 0.06, jetpackNozzleColor, 0.18,
    player.turn, localReflection, light, 0, turn.sin, turn.cos, { side: jetpackSide })
  setJetpackBoxPoint(jetpackNozzleGlowA, sideOffset, -0.025, 0.02)
  setJetpackBoxPoint(jetpackNozzleGlowB, sideOffset, -0.055, 0.02)
  addCharacterBox(target, boxInstances, jetpackNozzleGlowA, jetpackNozzleGlowB, 0.065, 0.07, jetpackNozzleGlow,
    active ? 1.6 : 0.38,
    player.turn, localReflection, light, 0, turn.sin, turn.cos, { side: jetpackSide })
}

function addJetpackHandle(
  target: VertexWriter,
  boxInstances: VertexWriter,
  pose: Vec3[],
  player: { turn: number },
  turn: TurnBasis,
  light: CharacterLight,
  localReflection: boolean,
  sideOffset: number,
  elbow: Vec3,
  hand: Vec3,
) {
  const sideSign = Math.sign(sideOffset)
  const endSideSpread = 0.08

  setJetpackPoint(jetpackHandleA, pose, turn, sideOffset, 0.3, 0.17)
  jetpackHandleB[0] = elbow[0]
  jetpackHandleB[1] = elbow[1]
  jetpackHandleB[2] = elbow[2]
  addCharacterBox(target, boxInstances, jetpackHandleA, jetpackHandleB, 0.026, 0.026, jetpackHandleColor, 0.12,
    player.turn, localReflection, light, 0, turn.sin, turn.cos, { side: jetpackSide })

  jetpackHandleA[0] = elbow[0]
  jetpackHandleA[1] = elbow[1] - 0.055
  jetpackHandleA[2] = elbow[2]
  jetpackHandleB[0] = elbow[0] + (hand[0] - elbow[0]) * jetpackHandleForearmEnd + turn.cos * sideSign * endSideSpread
  jetpackHandleB[1] = elbow[1] + (hand[1] - elbow[1]) * jetpackHandleForearmEnd - 0.015
  jetpackHandleB[2] = elbow[2] + (hand[2] - elbow[2]) * jetpackHandleForearmEnd - turn.sin * sideSign * endSideSpread
  addCharacterBox(target, boxInstances, jetpackHandleA, jetpackHandleB, 0.026, 0.026, jetpackHandleColor, 0.12,
    player.turn, localReflection, light, 0, turn.sin, turn.cos, { side: jetpackSide })
}

export function setPoseJetpackNozzles(left: Vec3, right: Vec3, pose: Vec3[], turn: TurnBasis) {
  setJetpackReferenceBox(pose, turn)
  setJetpackBoxPoint(left, -0.075, -0.055, 0.02)
  setJetpackBoxPoint(right, 0.075, -0.055, 0.02)
}

function setJetpackReferenceBox(pose: Vec3[], turn: TurnBasis) {
  setJetpackPoint(jetpackBodyA, pose, turn, 0, -0.34, 0.17)
  setJetpackPoint(jetpackBodyB, pose, turn, 0, 1.1, 0.17)
  setJetpackSide(jetpackSide, turn)
  setJetpackFrame()
}

function setJetpackBoxPoint(target: Vec3, side: number, along: number, back: number) {
  target[0] = jetpackBodyA[0] + jetpackAxis[0] * along + jetpackSide[0] * side + jetpackBack[0] * back
  target[1] = jetpackBodyA[1] + jetpackAxis[1] * along + jetpackSide[1] * side + jetpackBack[1] * back
  target[2] = jetpackBodyA[2] + jetpackAxis[2] * along + jetpackSide[2] * side + jetpackBack[2] * back
}

function setJetpackFrame() {
  const axisX = jetpackBodyB[0] - jetpackBodyA[0]
  const axisY = jetpackBodyB[1] - jetpackBodyA[1]
  const axisZ = jetpackBodyB[2] - jetpackBodyA[2]
  const axisLength = Math.sqrt(axisX * axisX + axisY * axisY + axisZ * axisZ)

  jetpackAxis[0] = axisX / axisLength
  jetpackAxis[1] = axisY / axisLength
  jetpackAxis[2] = axisZ / axisLength

  const sideDotAxis = jetpackSide[0] * jetpackAxis[0] + jetpackSide[1] * jetpackAxis[1]
    + jetpackSide[2] * jetpackAxis[2]

  jetpackSide[0] -= jetpackAxis[0] * sideDotAxis
  jetpackSide[1] -= jetpackAxis[1] * sideDotAxis
  jetpackSide[2] -= jetpackAxis[2] * sideDotAxis

  const sideLength = Math.sqrt(jetpackSide[0] * jetpackSide[0] + jetpackSide[1] * jetpackSide[1]
    + jetpackSide[2] * jetpackSide[2])

  jetpackSide[0] /= sideLength
  jetpackSide[1] /= sideLength
  jetpackSide[2] /= sideLength
  jetpackBack[0] = jetpackAxis[1] * jetpackSide[2] - jetpackAxis[2] * jetpackSide[1]
  jetpackBack[1] = jetpackAxis[2] * jetpackSide[0] - jetpackAxis[0] * jetpackSide[2]
  jetpackBack[2] = jetpackAxis[0] * jetpackSide[1] - jetpackAxis[1] * jetpackSide[0]
}

function setJetpackPoint(target: Vec3, pose: Vec3[], turn: TurnBasis, side: number, lift: number, back: number) {
  const spine = pose[spine2Index]!
  const neck = pose[neckIndex]!
  const torsoX = neck[0] - spine[0]
  const torsoY = neck[1] - spine[1]
  const torsoZ = neck[2] - spine[2]
  const sideX = turn.cos
  const sideZ = -turn.sin
  const backX = -turn.sin
  const backZ = -turn.cos

  target[0] = spine[0] + torsoX * lift + sideX * side + backX * back
  target[1] = spine[1] + torsoY * lift
  target[2] = spine[2] + torsoZ * lift + sideZ * side + backZ * back
}

function setJetpackSide(target: Vec3, turn: TurnBasis) {
  target[0] = turn.cos
  target[1] = 0
  target[2] = -turn.sin
}

function setJetpackArmPose(pose: Vec3[], turn: TurnBasis) {
  setJetpackArmSide(pose[leftArmIndex]!, pose[leftForeArmIndex]!, pose[leftHandIndex]!, turn, 1)
  setJetpackArmSide(pose[rightArmIndex]!, pose[rightForeArmIndex]!, pose[rightHandIndex]!, turn, -1)
}

function setJetpackArmSide(shoulder: Vec3, elbow: Vec3, hand: Vec3, turn: TurnBasis, sign: -1 | 1) {
  const upperLength = distance(shoulder, elbow)
  const foreArmLength = distance(elbow, hand)
  const sideX = turn.cos * sign
  const sideZ = -turn.sin * sign
  const forwardX = turn.sin
  const forwardZ = turn.cos

  elbow[0] = shoulder[0] + sideX * 0.02
  elbow[1] = shoulder[1] - upperLength
  elbow[2] = shoulder[2] + sideZ * 0.02
  hand[0] = elbow[0] + forwardX * foreArmLength
  hand[1] = elbow[1]
  hand[2] = elbow[2] + forwardZ * foreArmLength
}

function setAirborneLegInertia(pose: Vec3[], player: CharacterInput, turn: TurnBasis, loft: boolean) {
  if (player.mode === 'jump' || !player.input || lengthSq(player.input) === 0) {
    return
  }

  const floorY = loft
    ? walkLoftHeight(player.position[0], player.position[1], player.position[2])
    : walkHeight(player.position[0], player.position[1], player.position[2])

  if (player.position[1] <= floorY + 0.035) {
    return
  }

  const backX = -turn.sin
  const backZ = -turn.cos

  setAirborneLegSide(pose[leftUpLegIndex]!, pose[leftLegIndex]!, pose[leftFootIndex]!, pose[leftToeIndex]!, backX, backZ)
  setAirborneLegSide(pose[rightUpLegIndex]!, pose[rightLegIndex]!, pose[rightFootIndex]!, pose[rightToeIndex]!, backX,
    backZ)
}

function setAirborneLegSide(hip: Vec3, knee: Vec3, foot: Vec3, toe: Vec3, backX: number, backZ: number) {
  const upperLength = distance(hip, knee)
  const lowerLength = distance(knee, foot)
  const footLength = distance(foot, toe)
  const kneeBack = Math.min(0.12, upperLength * 0.45)
  const footBack = Math.min(0.18, lowerLength * 0.55)
  const toeForward = Math.min(0.07, footLength * 0.75)

  knee[0] = hip[0] + backX * kneeBack
  knee[1] = hip[1] - Math.sqrt(Math.max(0, upperLength * upperLength - kneeBack * kneeBack))
  knee[2] = hip[2] + backZ * kneeBack
  foot[0] = knee[0] + backX * footBack
  foot[1] = knee[1] - Math.sqrt(Math.max(0, lowerLength * lowerLength - footBack * footBack))
  foot[2] = knee[2] + backZ * footBack
  toe[0] = foot[0] - backX * toeForward
  toe[1] = foot[1] - Math.sqrt(Math.max(0, footLength * footLength - toeForward * toeForward))
  toe[2] = foot[2] - backZ * toeForward
}

function distance(a: Vec3, b: Vec3) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const dz = b[2] - a[2]

  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function raisePoseCigaretteArm(pose: Vec3[], turn: TurnBasis, time: number) {
  raiseCigaretteArm(pose[rightHandIndex]!, pose[rightForeArmIndex]!, pose[headIndex]!, turn, time)
}

export function setPoseCigaretteGeometry(
  target: CigaretteGeometry,
  pose: Vec3[],
  turn: TurnBasis,
  time: number,
) {
  raisePoseCigaretteArm(pose, turn, time)
  setCigaretteGeometry(target, pose[spine2Index]!, pose[rightForeArmIndex]!, pose[rightHandIndex]!, turn, time)
}

function addCigarette(
  target: VertexWriter,
  boxInstances: VertexWriter,
  pose: Vec3[],
  player: { turn: number },
  turn: TurnBasis,
  style: ResolvedPlayerStyle,
  light: CharacterLight,
  localReflection: boolean,
  time: number,
) {
  const torso = pose[spine2Index]!

  addCigaretteAtHand(target, boxInstances, torso, pose[rightForeArmIndex]!, pose[rightHandIndex]!, player, turn, style,
    light, localReflection, time)
}

function addCigaretteAtHand(
  target: VertexWriter,
  boxInstances: VertexWriter,
  torso: Vec3,
  foreArm: Vec3,
  hand: Vec3,
  player: { turn: number },
  turn: TurnBasis,
  style: ResolvedPlayerStyle,
  light: CharacterLight,
  localReflection: boolean,
  time: number,
) {
  setCigaretteGeometry(cigaretteGeometry, torso, foreArm, hand, turn, time)
  addCharacterBox(target, boxInstances, cigaretteA, cigaretteB, 0.02, 0.02, style.accessory!, 0.05, player.turn,
    localReflection, light, 0, turn.sin, turn.cos, { side: cigaretteSide })

  addCharacterBox(target, boxInstances, cigaretteB, cigaretteEmberB, 0.022, 0.022, cigaretteEmber, 1.6, player.turn,
    localReflection, light, 0, turn.sin, turn.cos, { side: cigaretteSide })
}

function bodySampleTime(time: number, distanceSq: number) {
  const fps = distanceSq > farPoseThrottleDistanceSq
    ? 6
    : distanceSq > midPoseThrottleDistanceSq
    ? 10
    : distanceSq > 10 * 10
    ? 20
    : 60

  return Math.round(time * fps) / fps
}

function sampleAndCacheBasePose(
  rig: CharacterRig,
  time: number,
  basePoses: Map<number, SampledPose>,
  key: number,
  idleClipIndex: number,
  includeRun: boolean,
) {
  const pose = sampleBasePose(rig, time, characterPoseJoints, characterPoseJointSet, idleClipIndex, basePoses.get(key),
    includeRun)

  basePoses.set(key, pose)

  return pose
}

function addNpcHairInstance(
  hairInstances: VertexWriter,
  pose: Vec3[],
  hair: HairMesh,
  color: Vec3,
) {
  const basis = characterHairBasis(pose)
  const head = pose[headIndex]!
  reserveFloats(hairInstances, 16)

  const data = hairInstances.data
  let offset = hairInstances.length

  data[offset++] = hair.index
  data[offset++] = head[0] - basis.up[0] * 0.035
  data[offset++] = head[1] - basis.up[1] * 0.035
  data[offset++] = head[2] - basis.up[2] * 0.035
  data[offset++] = basis.side[0]
  data[offset++] = basis.side[1]
  data[offset++] = basis.side[2]
  data[offset++] = basis.up[0]
  data[offset++] = basis.up[1]
  data[offset++] = basis.up[2]
  data[offset++] = basis.forward[0]
  data[offset++] = basis.forward[1]
  data[offset++] = basis.forward[2]
  data[offset++] = color[0]
  data[offset++] = color[1]
  data[offset++] = color[2]
  hairInstances.length = offset
}

function addCharacterPart(
  target: VertexWriter,
  boxInstances: VertexWriter,
  pose: Vec3[],
  plan: { part: CharacterPart; fromIndex: number; toIndex: number },
  player: { turn: number },
  turn: TurnBasis,
  style: ResolvedPlayerStyle,
  light: CharacterLight,
  localReflection: boolean,
) {
  const { part } = plan
  const from = pose[plan.fromIndex]!
  const to = pose[plan.toIndex]!
  const start = part.start ?? 0
  const end = part.end ?? 1
  const axisX = to[0] - from[0]
  const axisY = to[1] - from[1]
  const axisZ = to[2] - from[2]
  partA[0] = from[0] + axisX * start
  partA[1] = from[1] + axisY * start
  partA[2] = from[2] + axisZ * start
  partB[0] = from[0] + axisX * end
  partB[1] = from[1] + axisY * end
  partB[2] = from[2] + axisZ * end

  if (part.armOffset) {
    const torso = pose[spine2Index]!
    const sideX = turn.cos
    const sideZ = -turn.sin
    const centerX = (partA[0] + partB[0]) * 0.5 - torso[0]
    const centerZ = (partA[2] + partB[2]) * 0.5 - torso[2]
    const amount = Math.sign(centerX * sideX + centerZ * sideZ) * part.armOffset
    const offsetX = sideX * amount
    const offsetZ = sideZ * amount

    partA[0] += offsetX
    partA[2] += offsetZ
    partB[0] += offsetX
    partB[2] += offsetZ
  }

  if (part.lift) {
    partA[1] += part.lift
    partB[1] += part.lift
  }

  addCharacterBox(target, boxInstances, partA, partB, part.width, part.depth, characterPartColor(part, style),
    part.glow ?? 0.02, player.turn, localReflection, light, 0, turn.sin, turn.cos)
}

function characterPartColor(part: CharacterPart, style: ResolvedPlayerStyle) {
  if (part.top === 'torso') {
    return style.topMode === 'shirt' || style.topMode === 'sleeveless' ? style.shirtLight : style.skin
  }

  if (part.top === 'sleeve') {
    return style.topMode === 'shirt' ? style.shirt : style.skin
  }

  if (part.bottom) {
    return style.pants
  }

  if (part.color === shoe) {
    return style.shoe
  }

  return part.color === skin ? style.skin : part.color
}

function addCharacterChest(
  target: VertexWriter,
  boxInstances: VertexWriter,
  pose: Vec3[],
  player: { turn: number },
  turn: TurnBasis,
  style: ResolvedPlayerStyle,
  light: CharacterLight,
  localReflection: boolean,
) {
  const spine = pose[spine2Index]!
  const neck = pose[neckIndex]!
  const centerX = spine[0] + (neck[0] - spine[0]) * 0.32
  const centerY = spine[1] + (neck[1] - spine[1]) * 0.32
  const centerZ = spine[2] + (neck[2] - spine[2]) * 0.32
  const sideX = turn.cos
  const sideZ = -turn.sin
  const forwardX = turn.sin
  const forwardZ = turn.cos

  addCharacterChestSide(target, boxInstances, centerX, centerY, centerZ, sideX, sideZ, forwardX, forwardZ, -0.055,
    player, turn, style, light, localReflection)
  addCharacterChestSide(target, boxInstances, centerX, centerY, centerZ, sideX, sideZ, forwardX, forwardZ, 0.055,
    player, turn, style, light, localReflection)
}

function addCharacterChestSide(
  target: VertexWriter,
  boxInstances: VertexWriter,
  centerX: number,
  centerY: number,
  centerZ: number,
  sideX: number,
  sideZ: number,
  forwardX: number,
  forwardZ: number,
  offset: number,
  player: { turn: number },
  turn: TurnBasis,
  style: ResolvedPlayerStyle,
  light: CharacterLight,
  localReflection: boolean,
) {
  chestA[0] = centerX + sideX * offset + forwardX * 0.06
  chestA[1] = centerY
  chestA[2] = centerZ + sideZ * offset + forwardZ * 0.06
  chestB[0] = centerX + sideX * offset + forwardX * 0.13
  chestB[1] = centerY
  chestB[2] = centerZ + sideZ * offset + forwardZ * 0.13

  addCharacterBox(target, boxInstances, chestA, chestB, 0.065, 0.06, style.skin, 0.02, player.turn, localReflection,
    light, 0, turn.sin, turn.cos)
}

function addCharacterSkirt(
  target: VertexWriter,
  pose: Vec3[],
  player: { turn: number },
  turn: TurnBasis,
  style: ResolvedPlayerStyle,
  light: CharacterLight,
  localReflection: boolean,
) {
  const hips = pose[hipsIndex]!
  const leftUp = pose[leftUpLegIndex]!
  const rightUp = pose[rightUpLegIndex]!
  const leftLeg = pose[leftLegIndex]!
  const rightLeg = pose[rightLegIndex]!
  const topX = (hips[0] + leftUp[0] + rightUp[0]) / 3
  const topY = (hips[1] + leftUp[1] + rightUp[1]) / 3
  const topZ = (hips[2] + leftUp[2] + rightUp[2]) / 3
  const bottomX = (leftLeg[0] + rightLeg[0]) * 0.5
  const bottomY = (leftLeg[1] + rightLeg[1]) * 0.5
  const bottomZ = (leftLeg[2] + rightLeg[2]) * 0.5
  const sideX = turn.cos
  const sideZ = -turn.sin
  const forwardX = turn.sin
  const forwardZ = turn.cos
  const topWidth = 0.09
  const bottomWidth = 0.15
  const topDepth = 0.11
  const bottomDepth = 0.14
  setPoint(skirtA, topX - sideX * topWidth - forwardX * topDepth, topY, topZ - sideZ * topWidth - forwardZ * topDepth)
  setPoint(skirtB, topX + sideX * topWidth - forwardX * topDepth, topY, topZ + sideZ * topWidth - forwardZ * topDepth)
  setPoint(skirtC, topX + sideX * topWidth + forwardX * topDepth, topY, topZ + sideZ * topWidth + forwardZ * topDepth)
  setPoint(skirtD, topX - sideX * topWidth + forwardX * topDepth, topY, topZ - sideZ * topWidth + forwardZ * topDepth)
  setPoint(skirtE, bottomX - sideX * bottomWidth - forwardX * bottomDepth, bottomY,
    bottomZ - sideZ * bottomWidth - forwardZ * bottomDepth)
  setPoint(skirtF, bottomX + sideX * bottomWidth - forwardX * bottomDepth, bottomY,
    bottomZ + sideZ * bottomWidth - forwardZ * bottomDepth)
  setPoint(skirtG, bottomX + sideX * bottomWidth + forwardX * bottomDepth, bottomY,
    bottomZ + sideZ * bottomWidth + forwardZ * bottomDepth)
  setPoint(skirtH, bottomX - sideX * bottomWidth + forwardX * bottomDepth, bottomY,
    bottomZ - sideZ * bottomWidth + forwardZ * bottomDepth)

  addCharacterQuad(target, skirtA, skirtB, skirtF, skirtE, style.pants, 0.02, localReflection, light)
  addCharacterQuad(target, skirtB, skirtC, skirtG, skirtF, style.pantsLight, 0.02, localReflection, light)
  addCharacterQuad(target, skirtC, skirtD, skirtH, skirtG, style.pantsDim, 0.02, localReflection, light)
  addCharacterQuad(target, skirtD, skirtA, skirtE, skirtH, style.pantsLight, 0.02, localReflection, light)
  addCharacterQuad(target, skirtE, skirtF, skirtG, skirtH, style.pantsDark, 0.02, localReflection, light)
}

function setPoint(target: Vec3, x: number, y: number, z: number) {
  target[0] = x
  target[1] = y
  target[2] = z
}

function addCharacterHair(
  target: VertexWriter,
  pose: Vec3[],
  mesh: HairMesh,
  color: Vec3,
  light: CharacterLight,
) {
  const basis = characterHairBasis(pose)
  const head = pose[headIndex]!
  const triangles = mesh.localTriangles
  const centers = mesh.localTriangleCenters
  const normals = mesh.localTriangleNormals
  const centerX = head[0] - basis.up[0] * 0.035
  const centerY = head[1] - basis.up[1] * 0.035
  const centerZ = head[2] - basis.up[2] * 0.035
  const sideX = basis.side[0]
  const sideY = basis.side[1]
  const sideZ = basis.side[2]
  const upX = basis.up[0]
  const upY = basis.up[1]
  const upZ = basis.up[2]
  const forwardX = basis.forward[0]
  const forwardY = basis.forward[1]
  const forwardZ = basis.forward[2]

  reserveFloats(target, triangles.length / 3 * 11)
  for (let i = 0, normalIndex = 0; i < triangles.length; i += 9, normalIndex += 3) {
    const a0 = triangles[i]!
    const a1 = triangles[i + 1]!
    const a2 = triangles[i + 2]!
    const b0 = triangles[i + 3]!
    const b1 = triangles[i + 4]!
    const b2 = triangles[i + 5]!
    const c0 = triangles[i + 6]!
    const c1 = triangles[i + 7]!
    const c2 = triangles[i + 8]!
    const center0 = centers[normalIndex]!
    const center1 = centers[normalIndex + 1]!
    const center2 = centers[normalIndex + 2]!
    const normal0 = normals[normalIndex]!
    const normal1 = normals[normalIndex + 1]!
    const normal2 = normals[normalIndex + 2]!
    const ax = centerX + sideX * a0 + upX * a1 + forwardX * a2
    const ay = centerY + sideY * a0 + upY * a1 + forwardY * a2
    const az = centerZ + sideZ * a0 + upZ * a1 + forwardZ * a2
    const bx = centerX + sideX * b0 + upX * b1 + forwardX * b2
    const by = centerY + sideY * b0 + upY * b1 + forwardY * b2
    const bz = centerZ + sideZ * b0 + upZ * b1 + forwardZ * b2
    const cx = centerX + sideX * c0 + upX * c1 + forwardX * c2
    const cy = centerY + sideY * c0 + upY * c1 + forwardY * c2
    const cz = centerZ + sideZ * c0 + upZ * c1 + forwardZ * c2

    hairLightPoint[0] = centerX + sideX * center0 + upX * center1 + forwardX * center2
    hairLightPoint[1] = centerY + sideY * center0 + upY * center1 + forwardY * center2
    hairLightPoint[2] = centerZ + sideZ * center0 + upZ * center1 + forwardZ * center2
    hairLightNormal[0] = sideX * normal0 + upX * normal1 + forwardX * normal2
    hairLightNormal[1] = sideY * normal0 + upY * normal1 + forwardY * normal2
    hairLightNormal[2] = sideZ * normal0 + upZ * normal1 + forwardZ * normal2

    const shade = light(color, hairLightPoint, hairLightNormal, hairShade)

    addReservedFlatTriangle(target, ax, ay, az, bx, by, bz, cx, cy, cz, shade, 0)
  }
}

export function characterHeadBasisInto(pose: Vec3[], target: CharacterHeadBasis) {
  const head = pose[headIndex]!
  const top = pose[headTopIndex]!
  const leftArm = pose[leftArmIndex]!
  const rightArm = pose[rightArmIndex]!
  const upX = top[0] - head[0]
  const upY = top[1] - head[1]
  const upZ = top[2] - head[2]
  const upLength = Math.sqrt(upX * upX + upY * upY + upZ * upZ)

  target.up[0] = upX / upLength
  target.up[1] = upY / upLength
  target.up[2] = upZ / upLength

  const sideX = leftArm[0] - rightArm[0]
  const sideY = leftArm[1] - rightArm[1]
  const sideZ = leftArm[2] - rightArm[2]
  const sideDotUp = sideX * target.up[0] + sideY * target.up[1] + sideZ * target.up[2]

  target.side[0] = sideX - target.up[0] * sideDotUp
  target.side[1] = sideY - target.up[1] * sideDotUp
  target.side[2] = sideZ - target.up[2] * sideDotUp

  const sideLength = Math.sqrt(target.side[0] * target.side[0] + target.side[1] * target.side[1]
    + target.side[2] * target.side[2])

  target.side[0] /= sideLength
  target.side[1] /= sideLength
  target.side[2] /= sideLength
  target.forward[0] = target.side[1] * target.up[2] - target.side[2] * target.up[1]
  target.forward[1] = target.side[2] * target.up[0] - target.side[0] * target.up[2]
  target.forward[2] = target.side[0] * target.up[1] - target.side[1] * target.up[0]

  return target
}

function characterHairBasis(pose: Vec3[]) {
  return characterHeadBasisInto(pose, hairBasis)
}

function playerHair(hairMeshes: HairMesh[], index: number) {
  if (index === 0 || hairMeshes.length === 0) {
    return undefined
  }

  return hairMeshes[normalizeIndex(index - 1, hairMeshes.length)]!
}
