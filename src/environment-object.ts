import { characterFloor } from './character-data.ts'
import { electricNavy } from './constants.ts'
import { addBox, addDisc, addFlatPolygon, addFlatPolygonRing, addGrassQuad, addQuad, addTriangle, pack, packSmoke,
  polygonCenter, tShirtHaze } from './geometry.ts'
import { tShirtLogoTextureBounds } from './graffiti.ts'
import { add, mix, scale, subtract } from './math.ts'
import { backDoor, bartenderBar, bartenderStools, djBooth, djSpeakers, insideSideLightZs, landscapeBounds,
  outsideBounds, outsideCouches, outsideDjBooth, outsideDjSpeakers, outsideHut, outsideHutBar, outsideHutBarStools,
  outsideHutDeckHeight, outsideHutRoofBottom, outsideHutRoofEave, outsideHutRoofRidge, outsidePhotoWall,
  outsideRooftop, outsideRooftopLanding, outsideRooftopStairRiseAtZ,
  outsideRooftopStairs, outsideScheduleWall, outsideStage, outsideLakeIslandShore, outsideLakeSandInnerShore,
  outsideLakeShore, outsideLakeWaterShore, outsideToiletDoor, outsideToilets, outsideTShirtStands,
  outsideVideoScreenWall, roomBounds, tent, tentCenterBench, tentDjBooth, tentDjSpeakers, tentDoor, tentDoorAngle,
  tentPole, tentVideoAngle, tentVideoWall, type TShirtStand, upstairsBar, upstairsBarCounterRail,
  upstairsBarDrinkCounter, upstairsBarStools, upstairsCouches, upstairsDjBooth, upstairsDjSpeakers, upstairsDoor,
  upstairsRoofThickness, upstairsVideoWall, upstairsWallHeight } from './scene-data.ts'
import { strobeTarget } from './strobe-object.ts'
import type { Bounds, StrobeLight, Vec3, Vertex, VideoZone } from './types.ts'

export function addRoom(target: Vertex[]) {
  const dark: [number, number, number] = [0.032, 0.032, 0.038]
  const wall: [number, number, number] = [0.025, 0.023, 0.028]
  const ceiling: [number, number, number] = [0.016, 0.016, 0.02]
  const doorLeft = backDoor.x - backDoor.width / 2
  const doorRight = backDoor.x + backDoor.width / 2

  addQuad(target, [-7, -2, 4], [7, -2, 4], [7, -2, -24], [-7, -2, -24], dark, 0)
  addQuad(target, [-7, 5, -24], [7, 5, -24], [7, 5, 4], [-7, 5, 4], ceiling, 0)
  addQuad(target, [-7, -2, -24], [-7, 5, -24], [-7, 5, 4], [-7, -2, 4], wall, 0)
  addQuad(target, [7, -2, 4], [7, 5, 4], [7, 5, -24], [7, -2, -24], wall, 0)
  addQuad(target, [-7, -2, -24], [7, -2, -24], [7, 5, -24], [-7, 5, -24], [0.028, 0.022, 0.028], 0)
  addOutside(target)
  addQuad(target, [doorLeft, -2, 4], [-7, -2, 4], [-7, 5, 4], [doorLeft, 5, 4], [0.028, 0.022, 0.028], 0)
  addQuad(target, [7, -2, 4], [doorRight, -2, 4], [doorRight, 5, 4], [7, 5, 4], [0.028, 0.022, 0.028], 0)
  addQuad(target, [doorRight, backDoor.height - 2, 4], [doorLeft, backDoor.height - 2, 4], [doorLeft, 5, 4], [doorRight,
    5, 4], [0.028, 0.022, 0.028], 0)
  addBox(target, doorLeft - 0.05, -2 + backDoor.height / 2, 4.035, 0.1, backDoor.height, 0.08, [0.025, 0.035, 0.023],
    0.04)
  addBox(target, doorRight + 0.05, -2 + backDoor.height / 2, 4.035, 0.1, backDoor.height, 0.08, [0.025, 0.035, 0.023],
    0.04)
  addBox(target, backDoor.x, -2 + backDoor.height + 0.05, 4.035, backDoor.width + 0.2, 0.1, 0.08, [0.025, 0.035, 0.023],
    0.04)
  addQuad(target, [doorRight, -2, 4], [doorLeft, -2, 4], [doorLeft, -2 + backDoor.height, 4], [doorRight,
    -2 + backDoor.height, 4], [0.001, 0.001, 0.001], 0, 9001)
  addOutsideVideoBackdrop(target)
  addOutsideWallBackdrop(target, outsidePhotoWall)
  addOutsideWallBackdrop(target, outsideScheduleWall)
  addDoorPerimeterStripes(target)
  addBartenderBar(target)
  addDjBooth(target)
}

function addOutsideVideoBackdrop(target: Vertex[]) {
  const wall = outsideVideoScreenWall
  const left = wall.x - wall.width / 2
  const right = wall.x + wall.width / 2
  const bottom = wall.y - wall.height / 2
  const top = wall.y + wall.height / 2
  const color: Vec3 = [0.001, 0.001, 0.001]
  const z = wall.z

  addQuad(target, [right, bottom, z], [left, bottom, z], [left, top, z], [right, top, z], color, 0)
}

function addOutsideWallBackdrop(target: Vertex[], wall: typeof outsidePhotoWall) {
  const back = wall.z - wall.width / 2
  const front = wall.z + wall.width / 2
  const bottom = wall.y - wall.height / 2
  const top = wall.y + wall.height / 2
  const height = top - bottom
  const x = wall.x - 0.06
  const floor = -1.95
  const color: Vec3 = [0.002, 0.003, 0.006]
  const brace: Vec3 = [0.004, 0.004, 0.005]
  const frame: Vec3 = [0.02, 0.62, 0.92]
  const glow = 2.2

  addQuad(target, [x, bottom, front], [x, bottom, back], [x, top, back], [x, top, front], color, 0.02)
  addBox(target, x, wall.y, back - 0.06, 0.12, height + 0.26, 0.12, frame, glow)
  addBox(target, x, wall.y, front + 0.06, 0.12, height + 0.26, 0.12, frame, glow)
  addBox(target, x, bottom - 0.06, wall.z, 0.12, 0.12, wall.width + 0.36, frame, glow)
  addBox(target, x, top + 0.06, wall.z, 0.12, 0.12, wall.width + 0.36, frame, glow)
  addWallPost(target, x, back + 0.24, bottom - 0.02, floor)
  addWallPost(target, x, wall.z, bottom - 0.02, floor)
  addWallPost(target, x, front - 0.24, bottom - 0.02, floor)
  addWallBrace(target, x, back + 0.34, bottom + 0.68, floor + 0.08)
  addWallBrace(target, x, front - 0.34, bottom + 0.68, floor + 0.08)
  addWallBrace(target, x, wall.z, top - 0.18, floor + 0.08)
}

function addWallPost(target: Vertex[], x: number, z: number, top: number, bottom: number) {
  const brace: Vec3 = [0.004, 0.004, 0.005]
  const height = top - bottom

  addBox(target, x, bottom + height / 2, z, 0.14, height, 0.14, brace, 0)
}

function addWallBrace(target: Vertex[], x: number, z: number, top: number, bottom: number) {
  const brace: Vec3 = [0.004, 0.004, 0.005]
  const backX = x - 0.92
  const half = 0.055

  addQuad(target, [backX, bottom, z - half], [backX, bottom, z + half], [x, top, z + half], [x, top, z - half], brace,
    0)
  addQuad(target, [backX + 0.12, bottom, z + half], [backX + 0.12, bottom, z - half], [x + 0.12, top, z - half], [
    x + 0.12,
    top,
    z + half,
  ], brace, 0)
}

function addDoorPerimeterStripes(target: Vertex[]) {
  const left = backDoor.x - backDoor.width / 2 - 0.14
  const right = backDoor.x + backDoor.width / 2 + 0.14
  const bottom = -1.82
  const top = -2 + backDoor.height + 0.18
  const width = right - left
  const height = top - bottom
  const glow = 3.2

  addDoorPerimeterFrame(target, roomBounds.front - 0.08, left, right, bottom, top, width, height, electricNavy, glow)
  addDoorPerimeterFrame(target, roomBounds.front + 0.08, left, right, bottom, top, width, height, [0.95, 0.02, 0.015],
    glow)
}

function addDoorPerimeterFrame(
  target: Vertex[],
  z: number,
  left: number,
  right: number,
  bottom: number,
  top: number,
  width: number,
  height: number,
  color: Vec3,
  glow: number,
) {
  addBox(target, left, bottom + height / 2, z, 0.11, height, 0.06, color, glow)
  addBox(target, right, bottom + height / 2, z, 0.11, height, 0.06, color, glow)
  addBox(target, left + width / 2, top, z, width + 0.11, 0.11, 0.06, color, glow)
}

function addBartenderBar(target: Vertex[]) {
  const body: Vec3 = [0.026, 0.016, 0.018]
  const top: Vec3 = [0.006, 0.006, 0.008]
  const metal: Vec3 = [0.055, 0.052, 0.052]
  const seat: Vec3 = [0.014, 0.012, 0.013]
  const bottle: Vec3 = [0.16, 0.028, 0.018]
  const y = -2

  addBox(target, bartenderBar.x, y + 0.38, bartenderBar.z, bartenderBar.width, 0.76, bartenderBar.depth, body, 0)
  addBox(target, bartenderBar.x, y + 0.8, bartenderBar.z - 0.03, bartenderBar.width + 0.24, 0.12,
    bartenderBar.depth + 0.32, top, 0)
  for (const shelfY of [0.98, 1.58]) {
    addBox(target, bartenderBar.x, y + shelfY, roomBounds.front - 0.18, bartenderBar.width + 0.12, 0.08, 0.16, top, 0)

    for (let i = 0; i < 8; i++) {
      const x = bartenderBar.x - 1.38 + i * 0.39
      const height = 0.27 + (i % 3) * 0.07
      addBox(target, x, y + shelfY + 0.06 + height / 2, roomBounds.front - 0.28, 0.1, height, 0.1, bottle, 0.18)
    }
  }

  for (const stool of bartenderStools) {
    addBox(target, stool.x, y + 0.27, stool.z, 0.06, 0.54, 0.06, metal, 0)
    addDisc(target, [stool.x, y + 0.56, stool.z], 0.2, 0.2, 'y', seat, 0)
    addDisc(target, [stool.x, y + 0.04, stool.z], 0.15, 0.15, 'y', metal, 0)
  }
}

function addOutside(target: Vertex[]) {
  const floor = -1.95

  addGrassQuad(target, [landscapeBounds.left, floor, landscapeBounds.front], [landscapeBounds.right, floor,
    landscapeBounds.front], [landscapeBounds.right, floor, roomBounds.front], [landscapeBounds.left, floor,
    roomBounds.front])
  addGrassQuad(target, [roomBounds.left, floor, roomBounds.front], [landscapeBounds.left, floor, roomBounds.front], [
    landscapeBounds.left,
    floor,
    roomBounds.back,
  ], [roomBounds.left, floor, roomBounds.back])
  addGrassQuad(target, [landscapeBounds.right, floor, roomBounds.front], [roomBounds.right, floor, roomBounds.front], [
    roomBounds.right,
    floor,
    roomBounds.back,
  ], [landscapeBounds.right, floor, roomBounds.back])
  addGrassQuad(target, [landscapeBounds.left, floor, roomBounds.back], [landscapeBounds.right, floor, roomBounds.back],
    [landscapeBounds.right, floor, landscapeBounds.back], [landscapeBounds.left, floor, landscapeBounds.back])
  addOutsideRooftop(target, floor)
  addOutsideRooftopStairs(target, floor)
  addOutsideLake(target)
  addOpenAirHut(target, floor)
  addOutsideLounges(target, floor)
  addOutsideTShirtStands(target, floor)
  addOutsideToilets(target, floor)
  addOutsideStage(target, floor)
  addDjBoothAt(target, outsideDjBooth, outsideDjSpeakers, -1, electricNavy, 3.2)
  addTent(target, floor)
}

function addOutsideLake(target: Vertex[]) {
  const water = outsideLakeWaterShore.map(point => [point[0], point[1] + 0.012, point[2]] as Vec3)

  addFlatPolygonRing(target, outsideLakeShore, outsideLakeSandInnerShore, [0.52, 0.42, 0.17], 0.02)
  addFlatPolygonRing(target, outsideLakeSandInnerShore, outsideLakeWaterShore, [0.36, 0.32, 0.16], 0.02)
  addFlatPolygon(target, water, [0.035, 0.42, 0.62], 0.16, 3)
  addOutsideLakeIsland(target)
}

function addOutsideLakeIsland(target: Vertex[]) {
  const center = polygonCenter(outsideLakeIslandShore)
  const inner = outsideLakeIslandShore.map((point, index) => {
    const angle = Math.PI * 2 * index / outsideLakeIslandShore.length
    const width = 0.2 + Math.sin(angle * 4 - 0.2) * 0.035 + Math.sin(angle * 9 + 1.7) * 0.02

    return [
      point[0] + (center[0] - point[0]) * width,
      point[1],
      point[2] + (center[2] - point[2]) * width,
    ] as Vec3
  })

  addFlatPolygonRing(target, outsideLakeIslandShore, inner, [0.55, 0.44, 0.18], 0.02)
  addFlatPolygon(target, inner, [0.44, 0.36, 0.15], 0.02)
}

function addOutsideRooftop(target: Vertex[], floor: number) {
  const y = floor + outsideRooftop.height
  const surface: Vec3 = [0.13, 0.135, 0.14]
  const edge: Vec3 = [0.13, 0.135, 0.14]
  const left = outsideRooftop.x - outsideRooftop.width / 2
  const right = outsideRooftop.x + outsideRooftop.width / 2
  const back = outsideRooftop.z - outsideRooftop.depth / 2
  const front = outsideRooftop.z + outsideRooftop.depth / 2
  const landingBack = outsideRooftopLanding.z - outsideRooftopLanding.depth / 2
  const landingFront = outsideRooftopLanding.z + outsideRooftopLanding.depth / 2

  addQuad(target, [left, y, front], [right, y, front], [right, y, back], [left, y, back], surface, 0)
  addBox(target, outsideRooftop.x, y + 0.015, roomBounds.back - 0.06, outsideRooftop.width, 0.05, 0.12, edge, 0)
  addBox(target, outsideRooftop.x, y + 0.015, roomBounds.front + 0.06, outsideRooftop.width, 0.05, 0.12, edge, 0)
  addBox(target, roomBounds.left - 0.06, y + 0.015, (back + landingBack) / 2, 0.12, 0.05, landingBack - back, edge, 0)
  addBox(target, roomBounds.left - 0.06, y + 0.015, (landingFront + front) / 2, 0.12, 0.05, front - landingFront, edge,
    0)
  addBox(target, roomBounds.right + 0.06, y + 0.015, outsideRooftop.z, 0.12, 0.05, outsideRooftop.depth, edge, 0)
  addUpstairsRoom(target, y)
}

function addUpstairsRoom(target: Vertex[], floor: number) {
  const wall: Vec3 = [0.16, 0.17, 0.18]
  const outsideWall: Vec3 = [0.003, 0.003, 0.004]
  const accent: Vec3 = [0.02, 0.62, 0.92]
  const roof: Vec3 = [0.13, 0.14, 0.15]
  const left = roomBounds.left
  const right = roomBounds.right
  const back = roomBounds.back
  const front = roomBounds.front
  const top = floor + upstairsWallHeight
  const wallY = floor + upstairsWallHeight / 2
  const doorBack = upstairsDoor.z - upstairsDoor.width / 2
  const doorFront = upstairsDoor.z + upstairsDoor.width / 2
  const coverBack = doorBack + 0.12
  const coverFront = doorFront - 0.12
  const coverBottom = floor + 0.14
  const coverTop = floor + upstairsDoor.height - 0.12

  addBox(target, outsideRooftop.x, top + upstairsRoofThickness / 2, outsideRooftop.z, outsideRooftop.width,
    upstairsRoofThickness, outsideRooftop.depth, roof, 0)
  addBox(target, outsideRooftop.x, wallY, back - 0.06, outsideRooftop.width, upstairsWallHeight, 0.12, wall, 0)
  addBox(target, outsideRooftop.x, wallY, front + 0.06, outsideRooftop.width, upstairsWallHeight, 0.12, wall, 0)
  addBox(target, right + 0.06, wallY, outsideRooftop.z, 0.12, upstairsWallHeight, outsideRooftop.depth, wall, 0)
  addBox(target, left - 0.06, wallY, (back + doorBack) / 2, 0.12, upstairsWallHeight, doorBack - back, wall, 0)
  addBox(target, left - 0.06, wallY, (doorFront + front) / 2, 0.12, upstairsWallHeight, front - doorFront, wall, 0)
  addBox(target, left - 0.06, floor + upstairsDoor.height + (upstairsWallHeight - upstairsDoor.height) / 2,
    upstairsDoor.z, 0.12, upstairsWallHeight - upstairsDoor.height, upstairsDoor.width, wall, 0)
  addUpstairsOutsideWallFaces(target, floor, outsideWall, doorBack, doorFront)
  addQuad(target, [left - 0.045, floor + 0.02, doorFront], [left - 0.045, floor + 0.02, doorBack], [left - 0.045,
    floor + upstairsDoor.height, doorBack], [left - 0.045, floor + upstairsDoor.height, doorFront], [0.001, 0.001,
    0.001], 0, 9002)
  addQuad(target, [left - 0.004, coverBottom, coverFront], [left - 0.004, coverBottom, coverBack], [left - 0.004,
    coverTop, coverBack], [left - 0.004, coverTop, coverFront], [0.001, 0.001, 0.001], 0)
  addQuad(target, [left - 0.016, coverBottom, coverBack], [left - 0.016, coverBottom, coverFront], [left - 0.016,
    coverTop, coverFront], [left - 0.016, coverTop, coverBack], [0.001, 0.001, 0.001], 0)
  addBox(target, left - 0.24, floor + upstairsDoor.height / 2, doorBack - 0.04, 0.09, upstairsDoor.height, 0.09, accent,
    2.2)
  addBox(target, left - 0.24, floor + upstairsDoor.height / 2, doorFront + 0.04, 0.09, upstairsDoor.height, 0.09,
    accent, 2.2)
  addBox(target, left - 0.24, floor + upstairsDoor.height + 0.04, upstairsDoor.z, 0.09, 0.08, upstairsDoor.width + 0.18,
    accent, 2.2)
  addBox(target, left + 0.045, floor + upstairsDoor.height / 2, doorBack - 0.04, 0.09, upstairsDoor.height, 0.09,
    accent, 2.2)
  addBox(target, left + 0.045, floor + upstairsDoor.height / 2, doorFront + 0.04, 0.09, upstairsDoor.height, 0.09,
    accent, 2.2)
  addBox(target, left + 0.045, floor + upstairsDoor.height + 0.04, upstairsDoor.z, 0.09, 0.08,
    upstairsDoor.width + 0.18, accent, 2.2)

  addUpstairsVideoBackdrop(target)
  addDjBoothAt(target, upstairsDjBooth, upstairsDjSpeakers, -1, [0.04, 0.75, 1], 3.1, floor)
  addUpstairsBar(target, floor)

  for (const couch of upstairsCouches) {
    addLowPolyCouch(target, couch, floor)
  }
}

function addUpstairsOutsideWallFaces(target: Vertex[], floor: number, color: Vec3, doorBack: number,
  doorFront: number)
{
  const left = roomBounds.left
  const right = roomBounds.right
  const back = roomBounds.back
  const front = roomBounds.front
  const bottom = floor + 0.02
  const top = floor + upstairsWallHeight - 0.02
  const doorTop = floor + upstairsDoor.height + 0.04
  const e = 0.128

  addQuad(target, [left, bottom, front + e], [right, bottom, front + e], [right, top, front + e], [left, top,
    front + e], color, 0)
  addQuad(target, [right, bottom, back - e], [left, bottom, back - e], [left, top, back - e], [right, top, back - e],
    color, 0)
  addQuad(target, [right + e, bottom, front], [right + e, bottom, back], [right + e, top, back], [right + e, top,
    front], color, 0)
  addQuad(target, [left - e, bottom, back], [left - e, bottom, doorBack], [left - e, top, doorBack], [left - e, top,
    back], color, 0)
  addQuad(target, [left - e, bottom, doorFront], [left - e, bottom, front], [left - e, top, front], [left - e, top,
    doorFront], color, 0)
  addQuad(target, [left - e, doorTop, doorBack], [left - e, doorTop, doorFront], [left - e, top, doorFront], [left - e,
    top, doorBack], color, 0)
}

function addUpstairsVideoBackdrop(target: Vertex[]) {
  const wall = upstairsVideoWall
  const left = wall.x - wall.width / 2
  const right = wall.x + wall.width / 2
  const bottom = wall.y - wall.height / 2
  const top = wall.y + wall.height / 2
  const z = wall.z

  addQuad(target, [left, bottom, z], [right, bottom, z], [right, top, z], [left, top, z], [0.001, 0.001, 0.004], 0)
}

function addUpstairsBar(target: Vertex[], floor: number) {
  const body: Vec3 = [0.035, 0.025, 0.035]
  const top: Vec3 = [0.006, 0.008, 0.011]
  const metal: Vec3 = [0.055, 0.058, 0.06]
  const seat: Vec3 = [0.028, 0.02, 0.032]
  const neon: Vec3 = [0.05, 0.9, 0.8]
  const bottleColors: Vec3[] = [[0.75, 0.12, 0.42], [0.08, 0.58, 0.85], [0.92, 0.72, 0.08], [0.18, 0.8, 0.38]]
  const rail = upstairsBarCounterRail
  const centerDepth = upstairsBar.depth - rail * 2

  addBox(target, upstairsBar.x, floor + 0.44, upstairsBar.z - upstairsBar.depth / 2 + rail / 2, upstairsBar.width, 0.88,
    rail, body, 0)
  addBox(target, upstairsBar.x, floor + 0.44, upstairsBar.z + upstairsBar.depth / 2 - rail / 2, upstairsBar.width, 0.88,
    rail, body, 0)
  addBox(target, upstairsBar.x - upstairsBar.width / 2 + rail / 2, floor + 0.44, upstairsBar.z, rail, 0.88, centerDepth,
    body, 0)
  addBox(target, upstairsBar.x + upstairsBar.width / 2 - rail / 2, floor + 0.44, upstairsBar.z, rail, 0.88, centerDepth,
    body, 0)

  addBox(target, upstairsBar.x, floor + 0.93, upstairsBar.z - upstairsBar.depth / 2 + rail / 2,
    upstairsBar.width + 0.28, 0.14, rail + 0.24, top, 0)
  addBox(target, upstairsBar.x, floor + 0.93, upstairsBar.z + upstairsBar.depth / 2 - rail / 2,
    upstairsBar.width + 0.28, 0.14, rail + 0.24, top, 0)
  addBox(target, upstairsBar.x - upstairsBar.width / 2 + rail / 2, floor + 0.93, upstairsBar.z, rail + 0.24, 0.14,
    centerDepth, top, 0)
  addBox(target, upstairsBar.x + upstairsBar.width / 2 - rail / 2, floor + 0.93, upstairsBar.z, rail + 0.24, 0.14,
    centerDepth, top, 0)

  addBox(target, upstairsBar.x, floor + 1.12, upstairsBar.z - upstairsBar.depth / 2 - 0.08, upstairsBar.width - 0.65,
    0.07, 0.06, neon, 3.0)
  addBox(target, upstairsBar.x, floor + 1.12, upstairsBar.z + upstairsBar.depth / 2 + 0.08, upstairsBar.width - 0.65,
    0.07, 0.06, [0.96, 0.08, 0.62], 3.0)
  addBox(target, upstairsBarDrinkCounter.x, floor + 0.42, upstairsBarDrinkCounter.z, upstairsBarDrinkCounter.width,
    0.84, upstairsBarDrinkCounter.depth, body, 0)
  addBox(target, upstairsBarDrinkCounter.x, floor + 0.89, upstairsBarDrinkCounter.z,
    upstairsBarDrinkCounter.width + 0.22, 0.12, upstairsBarDrinkCounter.depth + 0.22, top, 0)
  addBox(target, upstairsBarDrinkCounter.x, floor + 1.02,
    upstairsBarDrinkCounter.z - upstairsBarDrinkCounter.depth / 2 - 0.08, upstairsBarDrinkCounter.width, 0.06, 0.05, [
    0.96,
    0.72,
    0.08,
  ], 2.6)
  addBox(target, upstairsBarDrinkCounter.x, floor + 1.02,
    upstairsBarDrinkCounter.z + upstairsBarDrinkCounter.depth / 2 + 0.08, upstairsBarDrinkCounter.width, 0.06, 0.05, [
    0.05,
    0.9,
    0.8,
  ], 2.6)

  for (let i = 0; i < 16; i++) {
    const x = upstairsBarDrinkCounter.x - upstairsBarDrinkCounter.width * 0.36
      + (i % 8) * upstairsBarDrinkCounter.width * 0.1
    const z = upstairsBarDrinkCounter.z - upstairsBarDrinkCounter.depth * 0.24
      + Math.floor(i / 8) * upstairsBarDrinkCounter.depth * 0.48
    const color = bottleColors[i % bottleColors.length]!

    addBox(target, x, floor + 1.18 + (i % 3) * 0.04, z, 0.1, 0.3 + (i % 4) * 0.04, 0.1, color, 0.5)
  }

  for (const stool of upstairsBarStools) {
    addBox(target, stool.x, floor + 0.28, stool.z, 0.07, 0.56, 0.07, metal, 0)
    addDisc(target, [stool.x, floor + 0.58, stool.z], 0.2, 0.2, 'y', seat, 0)
    addDisc(target, [stool.x, floor + 0.05, stool.z], 0.15, 0.15, 'y', metal, 0)
  }
}

function addOutsideRooftopStairs(target: Vertex[], floor: number) {
  const concrete: Vec3 = [0.06, 0.062, 0.066]
  const tread: Vec3 = [0.095, 0.098, 0.1]
  const rail: Vec3 = [0.02, 0.64, 0.92]
  const stairs = outsideRooftopStairs
  const landing = outsideRooftopLanding
  const back = stairs.z - stairs.depth / 2
  const front = stairs.z + stairs.depth / 2
  const stepDepth = stairs.depth / stairs.steps
  const landingLift = 0.048
  const landingSideRailX = stairs.x - stairs.width / 2 - 0.08

  for (let i = 0; i < stairs.steps; i++) {
    const top = stairs.height * (i + 1) / stairs.steps
    const z = front - stepDepth * (i + 0.5)

    addBox(target, stairs.x, floor + top / 2, z, stairs.width, top, stepDepth + 0.025, concrete, 0)
  }

  addStairSideRail(target, landingSideRailX, floor, front, back, rail)

  addBox(target, landing.x, floor + landing.height - 0.04 + landingLift, landing.z, landing.width, 0.08, landing.depth,
    tread, 0)
  addRooftopLandingSideRail(target, floor, landing, landingSideRailX, landing.z - landing.depth / 2, back, rail)
  addRooftopLandingEndRail(target, floor, landing, landingSideRailX, rail)
}

function addStairSideRail(target: Vertex[], x: number, floor: number, front: number, back: number, color: Vec3) {
  const height = outsideRooftopStairRiseAtZ(back)

  addQuad(target, [x, floor + 0.32, front], [x, floor + 0.86, front], [x, floor + height + 0.86, back], [x,
    floor + height + 0.32, back], color, 0.32)
}

function addRooftopLandingSideRail(
  target: Vertex[],
  floor: number,
  landing: typeof outsideRooftopLanding,
  x: number,
  back: number,
  front: number,
  color: Vec3,
) {
  const y = floor + landing.height

  addQuad(target, [x, y + 0.32, front], [x, y + 0.86, front], [x, y + 0.86, back], [x, y + 0.32, back], color, 0.32)
}

function addRooftopLandingEndRail(
  target: Vertex[],
  floor: number,
  landing: typeof outsideRooftopLanding,
  left: number,
  color: Vec3,
) {
  const y = floor + landing.height
  const back = landing.z - landing.depth / 2
  const right = landing.x + landing.width / 2

  addQuad(target, [right, y + 0.32, back], [left, y + 0.32, back], [left, y + 0.86, back], [right, y + 0.86, back],
    color, 0.32)
}

function addOutsideToilets(target: Vertex[], floor: number) {
  const wall: Vec3 = [0.72, 0.64, 0.52]
  const inside: Vec3 = [0.12, 0.16, 0.17]
  const trim: Vec3 = [0.06, 0.08, 0.09]
  const doorGlow: Vec3 = [0.04, 0.7, 0.95]
  const roof: Vec3 = [0.04, 0.05, 0.06]
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
  const fixtureX = outsideToilets.x - doorSide * 1.35
  const bottom = floor
  const top = floor + 2.55

  addBox(target, outsideToilets.x, floor + 0.04, outsideToilets.z, outsideToilets.width, 0.08, outsideToilets.depth,
    inside, 0)
  addQuad(target, [right, bottom, front], [left, bottom, front], [left, top, front], [right, top, front], wall, 0)
  addQuad(target, [left, bottom, back], [right, bottom, back], [right, top, back], [left, top, back], wall, 0)
  addQuad(target, [oppositeX, bottom, back], [oppositeX, bottom, front], [oppositeX, top, front], [oppositeX, top,
    back], wall, 0)
  addQuad(target, [doorX, bottom, back], [doorX, bottom, doorBack], [doorX, top, doorBack], [doorX, top, back], wall, 0)
  addQuad(target, [doorX, bottom, doorFront], [doorX, bottom, front], [doorX, top, front], [doorX, top, doorFront],
    wall, 0)
  addQuad(target, [doorX, bottom + outsideToiletDoor.height, doorBack], [doorX, bottom + outsideToiletDoor.height,
    doorFront], [doorX, top, doorFront], [doorX, top, doorBack], wall, 0)
  addBox(target, outsideToilets.x, top + 0.08, outsideToilets.z, outsideToilets.width + 0.36, 0.16,
    outsideToilets.depth + 0.36, roof, 0)
  addBox(target, doorX + doorSide * 0.04, floor + outsideToiletDoor.height / 2, doorBack - 0.04, 0.12,
    outsideToiletDoor.height, 0.12, doorGlow, 1.3)
  addBox(target, doorX + doorSide * 0.04, floor + outsideToiletDoor.height / 2, doorFront + 0.04, 0.12,
    outsideToiletDoor.height, 0.12, doorGlow, 1.3)
  addBox(target, doorX + doorSide * 0.04, floor + outsideToiletDoor.height + 0.05, outsideToiletDoor.z, 0.12, 0.1,
    outsideToiletDoor.width + 0.22, doorGlow, 1.3)
  addBox(target, dividerX, floor + 1.38, outsideToilets.z, outsideToilets.width - 1.32, 2.1, 0.12, trim, 0)
  for (const z of [outsideToilets.z - 1.05, outsideToilets.z + 1.05]) {
    addBox(target, fixtureX, floor + 0.22, z, 0.52, 0.28, 0.68, [0.92, 0.9, 0.84], 0)
    addDisc(target, [outsideToilets.x - doorSide * 1.18, floor + 0.42, z], 0.26, 0.2, 'y', [0.95, 0.95, 0.9], 0)
    addBox(target, outsideToilets.x - doorSide * 1.55, floor + 0.9, z, 0.1, 0.72, 0.54, [0.9, 0.88, 0.82], 0)
  }
}

function addTent(target: Vertex[], floor: number) {
  const fuchsia: Vec3 = [0.16, 0.006, 0.11]
  const light: Vec3 = [0.28, 0.006, 0.17]
  const seat: Vec3 = [0.18, 0.012, 0.13]
  const segments = 36
  const apex: Vec3 = [tent.x, floor + tent.height, tent.z]
  const wallTop = floor + tent.wallHeight
  const doorCutoutHalf = Math.asin((tentDoor.width / 2 + 0.18) / tent.radius)

  addDisc(target, [tent.x, floor + 0.015, tent.z], tent.radius, tent.radius, 'y', [0.055, 0.018, 0.048], 0.15)

  for (let i = 0; i < segments; i++) {
    const a = Math.PI * 2 * i / segments
    const b = Math.PI * 2 * (i + 1) / segments
    const ax = tent.x + Math.sin(a) * tent.radius
    const az = tent.z + Math.cos(a) * tent.radius
    const bx = tent.x + Math.sin(b) * tent.radius
    const bz = tent.z + Math.cos(b) * tent.radius
    const doorA = Math.abs(angleDistance(a, tentDoorAngle)) < doorCutoutHalf
    const doorB = Math.abs(angleDistance(b, tentDoorAngle)) < doorCutoutHalf

    if (!doorA || !doorB) {
      addQuad(target, [ax, floor, az], [bx, floor, bz], [bx, wallTop, bz], [ax, wallTop, az], fuchsia, 0.16)
    }
    addTriangle(target, [ax, wallTop, az], [bx, wallTop, bz], apex, fuchsia, 0.16)
  }

  addTentDoorFrame(target, floor)
  addTentDoorOccluder(target, floor)
  addTentSeating(target, floor, seat)
  addTentPole(target, floor)
  addTentCenterBench(target, floor, seat)
  addTentDjBooth(target, light, 1.4)

  for (const z of [tent.z - 2.6, tent.z, tent.z + 2.6]) {
    addDisc(target, [tent.x, floor + 3.15, z], 0.34, 0.34, 'y', light, 1.4)
  }
}

function addTentDoorFrame(target: Vertex[], floor: number) {
  const fuchsia: Vec3 = [1, 0.03, 0.72]
  const side = [Math.cos(tentDoorAngle), 0, -Math.sin(tentDoorAngle)] as Vec3
  const left: Vec3 = [tentDoor.x - side[0] * (tentDoor.width / 2 + 0.06), floor + tentDoor.height / 2,
    tentDoor.z - side[2] * (tentDoor.width / 2 + 0.06)]
  const right: Vec3 = [tentDoor.x + side[0] * (tentDoor.width / 2 + 0.06), floor + tentDoor.height / 2,
    tentDoor.z + side[2] * (tentDoor.width / 2 + 0.06)]

  addBox(target, left[0], left[1], left[2], 0.12, tentDoor.height, 0.12, fuchsia, 3.2)
  addBox(target, right[0], right[1], right[2], 0.12, tentDoor.height, 0.12, fuchsia, 3.2)
  addBox(target, tentDoor.x, floor + tentDoor.height + 0.05, tentDoor.z, 0.12, 0.1, tentDoor.width + 0.24, fuchsia, 3.2)
}

function addTentDoorOccluder(target: Vertex[], floor: number) {
  const side = [Math.cos(tentDoorAngle), 0, -Math.sin(tentDoorAngle)] as Vec3
  const normal = [Math.sin(tentDoorAngle), 0, Math.cos(tentDoorAngle)] as Vec3
  const bottom = floor
  const top = floor + tentDoor.height
  const center: Vec3 = [tentDoor.x - normal[0] * 0.04, 0, tentDoor.z - normal[2] * 0.04]
  const left: Vec3 = [center[0] - side[0] * tentDoor.width / 2, 0, center[2] - side[2] * tentDoor.width / 2]
  const right: Vec3 = [center[0] + side[0] * tentDoor.width / 2, 0, center[2] + side[2] * tentDoor.width / 2]

  addQuad(target, [right[0], bottom, right[2]], [left[0], bottom, left[2]], [left[0], top, left[2]], [right[0], top,
    right[2]], [0.001, 0.001, 0.001], 0)
}

function addTentPole(target: Vertex[], floor: number) {
  const segments = 18
  const bottom = floor
  const top = floor + tent.height
  const color: Vec3 = [0.05, 0.018, 0.045]

  for (let i = 0; i < segments; i++) {
    const a = Math.PI * 2 * i / segments
    const b = Math.PI * 2 * (i + 1) / segments
    const ax = tentPole.x + Math.cos(a) * tentPole.radius
    const az = tentPole.z + Math.sin(a) * tentPole.radius
    const bx = tentPole.x + Math.cos(b) * tentPole.radius
    const bz = tentPole.z + Math.sin(b) * tentPole.radius

    addQuad(target, [ax, bottom, az], [bx, bottom, bz], [bx, top, bz], [ax, top, az], color, 0.55)
  }
}

function addTentCenterBench(target: Vertex[], floor: number, color: Vec3) {
  const segments = 40
  const bottom = floor + 0.16
  const top = floor + 0.48
  const back = [color[0] * 0.62, color[1] * 0.62, color[2] * 0.62] as Vec3
  const trim = [0.052, 0.018, 0.044] as Vec3

  for (let i = 0; i < segments; i++) {
    const a = Math.PI * 2 * i / segments
    const b = Math.PI * 2 * (i + 1) / segments
    const outerA: Vec3 = [tentCenterBench.x + Math.cos(a) * tentCenterBench.outerRadius, top,
      tentCenterBench.z + Math.sin(a) * tentCenterBench.outerRadius]
    const outerB: Vec3 = [tentCenterBench.x + Math.cos(b) * tentCenterBench.outerRadius, top,
      tentCenterBench.z + Math.sin(b) * tentCenterBench.outerRadius]
    const innerA: Vec3 = [tentCenterBench.x + Math.cos(a) * tentCenterBench.innerRadius, top,
      tentCenterBench.z + Math.sin(a) * tentCenterBench.innerRadius]
    const innerB: Vec3 = [tentCenterBench.x + Math.cos(b) * tentCenterBench.innerRadius, top,
      tentCenterBench.z + Math.sin(b) * tentCenterBench.innerRadius]
    const outerBottomA: Vec3 = [outerA[0], bottom, outerA[2]]
    const outerBottomB: Vec3 = [outerB[0], bottom, outerB[2]]
    const innerBottomA: Vec3 = [innerA[0], bottom, innerA[2]]
    const innerBottomB: Vec3 = [innerB[0], bottom, innerB[2]]

    addQuad(target, innerA, innerB, outerB, outerA, color, 0.08)
    addQuad(target, outerBottomA, outerBottomB, outerB, outerA, back, 0.04)
    addQuad(target, innerBottomB, innerBottomA, innerA, innerB, color, 0.06)
    addQuad(target, innerBottomA, innerBottomB, outerBottomB, outerBottomA, trim, 0)
  }
}

function addTentSeating(target: Vertex[], floor: number, color: Vec3) {
  const segments = 56
  const outer = tent.radius - 0.52
  const inner = outer - 0.72
  const bottom = floor + 0.16
  const top = floor + 0.48
  const doorCutoutHalf = Math.asin((tentDoor.width / 2 + 0.28) / outer)
  const boothCutoutHalf = Math.asin(2.2 / outer)
  const back = [color[0] * 0.62, color[1] * 0.62, color[2] * 0.62] as Vec3
  const trim = [0.052, 0.018, 0.044] as Vec3

  for (let i = 0; i < segments; i++) {
    const a = Math.PI * 2 * i / segments
    const b = Math.PI * 2 * (i + 1) / segments

    if (inTentSeatCutout(a, doorCutoutHalf, boothCutoutHalf)
      || inTentSeatCutout(b, doorCutoutHalf, boothCutoutHalf))
    {
      continue
    }

    const outerA: Vec3 = [tent.x + Math.sin(a) * outer, top, tent.z + Math.cos(a) * outer]
    const outerB: Vec3 = [tent.x + Math.sin(b) * outer, top, tent.z + Math.cos(b) * outer]
    const innerA: Vec3 = [tent.x + Math.sin(a) * inner, top, tent.z + Math.cos(a) * inner]
    const innerB: Vec3 = [tent.x + Math.sin(b) * inner, top, tent.z + Math.cos(b) * inner]
    const outerBottomA: Vec3 = [outerA[0], bottom, outerA[2]]
    const outerBottomB: Vec3 = [outerB[0], bottom, outerB[2]]
    const innerBottomA: Vec3 = [innerA[0], bottom, innerA[2]]
    const innerBottomB: Vec3 = [innerB[0], bottom, innerB[2]]

    addQuad(target, innerA, innerB, outerB, outerA, color, 0.08)
    addQuad(target, outerBottomA, outerBottomB, outerB, outerA, back, 0.04)
    addQuad(target, innerBottomB, innerBottomA, innerA, innerB, color, 0.06)
    addQuad(target, innerBottomA, innerBottomB, outerBottomB, outerBottomA, trim, 0)
  }
}

function angleDistance(a: number, b: number) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b))
}

function inTentSeatCutout(angle: number, doorCutoutHalf: number, boothCutoutHalf: number) {
  return Math.abs(angleDistance(angle, tentDoorAngle)) < doorCutoutHalf
    || Math.abs(angleDistance(angle, tentVideoAngle)) < boothCutoutHalf
}

function addOutsideLounges(target: Vertex[], floor: number) {
  for (const couch of outsideCouches) {
    addLowPolyCouch(target, couch, floor)
  }

  addBonfireBase(target, floor)
}

function addOutsideTShirtStands(target: Vertex[], floor: number) {
  for (const stand of outsideTShirtStands) {
    addOutsideTShirtStand(target, stand, floor)
  }
}

function addOutsideTShirtStand(target: Vertex[], stand: TShirtStand, floor: number) {
  const metal: Vec3 = [0.052, 0.055, 0.06]
  const shirtColors: Vec3[] = [
    [0.018, 0.018, 0.02],
    [0.85, 0.04, 0.12],
    [1, 0.14, 0.62],
    [0.05, 0.42, 0.92],
    [0.55, 0.55, 0.58],
    [0.95, 0.72, 0.05],
    [0.04, 0.64, 0.32],
  ]
  const basis = tShirtStandBasis(stand)
  const top = floor + stand.height
  const postY = floor + (top - floor) / 2
  const postSize = 0.1
  const left = tShirtStandPoint(stand, basis, -stand.width / 2, postY, 0)
  const right = tShirtStandPoint(stand, basis, stand.width / 2, postY, 0)
  const shirtY = top - 0.34

  addTShirtStandBox(target, left, basis, postSize, top - floor, postSize, metal, 0)
  addTShirtStandBox(target, right, basis, postSize, top - floor, postSize, metal, 0)
  addTShirtStandBox(target, [stand.x, top, stand.z], basis, stand.width + postSize, postSize, postSize, metal, 0)

  for (let i = 0; i < shirtColors.length; i++) {
    const offset = -stand.width * 0.36 + stand.width * 0.72 * i / (shirtColors.length - 1)
    const center = tShirtStandPoint(stand, basis, offset, 0, 0)
    const color = shirtColors[i]!

    addFlatTShirt(target, center, basis, shirtY, color)
  }
}

function addFlatTShirt(target: Vertex[], center: Vec3, basis: TShirtStandBasis, y: number, color: Vec3) {
  const top = y + 0.3
  const bottom = y - 0.3
  const half = 0.18
  const sleeveIn = half
  const sleeveOut = 0.32
  const shoulderTop = top
  const shoulderBottom = top - 0.18
  const cuffTop = top - 0.1
  const cuffBottom = top - 0.34

  addQuad(target, tShirtPoint(center, basis, bottom, -half), tShirtPoint(center, basis, bottom, half),
    tShirtPoint(center, basis, top, half), tShirtPoint(center, basis, top, -half), color, 0, 0, tShirtHaze)
  addQuad(target, tShirtPoint(center, basis, shoulderTop, -sleeveIn),
    tShirtPoint(center, basis, shoulderBottom, -sleeveIn), tShirtPoint(center, basis, cuffBottom, -sleeveOut),
    tShirtPoint(center, basis, cuffTop, -sleeveOut), color, 0, 0, tShirtHaze)
  addQuad(target, tShirtPoint(center, basis, shoulderBottom, sleeveIn),
    tShirtPoint(center, basis, shoulderTop, sleeveIn), tShirtPoint(center, basis, cuffTop, sleeveOut),
    tShirtPoint(center, basis, cuffBottom, sleeveOut), color, 0, 0, tShirtHaze)
  addTShirtLogo(target, center, basis, y + 0.08, color)
}

function addTShirtLogo(target: Vertex[], center: Vec3, basis: TShirtStandBasis, y: number, color: Vec3) {
  const [u0, v0, u1, v1] = tShirtLogoTextureBounds()
  const halfWidth = 0.14
  const halfHeight = 0.029
  const haze = 7
  const lift = 0.012

  target.push(
    pack(tShirtPoint(center, basis, y - halfHeight, halfWidth, lift), color, 0, 0, u0, v1, haze),
    pack(tShirtPoint(center, basis, y - halfHeight, -halfWidth, lift), color, 0, 0, u1, v1, haze),
    pack(tShirtPoint(center, basis, y + halfHeight, -halfWidth, lift), color, 0, 0, u1, v0, haze),
    pack(tShirtPoint(center, basis, y - halfHeight, halfWidth, lift), color, 0, 0, u0, v1, haze),
    pack(tShirtPoint(center, basis, y + halfHeight, -halfWidth, lift), color, 0, 0, u1, v0, haze),
    pack(tShirtPoint(center, basis, y + halfHeight, halfWidth, lift), color, 0, 0, u0, v0, haze),
  )
}

type TShirtStandBasis = {
  axis: Vec3
  face: Vec3
}

function tShirtStandBasis(stand: TShirtStand): TShirtStandBasis {
  return {
    axis: [Math.cos(stand.turn), 0, Math.sin(stand.turn)],
    face: [-Math.sin(stand.turn), 0, Math.cos(stand.turn)],
  }
}

function tShirtStandPoint(
  stand: TShirtStand,
  basis: TShirtStandBasis,
  axisOffset: number,
  y: number,
  faceOffset: number,
): Vec3 {
  return [
    stand.x + basis.axis[0] * axisOffset + basis.face[0] * faceOffset,
    y,
    stand.z + basis.axis[2] * axisOffset + basis.face[2] * faceOffset,
  ]
}

function tShirtPoint(
  center: Vec3,
  basis: TShirtStandBasis,
  y: number,
  faceOffset: number,
  axisOffset = 0,
): Vec3 {
  return [
    center[0] + basis.axis[0] * axisOffset + basis.face[0] * faceOffset,
    y,
    center[2] + basis.axis[2] * axisOffset + basis.face[2] * faceOffset,
  ]
}

function addTShirtStandBox(
  target: Vertex[],
  center: Vec3,
  basis: TShirtStandBasis,
  width: number,
  height: number,
  depth: number,
  color: Vec3,
  glow: number,
) {
  const left = -width / 2
  const right = width / 2
  const back = -depth / 2
  const front = depth / 2
  const bottom = center[1] - height / 2
  const top = center[1] + height / 2
  const point = (axisOffset: number, y: number, faceOffset: number): Vec3 => [
    center[0] + basis.axis[0] * axisOffset + basis.face[0] * faceOffset,
    y,
    center[2] + basis.axis[2] * axisOffset + basis.face[2] * faceOffset,
  ]

  addQuad(target, point(left, bottom, front), point(right, bottom, front), point(right, top, front),
    point(left, top, front), color, glow)
  addQuad(target, point(right, bottom, back), point(left, bottom, back), point(left, top, back),
    point(right, top, back), color, glow)
  addQuad(target, point(left, bottom, back), point(left, bottom, front), point(left, top, front),
    point(left, top, back), color, glow)
  addQuad(target, point(right, bottom, front), point(right, bottom, back), point(right, top, back),
    point(right, top, front), color, glow)
  addQuad(target, point(left, top, front), point(right, top, front), point(right, top, back), point(left, top, back),
    color, glow)
  addQuad(target, point(left, bottom, back), point(right, bottom, back), point(right, bottom, front),
    point(left, bottom, front), color, glow)
}

export function addLowPolyCouch(
  target: Vertex[],
  couch: Bounds & { color: Vec3; face: 'east' | 'north' | 'south' | 'west' },
  floor: number,
) {
  const cushion = couch.color
  const shadow: Vec3 = [cushion[0] * 0.45, cushion[1] * 0.45, cushion[2] * 0.45]
  const trim: Vec3 = [0.035, 0.027, 0.024]
  const alongX = couch.width > couch.depth
  const width = couch.width
  const depth = couch.depth

  addBox(target, couch.x, floor + 0.19, couch.z, width, 0.24, depth, shadow, 0)
  addBox(target, couch.x, floor + 0.36, couch.z, width * 0.92, 0.2, depth * 0.82, cushion, 0)

  if (alongX) {
    const backZ = couch.z + (couch.face === 'north' ? -depth * 0.38 : depth * 0.38)

    addBox(target, couch.x, floor + 0.68, backZ, width, 0.64, 0.16, cushion, 0)
    addBox(target, couch.x - width * 0.45, floor + 0.48, couch.z, 0.18, 0.42, depth, shadow, 0)
    addBox(target, couch.x + width * 0.45, floor + 0.48, couch.z, 0.18, 0.42, depth, shadow, 0)
  }
  else {
    const backX = couch.x + (couch.face === 'east' ? -width * 0.38 : width * 0.38)

    addBox(target, backX, floor + 0.68, couch.z, 0.16, 0.64, depth, cushion, 0)
    addBox(target, couch.x, floor + 0.48, couch.z - depth * 0.45, width, 0.42, 0.18, shadow, 0)
    addBox(target, couch.x, floor + 0.48, couch.z + depth * 0.45, width, 0.42, 0.18, shadow, 0)
  }

  addBox(target, couch.x, floor + 0.08, couch.z, width * 0.72, 0.08, depth * 0.72, trim, 0)
}

function outsideBonfireCenter(): Vec3 {
  const couches = outsideCouches.slice(1, 3)
  const couchX = couches.reduce((total, couch) => total + couch.x, 0) / couches.length
  const x = couchX - 2.85
  const z = couches.reduce((total, couch) => total + couch.z, 0) / couches.length

  return [x, characterFloor + 0.02, z]
}

function addBonfireBase(target: Vertex[], floor: number) {
  const center = outsideBonfireCenter()

  addDisc(target, [center[0], floor + 0.03, center[2]], 0.72, 0.72, 'y', [0.32, 0.32, 0.34], 0)
}

function addBonfireFlame(target: Vertex[]) {
  const center = outsideBonfireCenter()
  const color: Vec3 = [1, 0.78, 0.05]
  const apex: Vec3 = [center[0], center[1] + 1.15, center[2]]
  const segments = 7
  const strobe = 777

  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    const b = ((i + 1) / segments) * Math.PI * 2
    const pointA: Vec3 = [center[0] + Math.cos(a) * 0.34, center[1], center[2] + Math.sin(a) * 0.34]
    const pointB: Vec3 = [center[0] + Math.cos(b) * 0.34, center[1], center[2] + Math.sin(b) * 0.34]

    target.push(
      pack(pointA, color, 3.4, strobe, 0, 0),
      pack(pointB, color, 3.4, strobe, 1, 0),
      pack(apex, color, 3.4, strobe, 0.5, 1),
    )
  }
}

function addOpenAirHut(target: Vertex[], floor: number) {
  const wood: Vec3 = [0.24, 0.13, 0.055]
  const darkWood: Vec3 = [0.11, 0.06, 0.032]
  const roof: Vec3 = [0.18, 0.052, 0.034]
  const trim: Vec3 = [0.032, 0.021, 0.014]
  const left = outsideHut.x - outsideHut.width / 2
  const right = outsideHut.x + outsideHut.width / 2
  const back = outsideHut.z - outsideHut.depth / 2
  const front = outsideHut.z + outsideHut.depth / 2
  const eave = outsideHutRoofEave
  const base = floor + outsideHutDeckHeight / 2
  const deckTop = floor + outsideHutDeckHeight
  const postTop = deckTop + 2.45
  const ridge = outsideHutRoofRidge
  const roofBottom = outsideHutRoofBottom
  const ridgeZ = outsideHut.z

  addBox(target, outsideHut.x, base, outsideHut.z, outsideHut.width + 0.35, outsideHutDeckHeight, outsideHut.depth
    + 0.35, darkWood, 0)

  for (const x of [left + 0.18, right - 0.18]) {
    for (const z of [back + 0.18, front - 0.18]) {
      addBox(target, x, deckTop + 1.22, z, 0.22, 2.44, 0.22, wood, 0)
    }
  }

  addBox(target, outsideHut.x, postTop, back + 0.16, outsideHut.width, 0.16, 0.14, trim, 0)
  addBox(target, outsideHut.x, postTop, front - 0.16, outsideHut.width, 0.16, 0.14, trim, 0)
  addBox(target, left + 0.16, postTop, outsideHut.z, 0.14, 0.16, outsideHut.depth, trim, 0)

  addQuad(target, [left - eave, roofBottom, back - eave], [right + eave, roofBottom, back - eave], [right + eave, ridge,
    ridgeZ], [left - eave, ridge, ridgeZ], roof, 0)
  addQuad(target, [right + eave, roofBottom, front + eave], [left - eave, roofBottom, front + eave], [left - eave,
    ridge, ridgeZ], [right + eave, ridge, ridgeZ], roof, 0)
  addTriangle(target, [left - eave, roofBottom, front + eave], [left - eave, roofBottom, back - eave], [left - eave,
    ridge, ridgeZ], roof, 0)
  addBox(target, outsideHut.x, ridge, ridgeZ, outsideHut.width + eave * 2.1, 0.12, 0.12, trim, 0)
  addOpenAirHutBar(target, deckTop)
}

function addOpenAirHutBar(target: Vertex[], floor: number) {
  const body: Vec3 = [0.22, 0.12, 0.052]
  const top: Vec3 = [0.09, 0.045, 0.022]
  const shelf: Vec3 = [0.12, 0.065, 0.032]
  const bottle: Vec3 = [0.02, 0.18, 0.72]
  const seat: Vec3 = [0.16, 0.08, 0.035]
  const leg: Vec3 = [0.07, 0.04, 0.025]
  const glow = 0.35
  const shelfX = outsideHut.x - outsideHut.width / 2 + 0.18
  const shelfDepth = outsideHut.depth - 0.36

  addBox(target, outsideHutBar.x, floor + 0.38, outsideHutBar.z, outsideHutBar.width, 0.76, outsideHutBar.depth, body,
    0)
  addBox(target, outsideHutBar.x + 0.03, floor + 0.8, outsideHutBar.z, outsideHutBar.width + 0.32, 0.12,
    outsideHutBar.depth + 0.24, top, 0)

  for (const shelfY of [0.98, 1.58]) {
    addBox(target, shelfX, floor + shelfY, outsideHutBar.z, 0.16, 0.08, shelfDepth, shelf, 0)

    for (let i = 0; i < 9; i++) {
      const z = outsideHutBar.z - shelfDepth * 0.4 + i * shelfDepth * 0.1
      const height = 0.28 + (i % 3) * 0.07

      addBox(target, shelfX + 0.08, floor + shelfY + 0.06 + height / 2, z, 0.1, height, 0.1, bottle, glow)
    }
  }

  for (const stool of outsideHutBarStools) {
    addBox(target, stool.x, floor + 0.28, stool.z, 0.07, 0.56, 0.07, leg, 0)
    addDisc(target, [stool.x, floor + 0.58, stool.z], 0.2, 0.2, 'y', seat, 0)
    addDisc(target, [stool.x, floor + 0.05, stool.z], 0.15, 0.15, 'y', leg, 0)
  }
}

function addOutsideStage(target: Vertex[], floor: number) {
  const dark: Vec3 = [0.005, 0.008, 0.02]
  const z = outsideStage.z
  const width = 7.4
  const left = outsideDjBooth.x - width / 2
  const right = outsideDjBooth.x + width / 2
  const base = floor + 0.1
  const top = floor + 4.1
  const centerY = (base + top) / 2

  addBox(target, outsideStage.x, floor + 0.04, z + 0.12, outsideStage.width, 0.08, outsideStage.depth, dark, 0)
  addBox(target, left, centerY, z, 0.13, top - base, 0.13, electricNavy, 3.2)
  addBox(target, right, centerY, z, 0.13, top - base, 0.13, electricNavy, 3.2)
  addBox(target, outsideDjBooth.x, top, z, width, 0.13, 0.13, electricNavy, 3.2)
  addStageBeam(target, [left, base, z], [right, top, z], electricNavy)
  addStageBeam(target, [right, base, z], [left, top, z], electricNavy)
}

function addStageBeam(target: Vertex[], a: Vec3, b: Vec3, color: Vec3) {
  const center = scale(add(a, b), 0.5)
  const length = Math.hypot(b[0] - a[0], b[1] - a[1])
  const angle = Math.atan2(b[1] - a[1], b[0] - a[0])
  const side: Vec3 = [-Math.sin(angle) * 0.06, Math.cos(angle) * 0.06, 0]

  addQuad(target, add(a, side), subtract(a, side), subtract(b, side), add(b, side), color, 2.4)
  addBox(target, center[0], center[1], center[2], length, 0.035, 0.035, color, 1.2)
}

function addDjBooth(target: Vertex[]) {
  addDjBoothAt(target, djBooth, djSpeakers, 1, [1, 0.03, 0.015], 0.45)
}

export function addDjBoothAt(target: Vertex[], booth: Bounds, speakers: Bounds[], direction: number, accent: Vec3,
  accentGlow: number, floor = -2)
{
  const body: Vec3 = [0.026, 0.018, 0.021]
  const top: Vec3 = [0.006, 0.006, 0.008]
  const dark: Vec3 = [0.012, 0.011, 0.014]
  const cone: Vec3 = [0.05, 0.047, 0.043]
  const y = floor
  const scale = 0.75

  addBox(target, booth.x, y + 0.33, booth.z, booth.width, 0.66, booth.depth, body, 0)
  addBox(target, booth.x, y + 0.7, booth.z + direction * 0.045, booth.width + 0.38 * scale, 0.12,
    booth.depth + 0.28 * scale, top, 0)
  addBox(target, booth.x - 0.82 * scale, y + 0.81, booth.z + direction * 0.21, 0.645 * scale, 0.039, 0.465 * scale,
    dark, 0)
  addBox(target, booth.x + 0.82 * scale, y + 0.81, booth.z + direction * 0.21, 0.645 * scale, 0.039, 0.465 * scale,
    dark, 0)
  addDisc(target, [booth.x - 0.82 * scale, y + 0.84, booth.z + direction * 0.21], 0.27 * scale, 0.21 * scale, 'y',
    accent, accentGlow)
  addDisc(target, [booth.x + 0.82 * scale, y + 0.84, booth.z + direction * 0.21], 0.27 * scale, 0.21 * scale, 'y',
    accent, accentGlow)
  addBox(target, booth.x, y + 0.835, booth.z + direction * 0.24, 0.56 * scale, 0.045, 0.68 * scale, [0.035, 0.034,
    0.036], 0)

  for (const speaker of speakers) {
    addSpeakerStack(target, speaker, body, dark, cone, direction, floor)
  }
}

function addSpeakerStack(
  target: Vertex[],
  bounds: Bounds,
  body: Vec3,
  dark: Vec3,
  cone: Vec3,
  direction: number,
  floor = -2,
) {
  const y = floor
  const front = bounds.z + direction * (bounds.depth / 2 + 0.012)

  addBox(target, bounds.x, y + 0.72, bounds.z, bounds.width, 1.44, bounds.depth, body, 0)
  addBox(target, bounds.x, y + 1.6, bounds.z, bounds.width * 0.82, 0.54, bounds.depth * 0.82, dark, 0)
  addDisc(target, [bounds.x, y + 0.9, front], 0.24, 0.24, 'z', cone, 0)
  addDisc(target, [bounds.x, y + 0.39, front], 0.165, 0.165, 'z', cone, 0)
  addDisc(target, [bounds.x, y + 1.6, front], 0.15, 0.15, 'z', cone, 0)
}

function addTentDjBooth(target: Vertex[], accent: Vec3, accentGlow: number) {
  const body: Vec3 = [0.026, 0.018, 0.021]
  const top: Vec3 = [0.006, 0.006, 0.008]
  const dark: Vec3 = [0.012, 0.011, 0.014]
  const cone: Vec3 = [0.05, 0.047, 0.043]
  const y = -2
  const scale = 0.75
  const direction = -1
  const booth = tentDjBooth

  addBox(target, booth.x, y + 0.33, booth.z, booth.width, 0.66, booth.depth, body, 0)
  addBox(target, booth.x + direction * 0.045, y + 0.7, booth.z, booth.width + 0.28 * scale, 0.12,
    booth.depth + 0.38 * scale, top, 0)
  addBox(target, booth.x + direction * 0.21, y + 0.81, booth.z - 0.82 * scale, 0.465 * scale, 0.039, 0.645 * scale,
    dark, 0)
  addBox(target, booth.x + direction * 0.21, y + 0.81, booth.z + 0.82 * scale, 0.465 * scale, 0.039, 0.645 * scale,
    dark, 0)
  addDisc(target, [booth.x + direction * 0.21, y + 0.84, booth.z - 0.82 * scale], 0.21 * scale, 0.27 * scale, 'y',
    accent, accentGlow)
  addDisc(target, [booth.x + direction * 0.21, y + 0.84, booth.z + 0.82 * scale], 0.21 * scale, 0.27 * scale, 'y',
    accent, accentGlow)
  addBox(target, booth.x + direction * 0.24, y + 0.835, booth.z, 0.68 * scale, 0.045, 0.56 * scale, [0.035, 0.034,
    0.036], 0)

  for (const speaker of tentDjSpeakers) {
    addTentSpeakerStack(target, speaker, body, dark, cone, direction)
  }
}

function addTentSpeakerStack(target: Vertex[], bounds: Bounds, body: Vec3, dark: Vec3, cone: Vec3, direction: number) {
  const y = -2
  const front = bounds.x + direction * (bounds.width / 2 + 0.012)

  addBox(target, bounds.x, y + 0.72, bounds.z, bounds.width, 1.44, bounds.depth, body, 0)
  addBox(target, bounds.x, y + 1.6, bounds.z, bounds.width * 0.82, 0.54, bounds.depth * 0.82, dark, 0)
  addXDisc(target, [front, y + 0.9, bounds.z], 0.24, 0.24, cone, 0)
  addXDisc(target, [front, y + 0.39, bounds.z], 0.165, 0.165, cone, 0)
  addXDisc(target, [front, y + 1.6, bounds.z], 0.15, 0.15, cone, 0)
}

function addXDisc(target: Vertex[], center: Vec3, radiusY: number, radiusZ: number, color: Vec3, glow: number) {
  const segments = 18

  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    const b = ((i + 1) / segments) * Math.PI * 2
    const pointA: Vec3 = [center[0], center[1] + Math.cos(a) * radiusY, center[2] + Math.sin(a) * radiusZ]
    const pointB: Vec3 = [center[0], center[1] + Math.cos(b) * radiusY, center[2] + Math.sin(b) * radiusZ]

    target.push(pack(center, color, glow), pack(pointA, color, glow), pack(pointB, color, glow))
  }
}

export function addWallStrips(target: Vertex[]) {
  let id = 101

  for (const z of insideSideLightZs) {
    addSideStrip(target, -6.98, z, id++)
    addSideStrip(target, 6.98, z, id++)
  }

  for (const x of [-4.5, 0, 4.5]) {
    if (x !== 0) {
      addEndStrip(target, x, -23.98, id++)
    }

    if (x !== -4.5) {
      addEndStrip(target, x, 3.98, id++)
    }
  }

  addDjBoothStrip(target, djBooth, 1, [1, 0.03, 0.015], 2.15)
  addDjBoothStrip(target, outsideDjBooth, -1, electricNavy, 3.2)
  addUpstairsLightStrips(target, id)
  addTentDjBoothStrip(target)
  addBartenderBarStrip(target)
  addOutsideHutBarStrip(target)
  addOutsideHutRoofStrips(target)
  addBonfireFlame(target)
  addTentGlow(target)
  addBartenderBottleGlow(target)
}

function addUpstairsLightStrips(target: Vertex[], startId: number) {
  const floor = characterFloor + outsideRooftop.height
  const low = floor + 1.42
  const high = floor + 3.15
  const colors: Vec3[] = [
    [0.04, 0.75, 1],
    [0.95, 0.08, 0.62],
    [0.96, 0.72, 0.08],
    [0.12, 0.9, 0.42],
  ]
  let id = startId

  addDjBoothStrip(target, upstairsDjBooth, -1, colors[0]!, 3.2, floor)
  addBox(target, upstairsBar.x, floor + 1.12, upstairsBar.z - upstairsBar.depth * 0.5 - 0.08, upstairsBar.width - 0.65,
    0.07, 0.06, colors[1]!, 3.0, id++)

  for (const z of [-21.4, -16.9, -12.4, -7.9, -3.4, 1.1]) {
    if (z < upstairsDoor.z - upstairsDoor.width / 2 || z > upstairsDoor.z + upstairsDoor.width / 2) {
      addUpstairsSideStrip(target, roomBounds.left + 0.055, z, low, high, colors[id % colors.length]!, id++)
    }
    addUpstairsSideStrip(target, roomBounds.right - 0.055, z, low, high, colors[id % colors.length]!, id++)
  }

  for (const x of [-4.65, -1.55, 1.55, 4.65]) {
    addUpstairsEndStrip(target, x, roomBounds.back + 0.055, low, high, colors[id % colors.length]!, id++)
  }

  for (const x of [-4.65, 4.65]) {
    addUpstairsEndStrip(target, x, roomBounds.front - 0.055, low, high, colors[id % colors.length]!, id++)
  }
}

function addUpstairsSideStrip(target: Vertex[], x: number, z: number, low: number, high: number, color: Vec3,
  id: number)
{
  addQuad(target, [x, low, z - 0.32], [x, high, z - 0.32], [x, high, z + 0.32], [x, low, z + 0.32], color, 2.6, id)
}

function addUpstairsEndStrip(target: Vertex[], x: number, z: number, low: number, high: number, color: Vec3,
  id: number)
{
  addQuad(target, [x - 0.32, low, z], [x + 0.32, low, z], [x + 0.32, high, z], [x - 0.32, high, z], color, 2.6, id)
}

function addTentGlow(target: Vertex[]) {
  addDisc(target, [tent.x, characterFloor + 3.15, tent.z], 1.2, 1.2, 'y', [1, 0.08, 0.68], 1.8)
}

function addSideStrip(target: Vertex[], x: number, z: number, id: number) {
  addQuad(
    target,
    [x, -1.25, z - 0.24],
    [x, 3.75, z - 0.24],
    [x, 3.75, z - 0.09],
    [x, -1.25, z - 0.09],
    [0.22, 0.006, 0.004],
    0.08,
    id,
  )

  addQuad(
    target,
    [x, -1.25, z - 0.09],
    [x, 3.75, z - 0.09],
    [x, 3.75, z + 0.09],
    [x, -1.25, z + 0.09],
    [1, 0.03, 0.015],
    2.15,
    id,
  )

  addQuad(
    target,
    [x, -1.25, z + 0.09],
    [x, 3.75, z + 0.09],
    [x, 3.75, z + 0.24],
    [x, -1.25, z + 0.24],
    [0.22, 0.006, 0.004],
    0.08,
    id,
  )
}

function addEndStrip(target: Vertex[], x: number, z: number, id: number) {
  addQuad(
    target,
    [x - 0.24, -1.25, z],
    [x - 0.09, -1.25, z],
    [x - 0.09, 3.75, z],
    [x - 0.24, 3.75, z],
    [0.22, 0.006, 0.004],
    0.08,
    id,
  )

  addQuad(
    target,
    [x - 0.09, -1.25, z],
    [x + 0.09, -1.25, z],
    [x + 0.09, 3.75, z],
    [x - 0.09, 3.75, z],
    [1, 0.03, 0.015],
    2.15,
    id,
  )

  addQuad(
    target,
    [x + 0.09, -1.25, z],
    [x + 0.24, -1.25, z],
    [x + 0.24, 3.75, z],
    [x + 0.09, 3.75, z],
    [0.22, 0.006, 0.004],
    0.08,
    id,
  )
}

function addDjBoothStrip(target: Vertex[], booth: Bounds, direction: number, color: Vec3, glow: number, floor = -2) {
  const y = floor + 0.46
  const z = booth.z + direction * 0.91
  const width = booth.width - 0.45
  const height = 0.07

  addBox(target, booth.x, y, z, width, height, 0.06, color, glow)
}

function addBartenderBarStrip(target: Vertex[]) {
  addBox(target, bartenderBar.x, -1.54, bartenderBar.z - bartenderBar.depth / 2 - 0.16, bartenderBar.width - 0.45, 0.07,
    0.06, [1, 0.03, 0.015], 2.15)
}

function addOutsideHutBarStrip(target: Vertex[]) {
  const x = outsideHutBar.x + outsideHutBar.width / 2 + 0.16
  const y = characterFloor + outsideHutDeckHeight + 0.46

  addBox(target, x, y, outsideHutBar.z, 0.06, 0.07, outsideHutBar.depth - 0.45, electricNavy, 3.2)
}

function addTentDjBoothStrip(target: Vertex[]) {
  addBox(target, tentDjBooth.x - tentDjBooth.width / 2 - 0.16, -1.54, tentDjBooth.z, 0.06, 0.07,
    tentDjBooth.depth - 0.45, [0.28, 0.006, 0.17], 1.4)
}

function addOutsideHutRoofStrips(target: Vertex[]) {
  const x = outsideHut.x + outsideHut.width / 2 + 0.5
  const back = outsideHut.z - outsideHut.depth / 2 - 0.48
  const front = outsideHut.z + outsideHut.depth / 2 + 0.48
  const deckTop = characterFloor + outsideHutDeckHeight
  const roofBottom = deckTop + 2.53
  const ridge = deckTop + 3.8
  const apex: Vec3 = [x, ridge, outsideHut.z]

  addWallBeam(target, [x, roofBottom, back], apex, electricNavy)
  addWallBeam(target, [x, roofBottom, front], apex, electricNavy)
}

function addWallBeam(target: Vertex[], a: Vec3, b: Vec3, color: Vec3) {
  const angle = Math.atan2(b[1] - a[1], b[2] - a[2])
  const side: Vec3 = [0, Math.cos(angle) * 0.06, -Math.sin(angle) * 0.06]

  addQuad(target, add(a, side), subtract(a, side), subtract(b, side), add(b, side), color, 2.4)
}

function addBartenderBottleGlow(target: Vertex[]) {
  const y = -2

  for (const shelfY of [0.98, 1.58]) {
    for (let i = 0; i < 8; i++) {
      const x = bartenderBar.x - 1.38 + i * 0.39
      const height = 0.27 + (i % 3) * 0.07

      addBox(target, x, y + shelfY + 0.06 + height / 2, roomBounds.front - 0.3, 0.1, height, 0.08, [1, 0.03, 0.015],
        0.72)
    }
  }
}

export function addRoomSmoke(target: Vertex[]) {
  for (let i = 0; i < 82; i++) {
    const seed = i + 1
    const x = mix(-5.4, 5.4, smokeRandom(seed * 11.7))
    const y = mix(-1.35, 1.4, smokeRandom(seed * 19.1) ** 1.8)
    const z = mix(-22.5, 1.8, smokeRandom(seed * 31.3))
    const width = mix(1.8, 5.1, smokeRandom(seed * 47.9))
    const height = mix(0.8, 2.35, smokeRandom(seed * 61.5))
    const opacity = mix(0.045, 0.12, smokeRandom(seed * 73.3))

    addSmokePatch(target, [x, y, z], width, height, opacity, seed)
  }
}

function addSmokePatch(
  target: Vertex[],
  center: [number, number, number],
  width: number,
  height: number,
  opacity: number,
  seed: number,
) {
  const left = -width / 2
  const right = width / 2
  const bottom = -height / 2
  const top = height / 2

  target.push(
    packSmoke(center, left, bottom, opacity, seed, 0, 0),
    packSmoke(center, right, bottom, opacity, seed, 1, 0),
    packSmoke(center, right, top, opacity, seed, 1, 1),
  )
  target.push(
    packSmoke(center, left, bottom, opacity, seed, 0, 0),
    packSmoke(center, right, top, opacity, seed, 1, 1),
    packSmoke(center, left, top, opacity, seed, 0, 1),
  )
}

function smokeRandom(seed: number) {
  const value = Math.sin(seed * 127.1) * 43758.5453123

  return value - Math.floor(value)
}

export function addCeilingBeams(target: Vertex[], time: number, strobeLights: StrobeLight[], videoZone: VideoZone) {
  for (const light of strobeLights) {
    if (light.zone !== videoZone) {
      continue
    }

    const hit = strobeTarget(light, time)

    addBeam(target, light, hit[0], hit[2])
    addFloorPool(target, light, hit[0], hit[2])
  }
}

function addBeam(target: Vertex[], light: StrobeLight, targetX: number, targetZ: number) {
  const upstairs = light.zone === 'upstairs'
  const shells = [
    { radiusX: light.zone === 'outside' ? 1.35 : upstairs ? 0.82 : 0.5,
      radiusZ: light.zone === 'outside' ? 1.85 : upstairs ? 1.05 : 0.68,
      glow: light.zone === 'outside' ? 0.7 : upstairs ? 0.62 : 0.42, color: light.color },
  ]
  const segments = 20

  for (let shell = 0; shell < shells.length; shell++) {
    const layer = shells[shell]!
    const offset = shell * Math.PI / segments
    const uvOffset = shell * 0.37

    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2 + offset
      const b = ((i + 1) / segments) * Math.PI * 2 + offset
      const uA = i / segments + uvOffset
      const uB = (i + 1) / segments + uvOffset
      const topA: [number, number, number] = [light.x + Math.cos(a) * 0.07, light.top, light.z + Math.sin(a) * 0.07]
      const topB: [number, number, number] = [light.x + Math.cos(b) * 0.07, light.top, light.z + Math.sin(b) * 0.07]
      const bottomA: [number, number, number] = [targetX + Math.cos(a) * layer.radiusX, light.floor,
        targetZ + Math.sin(a) * layer.radiusZ]
      const bottomB: [number, number, number] = [targetX + Math.cos(b) * layer.radiusX, light.floor,
        targetZ + Math.sin(b) * layer.radiusZ]

      target.push(
        pack(topA, layer.color, layer.glow * 0.18, light.id, uA, 0, 1),
        pack(topB, layer.color, layer.glow * 0.18, light.id, uB, 0, 1),
        pack(bottomB, layer.color, layer.glow, light.id, uB, 1, 1),
      )
      target.push(
        pack(topA, layer.color, layer.glow * 0.18, light.id, uA, 0, 1),
        pack(bottomB, layer.color, layer.glow, light.id, uB, 1, 1),
        pack(bottomA, layer.color, layer.glow, light.id, uA, 1, 1),
      )
    }
  }
}

function addFloorPool(target: Vertex[], light: StrobeLight, x: number, z: number) {
  const center: [number, number, number] = [x, light.floor + 0.02, z]
  const color = light.color
  const innerRadius = 0.82
  const outerRadiusX = 1.75
  const outerRadiusZ = 2.2
  const segments = 32

  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    const b = ((i + 1) / segments) * Math.PI * 2
    const innerA: [number, number, number] = [x + Math.cos(a) * innerRadius, light.floor + 0.02,
      z + Math.sin(a) * innerRadius]
    const innerB: [number, number, number] = [x + Math.cos(b) * innerRadius, light.floor + 0.02,
      z + Math.sin(b) * innerRadius]
    const edgeA: [number, number, number] = [x + Math.cos(a) * outerRadiusX, light.floor + 0.02,
      z + Math.sin(a) * outerRadiusZ]
    const edgeB: [number, number, number] = [x + Math.cos(b) * outerRadiusX, light.floor + 0.02,
      z + Math.sin(b) * outerRadiusZ]

    target.push(pack(center, color, 1.08, light.id), pack(innerA, color, 0.9, light.id),
      pack(innerB, color, 0.9, light.id))
    target.push(pack(innerA, color, 0.34, light.id), pack(edgeA, color, 0.08, light.id),
      pack(edgeB, color, 0.08, light.id))
    target.push(pack(innerA, color, 0.34, light.id), pack(edgeB, color, 0.08, light.id),
      pack(innerB, color, 0.34, light.id))
  }
}
