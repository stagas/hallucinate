import { characterFloor } from './character-data.ts'
import { clearTouchMoveInput, readMoveInput } from './input.ts'
import {
  lengthSq,
  normalizeInto,
  smoothAngle,
} from './math.ts'
import { findPath } from './pathfinding.ts'
import { outsideRooftop, upstairsWallHeight } from './scene-data.ts'
import { collideLoftRoom, collideRoom, isOutside, roomAt, seatAt, seatById, walkHeight,
  walkLoftHeight } from './scene.ts'
import type { Seat } from './scene.ts'
import { createTurnBasisCache } from './turn-basis.ts'
import type { BottomMode, CharacterMode, CircleBounds, Vec3 } from './types.ts'

const jumpDuration = 0.8
const jumpHeight = 1.65
const jumpRiseDuration = 0.4
const waveDuration = 95 / 30
const waveLoopStart = 28 / 30
const waveLoopEnd = 62 / 30
const breakdanceDuration = 201 / 30
const jetpackAcceleration = 10
const jetpackMaxVerticalSpeed = 2.8
export const jetpackMaxEffectiveHeight = characterFloor + (outsideRooftop.height + upstairsWallHeight) * 0.5

export function createLocalCharacter(keys: Set<string>) {
  const position: Vec3 = [-2.2, -1.95, -6.8]
  const input: Vec3 = [0, 0, 0]
  const forward: Vec3 = [0, 0, 0]
  const right: Vec3 = [0, 0, 0]
  const direction: Vec3 = [0, 0, 0]
  const destination: Vec3 = [0, 0, 0]
  const jumpTarget: Vec3 = [0, 0, 0]
  let path: Vec3[] = []
  let destinationSeat = ''
  let turn = 0
  let motionBlend = 0
  let mode: CharacterMode = 'stand'
  let velocityY = 0
  let seated = false
  let couchRelease = 0
  let seat = ''
  let hasDestination = false
  let hasJumpTarget = false
  let jumpTime = 0
  let jumpElapsed = 0
  let jumpHeld = false
  let waveActive = false
  let waveHeld = false
  let waveElapsed = 0
  let waveOutElapsed = 0
  let breakdanceElapsed = 0
  const cameraTurnBasis = createTurnBasisCache()
  const localTurnBasis = createTurnBasisCache()

  function startJump() {
    hasDestination = false
    hasJumpTarget = false
    destinationSeat = ''
    path = []
    jumpTime = jumpDuration
    jumpElapsed = 0
    mode = 'jump'
    motionBlend = 0
  }

  return {
    position,
    input,
    get turn() {
      return turn
    },
    set turn(value: number) {
      turn = value
    },
    get motionBlend() {
      return motionBlend
    },
    get mode() {
      return mode
    },
    get seat() {
      return seated ? seat : ''
    },
    get jumping() {
      return jumpTime > 0
    },
    get modeTime() {
      return mode === 'wave'
        ? waveElapsed
        : mode === 'waveOut'
        ? waveOutElapsed
        : mode === 'breakdance'
        ? breakdanceElapsed
        : jumpElapsed
    },
    get velocityY() {
      return velocityY
    },
    set velocityY(value: number) {
      velocityY = value
    },
    setDestination(value: Vec3, targetSeat?: Seat) {
      if (mode === 'breakdance') {
        return
      }

      destination[0] = value[0]
      destination[1] = value[1]
      destination[2] = value[2]
      destinationSeat = targetSeat?.id ?? ''
      hasDestination = true
      hasJumpTarget = false
      path = []
    },
    readInput() {
      return readMoveInput(keys, input)
    },
    stopMoving() {
      keys.clear()
      clearTouchMoveInput()
      input[0] = 0
      input[1] = 0
      input[2] = 0
      hasDestination = false
      hasJumpTarget = false
      destinationSeat = ''
      path = []
      jumpHeld = false
      waveHeld = false
    },
    startJumping() {
      jumpHeld = !seated

      if (!seated && jumpTime === 0) {
        startJump()
      }
    },
    stopJumping() {
      jumpHeld = false
    },
    jump() {
      if (seated || jumpTime > 0 || mode === 'breakdance') {
        return
      }

      startJump()
    },
    jumpToward(target: Vec3) {
      if (seated || jumpTime > 0 || mode === 'breakdance') {
        return
      }

      startJump()
      jumpTarget[0] = target[0]
      jumpTarget[1] = target[1]
      jumpTarget[2] = target[2]
      hasJumpTarget = true
    },
    startWave() {
      if (seated || jumpTime > 0 || mode === 'breakdance') {
        return
      }

      if (waveActive) {
        waveHeld = true
        return
      }

      hasDestination = false
      hasJumpTarget = false
      destinationSeat = ''
      path = []
      waveActive = true
      waveHeld = true
      waveElapsed = 0
      waveOutElapsed = 0
      mode = 'wave'
      motionBlend = 0
    },
    stopWave() {
      waveHeld = false
    },
    startBreakdance() {
      if (seated || jumpTime > 0 || mode === 'breakdance') {
        return
      }

      hasDestination = false
      hasJumpTarget = false
      destinationSeat = ''
      path = []
      waveActive = false
      waveHeld = false
      waveOutElapsed = 0
      breakdanceElapsed = 0
      mode = 'breakdance'
      motionBlend = 0
    },
    update(
      delta: number,
      cameraTurn: number,
      outsideTree: CircleBounds,
      bottomMode: BottomMode,
      jetpackThrust: boolean,
      loft: boolean,
      occupiedSeats: Set<string>,
      takeSeat: (seat: Seat) => void,
    ) {
      this.readInput()
      if (mode === 'breakdance') {
        input[0] = 0
        input[1] = 0
        input[2] = 0
        hasDestination = false
        hasJumpTarget = false
        destinationSeat = ''
        path = []
      }
      if (lengthSq(input) > 0) {
        hasDestination = false
        hasJumpTarget = false
        destinationSeat = ''
        path = []
      }
      if (hasDestination) {
        if (path.length === 0) {
          try {
            path = loft
              ? [[destination[0], destination[1], destination[2]]]
              : findPath(position, destination, outsideTree)
          }
          catch (e) {
            void e
            hasDestination = false
            destinationSeat = ''
            path = []
          }
        }

        while (path.length > 0 && waypointReached(position, path[0]!)) {
          path.shift()
        }

        hasDestination = path.length > 0
      }
      if (hasDestination) {
        const target = path[0]!
        const dx = target[0] - position[0]
        const dz = target[2] - position[2]
        const distanceSq = dx * dx + dz * dz

        const distance = Math.sqrt(distanceSq)
        const worldX = dx / distance
        const worldZ = dz / distance
        const camera = cameraTurnBasis(cameraTurn)

        input[0] = -camera.cos * worldX + camera.sin * worldZ
        input[1] = 0
        input[2] = camera.sin * worldX + camera.cos * worldZ
      }
      if (hasJumpTarget) {
        if (waypointReached(position, jumpTarget)) {
          hasJumpTarget = false
          input[0] = 0
          input[1] = 0
          input[2] = 0
        }
        else {
          turn = smoothAngle(turn, Math.atan2(jumpTarget[0] - position[0], jumpTarget[2] - position[2]), 10, delta)
          input[0] = 0
          input[1] = 0
          input[2] = 1
        }
      }
      const moving = lengthSq(input) > 0

      couchRelease = Math.max(0, couchRelease - delta)
      const wasJumping = jumpTime > 0
      if (jumpTime > 0) {
        jumpTime = Math.max(0, jumpTime - delta)
        jumpElapsed += delta
      }
      if (jumpHeld && jumpTime === 0 && !seated) {
        startJump()
      }
      if (waveActive) {
        waveElapsed += delta

        if (!waveHeld && waveElapsed >= waveLoopStart) {
          waveActive = false
          waveOutElapsed = 0
          mode = 'waveOut'
        }
      }
      else if (mode === 'waveOut') {
        waveOutElapsed += delta

        if (waveOutElapsed >= waveDuration - waveLoopEnd) {
          waveActive = false
          mode = moving ? 'run' : 'stand'
        }
      }
      else if (mode === 'breakdance') {
        breakdanceElapsed += delta

        if (breakdanceElapsed >= breakdanceDuration) {
          mode = 'stand'
        }
      }

      if (seated) {
        const currentSeat = seatById(seat)

        position[0] = currentSeat.position[0]
        position[1] = currentSeat.position[1]
        position[2] = currentSeat.position[2]
        turn = currentSeat.turn
        velocityY = 0

        if (hasDestination || hasJumpTarget || input[2] > 0) {
          seated = false
          couchRelease = 0.35
          occupiedSeats.delete(seat)
          seat = ''
          mode = 'run'
          motionBlend = 1
          const local = localTurnBasis(turn)
          position[0] += local.sin * 0.46
          position[2] += local.cos * 0.46
        }
        else {
          motionBlend = 0
          mode = bottomMode === 'pants' ? 'manSitting' : 'womanSitting'

          return
        }
      }

      if (jumpTime > 0) {
        mode = 'jump'
        motionBlend = 0
        waveActive = false
        waveHeld = false
        waveOutElapsed = 0
      }
      else if (mode === 'breakdance') {
        motionBlend = 0
      }
      else if (waveActive && !moving) {
        mode = 'wave'
        motionBlend = 0
      }
      else if (waveActive) {
        motionBlend += (1 - motionBlend) * (1 - Math.exp(-8 * delta))
        mode = 'wave'
      }
      else if (mode === 'waveOut' && !moving) {
        motionBlend = 0
      }
      else if (mode === 'waveOut') {
        motionBlend += (1 - motionBlend) * (1 - Math.exp(-8 * delta))
      }
      else {
        motionBlend += ((moving ? 1 : 0) - motionBlend) * (1 - Math.exp(-8 * delta))
        mode = motionBlend > 0.5 ? 'run' : 'stand'
      }

      const jumping = wasJumping || jumpTime > 0
      const thrusting = jetpackThrust && !jumping && mode !== 'breakdance'
      const collisionOptions = jumping || thrusting ? { couches: false, duck: false } : { duck: false }
      const previousPosition: Vec3 = [position[0], position[1], position[2]]

      if (jumping) {
        const floorY = loft
          ? walkLoftHeight(position[0], position[1], position[2], collisionOptions)
          : walkHeight(position[0], position[1], position[2])

        position[1] = jumpY(floorY, jumpElapsed, position, loft)
        velocityY = 0
      }

      if (moving) {
        normalizeInto(input)
        if (hasJumpTarget) {
          const local = localTurnBasis(turn)
          direction[0] = local.sin
          direction[1] = 0
          direction[2] = local.cos
        }
        else {
          const camera = cameraTurnBasis(cameraTurn)

          forward[0] = camera.sin
          forward[1] = 0
          forward[2] = camera.cos
          right[0] = -camera.cos
          right[1] = 0
          right[2] = camera.sin
          direction[0] = forward[0] * input[2] + right[0] * input[0]
          direction[1] = 0
          direction[2] = forward[2] * input[2] + right[2] * input[0]
        }
        normalizeInto(direction)

        position[0] += direction[0] * delta * 5
        position[2] += direction[2] * delta * 5
        const foundSeat = !jumping && !thrusting && couchRelease <= 0
          ? seatAt(position, occupiedSeats, 0.46, true, loft)
          : undefined
        const nextSeat = foundSeat && (!hasDestination || foundSeat.id === destinationSeat) ? foundSeat : undefined

        if (nextSeat) {
          takeSeat(nextSeat)
          seated = true
          hasDestination = false
          hasJumpTarget = false
          destinationSeat = ''
          path = []
          seat = nextSeat.id
          occupiedSeats.add(seat)
          position[0] = nextSeat.position[0]
          position[1] = nextSeat.position[1]
          position[2] = nextSeat.position[2]
          turn = nextSeat.turn
          motionBlend = 0
          mode = bottomMode === 'pants' ? 'manSitting' : 'womanSitting'
          velocityY = 0

          return
        }

        if (loft) {
          collideLoftRoom(position, collisionOptions)
        }
        else {
          collideRoom(position, outsideTree, isOutside(position), previousPosition, collisionOptions)
        }
        turn = smoothAngle(turn, Math.atan2(direction[0], direction[2]), 10, delta)
      }

      const floorY = loft
        ? walkLoftHeight(position[0], position[1], position[2], collisionOptions)
        : walkHeight(position[0], position[1], position[2])

      if (jumping) {
        position[1] = jumpY(floorY, jumpElapsed, position, loft)
        velocityY = 0
      }
      else if (floorY > position[1]) {
        position[1] = floorY
        velocityY = 0
      }
      else {
        velocityY = thrusting
          ? Math.min(jetpackMaxVerticalSpeed, velocityY + jetpackAcceleration * delta)
          : velocityY - 12 * delta
        position[1] += velocityY * delta

        if (position[1] < floorY) {
          position[1] = floorY
          velocityY = 0
        }
      }
      if (!jumping && position[1] > floorY + 0.02) {
        motionBlend = 0
        if (mode === 'run') {
          mode = 'stand'
        }
      }

      if (loft) {
        collideLoftRoom(position, collisionOptions)
      }
      else {
        collideRoom(position, outsideTree, isOutside(position), previousPosition, collisionOptions)
      }
    },
  }
}

function jumpOffset(elapsed: number) {
  const progress = elapsed < jumpRiseDuration
    ? elapsed / jumpRiseDuration * 0.5
    : 0.5 + (elapsed - jumpRiseDuration) / (jumpDuration - jumpRiseDuration) * 0.5

  return Math.sin(progress * Math.PI) * jumpHeight
}

function jumpY(floorY: number, elapsed: number, position: Vec3, loft: boolean) {
  const y = floorY + jumpOffset(elapsed)

  if (loft || roomAt(position) !== 'upstairs') {
    return y
  }

  return Math.min(y, characterFloor + outsideRooftop.height + upstairsWallHeight - 1.45)
}

function waypointReached(position: Vec3, waypoint: Vec3) {
  const dx = waypoint[0] - position[0]
  const dz = waypoint[2] - position[2]

  return dx * dx + dz * dz < 0.09
}
