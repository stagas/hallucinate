import type { Bounds, CircleBounds, Vec3, VideoZone } from './types.ts'

import { characterFloor } from './character-data.ts'

export type TShirtStand = Bounds & { height: number; turn: number }
export type StageDuck = Bounds & { height: number; kind: 'duck'; platformHeight: number; turn: number }
export type StageRock = Bounds & { height: number; kind: 'rock'; meshIndex: number; turn: number }
export type StageProp = StageDuck | StageRock
export type Couch = Bounds & { color: Vec3; face: 'east' | 'north' | 'south' | 'west' }

export const djBooth: Bounds = { x: 0, z: -21.55, width: 3.6, depth: 1.24 }
export const djSpeakers: Bounds[] = [
  { x: -4.16, z: -21.63, width: 0.71, depth: 0.79 },
  { x: 4.16, z: -21.63, width: 0.71, depth: 0.79 },
]
export const bartenderBar: Bounds = { x: 2.25, z: 2.42, width: 5.2, depth: 0.7 }
export const bartenderDrinkWall = {
  x: bartenderBar.x,
  y: characterFloor + 1.55,
  z: 3.7,
  width: bartenderBar.width * 0.84,
  height: 0.84,
  normal: [0, 0, -1] as Vec3,
}
export const bartenderStools: Bounds[] = [-2.05, -1.15, -0.25, 0.65, 1.55, 2.25].map(offset => ({
  x: bartenderBar.x + offset,
  z: bartenderBar.z - 1.15,
  width: 0.34,
  depth: 0.34,
}))
export const outsideDjBooth: Bounds = { x: 0, z: 29, width: 3.6, depth: 1.24 }
export const outsideStage: Bounds = { x: outsideDjBooth.x, z: outsideDjBooth.z + 2.15, width: 8.6, depth: 1.55 }
export const outsideTreeStart: CircleBounds = { x: 0, z: 20.5, radius: 0.75 }
export const outsideDjSpeakers: Bounds[] = [
  { x: -4.16, z: 29.08, width: 0.71, depth: 0.79 },
  { x: 4.16, z: 29.08, width: 0.71, depth: 0.79 },
]
const outsideStageRockWidth = 1.48
const outsideStageRockDepth = 1.32
const outsideStageRockZ = outsideDjBooth.z - outsideDjBooth.depth / 2 - outsideStageRockDepth / 2 + 0.28
const outsideStageSpeakerRocks: StageRock[] = outsideDjSpeakers.map((speaker, index) => {
  const side = Math.sign(speaker.x)
  return {
    x: speaker.x + side * 1.45 + (side > 0 ? 2.5 : 0),
    z: (outsideStageRockZ + outsideTreeStart.z) * 0.45,
    width: outsideStageRockWidth,
    depth: outsideStageRockDepth,
    height: index === 0 ? 1.15 : 1,
    kind: 'rock',
    meshIndex: index === 0 ? 1 : 2,
    turn: side * 0.42,
  }
})
export const outsideStageDuck: StageDuck = {
  x: outsideStageSpeakerRocks[0]!.x - 2.2,
  z: outsideStageSpeakerRocks[0]!.z - 0.85,
  width: outsideStageRockWidth,
  depth: outsideStageRockDepth,
  height: 2.16,
  kind: 'duck',
  platformHeight: 1.08,
  turn: -0.42,
}
export const outsideStageProps: StageProp[] = [outsideStageDuck, ...outsideStageSpeakerRocks]
export const outsideBuddha: CircleBounds = { x: 11.5, z: 27.9, radius: 1.05 }
export const outsidePalmTree: CircleBounds = { x: -11, z: 29.15, radius: 0.45 }
export const outsideTreeSwing = {
  angle: -Math.PI * 105 / 180,
  distance: 1.62,
  facing: Math.PI / 2,
  anchorHeight: 3.45,
  seatHeight: 0.46,
  sittingHeightOffset: -0.265,
  ropeSpacing: 0.62,
  ropeThickness: 0.032,
  seatWidth: 0.86,
  seatDepth: 0.34,
  seatThickness: 0.08,
  swingMaxAngle: Math.PI * 62 / 180,
  swingDamping: 0.10,
  swingEmptyDamping: 0.72,
  swingControlDeadZone: 0.018,
  swingControlForce: 1.45,
  swingNpcControl: 0.07,
  swingNpcMaxAngle: Math.PI * 7 / 180,
  swingSeconds: 2.75,
}
export const outsideHut: Bounds = { x: -18, z: 20.5, width: 6.2, depth: 5 }
export const outsideHutDeckHeight = 0.32
export const outsideHutRoofEave = 0.48
export const outsideHutRoofBottom = characterFloor + outsideHutDeckHeight + 2.53
export const outsideHutRoofRidge = characterFloor + outsideHutDeckHeight + 3.8
export const outsideHutBar: Bounds = {
  x: outsideHut.x - outsideHut.width / 2 + 1.75,
  z: outsideHut.z,
  width: 0.72,
  depth: outsideHut.depth - 1.25,
}
export const outsideHutDrinkWall = {
  x: outsideHut.x - outsideHut.width / 2 + 0.26,
  y: characterFloor + outsideHutDeckHeight + 1.55,
  z: outsideHutBar.z,
  width: outsideHutBar.depth * 0.84,
  height: 0.84,
  normal: [1, 0, 0] as Vec3,
}
export const outsideHutBarStools: Bounds[] = [-1.35, 0, 1.35].map(offset => ({
  x: outsideHutBar.x + 0.95,
  z: outsideHutBar.z + offset,
  width: 0.36,
  depth: 0.36,
}))
export const outsideCouches: Couch[] = [
  { x: 11.5, z: 9.2, width: 2.4, depth: 0.82, color: [0.5, 0.05, 0.16], face: 'north' },
  { x: 13.35, z: 11.1, width: 0.82, depth: 2.35, color: [0.05, 0.28, 0.5], face: 'west' },
  { x: 13.35, z: 13.65, width: 0.82, depth: 2.05, color: [0.42, 0.28, 0.04], face: 'west' },
  { x: -11.8, z: 8.7, width: 2.55, depth: 0.82, color: [0.1, 0.36, 0.18], face: 'north' },
  { x: -13.75, z: 10.55, width: 0.82, depth: 2.15, color: [0.42, 0.09, 0.46], face: 'east' },
  { x: -12.55, z: 31.55, width: 2.35, depth: 0.82, color: [0.06, 0.36, 0.42], face: 'south' },
  { x: -14.55, z: 29.45, width: 0.82, depth: 2.35, color: [0.46, 0.11, 0.38], face: 'east' },
  { x: -9.25, z: 31.55, width: 2.1, depth: 0.82, color: [0.5, 0.11, 0.32], face: 'south' },
  { x: -8.45, z: 27.35, width: 2.2, depth: 0.82, color: [0.08, 0.42, 0.48], face: 'north' },
  { x: -6.95, z: 29.45, width: 0.82, depth: 2.1, color: [0.5, 0.32, 0.08], face: 'west' },
  { x: 16.1, z: 16.3, width: 2.15, depth: 0.82, color: [0.06, 0.38, 0.42], face: 'north' },
  { x: 17.7, z: 18.05, width: 0.82, depth: 2, color: [0.5, 0.18, 0.05], face: 'west' },
]
export const outsideToilets: Bounds = { x: -21.2, z: -8.8, width: 5.2, depth: 4.1 }
export const outsideToiletDoor = {
  side: 'east',
  x: outsideToilets.x + outsideToilets.width / 2,
  z: outsideToilets.z - 0.95,
  width: 1.35,
  height: 2.2,
} as const
export const djVideoWall = { x: 0, y: .25, z: -23.96, width: 5.5, height: 3.0625, normal: [0, 0, 1] as Vec3 }
export const outsideVideoWall = { x: 0, y: .25, z: 31.41, width: 5.5, height: 3.0625, normal: [0, 0, -1] as Vec3 }
export const outsideVideoScreenWall = { ...outsideVideoWall, z: outsideVideoWall.z - 0.5 }
export const outsidePhotoWall = { x: -21.48, y: 0.45, z: 5.85, width: 7.2, height: 4.2, normal: [1, 0, 0] as Vec3 }
export const outsideScheduleWall = { x: -21.48, y: 0.65, z: 13.85, width: 7.2, height: 3.35, normal: [1, 0, 0] as Vec3 }
export const tent = {
  x: 25,
  z: 25,
  radius: 4.4,
  wallHeight: 2.6,
  height: 6.8,
  doorWidth: 1.65,
  doorHeight: 2.55,
}
export const tentDoorAngle = -Math.PI / 2
export const tentVideoAngle = Math.PI / 2
export const tentDoor = {
  x: tent.x + Math.sin(tentDoorAngle) * tent.radius,
  z: tent.z + Math.cos(tentDoorAngle) * tent.radius,
  width: tent.doorWidth,
  height: tent.doorHeight,
}
export const outsideLakeShore: Vec3[] = smoothShore([25.1, characterFloor + 0.018, -7.4], 11.4, 15.8, 72)
export const outsideLakeSandInnerShore: Vec3[] = insetShore(outsideLakeShore,
  angle => 0.19 + Math.sin(angle * 3 + 0.4) * 0.035 + Math.sin(angle * 7 - 1.2) * 0.02)
export const outsideLakeWaterShore: Vec3[] = insetShore(outsideLakeSandInnerShore,
  angle => 0.09 + Math.sin(angle * 5 + 1.8) * 0.018)
export const outsideLakeIslandShore: Vec3[] = smoothShore([25.6, characterFloor + 0.032, -7.8], 2.05, 2.75, 40)
export const outsideLakePalmTree: CircleBounds = { x: 25.35, z: -7.95, radius: 0.38 }
export const tentVideoWall = {
  x: tent.x + Math.sin(tentVideoAngle) * (tent.radius - 0.22),
  y: 0,
  z: tent.z + Math.cos(tentVideoAngle) * (tent.radius - 0.22),
  width: 3.6,
  height: 2.025,
  normal: [-1, 0, 0] as Vec3,
}

function smoothShore(center: Vec3, radiusX: number, radiusZ: number, points: number) {
  return Array.from({ length: points }, (_, index): Vec3 => {
    const angle = Math.PI * 2 * index / points
    const wave = 1
      + Math.sin(angle * 2 + 0.7) * 0.12
      + Math.sin(angle * 3 - 1.1) * 0.08
      + Math.sin(angle * 5 + 2.3) * 0.045
    const inlet = 1 - Math.max(0, Math.cos(angle - Math.PI * 0.34)) * 0.18

    return [
      center[0] + Math.cos(angle) * radiusX * wave * inlet,
      center[1],
      center[2] + Math.sin(angle) * radiusZ * wave,
    ]
  })
}

function insetShore(points: Vec3[], insetAt: (angle: number) => number) {
  const center = shoreCenter(points)

  return points.map((point, index): Vec3 => {
    const angle = Math.PI * 2 * index / points.length
    const inset = insetAt(angle)

    return [
      point[0] + (center[0] - point[0]) * inset,
      point[1],
      point[2] + (center[2] - point[2]) * inset,
    ]
  })
}

function shoreCenter(points: Vec3[]) {
  const center: Vec3 = [0, 0, 0]

  for (const point of points) {
    center[0] += point[0]
    center[1] += point[1]
    center[2] += point[2]
  }

  center[0] /= points.length
  center[1] /= points.length
  center[2] /= points.length

  return center
}

export const loftBounds = { left: -12, right: 12, back: -12, front: 12 }
export const loftDoor = { x: 5.8, width: 2.05, height: 2.8 }
export const loftVideoWall = { x: 0, y: 0.35, z: loftBounds.back + 0.04, width: 5.8, height: 3.25,
  normal: [0, 0, 1] as Vec3 }
export const loftDjBooth: Bounds = { x: 0, z: loftBounds.back + 2.55, width: 3.6, depth: 1.24 }
export const loftDjSpeakers: Bounds[] = [
  { x: -4.16, z: loftBounds.back + 2.47, width: 0.71, depth: 0.79 },
  { x: 4.16, z: loftBounds.back + 2.47, width: 0.71, depth: 0.79 },
]
export const loftCouches: Couch[] = [
  { x: -7.9, z: -1.2, width: 0.88, depth: 3.1, color: [0.48, 0.4, 0.3], face: 'east' },
  { x: -7.9, z: 2.5, width: 0.88, depth: 3.1, color: [0.48, 0.4, 0.3], face: 'east' },
  { x: 7.9, z: -1.2, width: 0.88, depth: 3.1, color: [0.48, 0.4, 0.3], face: 'west' },
  { x: 7.9, z: 2.5, width: 0.88, depth: 3.1, color: [0.48, 0.4, 0.3], face: 'west' },
]
export const loftTables: Bounds[] = [
  { x: -6.15, z: -1.2, width: 0.82, depth: 2.05 },
  { x: -6.15, z: 2.5, width: 0.82, depth: 2.05 },
  { x: 6.15, z: -1.2, width: 0.82, depth: 2.05 },
  { x: 6.15, z: 2.5, width: 0.82, depth: 2.05 },
]
export const loftPlants: CircleBounds[] = [
  { x: -10.25, z: loftBounds.back + 1.05, radius: 0.48 },
  { x: 10.25, z: loftBounds.back + 1.05, radius: 0.48 },
]
export const loftCornerFigures: CircleBounds[] = [
  { x: -10.1, z: loftBounds.front - 1.15, radius: 0.42 },
  { x: 10.1, z: loftBounds.front - 1.15, radius: 0.42 },
]
export const tentDjBooth: Bounds = { x: tent.x + tent.radius - 1.3, z: tent.z, width: 1.08, depth: 3.1 }
export const tentDjSpeakers: Bounds[] = [
  { x: tentDjBooth.x + 0.08, z: tent.z - 2.35, width: 0.68, depth: 0.58 },
  { x: tentDjBooth.x + 0.08, z: tent.z + 2.35, width: 0.68, depth: 0.58 },
]
export const tentPole: CircleBounds = { x: tent.x, z: tent.z, radius: 0.13 }
export const tentCenterBench = { x: tent.x, z: tent.z, innerRadius: 0.34, outerRadius: 0.9 }
export const videoTracks: Record<VideoZone, string> = {
  inside: '0oB97YhEukw',
  loft: '0oB97YhEukw',
  outside: 'rO6gtwvM764', // 'CU0wjRIL1AQ', // 'IIbcGjZy6OM', //  'AJ7lbqyLbX8', // 'HIn1BxT38mE', // '0oB97YhEukw', // 'mqz9HpVNSAQ', // '5lthiQoQiRA', // 'ZEaqqk8V1bY', // 'CU0wjRIL1AQ', // '5aqWdYBG_js', //  'mqz9HpVNSAQ', // 'JviNPyhY6U4', // 'DK5XBwLiWZY', // 'IIbcGjZy6OM', // '5lthiQoQiRA', 'CsGauHXioos', // 'HIn1BxT38mE', // , //
  tent: 'fz6nN5AtcYk',
  upstairs: '0oB97YhEukw',
}
export const videoStartTimes: Record<VideoZone, number> = {
  inside: 0,
  loft: 0,
  outside: 0,
  tent: 0,
  upstairs: 0,
}
export const videoPlaylists: Partial<Record<VideoZone, string>> = {
  inside: 'PLdfk8NH4EncB_75qaHdSR96vP8L7Lowpv',
  outside: 'PLdfk8NH4EncB_75qaHdSR96vP8L7Lowpv',
  tent: 'PLue4XlmLp3HJwLqVNq9qBC1z5slCHuPSJ',
  upstairs: 'PLdfk8NH4EncB_75qaHdSR96vP8L7Lowpv',
}
export const backDoor = { x: -4.75, z: 4, width: 1.45, height: 2.55 }
export const roomBounds = { left: -7, right: 7, back: -24, front: 4 }
export const outsideRooftop: Bounds & { height: number } = {
  x: (roomBounds.left + roomBounds.right) / 2,
  z: (roomBounds.back + roomBounds.front) / 2,
  width: roomBounds.right - roomBounds.left + 0.18,
  depth: roomBounds.front - roomBounds.back + 0.18,
  height: 7,
}
export const outsideRooftopStairs: Bounds & { height: number; steps: number } = {
  x: roomBounds.left - 1.04,
  z: -10.4,
  width: 1.86,
  depth: 13.2,
  height: outsideRooftop.height,
  steps: 28,
}
export function outsideRooftopStairRiseAtZ(z: number) {
  const back = outsideRooftopStairs.z - outsideRooftopStairs.depth / 2
  const front = outsideRooftopStairs.z + outsideRooftopStairs.depth / 2

  return outsideRooftopStairs.height * ((front - z) / (front - back))
}

const outsideRooftopLandingDepth = 1.9
const outsideRooftopLandingWidth = outsideRooftopStairs.width + 0.38
const outsideRooftopLandingOffset = -1.45

export const outsideRooftopLanding: Bounds & { height: number } = {
  x: outsideRooftopStairs.x,
  z: outsideRooftopStairs.z - outsideRooftopStairs.depth / 2 + outsideRooftopLandingDepth / 2
    + outsideRooftopLandingOffset,
  width: outsideRooftopLandingWidth,
  depth: outsideRooftopLandingDepth,
  height: outsideRooftop.height,
}
export const upstairsWallHeight = 4.25
export const upstairsRoofThickness = 0.08
export const upstairsRoofHeight = characterFloor + outsideRooftop.height + upstairsWallHeight + upstairsRoofThickness
export const upstairsDoor = {
  x: roomBounds.left,
  z: outsideRooftopStairs.z - outsideRooftopStairs.depth / 2,
  width: 2.4,
  height: 2.5,
}
export const upstairsDjBooth: Bounds = { x: 0, z: roomBounds.front - 1.8, width: 3.6, depth: 1.24 }
export const upstairsDjSpeakers: Bounds[] = [
  { x: -4.16, z: upstairsDjBooth.z + 0.08, width: 0.71, depth: 0.79 },
  { x: 4.16, z: upstairsDjBooth.z + 0.08, width: 0.71, depth: 0.79 },
]
export const upstairsVideoWall = {
  x: upstairsDjBooth.x,
  y: characterFloor + outsideRooftop.height + 2.05,
  z: roomBounds.front - 0.04,
  width: 5.5,
  height: 3.0625,
  normal: [0, 0, -1] as Vec3,
}
export const upstairsBar: Bounds = { x: 0, z: -12.2, width: 5.8, depth: 4.4 }
export const upstairsBarCounterRail = 0.64
export const upstairsBarDrinkCounter: Bounds = { x: upstairsBar.x, z: upstairsBar.z, width: 2.35, depth: 1.05 }
export const upstairsBarDrinkWall = {
  x: upstairsBarDrinkCounter.x,
  y: characterFloor + outsideRooftop.height + 1.38,
  z: upstairsBarDrinkCounter.z,
  width: upstairsBarDrinkCounter.width * 0.92,
  height: 0.76,
  normal: [0, 0, -1] as Vec3,
}
export const upstairsBarStools: Bounds[] = [
  -2.05,
  -1.02,
  0,
  1.02,
  2.05,
].flatMap(offset => [
  { x: upstairsBar.x + offset, z: upstairsBar.z - upstairsBar.depth / 2 - 0.62, width: 0.36, depth: 0.36 },
  { x: upstairsBar.x + offset, z: upstairsBar.z + upstairsBar.depth / 2 + 0.62, width: 0.36, depth: 0.36 },
]).concat([
  { x: upstairsBar.x - upstairsBar.width / 2 - 0.62, z: upstairsBar.z - 1.25, width: 0.36, depth: 0.36 },
  { x: upstairsBar.x - upstairsBar.width / 2 - 0.62, z: upstairsBar.z, width: 0.36, depth: 0.36 },
  { x: upstairsBar.x - upstairsBar.width / 2 - 0.62, z: upstairsBar.z + 1.25, width: 0.36, depth: 0.36 },
  { x: upstairsBar.x + upstairsBar.width / 2 + 0.62, z: upstairsBar.z - 1.25, width: 0.36, depth: 0.36 },
  { x: upstairsBar.x + upstairsBar.width / 2 + 0.62, z: upstairsBar.z, width: 0.36, depth: 0.36 },
  { x: upstairsBar.x + upstairsBar.width / 2 + 0.62, z: upstairsBar.z + 1.25, width: 0.36, depth: 0.36 },
])
export const upstairsCouches: Couch[] = [
  { x: -4.5, z: roomBounds.back + 1.08, width: 3.05, depth: 0.82, color: [0.04, 0.42, 0.58], face: 'north' },
  { x: 0, z: roomBounds.back + 1.08, width: 3.05, depth: 0.82, color: [0.48, 0.06, 0.46], face: 'north' },
  { x: 4.5, z: roomBounds.back + 1.08, width: 3.05, depth: 0.82, color: [0.56, 0.34, 0.05], face: 'north' },
  { x: roomBounds.left + 0.72, z: -20.75, width: 0.82, depth: 2.7, color: [0.55, 0.22, 0.08], face: 'east' },
  { x: roomBounds.left + 0.72, z: -12.4, width: 0.82, depth: 3.0, color: [0.08, 0.5, 0.28], face: 'east' },
  { x: roomBounds.left + 0.72, z: -8.85, width: 0.82, depth: 2.65, color: [0.06, 0.36, 0.58], face: 'east' },
  { x: roomBounds.left + 0.72, z: -5.35, width: 0.82, depth: 2.9, color: [0.62, 0.08, 0.22], face: 'east' },
  { x: roomBounds.right - 0.72, z: -18.1, width: 0.82, depth: 3.15, color: [0.1, 0.34, 0.62], face: 'west' },
  { x: roomBounds.right - 0.72, z: -14.55, width: 0.82, depth: 2.65, color: [0.08, 0.5, 0.28], face: 'west' },
  { x: roomBounds.right - 0.72, z: -11.05, width: 0.82, depth: 3.05, color: [0.5, 0.12, 0.55], face: 'west' },
  { x: roomBounds.right - 0.72, z: -7.55, width: 0.82, depth: 2.65, color: [0.04, 0.42, 0.58], face: 'west' },
  { x: roomBounds.right - 0.72, z: -4.2, width: 0.82, depth: 2.55, color: [0.55, 0.38, 0.08], face: 'west' },
]
export const insideSideLightZs = [-2, -6, -10, -14, -18, -22] as const
const arcadeCabinetSize = { width: 0.88, depth: 0.86, height: 2.2 } as const
export const insideArcade: Bounds & { height: number; turn: number } = {
  x: roomBounds.right - arcadeCabinetSize.depth / 2 - 0.08,
  z: (insideSideLightZs[0] + insideSideLightZs[1]) * 0.5,
  ...arcadeCabinetSize,
  turn: -Math.PI / 2,
}
export const insideArcadeScreenWall = {
  x: insideArcade.x - insideArcade.depth / 2 - 0.035,
  y: characterFloor + insideArcade.height * 0.66,
  z: insideArcade.z,
  width: insideArcade.width * 0.62,
  height: insideArcade.height * 0.25,
  normal: [-1, 0, 0] as Vec3,
}
const foodTruckDistanceFromTent = tent.radius + 8.4
const foodTruckToClubX = ((roomBounds.left + roomBounds.right) * 0.5) - tent.x
const foodTruckToClubZ = ((roomBounds.back + roomBounds.front) * 0.5) - tent.z
const foodTruckToClubLength = Math.hypot(foodTruckToClubX, foodTruckToClubZ)
export const outsideFoodTruck: CircleBounds = {
  x: tent.x + foodTruckToClubX / foodTruckToClubLength * foodTruckDistanceFromTent + 4.2,
  z: tent.z + foodTruckToClubZ / foodTruckToClubLength * foodTruckDistanceFromTent - 2.8,
  radius: 1.8,
}
export const outsideFoodTruckSize = { width: 2.46, depth: 5.5, height: 2.4 }
export const outsideFoodTruckTurn = Math.atan2(outsideFoodTruck.z - tent.z + 8, outsideFoodTruck.x - tent.x)
  - Math.PI / 2
const foodTruckRight: Vec3 = [Math.cos(outsideFoodTruckTurn), 0, Math.sin(outsideFoodTruckTurn)]
const foodTruckForward: Vec3 = [-Math.sin(outsideFoodTruckTurn), 0, Math.cos(outsideFoodTruckTurn)]
const foodTruckToStage: Vec3 = [outsideStage.x - outsideFoodTruck.x, 0, outsideStage.z - outsideFoodTruck.z]
const foodTruckStageSide = foodTruckRight[0] * foodTruckToStage[0] + foodTruckRight[2] * foodTruckToStage[2] > 0
  ? 1
  : -1
export const outsideFoodTruckFoodWall = {
  x: outsideFoodTruck.x + foodTruckRight[0] * outsideFoodTruckSize.width / 2 * foodTruckStageSide,
  y: characterFloor + outsideFoodTruckSize.height * 0.62,
  z: outsideFoodTruck.z + foodTruckRight[2] * outsideFoodTruckSize.width / 2 * foodTruckStageSide,
  width: outsideFoodTruckSize.depth * 0.62,
  height: outsideFoodTruckSize.height * 0.46,
  normal: [
    foodTruckRight[0] * foodTruckStageSide,
    0,
    foodTruckRight[2] * foodTruckStageSide,
  ] as Vec3,
  tangent: foodTruckForward,
}
const tShirtStandSize = { width: 3.2, depth: 0.9, height: 1.68 } as const
const foodTruckBack: Vec3 = [-foodTruckForward[0], 0, -foodTruckForward[2]]
const foodTruckTShirtStandTurn = Math.atan2(foodTruckBack[2], foodTruckBack[0]) + foodTruckStageSide * Math.PI / 4
const foodTruckTShirtStandAxis: Vec3 = [
  Math.cos(foodTruckTShirtStandTurn),
  0,
  Math.sin(foodTruckTShirtStandTurn),
]
const foodTruckTShirtStandPoleDistance = outsideFoodTruckSize.depth / 2 + 0.36
const foodTruckTShirtStandPole: Vec3 = [
  outsideFoodTruck.x + foodTruckBack[0] * foodTruckTShirtStandPoleDistance,
  0,
  outsideFoodTruck.z + foodTruckBack[2] * foodTruckTShirtStandPoleDistance,
]
export const outsideTShirtStands: TShirtStand[] = [
  {
    x: outsidePhotoWall.x + 1.76,
    z: outsidePhotoWall.z - outsidePhotoWall.width / 2 - 0.36,
    ...tShirtStandSize,
    turn: 0,
  },
  {
    x: foodTruckTShirtStandPole[0] + foodTruckTShirtStandAxis[0] * tShirtStandSize.width / 2,
    z: foodTruckTShirtStandPole[2] + foodTruckTShirtStandAxis[2] * tShirtStandSize.width / 2,
    ...tShirtStandSize,
    turn: foodTruckTShirtStandTurn,
  },
]
export const outsideBounds = { left: -24, right: 40, back: -32, front: 38 }
export const landscapeBounds = { left: -72, right: 72, back: -84, front: 88 }
