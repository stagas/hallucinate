import {
  backDoor,
  bartenderBar,
  bartenderStools,
  djBooth,
  djSpeakers,
  insideArcade,
  loftBounds,
  loftCornerFigures,
  loftCouches,
  loftDjBooth,
  loftDjSpeakers,
  loftPlants,
  loftTables,
  outsideBounds,
  outsideBuddha,
  outsideCouches,
  outsideDjBooth,
  outsideDjSpeakers,
  outsideFoodTruck,
  outsideFoodTruckSize,
  outsideFoodTruckTurn,
  outsideHut,
  outsideHutBar,
  outsideHutBarStools,
  outsideHutDeckHeight,
  outsideHutRoofBottom,
  outsideHutRoofEave,
  outsideHutRoofRidge,
  outsidePalmTree,
  outsidePhotoWall,
  outsideRooftop,
  outsideRooftopLanding,
  outsideRooftopStairRiseAtZ,
  outsideRooftopStairs,
  outsideScheduleWall,
  outsideLakeIslandShore,
  outsideLakePalmTree,
  outsideLakeShore,
  outsideLakeWaterShore,
  outsideStage,
  outsideStageProps,
  outsideToiletDoor,
  outsideToilets,
  outsideTShirtStands,
  roomBounds,
  tent,
  tentCenterBench,
  tentDjBooth,
  tentDjSpeakers,
  tentDoor,
  tentDoorAngle,
  tentPole,
  tentVideoAngle,
  upstairsBar,
  upstairsBarCounterRail,
  upstairsBarDrinkCounter,
  upstairsBarStools,
  upstairsCouches,
  upstairsDjBooth,
  upstairsDjSpeakers,
  upstairsDoor,
  upstairsRoofHeight,
} from './scene-data.ts'
import { treeSwingSeatAt, treeSwingSeats } from './tree-swing.ts'
import type { Bounds, CircleBounds, Vec3, VideoZone } from './types.ts'

import { characterFloor } from './character-data.ts'
import { duckBoundsAt, duckPlatformTop, duckPosition, onDuckPlatform } from './duck-position.ts'
import { clamp } from './math.ts'

export type Seat = {
  cameraTarget?: Vec3
  id: string
  position: Vec3
  turn: number
}

type PaddedBounds = {
  back: number
  front: number
  left: number
  right: number
}
type PaddedBoundsSide = keyof PaddedBounds
type OrientedBounds = {
  cos: number
  depth: number
  sin: number
  width: number
  x: number
  z: number
}
type CollisionOptions = {
  couches?: boolean
  duck?: boolean
}
type HeightOptions = {
  couches?: boolean
  duck?: boolean
}
type WalkableOptions = {
  clearance?: number
}
type PaddedPlatform = {
  bounds: PaddedBounds
  top: number
}
type PolygonPlan = {
  back: number
  front: number
  left: number
  right: number
  xs: Float64Array
  zs: Float64Array
}

const djBoothCollision = paddedBounds(djBooth)
const bartenderBarCollision = paddedBounds(bartenderBar)
const bartenderStoolCollisions = bartenderStools.map(bounds => paddedBounds(bounds))
const insideArcadeCollision = orientedBounds(
  insideArcade.x,
  insideArcade.z,
  insideArcade.width,
  insideArcade.depth,
  insideArcade.turn,
)
const seatStools = [...bartenderStools, ...outsideHutBarStools, ...upstairsBarStools]
const djSpeakerCollisions = djSpeakers.map(bounds => paddedBounds(bounds))
const outsideDjBoothCollision = paddedBounds(outsideDjBooth)
const outsideStageCollision = paddedBounds(outsideStage, 0.12)
const outsideStageRockPlatforms = outsideStageProps.flatMap(prop => prop.kind === 'rock'
  ? [{
      bounds: paddedBounds(prop, 0.18),
      top: characterFloor + prop.height - 0.1,
    }]
  : [])
const outsideDjSpeakerCollisions = outsideDjSpeakers.map(bounds => paddedBounds(bounds))
const upstairsDjBoothCollision = paddedBounds(upstairsDjBooth)
const upstairsDjSpeakerCollisions = upstairsDjSpeakers.map(bounds => paddedBounds(bounds))
const upstairsBarCounterCollisions = upstairsBarCounterBounds().map(bounds => paddedBounds(bounds, 0.18))
const upstairsBarDrinkCounterCollision = paddedBounds(upstairsBarDrinkCounter, 0.18)
const upstairsBarStoolCollisions = upstairsBarStools.map(bounds => paddedBounds(bounds))
const upstairsCouchCollisions = upstairsCouches.map(bounds => couchCollisionBounds(bounds))
const tentDjBoothCollision = paddedBounds(tentDjBooth)
const tentDjSpeakerCollisions = tentDjSpeakers.map(bounds => paddedBounds(bounds))
const loftDjBoothCollision = paddedBounds(loftDjBooth)
const loftDjSpeakerCollisions = loftDjSpeakers.map(bounds => paddedBounds(bounds))
const loftCouchCollisions = loftCouches.map(bounds => couchCollisionBounds(bounds))
const loftTableCollisions = loftTables.map(bounds => paddedBounds(bounds, 0.18))
const outsideCouchCollisions = outsideCouches.map(bounds => couchCollisionBounds(bounds))
const outsideHutBarCollision = paddedBounds(outsideHutBar)
const outsideHutBarStoolCollisions = outsideHutBarStools.map(bounds => paddedBounds(bounds))
const outsideFoodTruckCollision = orientedBounds(
  outsideFoodTruck.x,
  outsideFoodTruck.z,
  outsideFoodTruckSize.width,
  outsideFoodTruckSize.depth,
  outsideFoodTruckTurn,
)
const outsideTShirtStandCollisions = outsideTShirtStands.map(stand => ({
  bounds: orientedBounds(stand.x, stand.z, stand.width, stand.depth, stand.turn),
  top: characterFloor + stand.height,
}))
const outsidePhotoWallBounds = wallPanelBounds(outsidePhotoWall)
const outsidePhotoWallCollision = paddedBounds(outsidePhotoWallBounds, 0.18)
const outsideScheduleWallBounds = wallPanelBounds(outsideScheduleWall)
const outsideScheduleWallCollision = paddedBounds(outsideScheduleWallBounds, 0.18)
const outsideToiletWallCollisions = toiletWallBounds().map(bounds => paddedBounds(bounds, 0.18))
const outsideHutBarDeckBounds: Bounds = {
  x: (outsideHut.x - outsideHut.width / 2 + outsideHutBar.x) / 2,
  z: outsideHutBar.z,
  width: outsideHut.width / 2 + outsideHutBar.width,
  depth: outsideHut.depth,
}
const outsideHutPostCollisions = hutPostBounds(outsideHut).map(bounds => paddedBounds(bounds, 0.18))
const insideLeft = roomBounds.left + 0.8
const insideRight = roomBounds.right - 0.8
const insideBack = roomBounds.back + 0.8
const insideFront = roomBounds.front - 0.8
const loftLeft = loftBounds.left + 0.65
const loftRight = loftBounds.right - 0.65
const loftBack = loftBounds.back + 0.65
const loftFront = loftBounds.front - 0.65
const buddhaSeatId = 'buddha'
const djBoothTop = characterFloor + 0.71
const speakerTop = characterFloor + 1.82
const barTop = characterFloor + 0.86
const couchTop = characterFloor + 0.78
const tableTop = characterFloor + 0.4
const stoolTop = characterFloor + 0.72
const outsideHutStoolTop = characterFloor + outsideHutDeckHeight + 0.72
const outsideStageTop = characterFloor + 4.2
const outsideRooftopTop = characterFloor + outsideRooftop.height
const upstairsBarCounterHeight = outsideRooftopTop + 1
const upstairsStoolTop = outsideRooftopTop + 0.72
const boothCameraHeight = 1.12
const upstairsBoothCameraTarget = boothCameraTarget(upstairsDjBooth, outsideRooftopTop)
const platformStep = 0.42
const outsideRooftopStairSidePadding = 0.72
const outsideRooftopStairSideInset = 0.24
const outsideRooftopStairWalkLift = 0.12
const outsideRooftopLandingTransitionPadding = outsideRooftopLanding.x + outsideRooftopLanding.width / 2
  - (outsideRooftop.x - outsideRooftop.width / 2) + 0.05
const emptySeats = new Set<string>()
const polygonPlans = new WeakMap<Vec3[], PolygonPlan>()

export function walkHeight(x: number, y: number, z: number) {
  return walkHeightWithDuck(x, y, z, true)
}

export function walkHeightWithoutDuck(x: number, y: number, z: number) {
  return walkHeightWithDuck(x, y, z, false)
}

function walkHeightWithDuck(x: number, y: number, z: number, duckWalks: boolean) {
  if (inBoundsInclusive(x, z, outsideRooftop) && y > upstairsRoofHeight - platformStep) {
    return upstairsRoofHeight
  }

  const upstairsPlatform = upstairsPlatformHeight(x, z)

  if (upstairsPlatform !== undefined && y > upstairsPlatform - platformStep) {
    return upstairsPlatform
  }

  if ((inBoundsInclusive(x, z, outsideRooftop) || inBoundsInclusive(x, z, outsideRooftopLanding))
    && y > outsideRooftopTop - platformStep)
  {
    return outsideRooftopTop
  }

  const stairs = outsideRooftopStairHeight(x, z)

  if (stairs !== undefined && y > stairs - platformStep) {
    return stairs
  }

  const hutRoof = outsideHutRoofHeight(x, z)

  if (hutRoof !== undefined && y > hutRoof - platformStep) {
    return hutRoof
  }

  const duckTop = duckWalks ? duckPlatformHeight(x, z) : undefined

  if (duckTop !== undefined && y > duckTop - platformStep) {
    return duckTop
  }

  const platform = platformHeight(x, z, isOutside([x, y, z]))

  if (platform !== undefined && y > platform - platformStep) {
    return platform
  }

  if (inBounds(x, z, outsideHut) || inBounds(x, z, outsideHutBarDeckBounds)) {
    return characterFloor + outsideHutDeckHeight
  }

  return characterFloor
}

export function outsideHutRoofHeight(x: number, z: number) {
  const halfWidth = outsideHut.width / 2 + outsideHutRoofEave
  const halfDepth = outsideHut.depth / 2 + outsideHutRoofEave
  const localX = Math.abs(x - outsideHut.x)
  const localZ = Math.abs(z - outsideHut.z)

  if (localX >= halfWidth || localZ >= halfDepth) {
    return undefined
  }

  return outsideHutRoofBottom + (outsideHutRoofRidge - outsideHutRoofBottom) * (1 - localZ / halfDepth)
}

export function walkLoftHeight(x: number, y: number, z: number, options?: HeightOptions) {
  const platform = loftPlatformHeight(x, z, options)

  if (platform !== undefined && y > platform - platformStep) {
    return platform
  }

  return characterFloor
}

function isAtBackDoor(position: Vec3, padding = 0) {
  return Math.abs(position[0] - backDoor.x) < backDoor.width * 0.5 + padding
}

function inBackDoorOpening(x: number, z: number, clearance = 0) {
  return Math.abs(x - backDoor.x) < backDoor.width * 0.5 - clearance
    && z > roomBounds.front - 0.8
}

function isAtTentDoor(position: Vec3, padding = 0) {
  const distance = Math.hypot(position[0] - tent.x, position[2] - tent.z)

  return Math.abs(angleDistance(pointAngle(position[0], position[2]), tentDoorAngle))
      < Math.asin((tentDoor.width / 2 + padding) / tent.radius)
    && distance > tent.radius - 1
}

export function isOutside(position: Vec3) {
  return !isUpstairsAt(position[0], position[1], position[2]) && onOutsideRooftopPathAt(position[0], position[1],
    position[2])
    || position[0] < roomBounds.left || position[0] > roomBounds.right || position[2] < roomBounds.back
    || position[2] > roomBounds.front
}

export function isUpstairs(position: Vec3) {
  return isUpstairsAt(position[0], position[1], position[2])
}

function isOutsideAt(x: number, y: number, z: number) {
  return !isUpstairsAt(x, y, z) && onOutsideRooftopPathAt(x, y, z)
    || x < roomBounds.left || x > roomBounds.right || z < roomBounds.back || z > roomBounds.front
}

function isUpstairsAt(x: number, y: number, z: number) {
  return y > outsideRooftopTop - platformStep && y <= upstairsRoofHeight - platformStep
    && inBoundsInclusive(x, z, outsideRooftop)
}

export function roomAt(position: Vec3): VideoZone {
  return inTent(position[0], position[2])
    ? 'tent'
    : isUpstairs(position)
    ? 'upstairs'
    : isOutside(position)
    ? 'outside'
    : 'inside'
}

export function usesSkyBackground(_camera: { eye: Vec3; center: Vec3 }) {
  return true
}

export function collideRoom(
  position: Vec3,
  outsideTree: CircleBounds,
  outside = isOutside(position),
  previous?: Vec3,
  options?: CollisionOptions,
) {
  collideRoomWithDuck(position, outsideTree, outside, previous, options, true)
}

export function collideRoomWithoutDuck(
  position: Vec3,
  outsideTree: CircleBounds,
  outside = isOutside(position),
  previous?: Vec3,
  options?: Omit<CollisionOptions, 'duck'>,
) {
  collideRoomWithDuck(position, outsideTree, outside, previous, options, false)
}

function collideRoomWithDuck(
  position: Vec3,
  outsideTree: CircleBounds,
  outside: boolean,
  previous: Vec3 | undefined,
  options: Omit<CollisionOptions, 'duck'> | undefined,
  duckCollides: boolean,
) {
  if (onUpstairsRoof(position) || (previous !== undefined && onUpstairsRoof(previous))) {
    position[0] = clamp(position[0], outsideBounds.left, outsideBounds.right)
    position[2] = clamp(position[2], outsideBounds.back, outsideBounds.front)
    return
  }

  const upstairs = isUpstairs(position)
  const wasUpstairs = previous !== undefined && isUpstairs(previous)

  if (upstairs && position[1] <= upstairsRoofHeight - platformStep && previous !== undefined && !wasUpstairs
    && !(previous[0] < roomBounds.left && isAtUpstairsDoor(position[2], 0.45)))
  {
    collidePaddedBounds(position, paddedBounds(outsideRooftop, 0.45))
  }

  if (isUpstairs(position) || wasUpstairs) {
    collideUpstairsRoom(position)
    if (duckCollides) {
      collideDuck(position)
    }
    return
  }

  const outsideZone = outside || (previous !== undefined && onOutsideRooftopPath(previous))

  if (outsideZone) {
    position[0] = clamp(position[0], outsideBounds.left, outsideBounds.right)
    position[2] = clamp(position[2], outsideBounds.back, outsideBounds.front)
    collideOutsideRooftopPath(position, previous)
    if (onOutsideRooftopPath(position)) {
      if (duckCollides) {
        collideDuck(position)
      }
      return
    }
    collideBuildingWalls(position, 0.45)
    collideTentWalls(position, 0.35)
    collideCircle(position, tentPole)
    collideCircle(position, outsideTree)
    collideCircle(position, outsidePalmTree)
    collideCircle(position, outsideLakePalmTree)
    collideCircle(position, outsideBuddha)
    if (!onPaddedPlatform(position, outsideDjBoothCollision, djBoothTop)) {
      collidePaddedBounds(position, outsideDjBoothCollision)
    }
    collidePaddedBounds(position, outsideStageCollision)
    if (!onPaddedPlatform(position, tentDjBoothCollision, djBoothTop)) {
      collidePaddedBounds(position, tentDjBoothCollision)
    }
    if (!onPaddedPlatform(position, outsideHutBarCollision, barTop)) {
      collidePaddedBounds(position, outsideHutBarCollision)
    }
    collideOrientedBounds(position, outsideFoodTruckCollision, 0.34)
    for (const stand of outsideTShirtStandCollisions) {
      collideOrientedBounds(position, stand.bounds, 0.12)
    }
    collideWallPanel(position, outsidePhotoWallBounds, outsidePhotoWallCollision, previous)
    collideWallPanel(position, outsideScheduleWallBounds, outsideScheduleWallCollision, previous)

    for (const speaker of outsideDjSpeakerCollisions) {
      if (!onPaddedPlatform(position, speaker, speakerTop)) {
        collidePaddedBounds(position, speaker)
      }
    }
    for (const prop of outsideStageRockCollisions()) {
      if (!onPaddedPlatform(position, prop.bounds, prop.top)) {
        collidePaddedBounds(position, prop.bounds)
      }
    }
    if (duckCollides) {
      collideDuck(position)
    }
    for (const speaker of tentDjSpeakerCollisions) {
      if (!onPaddedPlatform(position, speaker, speakerTop)) {
        collidePaddedBounds(position, speaker)
      }
    }

    if (options?.couches !== false) {
      for (const couch of outsideCouchCollisions) {
        if (!onPaddedPlatform(position, couch, couchTop)) {
          collidePaddedBounds(position, couch)
        }
      }
    }

    for (const stool of outsideHutBarStoolCollisions) {
      if (!onPaddedPlatform(position, stool, outsideHutStoolTop)) {
        collidePaddedBounds(position, stool)
      }
    }

    for (const post of outsideHutPostCollisions) {
      collidePaddedBounds(position, post)
    }

    collideToiletWalls(position, previous)

    return
  }

  position[0] = clamp(position[0], insideLeft, insideRight)

  if (position[2] > insideFront && !isAtBackDoor(position)) {
    position[2] = insideFront
  }
  else {
    position[2] = clamp(position[2], insideBack, roomBounds.front + 0.45)
  }

  if (!onPaddedPlatform(position, djBoothCollision, djBoothTop)) {
    collidePaddedBounds(position, djBoothCollision)
  }
  if (!onPaddedPlatform(position, bartenderBarCollision, barTop)) {
    collidePaddedBounds(position, bartenderBarCollision)
  }
  if (duckCollides) {
    collideDuck(position)
  }
  collideOrientedBounds(position, insideArcadeCollision, 0.28)

  for (const stool of bartenderStoolCollisions) {
    if (!onPaddedPlatform(position, stool, stoolTop)) {
      collidePaddedBounds(position, stool)
    }
  }

  for (const speaker of djSpeakerCollisions) {
    if (!onPaddedPlatform(position, speaker, speakerTop)) {
      collidePaddedBounds(position, speaker)
    }
  }
}

function collideUpstairsRoom(position: Vec3) {
  if (position[1] > upstairsRoofHeight - platformStep) {
    return
  }

  const padding = 0.45
  const left = roomBounds.left + padding
  const right = roomBounds.right - padding
  const back = roomBounds.back + padding
  const front = roomBounds.front - padding

  if (position[0] > right) {
    position[0] = right
  }
  if (position[0] < left && !isAtUpstairsDoor(position[2], padding)) {
    position[0] = left
  }

  position[2] = clamp(position[2], back, front)

  if (!onPaddedPlatform(position, upstairsDjBoothCollision, djBoothTop + outsideRooftop.height)) {
    collidePaddedBounds(position, upstairsDjBoothCollision)
  }
  for (const speaker of upstairsDjSpeakerCollisions) {
    if (!onPaddedPlatform(position, speaker, speakerTop + outsideRooftop.height)) {
      collidePaddedBounds(position, speaker)
    }
  }
  for (const counter of upstairsBarCounterCollisions) {
    if (!onPaddedPlatform(position, counter, upstairsBarCounterHeight)) {
      collidePaddedBounds(position, counter)
    }
  }
  if (!onPaddedPlatform(position, upstairsBarDrinkCounterCollision, upstairsBarCounterHeight)) {
    collidePaddedBounds(position, upstairsBarDrinkCounterCollision)
  }
  for (const couch of upstairsCouchCollisions) {
    collidePaddedBounds(position, couch)
  }
  for (const stool of upstairsBarStoolCollisions) {
    if (!onPaddedPlatform(position, stool, upstairsStoolTop)) {
      collidePaddedBounds(position, stool)
    }
  }
}

function isAtUpstairsDoor(z: number, padding = 0) {
  return z > upstairsDoor.z - upstairsDoor.width / 2 - padding
    && z < upstairsDoor.z + upstairsDoor.width / 2 + padding
}

function upstairsPlatformHeight(x: number, z: number) {
  if (inPaddedBounds(x, z, upstairsDjBoothCollision)) {
    return djBoothTop + outsideRooftop.height
  }

  if (upstairsDjSpeakerCollisions.some(bounds => inPaddedBounds(x, z, bounds))) {
    return speakerTop + outsideRooftop.height
  }

  if (upstairsBarCounterCollisions.some(bounds => inPaddedBounds(x, z, bounds))
    || inPaddedBounds(x, z, upstairsBarDrinkCounterCollision))
  {
    return upstairsBarCounterHeight
  }
}

function upstairsBarCounterBounds(): Bounds[] {
  const rail = upstairsBarCounterRail
  const innerDepth = upstairsBar.depth - rail * 2

  return [
    { x: upstairsBar.x, z: upstairsBar.z - upstairsBar.depth / 2 + rail / 2, width: upstairsBar.width, depth: rail },
    { x: upstairsBar.x, z: upstairsBar.z + upstairsBar.depth / 2 - rail / 2, width: upstairsBar.width, depth: rail },
    { x: upstairsBar.x - upstairsBar.width / 2 + rail / 2, z: upstairsBar.z, width: rail, depth: innerDepth },
    { x: upstairsBar.x + upstairsBar.width / 2 - rail / 2, z: upstairsBar.z, width: rail, depth: innerDepth },
  ]
}

export function collideLoftRoom(position: Vec3, options?: CollisionOptions) {
  position[0] = clamp(position[0], loftLeft, loftRight)
  position[2] = clamp(position[2], loftBack, loftFront)

  if (!onPaddedPlatform(position, loftDjBoothCollision, djBoothTop)) {
    collidePaddedBounds(position, loftDjBoothCollision)
  }
  for (const speaker of loftDjSpeakerCollisions) {
    if (!onPaddedPlatform(position, speaker, speakerTop)) {
      collidePaddedBounds(position, speaker)
    }
  }
  if (options?.couches !== false) {
    for (const couch of loftCouchCollisions) {
      if (!onPaddedPlatform(position, couch, couchTop)) {
        collidePaddedBounds(position, couch)
      }
    }
  }
  for (const table of loftTableCollisions) {
    if (!onPaddedPlatform(position, table, tableTop)) {
      collidePaddedBounds(position, table)
    }
  }
  for (const plant of loftPlants) {
    collideCircle(position, plant)
  }
  for (const figure of loftCornerFigures) {
    collideCircle(position, figure)
  }
}

export function collideSphereRoom(position: Vec3, radius: number, outsideTree: CircleBounds, options?: CollisionOptions) {
  position[0] = clamp(position[0], outsideBounds.left + radius, outsideBounds.right - radius)
  position[2] = clamp(position[2], outsideBounds.back + radius, outsideBounds.front - radius)
  collideBuildingWalls(position, radius)
  collideSphereUnderOutsideRooftopStairs(position, radius)

  if (sphereOverlapsHeight(position, radius, characterFloor + tent.wallHeight)) {
    collideTentWalls(position, radius)
  }
  if (sphereOverlapsHeight(position, radius, characterFloor + tent.height)) {
    collideCircle(position, tentPole, radius)
  }
  if (sphereOverlapsHeight(position, radius, characterFloor + 5.5)) {
    collideCircle(position, outsideTree, radius)
    collideCircle(position, outsidePalmTree, radius)
  }
  if (sphereOverlapsHeight(position, radius, characterFloor + 1.75)) {
    collideCircle(position, outsideBuddha, radius)
  }

  collideSpherePaddedBounds(position, radius, outsideDjBoothCollision, djBoothTop)
  collideSpherePaddedBounds(position, radius, outsideStageCollision, outsideStageTop)
  collideSpherePaddedBounds(position, radius, tentDjBoothCollision, djBoothTop)
  collideSpherePaddedBounds(position, radius, outsideHutBarCollision, barTop)
  collideSphereOrientedBounds(position, radius, outsideFoodTruckCollision, characterFloor + outsideFoodTruckSize.height)
  for (const stand of outsideTShirtStandCollisions) {
    collideSphereOrientedBounds(position, radius, stand.bounds, stand.top)
  }
  collideSpherePaddedBounds(position, radius, outsidePhotoWallCollision, characterFloor + outsidePhotoWall.height)
  collideSpherePaddedBounds(position, radius, outsideScheduleWallCollision, characterFloor + outsideScheduleWall.height)

  for (const speaker of outsideDjSpeakerCollisions) {
    collideSpherePaddedBounds(position, radius, speaker, speakerTop)
  }
  for (const prop of outsideStageRockCollisions()) {
    collideSpherePaddedBounds(position, radius, prop.bounds, prop.top)
  }
  if (options?.duck !== false) {
    const duck = duckCollision()
    collideSpherePaddedBounds(position, radius, duck.bounds, duck.top)
  }
  for (const speaker of tentDjSpeakerCollisions) {
    collideSpherePaddedBounds(position, radius, speaker, speakerTop)
  }
  for (const couch of outsideCouchCollisions) {
    collideSpherePaddedBounds(position, radius, couch, characterFloor + 0.78)
  }
  for (const stool of outsideHutBarStoolCollisions) {
    collideSpherePaddedBounds(position, radius, stool, characterFloor + outsideHutDeckHeight + 0.72)
  }
  for (const post of outsideHutPostCollisions) {
    collideSpherePaddedBounds(position, radius, post, characterFloor + outsideHutDeckHeight + 2.45)
  }
  for (const wall of outsideToiletWallCollisions) {
    collideSpherePaddedBounds(position, radius, wall, characterFloor + 2.75)
  }
}

export function isWalkable(
  x: number,
  z: number,
  outsideTree: CircleBounds,
  y = characterFloor,
  options?: WalkableOptions,
) {
  return isWalkableWithDuck(x, z, outsideTree, y, options, true)
}

export function isWalkableWithoutDuck(
  x: number,
  z: number,
  outsideTree: CircleBounds,
  y = characterFloor,
  options?: WalkableOptions,
) {
  return isWalkableWithDuck(x, z, outsideTree, y, options, false)
}

function isWalkableWithDuck(
  x: number,
  z: number,
  outsideTree: CircleBounds,
  y: number,
  options: WalkableOptions | undefined,
  duckWalks: boolean,
) {
  const clearance = options?.clearance ?? 0

  if (isUpstairsAt(x, y, z)) {
    return x >= roomBounds.left + 0.55 + clearance
      && x <= roomBounds.right - 0.55 - clearance
      && z >= roomBounds.back + 0.55 + clearance
      && z <= roomBounds.front - 0.55 - clearance
      && !inPaddedBounds(x, z, upstairsDjBoothCollision, clearance)
      && upstairsDjSpeakerCollisions.every(bounds => !inPaddedBounds(x, z, bounds, clearance))
      && upstairsBarCounterCollisions.every(bounds => !inPaddedBounds(x, z, bounds, clearance))
      && !inPaddedBounds(x, z, upstairsBarDrinkCounterCollision, clearance)
      && upstairsBarStoolCollisions.every(bounds => !inPaddedBounds(x, z, bounds, clearance))
      && upstairsCouchCollisions.every(bounds => !inPaddedBounds(x, z, bounds, clearance))
      && (!duckWalks || duckWalkable(x, z, y, clearance))
  }

  if (isOutsideAt(x, y, z)) {
    return x >= outsideBounds.left + clearance
      && x <= outsideBounds.right - clearance
      && z >= outsideBounds.back + clearance
      && z <= outsideBounds.front - clearance
      && !inBuildingWall(x, z, 0.45 + clearance, clearance)
      && !inOutsideRooftopStairWallAt(x, y, z, clearance)
      && !inTentWall(x, z, 0.35, clearance)
      && !inCircle(x, z, tentPole, clearance)
      && !inCircle(x, z, outsideTree, clearance)
      && !inCircle(x, z, outsidePalmTree, clearance)
      && !inCircle(x, z, outsideLakePalmTree, clearance)
      && !inCircle(x, z, outsideBuddha, clearance)
      && !inPaddedBounds(x, z, outsideDjBoothCollision, clearance)
      && !inPaddedBounds(x, z, outsideStageCollision, clearance)
      && !inPaddedBounds(x, z, tentDjBoothCollision, clearance)
      && !inPaddedBounds(x, z, outsideHutBarCollision, clearance)
      && !inOrientedBounds(x, z, outsideFoodTruckCollision, 0.34 + clearance)
      && outsideTShirtStandCollisions.every(stand => !inOrientedBounds(x, z, stand.bounds, 0.12 + clearance))
      && !inPaddedBounds(x, z, outsidePhotoWallCollision, clearance)
      && !inPaddedBounds(x, z, outsideScheduleWallCollision, clearance)
      && outsideDjSpeakerCollisions.every(bounds => !inPaddedBounds(x, z, bounds, clearance))
      && outsideStageRockPlatforms.every(prop => !inPaddedBounds(x, z, prop.bounds, clearance))
      && (!duckWalks || duckWalkable(x, z, y, clearance))
      && tentDjSpeakerCollisions.every(bounds => !inPaddedBounds(x, z, bounds, clearance))
      && outsideCouchCollisions.every(bounds => !inPaddedBounds(x, z, bounds, clearance))
      && outsideHutBarStoolCollisions.every(bounds => !inPaddedBounds(x, z, bounds, clearance))
      && outsideHutPostCollisions.every(bounds => !inPaddedBounds(x, z, bounds, clearance))
      && outsideToiletWallCollisions.every(bounds => !inPaddedBounds(x, z, bounds, clearance))
  }

  return x >= insideLeft + clearance && x <= insideRight - clearance
    && z >= insideBack + clearance
    && (z <= insideFront - clearance || inBackDoorOpening(x, z, clearance))
    && z <= roomBounds.front + 0.45
    && !inPaddedBounds(x, z, djBoothCollision, clearance)
    && !inPaddedBounds(x, z, bartenderBarCollision, clearance)
    && !inOrientedBounds(x, z, insideArcadeCollision, 0.28 + clearance)
    && (!duckWalks || duckWalkable(x, z, y, clearance))
    && bartenderStoolCollisions.every(bounds => !inPaddedBounds(x, z, bounds, clearance))
    && djSpeakerCollisions.every(bounds => !inPaddedBounds(x, z, bounds, clearance))
}

export function nearInsideArcade(position: Vec3, padding = 0.44) {
  return roomAt(position) === 'inside' && inOrientedBounds(position[0], position[2], insideArcadeCollision, padding)
}

export function resolveDuckPosition(position: Vec3, outsideTree: CircleBounds): Vec3 {
  const radius = duckCollisionRadius()
  const sphere: Vec3 = [position[0], position[1] + radius, position[2]]

  collideSphereRoom(sphere, radius, outsideTree, { duck: false })

  return [sphere[0], position[1], sphere[2]]
}

function inTent(x: number, z: number) {
  const dx = x - tent.x
  const dz = z - tent.z

  return dx * dx + dz * dz < tent.radius * tent.radius
}

function collideTentWalls(position: Vec3, padding: number) {
  const dx = position[0] - tent.x
  const dz = position[2] - tent.z
  const distance = Math.sqrt(dx * dx + dz * dz)
  const outer = tent.radius + padding
  const inner = tent.radius - 0.62

  if (distance < inner || distance > outer || isAtTentDoor(position, padding)) {
    return
  }

  const radius = distance > tent.radius ? outer : inner

  position[0] = tent.x + dx / distance * radius
  position[2] = tent.z + dz / distance * radius
}

function inTentWall(x: number, z: number, padding: number, clearance = 0) {
  const dx = x - tent.x
  const dz = z - tent.z
  const distance = Math.sqrt(dx * dx + dz * dz)

  return distance < tent.radius + padding + clearance && distance > tent.radius - 0.62 - clearance
    && !isAtTentDoor([x, characterFloor, z], padding + clearance)
}

export function seatAt(position: Vec3, occupiedSeats = emptySeats, padding = 0.46, includeOccupied = false,
  loft = false
):
  | Seat
  | undefined
{
  if (loft) {
    return couchSeatAt(loftCouches, 'loft-couch', position, occupiedSeats, padding, includeOccupied, walkLoftHeight)
  }

  const outside = isOutside(position)

  if (isUpstairs(position)) {
    return couchSeatAt(upstairsCouches, 'upstairs-couch', position, occupiedSeats, padding, includeOccupied, walkHeight)
      ?? stoolSeatAt(position, occupiedSeats, padding, includeOccupied,
        bartenderStools.length + outsideHutBarStools.length, seatStools.length)
  }

  if (!outside) {
    return stoolSeatAt(position, occupiedSeats, padding, includeOccupied, 0, bartenderStools.length)
  }

  const swingSeat = treeSwingSeatAt(position, occupiedSeats, padding, includeOccupied)

  if (swingSeat) {
    return swingSeat
  }

  const buddha = cachedBuddhaSeat
  const tent = tentSeat(position, occupiedSeats, includeOccupied)
    ?? tentCenterSeat(position, occupiedSeats, includeOccupied)

  if (tent) {
    return tent
  }

  const buddhaX = position[0] - outsideBuddha.x
  const buddhaZ = position[2] - outsideBuddha.z

  if (buddhaX * buddhaX + buddhaZ * buddhaZ < (outsideBuddha.radius + padding) ** 2
    && (includeOccupied || !occupiedSeats.has(buddha.id)))
  {
    return buddha
  }

  const couchSeat = couchSeatAt(outsideCouches, 'couch', position, occupiedSeats, padding, includeOccupied, walkHeight)

  if (couchSeat) {
    return couchSeat
  }

  return stoolSeatAt(position, occupiedSeats, padding, includeOccupied, bartenderStools.length, seatStools.length)
}

export function seats() {
  return cachedSeats
}

export function seatById(id: string) {
  return cachedSeatById.get(id)!
}

function buddhaSeat(): Seat {
  return {
    id: buddhaSeatId,
    position: [outsideBuddha.x, characterFloor + 0.8, outsideBuddha.z - 0.3],
    turn: Math.PI,
  }
}

function tentSeat(position: Vec3, occupiedSeats: Set<string>, includeOccupied: boolean) {
  const seat = nearestSeat(cachedTentSeats, position, occupiedSeats, includeOccupied)

  return seat && distanceSq(position, seat.position) < 1 ? seat : undefined
}

function tentCenterSeat(position: Vec3, occupiedSeats: Set<string>, includeOccupied: boolean) {
  const seat = nearestSeat(cachedTentCenterSeats, position, occupiedSeats, includeOccupied)

  return seat && distanceSq(position, seat.position) < 0.9 ? seat : undefined
}

function tentCenterSeats(): Seat[] {
  const seats: Seat[] = []
  const radius = (tentCenterBench.innerRadius + tentCenterBench.outerRadius) / 2

  for (let i = 0; i < 8; i++) {
    const angle = Math.PI * 2 * i / 8
    const x = tentCenterBench.x + Math.cos(angle) * radius
    const z = tentCenterBench.z + Math.sin(angle) * radius

    seats.push({
      id: `tent-center:${i}`,
      position: [x, characterFloor + 0.3, z],
      turn: Math.atan2(x - tentCenterBench.x, z - tentCenterBench.z),
    })
  }

  return seats
}

function tentSeats(): Seat[] {
  const seats: Seat[] = []
  const outer = tent.radius - 0.52
  const radius = tent.radius - 0.97
  const doorCutoutHalf = Math.asin((tentDoor.width / 2 + 0.28) / outer)
  const boothCutoutHalf = Math.asin(2.2 / outer)

  for (let i = 0; i < 24; i++) {
    const angle = Math.PI * 2 * i / 24
    const x = tent.x + Math.sin(angle) * radius
    const z = tent.z + Math.cos(angle) * radius

    if (Math.abs(angleDistance(angle, tentDoorAngle)) < doorCutoutHalf
      || Math.abs(angleDistance(angle, tentVideoAngle)) < boothCutoutHalf)
    {
      continue
    }

    seats.push({
      id: `tent:${i}`,
      position: [x, characterFloor + 0.3, z],
      turn: Math.atan2(tent.x - x, tent.z - z),
    })
  }

  return seats
}

function angleDistance(a: number, b: number) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b))
}

function pointAngle(x: number, z: number) {
  return Math.atan2(x - tent.x, z - tent.z)
}

function couchSeatAt(
  couches: typeof outsideCouches,
  idPrefix: string,
  position: Vec3,
  occupiedSeats: Set<string>,
  padding: number,
  includeOccupied: boolean,
  heightAt: (x: number, y: number, z: number) => number,
) {
  for (let i = 0; i < couches.length; i++) {
    const couch = couches[i]!

    if (position[0] > couch.x - couch.width * 0.5 - padding
      && position[0] < couch.x + couch.width * 0.5 + padding
      && position[2] > couch.z - couch.depth * 0.5 - padding
      && position[2] < couch.z + couch.depth * 0.5 + padding)
    {
      const seats = idPrefix === 'couch'
        ? cachedOutsideCouchSeatsByCouch[i]!
        : idPrefix === 'upstairs-couch'
        ? cachedUpstairsCouchSeatsByCouch[i]!
        : cachedLoftCouchSeatsByCouch[i]!

      return nearestSeat(seats, position, occupiedSeats, includeOccupied)
    }
  }
}

function stoolSeatAt(
  position: Vec3,
  occupiedSeats: Set<string>,
  padding: number,
  includeOccupied: boolean,
  start: number,
  end: number,
) {
  for (let i = start; i < end; i++) {
    const stool = seatStools[i]!
    const seat = cachedStoolSeats[i]!

    if (position[0] > stool.x - stool.width * 0.5 - padding
      && position[0] < stool.x + stool.width * 0.5 + padding
      && position[2] > stool.z - stool.depth * 0.5 - padding
      && position[2] < stool.z + stool.depth * 0.5 + padding
      && (includeOccupied || !occupiedSeats.has(seat.id)))
    {
      return seat
    }
  }
}

function nearestSeat(seats: Seat[], position: Vec3, occupiedSeats: Set<string>, includeOccupied: boolean) {
  let nearest: Seat | undefined
  let nearestDistance = Infinity

  for (const seat of seats) {
    if (!includeOccupied && occupiedSeats.has(seat.id)) {
      continue
    }

    const distance = distanceSq(position, seat.position)

    if (distance < nearestDistance) {
      nearest = seat
      nearestDistance = distance
    }
  }

  return nearest
}

function couchSeats(
  couch: (typeof outsideCouches)[number],
  idPrefix: string,
  couchIndex: number,
  heightAt: (x: number, y: number, z: number) => number,
  cameraTarget?: Vec3,
): Seat[] {
  const direction = couchSeatDirection(couch.face)
  const side = couchSeatSide(couch.face)
  const depth = couch.face === 'north' || couch.face === 'south' ? couch.depth : couch.width
  const width = couch.face === 'north' || couch.face === 'south' ? couch.width : couch.depth
  const offsets = [-width * 0.3, 0, width * 0.3]
  const floor = idPrefix === 'upstairs-couch' ? outsideRooftopTop : characterFloor

  return offsets.map((offset, index) => ({
    ...(cameraTarget ? { cameraTarget } : {}),
    id: `${idPrefix}:${couchIndex}:${index}`,
    position: [
      couch.x + direction[0] * depth * 0.12 + side[0] * offset,
      heightAt(couch.x, floor, couch.z) + 0.28,
      couch.z + direction[2] * depth * 0.12 + side[2] * offset,
    ] as Vec3,
    turn: Math.atan2(direction[0], direction[2]),
  }))
}

function stoolSeat(stool: Bounds, index: number): Seat {
  const outside = index >= bartenderStools.length
  const upstairs = index >= bartenderStools.length + outsideHutBarStools.length

  return {
    ...(upstairs ? { cameraTarget: upstairsBoothCameraTarget } : {}),
    id: `stool:${index}`,
    position: [stool.x, (upstairs ? outsideRooftopTop : walkHeight(stool.x, characterFloor, stool.z)) + 0.34, stool.z],
    turn: upstairs ? Math.atan2(upstairsBar.x - stool.x, upstairsBar.z - stool.z) : outside ? Math.PI / 2 : Math.PI,
  }
}

const cachedBuddhaSeat = buddhaSeat()
const cachedTentSeats = tentSeats()
const cachedTentCenterSeats = tentCenterSeats()
const cachedOutsideCouchSeatsByCouch = outsideCouches.map((couch, index) =>
  couchSeats(couch, 'couch', index, walkHeight)
)
const cachedLoftCouchSeatsByCouch = loftCouches.map((couch, index) =>
  couchSeats(couch, 'loft-couch', index, walkLoftHeight)
)
const cachedUpstairsCouchSeatsByCouch = upstairsCouches.map((couch, index) =>
  couchSeats(couch, 'upstairs-couch', index, walkHeight, upstairsBoothCameraTarget)
)
const cachedOutsideCouchSeats = cachedOutsideCouchSeatsByCouch.flat()
const cachedLoftCouchSeats = cachedLoftCouchSeatsByCouch.flat()
const cachedUpstairsCouchSeats = cachedUpstairsCouchSeatsByCouch.flat()
const cachedStoolSeats = seatStools.map((stool, index) => stoolSeat(stool, index))
const cachedSeats = [
  cachedBuddhaSeat,
  ...cachedTentSeats,
  ...cachedTentCenterSeats,
  ...cachedOutsideCouchSeats,
  ...cachedUpstairsCouchSeats,
  ...cachedStoolSeats,
]
const cachedSeatById = new Map<string, Seat>(
  [...treeSwingSeats, ...cachedSeats, ...cachedLoftCouchSeats].map(seat => [seat.id, seat] as const),
)

function boothCameraTarget(booth: Bounds, floor = characterFloor): Vec3 {
  return [booth.x, floor + boothCameraHeight, booth.z]
}

function couchSeatDirection(face: (typeof outsideCouches)[number]['face']): Vec3 {
  if (face === 'north') {
    return [0, 0, 1]
  }
  if (face === 'south') {
    return [0, 0, -1]
  }
  if (face === 'east') {
    return [1, 0, 0]
  }

  return [-1, 0, 0]
}

function couchSeatSide(face: (typeof outsideCouches)[number]['face']): Vec3 {
  if (face === 'north' || face === 'south') {
    return [1, 0, 0]
  }

  return [0, 0, 1]
}

function distanceSq(a: Vec3, b: Vec3) {
  const x = a[0] - b[0]
  const z = a[2] - b[2]

  return x * x + z * z
}

export function collideBuildingWalls(position: Vec3, padding: number) {
  if (position[1] > upstairsRoofHeight - platformStep) {
    return
  }

  const left = roomBounds.left - padding
  const right = roomBounds.right + padding
  const back = roomBounds.back - padding
  const front = roomBounds.front + padding

  if (position[0] > left && position[0] < right && position[2] > back && position[2] < front) {
    if (isAtBackDoor(position, padding) && position[2] > roomBounds.front - 0.8) {
      return
    }

    const pushLeft = Math.abs(position[0] - left)
    const pushRight = Math.abs(right - position[0])
    const pushBack = Math.abs(position[2] - back)
    const pushFront = Math.abs(front - position[2])
    const push = Math.min(pushLeft, pushRight, pushBack, pushFront)

    if (push === pushLeft) {
      position[0] = left
    }
    else if (push === pushRight) {
      position[0] = right
    }
    else if (push === pushBack) {
      position[2] = back
    }
    else {
      position[2] = front
    }
  }
}

function paddedBounds(bounds: Bounds, padding = 0.28): PaddedBounds {
  return {
    back: bounds.z - bounds.depth / 2 - padding,
    front: bounds.z + bounds.depth / 2 + padding,
    left: bounds.x - bounds.width / 2 - padding,
    right: bounds.x + bounds.width / 2 + padding,
  }
}

function orientedBounds(x: number, z: number, width: number, depth: number, turn: number): OrientedBounds {
  return {
    cos: Math.cos(turn),
    depth,
    sin: Math.sin(turn),
    width,
    x,
    z,
  }
}

function couchCollisionBounds(bounds: (typeof outsideCouches)[number]): PaddedBounds {
  const collision = paddedBounds(bounds, 0.22)
  const endGap = 0.15

  if (bounds.face === 'north' || bounds.face === 'south') {
    collision.left += endGap
    collision.right -= endGap
  }
  else {
    collision.back += endGap
    collision.front -= endGap
  }

  return collision
}

function hutPostBounds(bounds: Bounds): Bounds[] {
  const left = bounds.x - bounds.width / 2 + 0.18
  const right = bounds.x + bounds.width / 2 - 0.18
  const back = bounds.z - bounds.depth / 2 + 0.18
  const front = bounds.z + bounds.depth / 2 - 0.18

  return [
    { x: left, z: back, width: 0.22, depth: 0.22 },
    { x: right, z: back, width: 0.22, depth: 0.22 },
    { x: left, z: front, width: 0.22, depth: 0.22 },
    { x: right, z: front, width: 0.22, depth: 0.22 },
  ]
}

function wallPanelBounds(wall: typeof outsidePhotoWall): Bounds {
  return {
    x: wall.x - 0.06,
    z: wall.z,
    width: 0.12,
    depth: wall.width + 0.36,
  }
}

function collideWallPanel(position: Vec3, bounds: Bounds, collision: PaddedBounds, previous?: Vec3) {
  const back = bounds.z - bounds.depth / 2
  const front = bounds.z + bounds.depth / 2
  const padding = 0.42

  if (previous) {
    collideVerticalWall(position, previous, bounds.x, back, front, padding)
  }

  collidePaddedBounds(position, collision)
}

function toiletWallBounds(): Bounds[] {
  const left = outsideToilets.x - outsideToilets.width / 2
  const right = outsideToilets.x + outsideToilets.width / 2
  const back = outsideToilets.z - outsideToilets.depth / 2
  const front = outsideToilets.z + outsideToilets.depth / 2
  const doorBack = outsideToiletDoor.z - outsideToiletDoor.width / 2
  const doorFront = outsideToiletDoor.z + outsideToiletDoor.width / 2
  const doorSide = outsideToiletDoor.side === 'east' ? 1 : -1
  const doorX = doorSide > 0 ? right : left
  const oppositeX = doorSide > 0 ? left : right
  const dividerX = outsideToilets.x - doorSide * 0.58
  const wall = 0.12
  const divider = 0.5

  return [
    { x: outsideToilets.x, z: back, width: outsideToilets.width, depth: wall },
    { x: outsideToilets.x, z: front, width: outsideToilets.width, depth: wall },
    { x: oppositeX, z: outsideToilets.z, width: wall, depth: outsideToilets.depth },
    { x: doorX, z: (back + doorBack) / 2, width: wall, depth: doorBack - back },
    { x: doorX, z: (doorFront + front) / 2, width: wall, depth: front - doorFront },
    { x: dividerX, z: outsideToilets.z, width: outsideToilets.width - 1.32, depth: divider },
  ]
}

function collideToiletWalls(position: Vec3, previous?: Vec3) {
  const left = outsideToilets.x - outsideToilets.width / 2
  const right = outsideToilets.x + outsideToilets.width / 2
  const back = outsideToilets.z - outsideToilets.depth / 2
  const front = outsideToilets.z + outsideToilets.depth / 2
  const doorBack = outsideToiletDoor.z - outsideToiletDoor.width / 2
  const doorFront = outsideToiletDoor.z + outsideToiletDoor.width / 2
  const doorSide = outsideToiletDoor.side === 'east' ? 1 : -1
  const doorX = doorSide > 0 ? right : left
  const oppositeX = doorSide > 0 ? left : right
  const dividerX = outsideToilets.x - doorSide * 0.58
  const dividerLeft = dividerX - (outsideToilets.width - 1.32) / 2
  const dividerRight = dividerX + (outsideToilets.width - 1.32) / 2
  const padding = 0.34
  const dividerPadding = 0.43

  if (previous) {
    collideHorizontalWall(position, previous, back, left, right, padding)
    collideHorizontalWall(position, previous, front, left, right, padding)
    collideVerticalWall(position, previous, oppositeX, back, front, padding)
    collideVerticalWall(position, previous, doorX, back, doorBack, padding)
    collideVerticalWall(position, previous, doorX, doorFront, front, padding)
    collideHorizontalWall(position, previous, outsideToilets.z, dividerLeft, dividerRight, dividerPadding)
  }

  if (position[0] > left - padding && position[0] < right + padding) {
    if (position[2] > back - padding && position[2] < back + padding) {
      position[2] = position[2] > back ? back + padding : back - padding
    }
    if (position[2] > front - padding && position[2] < front + padding) {
      position[2] = position[2] < front ? front - padding : front + padding
    }
  }

  for (const wall of outsideToiletWallCollisions.slice(2)) {
    collidePaddedBounds(position, wall)
  }
}

function collideHorizontalWall(
  position: Vec3,
  previous: Vec3,
  z: number,
  left: number,
  right: number,
  padding: number,
) {
  if (!segmentOverlaps(previous[0], position[0], left, right, padding)) {
    return
  }

  if (previous[2] >= z + padding && position[2] < z + padding) {
    position[2] = z + padding
  }
  else if (previous[2] <= z - padding && position[2] > z - padding) {
    position[2] = z - padding
  }
}

function collideVerticalWall(
  position: Vec3,
  previous: Vec3,
  x: number,
  back: number,
  front: number,
  padding: number,
) {
  if (!segmentOverlaps(previous[2], position[2], back, front, padding)) {
    return
  }

  if (previous[0] >= x + padding && position[0] < x + padding) {
    position[0] = x + padding
  }
  else if (previous[0] <= x - padding && position[0] > x - padding) {
    position[0] = x - padding
  }
}

function segmentOverlaps(a: number, b: number, min: number, max: number, padding: number) {
  return Math.max(a, b) > min - padding && Math.min(a, b) < max + padding
}

function inBounds(x: number, z: number, bounds: Bounds) {
  return x > bounds.x - bounds.width / 2 && x < bounds.x + bounds.width / 2
    && z > bounds.z - bounds.depth / 2 && z < bounds.z + bounds.depth / 2
}

function inBoundsInclusive(x: number, z: number, bounds: Bounds, padding = 0) {
  return x >= bounds.x - bounds.width / 2 - padding && x <= bounds.x + bounds.width / 2 + padding
    && z >= bounds.z - bounds.depth / 2 - padding && z <= bounds.z + bounds.depth / 2 + padding
}

function onOutsideRooftopPath(position: Vec3) {
  return onOutsideRooftopPathAt(position[0], position[1], position[2])
}

function onOutsideRooftopPathAt(x: number, y: number, z: number) {
  const stairs = outsideRooftopStairPathHeight(x, z)

  return (stairs !== undefined && y > stairs - platformStep)
    || ((inBoundsInclusive(x, z, outsideRooftop) || inBoundsInclusive(x, z, outsideRooftopLanding))
      && y > outsideRooftopTop - platformStep)
}

export function onOutsideRooftopStairPath(position: Vec3) {
  const stairs = outsideRooftopStairPathHeight(position[0], position[2])

  return stairs !== undefined && position[1] > stairs - platformStep
}

function onUpstairsRoof(position: Vec3) {
  return position[1] > upstairsRoofHeight - platformStep
    && inBoundsInclusive(position[0], position[2], outsideRooftop)
}

function collideOutsideRooftopPath(position: Vec3, previous?: Vec3) {
  const fromPath = previous ? onOutsideRooftopPath(previous) : onOutsideRooftopPath(position)
  const stairHeight = outsideRooftopStairHeightAtZ(position[2])
  const currentStairPath = outsideRooftopStairPathHeight(position[0], position[2]) !== undefined
  const previousStairPath = previous !== undefined
    && outsideRooftopStairPathHeight(previous[0], previous[2]) !== undefined
  const inStairPath = currentStairPath || previousStairPath
  const inLandingZ = inOutsideRooftopLandingZ(position[2])
  const nearLandingZ = inOutsideRooftopLandingZ(position[2], outsideRooftopLandingTransitionPadding)
  const landingLeft = outsideRooftopLanding.x - outsideRooftopLanding.width / 2
  const landingRight = outsideRooftopLanding.x + outsideRooftopLanding.width / 2
  const landingBack = outsideRooftopLanding.z - outsideRooftopLanding.depth / 2
  const landingFront = outsideRooftopLanding.z + outsideRooftopLanding.depth / 2
  const roofLeft = outsideRooftop.x - outsideRooftop.width / 2
  const roofRight = outsideRooftop.x + outsideRooftop.width / 2
  const roofBack = outsideRooftop.z - outsideRooftop.depth / 2
  const roofFront = outsideRooftop.z + outsideRooftop.depth / 2
  const landingExit = roofLeft + outsideRooftopLandingTransitionPadding

  if (previous) {
    collideOutsideRooftopSideWall(position, previous, roofLeft, roofBack, landingBack)
    collideOutsideRooftopSideWall(position, previous, roofLeft, landingFront, roofFront)
  }

  const fromRoofSide = previous !== undefined && inBoundsInclusive(previous[0], previous[2], outsideRooftop)
    && !inBoundsInclusive(previous[0], previous[2], outsideRooftopLanding)
    && previous[1] > outsideRooftopTop - platformStep
  const fromLandingSide = previous === undefined || inBoundsInclusive(previous[0], previous[2], outsideRooftopLanding)
    || (nearLandingZ && previous[0] < landingExit)
  const fromStairSide = previous !== undefined && previousStairPath && previous[0] < roofLeft
  const crossingToRoof = nearLandingZ && position[1] > outsideRooftopTop - platformStep && position[0] > landingRight

  if (fromRoofSide && currentStairPath && !inLandingZ && position[1] > outsideRooftopTop - platformStep) {
    position[0] = Math.max(position[0], roofLeft)
    return
  }

  if (!crossingToRoof && fromLandingSide && fromPath && inStairPath && stairHeight !== undefined
    && position[1] > stairHeight - platformStep)
  {
    const stairs = outsideRooftopStairs
    const left = stairs.x - stairs.width / 2 + outsideRooftopStairSideInset
    const right = stairs.x + stairs.width / 2 - outsideRooftopStairSideInset
    const topTransition = nearLandingZ && position[1] > outsideRooftopTop - platformStep

    position[0] = clamp(position[0], topTransition ? Math.min(left, landingLeft) : left,
      topTransition ? Math.max(right, landingRight) : right)
    if (topTransition && !currentStairPath) {
      position[2] = clamp(position[2], landingBack, landingFront)
    }
    return
  }

  if (fromStairSide && currentStairPath && stairHeight !== undefined && position[1] > stairHeight - platformStep) {
    const stairs = outsideRooftopStairs

    position[0] = clamp(position[0], stairs.x - stairs.width / 2 + outsideRooftopStairSideInset,
      stairs.x + stairs.width / 2 - outsideRooftopStairSideInset)
    return
  }

  if (fromPath && nearLandingZ && position[0] < landingExit && position[1] > outsideRooftopTop - platformStep) {
    position[0] = clamp(position[0], landingLeft, landingExit)
    position[2] = clamp(position[2], landingBack, landingFront)
    return
  }

  if (!fromPath || position[1] <= outsideRooftopTop - platformStep) {
    collideUnderOutsideRooftopStairs(position, previous)
    return
  }

  position[0] = clamp(position[0], inLandingZ ? landingLeft : roofLeft,
    inLandingZ ? Math.max(roofRight, landingRight) : roofRight)
  position[2] = clamp(position[2], roofBack, roofFront)
}

function collideUnderOutsideRooftopStairs(position: Vec3, previous?: Vec3) {
  if (onOutsideRooftopPath(position)) {
    return
  }

  collidePaddedBoundsSides(position, paddedBounds(outsideRooftopLanding, 0.12), ['left', 'back'])

  const stairs = outsideRooftopStairs
  const front = stairs.z + stairs.depth / 2
  const bottomOpeningBack = front - 1.1

  if (position[0] < stairs.x - stairs.width / 2 - 0.12
    || position[0] > stairs.x + stairs.width / 2 + 0.12
    || position[2] < stairs.z - stairs.depth / 2 - 0.12
    || position[2] >= bottomOpeningBack)
  {
    return
  }

  if (previous && previous[2] >= bottomOpeningBack && position[2] < bottomOpeningBack) {
    position[2] = bottomOpeningBack
    return
  }

  collidePaddedBoundsSides(position, paddedBounds(stairs, 0.12), ['left', 'front'])
}

function collideSphereUnderOutsideRooftopStairs(position: Vec3, radius: number) {
  if (onOutsideRooftopPath(position)) {
    return
  }

  collidePaddedBounds(position, paddedBounds(outsideRooftopLanding, 0.12 + radius))

  const stairs = outsideRooftopStairs
  const front = stairs.z + stairs.depth / 2
  const bottomOpeningBack = front - 1.1
  const padding = 0.12 + radius

  if (position[0] < stairs.x - stairs.width / 2 - padding
    || position[0] > stairs.x + stairs.width / 2 + padding
    || position[2] < stairs.z - stairs.depth / 2 - padding
    || position[2] > bottomOpeningBack + padding)
  {
    return
  }

  collidePaddedBounds(position, {
    back: stairs.z - stairs.depth / 2 - padding,
    front: bottomOpeningBack + padding,
    left: stairs.x - stairs.width / 2 - padding,
    right: stairs.x + stairs.width / 2 + padding,
  })
}

function inOutsideRooftopStairWall(position: Vec3, clearance = 0) {
  return inOutsideRooftopStairWallAt(position[0], position[1], position[2], clearance)
}

function inOutsideRooftopStairWallAt(x: number, y: number, z: number, clearance = 0) {
  if (onOutsideRooftopPathAt(x, y, z)) {
    return false
  }

  if (inBoundsInclusive(x, z, outsideRooftopLanding, 0.12 + clearance)) {
    return true
  }

  const stairs = outsideRooftopStairs
  const front = stairs.z + stairs.depth / 2
  const bottomOpeningBack = front - 1.1

  return x >= stairs.x - stairs.width / 2 - 0.12 - clearance
    && x <= stairs.x + stairs.width / 2 + 0.12 + clearance
    && z >= stairs.z - stairs.depth / 2 - 0.12 - clearance
    && z <= bottomOpeningBack + clearance
}

function collideOutsideRooftopSideWall(position: Vec3, previous: Vec3, x: number, back: number, front: number) {
  if (previous[1] <= outsideRooftopTop - platformStep
    || !inBoundsInclusive(previous[0], previous[2], outsideRooftop)
    || !segmentOverlaps(previous[2], position[2], back, front, 0))
  {
    return
  }

  if (previous[0] >= x && position[0] < x) {
    position[0] = x
  }
}

function inOutsideRooftopLandingZ(z: number, padding = 0) {
  return z >= outsideRooftopLanding.z - outsideRooftopLanding.depth / 2 - padding
    && z <= outsideRooftopLanding.z + outsideRooftopLanding.depth / 2 + padding
}

function outsideRooftopStairHeight(x: number, z: number) {
  if (!inBoundsInclusive(x, z, outsideRooftopStairs)) {
    return undefined
  }

  return outsideRooftopStairHeightAtZ(z)
}

function outsideRooftopStairPathHeight(x: number, z: number) {
  const stairs = outsideRooftopStairs

  if (x < stairs.x - stairs.width / 2 + outsideRooftopStairSideInset - outsideRooftopStairSidePadding
    || x > stairs.x + stairs.width / 2 - outsideRooftopStairSideInset + outsideRooftopStairSidePadding
    || z < stairs.z - stairs.depth / 2
    || z > stairs.z + stairs.depth / 2)
  {
    return undefined
  }

  return outsideRooftopStairHeightAtZ(z)
}

function outsideRooftopStairHeightAtZ(z: number) {
  return characterFloor
    + clamp(outsideRooftopStairRiseAtZ(z) + outsideRooftopStairWalkLift, 0, outsideRooftopStairs.height)
}

function platformHeight(x: number, z: number, outside: boolean) {
  if (outside) {
    if (inPaddedBounds(x, z, outsideDjBoothCollision) || inPaddedBounds(x, z, tentDjBoothCollision)) {
      return djBoothTop
    }

    if (outsideDjSpeakerCollisions.some(bounds => inPaddedBounds(x, z, bounds))
      || tentDjSpeakerCollisions.some(bounds => inPaddedBounds(x, z, bounds)))
    {
      return speakerTop
    }

    const stageProp = outsideStageRockCollisions().find(prop => inPaddedBounds(x, z, prop.bounds))

    if (stageProp) {
      return stageProp.top
    }

    if (inPaddedBounds(x, z, outsideHutBarCollision)) {
      return barTop
    }

    return undefined
  }

  if (inPaddedBounds(x, z, djBoothCollision)) {
    return djBoothTop
  }

  if (djSpeakerCollisions.some(bounds => inPaddedBounds(x, z, bounds))) {
    return speakerTop
  }

  if (inPaddedBounds(x, z, bartenderBarCollision)) {
    return barTop
  }
}

function loftPlatformHeight(x: number, z: number, options?: HeightOptions) {
  if (inPaddedBounds(x, z, loftDjBoothCollision)) {
    return djBoothTop
  }

  if (loftDjSpeakerCollisions.some(bounds => inPaddedBounds(x, z, bounds))) {
    return speakerTop
  }

  if (options?.couches !== false && loftCouchCollisions.some(bounds => inPaddedBounds(x, z, bounds))) {
    return couchTop
  }

  if (loftTableCollisions.some(bounds => inPaddedBounds(x, z, bounds))) {
    return tableTop
  }
}

function onPaddedPlatform(position: Vec3, bounds: PaddedBounds, height: number) {
  return position[1] > height - platformStep && inPaddedBounds(position[0], position[2], bounds)
}

export function onOutsideDuckPlatform(position: Vec3, duck?: Vec3) {
  return onDuckPlatform(position, duck)
}

function duckCollision(): PaddedPlatform {
  return {
    bounds: paddedBounds(duckBoundsAt(), 0.18),
    top: duckPlatformTop(),
  }
}

function duckCollisionRadius() {
  const bounds = duckBoundsAt()

  return Math.hypot(bounds.width, bounds.depth) * 0.5 + 0.18
}

function duckPlatformHeight(x: number, z: number) {
  const duck = duckCollision()

  return inPaddedBounds(x, z, duck.bounds) ? duck.top : undefined
}

function duckWalkable(x: number, z: number, y: number, clearance: number) {
  const duck = duckCollision()

  return !duckBlocksHeight(y) || !inPaddedBounds(x, z, duck.bounds, clearance)
}

function duckBlocksHeight(y: number) {
  return y > duckPosition[1] - platformStep && y < duckPlatformTop() + platformStep
}

function collideDuck(position: Vec3) {
  const duck = duckCollision()

  if (!onPaddedPlatform(position, duck.bounds, duck.top)) {
    collidePaddedBounds(position, duck.bounds)
  }
}

function outsideStageRockCollisions(): PaddedPlatform[] {
  return outsideStageRockPlatforms
}

function inPaddedBounds(x: number, z: number, bounds: PaddedBounds, clearance = 0) {
  return x > bounds.left - clearance && x < bounds.right + clearance
    && z > bounds.back - clearance && z < bounds.front + clearance
}

function inOrientedBounds(x: number, z: number, bounds: OrientedBounds, padding = 0) {
  const local = orientedLocalPoint(x, z, bounds)

  return Math.abs(local[0]) < bounds.width / 2 + padding && Math.abs(local[1]) < bounds.depth / 2 + padding
}

function inBuildingWall(x: number, z: number, padding: number, doorClearance = 0) {
  const left = roomBounds.left - padding
  const right = roomBounds.right + padding
  const back = roomBounds.back - padding
  const front = roomBounds.front + padding

  return x > left && x < right && z > back && z < front
    && !inBackDoorOpening(x, z, doorClearance)
}

function collidePaddedBounds(position: Vec3, bounds: PaddedBounds) {
  collidePaddedBoundsSides(position, bounds, ['left', 'right', 'back', 'front'])
}

function collidePaddedBoundsSides(position: Vec3, bounds: PaddedBounds, sides: PaddedBoundsSide[]) {
  const left = bounds.left
  const right = bounds.right
  const front = bounds.front
  const back = bounds.back

  if (position[0] > left && position[0] < right && position[2] > back && position[2] < front) {
    let side = sides[0]!
    let push = paddedBoundsSideDistance(position, bounds, side)

    for (let i = 1; i < sides.length; i++) {
      const nextSide = sides[i]!
      const nextPush = paddedBoundsSideDistance(position, bounds, nextSide)

      if (nextPush < push) {
        side = nextSide
        push = nextPush
      }
    }

    if (side === 'left') {
      position[0] = left
    }
    else if (side === 'right') {
      position[0] = right
    }
    else if (side === 'back') {
      position[2] = back
    }
    else {
      position[2] = front
    }
  }
}

function paddedBoundsSideDistance(position: Vec3, bounds: PaddedBounds, side: PaddedBoundsSide) {
  if (side === 'left') {
    return Math.abs(position[0] - bounds.left)
  }
  if (side === 'right') {
    return Math.abs(bounds.right - position[0])
  }
  if (side === 'back') {
    return Math.abs(position[2] - bounds.back)
  }

  return Math.abs(bounds.front - position[2])
}

function collideOrientedBounds(position: Vec3, bounds: OrientedBounds, padding = 0) {
  const local = orientedLocalPoint(position[0], position[2], bounds)
  const halfWidth = bounds.width / 2 + padding
  const halfDepth = bounds.depth / 2 + padding

  if (Math.abs(local[0]) < halfWidth && Math.abs(local[1]) < halfDepth) {
    const pushLeft = halfWidth + local[0]
    const pushRight = halfWidth - local[0]
    const pushBack = halfDepth + local[1]
    const pushFront = halfDepth - local[1]
    const push = Math.min(pushLeft, pushRight, pushBack, pushFront)

    if (push === pushLeft) {
      local[0] = -halfWidth
    }
    else if (push === pushRight) {
      local[0] = halfWidth
    }
    else if (push === pushBack) {
      local[1] = -halfDepth
    }
    else {
      local[1] = halfDepth
    }

    position[0] = bounds.x + local[0] * bounds.cos - local[1] * bounds.sin
    position[2] = bounds.z + local[0] * bounds.sin + local[1] * bounds.cos
  }
}

function collideSpherePaddedBounds(position: Vec3, radius: number, bounds: PaddedBounds, top: number) {
  if (sphereOverlapsHeight(position, radius, top)) {
    collidePaddedBounds(position, {
      back: bounds.back - radius,
      front: bounds.front + radius,
      left: bounds.left - radius,
      right: bounds.right + radius,
    })
  }
}

function collideSphereOrientedBounds(position: Vec3, radius: number, bounds: OrientedBounds, top: number) {
  if (sphereOverlapsHeight(position, radius, top)) {
    collideOrientedBounds(position, bounds, radius)
  }
}

function orientedLocalPoint(x: number, z: number, bounds: OrientedBounds): [number, number] {
  const dx = x - bounds.x
  const dz = z - bounds.z

  return [
    dx * bounds.cos + dz * bounds.sin,
    -dx * bounds.sin + dz * bounds.cos,
  ]
}

function sphereOverlapsHeight(position: Vec3, radius: number, top: number, bottom = characterFloor) {
  return position[1] - radius < top && position[1] + radius > bottom
}

function collideCircle(position: Vec3, bounds: CircleBounds, padding = 0.28) {
  const x = position[0] - bounds.x
  const z = position[2] - bounds.z
  const distance = Math.sqrt(x * x + z * z)
  const radius = bounds.radius + padding

  if (distance < radius) {
    position[0] = bounds.x + x / distance * radius
    position[2] = bounds.z + z / distance * radius
  }
}

function collidePolygon(position: Vec3, points: Vec3[], padding = 0) {
  const inside = pointInPolygon(position[0], position[2], points)

  if (!inside && !inPolygon(position[0], position[2], points, padding)) {
    return
  }

  let distanceSq = Infinity
  let closest: [number, number] = [0, 0]

  for (let i = 0; i < points.length; i++) {
    const point = closestSegmentPoint(position[0], position[2], points[i]!, points[(i + 1) % points.length]!)
    const dx = position[0] - point[0]
    const dz = position[2] - point[1]
    const nextDistanceSq = dx * dx + dz * dz

    if (nextDistanceSq < distanceSq) {
      distanceSq = nextDistanceSq
      closest = point
    }
  }

  const dx = position[0] - closest[0]
  const dz = position[2] - closest[1]
  const distance = Math.sqrt(distanceSq)
  const direction = inside ? -1 : 1

  position[0] = closest[0] + dx / distance * padding * direction
  position[2] = closest[1] + dz / distance * padding * direction
}

function inCircle(x: number, z: number, bounds: CircleBounds, clearance = 0) {
  const dx = x - bounds.x
  const dz = z - bounds.z
  const radius = bounds.radius + 0.28 + clearance

  return dx * dx + dz * dz < radius * radius
}

export function inLake(x: number, z: number, clearance = 0) {
  return inPolygon(x, z, outsideLakeWaterShore, clearance) && !inPolygon(x, z, outsideLakeIslandShore, clearance)
}

export function inLakeShore(x: number, z: number, clearance = 0) {
  return inPolygon(x, z, outsideLakeShore, clearance)
}

export function inPolygon(x: number, z: number, points: Vec3[], clearance = 0) {
  const plan = polygonPlan(points)

  if (x < plan.left - clearance || x > plan.right + clearance || z < plan.back - clearance
    || z > plan.front + clearance)
  {
    return false
  }

  if (clearance > 0 && polygonDistanceSq(x, z, plan, clearance * clearance) < clearance * clearance) {
    return true
  }

  return pointInPolygonPlan(x, z, plan)
}

function pointInPolygon(x: number, z: number, points: Vec3[]) {
  return pointInPolygonPlan(x, z, polygonPlan(points))
}

function pointInPolygonPlan(x: number, z: number, plan: PolygonPlan) {
  const xs = plan.xs
  const zs = plan.zs
  let inside = false

  for (let i = 0, j = xs.length - 1; i < xs.length; j = i++) {
    const ax = xs[i]!
    const az = zs[i]!
    const bx = xs[j]!
    const bz = zs[j]!

    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) {
      inside = !inside
    }
  }

  return inside
}

function polygonDistanceSq(x: number, z: number, plan: PolygonPlan, stopDistanceSq = Infinity) {
  const xs = plan.xs
  const zs = plan.zs
  let distanceSq = Infinity

  for (let i = 0; i < xs.length; i++) {
    const nextIndex = (i + 1) % xs.length
    const ax = xs[i]!
    const az = zs[i]!
    const edgeX = xs[nextIndex]! - ax
    const edgeZ = zs[nextIndex]! - az
    const t = clamp(((x - ax) * edgeX + (z - az) * edgeZ) / (edgeX * edgeX + edgeZ * edgeZ), 0, 1)
    const dx = x - (ax + edgeX * t)
    const dz = z - (az + edgeZ * t)

    distanceSq = Math.min(distanceSq, dx * dx + dz * dz)
    if (distanceSq < stopDistanceSq) {
      return distanceSq
    }
  }

  return distanceSq
}

function polygonPlan(points: Vec3[]) {
  let plan = polygonPlans.get(points)

  if (plan) {
    return plan
  }

  let left = Infinity
  let right = -Infinity
  let back = Infinity
  let front = -Infinity
  const xs = new Float64Array(points.length)
  const zs = new Float64Array(points.length)

  for (let i = 0; i < points.length; i++) {
    const point = points[i]!

    xs[i] = point[0]
    zs[i] = point[2]
    left = Math.min(left, point[0])
    right = Math.max(right, point[0])
    back = Math.min(back, point[2])
    front = Math.max(front, point[2])
  }

  plan = { back, front, left, right, xs, zs }
  polygonPlans.set(points, plan)

  return plan
}

function closestSegmentPoint(x: number, z: number, a: Vec3, b: Vec3): [number, number] {
  const dx = b[0] - a[0]
  const dz = b[2] - a[2]
  const t = clamp(((x - a[0]) * dx + (z - a[2]) * dz) / (dx * dx + dz * dz), 0, 1)

  return [a[0] + dx * t, a[2] + dz * t]
}
