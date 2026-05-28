import { characterGroundJoints, characterScale, shoe } from './character-data.ts'
import {
  addCharacterBox,
  addCharacterQuad,
  addFlatTriangle,
  reserveFloats,
  resetVertexWriter,
  vertexWriterData,
} from './character-geometry.ts'
import type { VertexWriter } from './character-geometry.ts'
import { characterParts, characterPoseJoints, characterPoseJointSet } from './character-parts.ts'
import { sampleBasePose, sampleCharacterPose } from './character-rig.ts'
import { resolvePlayerStyle } from './character-style.ts'
import { characterView, characterVisibility } from './character-visibility.ts'
import { normalizeIndex } from './math.ts'
import type {
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
  mode?: CharacterMode
  idleClipIndex: number
  style: PlayerStyle
  resolvedStyle?: ResolvedPlayerStyle
}

type BuildOptions = {
  cameraPosition: Vec3
  cameraTarget: Vec3
  character: CharacterInput
  hairMeshes: HairMesh[]
  light: (color: Vec3, point: Vec3, normal: Vec3) => Vec3
  players: Player[]
  rig: CharacterRig
  time: number
  drawCache?: CharacterDrawCache
  vertexWriter?: VertexWriter
  width: number
  height: number
}

type TurnBasis = {
  cos: number
  sin: number
}

export type CharacterDrawCache = {
  basePose?: SampledPose
  basePoses: Map<number, SampledPose>
  boxInstances: VertexWriter
  hairInstances: VertexWriter
  npcBlendCache: PoseBlendCache
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
const leftUpLegIndex = poseJointIndices.get('mixamorig:LeftUpLeg')!
const rightUpLegIndex = poseJointIndices.get('mixamorig:RightUpLeg')!
const leftLegIndex = poseJointIndices.get('mixamorig:LeftLeg')!
const rightLegIndex = poseJointIndices.get('mixamorig:RightLeg')!
const headIndex = poseJointIndices.get('mixamorig:Head')!
const headTopIndex = poseJointIndices.get('mixamorig:HeadTop_End')!
const characterPartPlans = characterParts.map(part => ({
  part,
  fromIndex: poseJointIndices.get(part.from)!,
  toIndex: poseJointIndices.get(part.to)!,
}))
const hairLightPoint: Vec3 = [0, 0, 0]
const hairLightNormal: Vec3 = [0, 1, 0]
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
const farHairDistanceSq = 34 * 34

export function buildCharacterDrawData(options: BuildOptions) {
  const cache = options.drawCache
  const vertices = cache?.vertices ?? options.vertexWriter ?? { data: new Float32Array(0), length: 0 }
  const boxInstances = cache?.boxInstances ?? { data: new Float32Array(0), length: 0 }
  const hairInstances = cache?.hairInstances ?? { data: new Float32Array(0), length: 0 }
  const npcBlendCache = cache?.npcBlendCache ?? new Map()
  const poses = cache?.poses ?? []
  const basePoses = cache?.basePoses ?? new Map()
  const usedBasePoseKeys = cache?.usedBasePoseKeys ?? new Set<number>()
  const usedNpcBlendKeys = cache?.usedNpcBlendKeys ?? new Set<number>()
  const basePose = sampleBasePose(options.rig, options.time, characterPoseJoints, characterPoseJointSet,
    options.character.idleClipIndex, cache?.basePose)

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
    poses[poseIndex] ??= [])
  poseIndex++

  const view = characterView(options.cameraPosition, options.cameraTarget)

  for (const player of options.players) {
    const visibility = characterVisibility(player, view, options.width, options.height)

    if (visibility.visible) {
      const sampledTime = bodySampleTime(options.time, visibility.distanceSq)
      const sampleKey = player.idleClipIndex * 1000000 + Math.round(sampledTime * 60)
      const blendKey = sampleKey * 100 + Math.round(player.motionBlend * 60)
      usedBasePoseKeys.add(sampleKey)
      usedNpcBlendKeys.add(blendKey)
      const sampledBasePose = basePoses.get(sampleKey)
        ?? sampleAndCacheBasePose(options.rig, sampledTime, basePoses, sampleKey, player.idleClipIndex)

      addRenderedCharacter(vertices, boxInstances, hairInstances, player, options, false, sampledBasePose,
        npcBlendCache, poses[poseIndex] ??= [], sampledTime, sampleKey, visibility.distanceSq <= farHairDistanceSq)
      poseIndex++
    }
  }

  for (const key of basePoses.keys()) {
    if (!usedBasePoseKeys.has(key)) {
      basePoses.delete(key)
    }
  }
  for (const key of npcBlendCache.keys()) {
    if (!usedNpcBlendKeys.has(key)) {
      npcBlendCache.delete(key)
    }
  }

  return {
    vertices: vertexWriterData(vertices),
    boxInstances: vertexWriterData(boxInstances),
    hairInstances: vertexWriterData(hairInstances),
  }
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
) {
  const pose = sampleCharacterPose(options.rig, time, player, characterPoseJoints, characterPoseJointSet,
    groundJointIndices, characterScale, basePose, blendCache, placedPose, cacheFrame)
  const style = player.resolvedStyle ?? resolvePlayerStyle(player.style)
  const localReflection = detailedHair
  const turn: TurnBasis = {
    cos: Math.cos(player.turn),
    sin: Math.sin(player.turn),
  }

  for (const part of characterPartPlans) {
    if (style.bottomMode === 'pants' || !part.part.bottom) {
      addCharacterPart(target, boxInstances, pose, part, player, turn, style, options.light, localReflection)
    }
  }

  if (style.bottomMode === 'skirt') {
    addCharacterSkirt(target, pose, player, turn, style, options.light, localReflection)
  }

  if (style.topMode === 'chest') {
    addCharacterChest(target, boxInstances, pose, player, turn, style.skinColor, options.light, localReflection)
  }

  const hair = playerHair(options.hairMeshes, player.style.hairIndex)

  if (hair && detailedHair) {
    addCharacterHair(target, pose, hair, style.hairColor, options.light)
  }
  else if (hair && renderHair && options.hairMeshes.length > 0) {
    addNpcHairInstance(hairInstances, pose, hair, style.hairColor)
  }
}

function bodySampleTime(time: number, distanceSq: number) {
  const fps = distanceSq > 32 * 32 ? 8 : distanceSq > 20 * 20 ? 15 : distanceSq > 10 * 10 ? 30 : 60

  return Math.round(time * fps) / fps
}

function sampleAndCacheBasePose(
  rig: CharacterRig,
  time: number,
  basePoses: Map<number, SampledPose>,
  key: number,
  idleClipIndex: number,
) {
  const pose = sampleBasePose(rig, time, characterPoseJoints, characterPoseJointSet, idleClipIndex)

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
  light: (color: Vec3, point: Vec3, normal: Vec3) => Vec3,
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
    return style.topMode === 'shirt' || style.topMode === 'sleeveless' ? style.shirtLight : style.skinColor
  }

  if (part.top === 'sleeve') {
    return style.topMode === 'shirt' ? style.shirt : style.skinColor
  }

  if (part.bottom) {
    return style.pants
  }

  if (part.color === shoe) {
    return style.shoe
  }

  return part.color
}

function addCharacterChest(
  target: VertexWriter,
  boxInstances: VertexWriter,
  pose: Vec3[],
  player: { turn: number },
  turn: TurnBasis,
  skinColor: Vec3,
  light: (color: Vec3, point: Vec3, normal: Vec3) => Vec3,
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
    player, turn, skinColor, light, localReflection)
  addCharacterChestSide(target, boxInstances, centerX, centerY, centerZ, sideX, sideZ, forwardX, forwardZ, 0.055,
    player, turn, skinColor, light, localReflection)
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
  skinColor: Vec3,
  light: (color: Vec3, point: Vec3, normal: Vec3) => Vec3,
  localReflection: boolean,
) {
  chestA[0] = centerX + sideX * offset + forwardX * 0.06
  chestA[1] = centerY
  chestA[2] = centerZ + sideZ * offset + forwardZ * 0.06
  chestB[0] = centerX + sideX * offset + forwardX * 0.13
  chestB[1] = centerY
  chestB[2] = centerZ + sideZ * offset + forwardZ * 0.13

  addCharacterBox(target, boxInstances, chestA, chestB, 0.065, 0.06, skinColor, 0.02, player.turn, localReflection, light, 0,
    turn.sin, turn.cos)
}

function addCharacterSkirt(
  target: VertexWriter,
  pose: Vec3[],
  player: { turn: number },
  turn: TurnBasis,
  style: ResolvedPlayerStyle,
  light: (color: Vec3, point: Vec3, normal: Vec3) => Vec3,
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
  light: (color: Vec3, point: Vec3, normal: Vec3) => Vec3,
) {
  const basis = characterHairBasis(pose)
  const head = pose[headIndex]!
  const triangles = mesh.localTriangles
  const centerX = head[0] - basis.up[0] * 0.035
  const centerY = head[1] - basis.up[1] * 0.035
  const centerZ = head[2] - basis.up[2] * 0.035

  for (let i = 0; i < triangles.length; i += 9) {
    const a0 = triangles[i]!
    const a1 = triangles[i + 1]!
    const a2 = triangles[i + 2]!
    const b0 = triangles[i + 3]!
    const b1 = triangles[i + 4]!
    const b2 = triangles[i + 5]!
    const c0 = triangles[i + 6]!
    const c1 = triangles[i + 7]!
    const c2 = triangles[i + 8]!
    const ax = centerX + basis.side[0] * a0 + basis.up[0] * a1 + basis.forward[0] * a2
    const ay = centerY + basis.side[1] * a0 + basis.up[1] * a1 + basis.forward[1] * a2
    const az = centerZ + basis.side[2] * a0 + basis.up[2] * a1 + basis.forward[2] * a2
    const bx = centerX + basis.side[0] * b0 + basis.up[0] * b1 + basis.forward[0] * b2
    const by = centerY + basis.side[1] * b0 + basis.up[1] * b1 + basis.forward[1] * b2
    const bz = centerZ + basis.side[2] * b0 + basis.up[2] * b1 + basis.forward[2] * b2
    const cx = centerX + basis.side[0] * c0 + basis.up[0] * c1 + basis.forward[0] * c2
    const cy = centerY + basis.side[1] * c0 + basis.up[1] * c1 + basis.forward[1] * c2
    const cz = centerZ + basis.side[2] * c0 + basis.up[2] * c1 + basis.forward[2] * c2
    const ux = cx - ax
    const uy = cy - ay
    const uz = cz - az
    const vx = bx - ax
    const vy = by - ay
    const vz = bz - az
    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx
    const area = nx * nx + ny * ny + nz * nz

    if (area > 0.00000001) {
      const length = Math.sqrt(area)
      hairLightPoint[0] = (ax + bx + cx) / 3
      hairLightPoint[1] = (ay + by + cy) / 3
      hairLightPoint[2] = (az + bz + cz) / 3
      hairLightNormal[0] = nx / length
      hairLightNormal[1] = ny / length
      hairLightNormal[2] = nz / length

      const shade = light(color, hairLightPoint, hairLightNormal)

      addFlatTriangle(target, ax, ay, az, bx, by, bz, cx, cy, cz, shade, 0)
    }
  }
}

function characterHairBasis(pose: Vec3[]) {
  const head = pose[headIndex]!
  const top = pose[headTopIndex]!
  const leftArm = pose[leftArmIndex]!
  const rightArm = pose[rightArmIndex]!
  const upX = top[0] - head[0]
  const upY = top[1] - head[1]
  const upZ = top[2] - head[2]
  const upLength = Math.hypot(upX, upY, upZ)

  hairUp[0] = upX / upLength
  hairUp[1] = upY / upLength
  hairUp[2] = upZ / upLength

  const sideX = leftArm[0] - rightArm[0]
  const sideY = leftArm[1] - rightArm[1]
  const sideZ = leftArm[2] - rightArm[2]
  const sideDotUp = sideX * hairUp[0] + sideY * hairUp[1] + sideZ * hairUp[2]

  hairSide[0] = sideX - hairUp[0] * sideDotUp
  hairSide[1] = sideY - hairUp[1] * sideDotUp
  hairSide[2] = sideZ - hairUp[2] * sideDotUp

  const sideLength = Math.hypot(hairSide[0], hairSide[1], hairSide[2])

  hairSide[0] /= sideLength
  hairSide[1] /= sideLength
  hairSide[2] /= sideLength
  hairForward[0] = hairSide[1] * hairUp[2] - hairSide[2] * hairUp[1]
  hairForward[1] = hairSide[2] * hairUp[0] - hairSide[0] * hairUp[2]
  hairForward[2] = hairSide[0] * hairUp[1] - hairSide[1] * hairUp[0]

  return {
    forward: hairForward,
    side: hairSide,
    up: hairUp,
  }
}

function playerHair(hairMeshes: HairMesh[], index: number) {
  if (index === 0 || hairMeshes.length === 0) {
    return undefined
  }

  return hairMeshes[normalizeIndex(index - 1, hairMeshes.length)]!
}
