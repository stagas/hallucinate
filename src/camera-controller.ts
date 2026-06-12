import { characterFloor } from './character-data.ts'
import { clamp, lengthSq, lerpVec3, mix, smoothAngle } from './math.ts'
import { backDoor, loftBounds, outsideBounds, outsideDjBooth, outsideRooftop, outsideRooftopLanding,
  outsideRooftopStairs, outsideStage, outsideToilets, roomBounds, tent, upstairsWallHeight } from './scene-data.ts'
import { collideBuildingWalls, isOutside, roomAt, walkHeight } from './scene.ts'
import type { Vec3 } from './types.ts'

const insideCameraFront = roomBounds.front - 0.2
const outsideCameraFront = outsideStage.z - outsideStage.depth / 2 - 0.35
const manualCameraHoldTime = 5000
const cameraBouncePauseTime = 2500
const dragMoveThreshold = 3
const cameraTurnSensitivity = 0.005
const cameraPitchSensitivity = 0.018
const firstPersonEyeLift = 0.07
const firstPersonFaceOffset = 0.18
const firstPersonLookDistance = 1.4

type CameraFace = {
  position: Vec3
  forward: Vec3
  up: Vec3
}

type CameraUpdateOptions = {
  cameraUp?: Vec3
  face?: CameraFace
  loft?: boolean
  lookAt?: Vec3
  lookDown?: boolean
  manualHold?: boolean
  sideViewTurn?: number
}

type CameraBasis = {
  forwardX: number
  forwardY: number
  forwardZ: number
  upX: number
  upY: number
  upZ: number
}

export function createCameraController(
  canvas: HTMLCanvasElement,
  characterPosition: Vec3,
  options: { suppressManualDrag?: () => boolean } = {},
) {
  const position: Vec3 = [-2.2, 0.15, -9.0]
  const target: Vec3 = [-2.2, -0.75, -6.8]
  const viewUp: Vec3 = [0, 1, 0]
  let firstPerson = false
  let freeMouse = false
  let turn = 0
  let dragX = 0
  let dragY = 0
  let pitch = 0
  let dragging = false
  let dragTouchId = -1
  let dragMoved = false
  let holdingManualCamera = false
  let manualCameraHoldUntil = 0
  let cameraBouncePausedUntil = 0
  let returning = false
  let wasMoving = false

  function setFirstPerson(value: boolean) {
    firstPerson = value
    if (firstPerson) {
      exitFreeMouse()
    }
    holdingManualCamera = false
    returning = false
    pitch = 0
  }

  function setFreeMouse(value: boolean) {
    freeMouse = value
    dragging = false
    dragMoved = false
    dragTouchId = -1
    if (freeMouse) {
      firstPerson = false
      holdingManualCamera = true
      returning = false
      cameraBouncePausedUntil = performance.now() + cameraBouncePauseTime
    }
    else {
      holdingManualCamera = true
      manualCameraHoldUntil = performance.now() + manualCameraHoldTime
    }
  }

  function enterFreeMouse() {
    dragging = false
    dragMoved = false
    dragTouchId = -1
    returning = false
    canvas.focus()
    const request = canvas.requestPointerLock()

    request.catch((e: unknown) => console.error(e))
  }

  function exitFreeMouse() {
    if (document.pointerLockElement === canvas) {
      document.exitPointerLock()
      setFreeMouse(false)
      return
    }

    if (freeMouse) {
      setFreeMouse(false)
    }
  }

  function syncFreeMouseLock() {
    const locked = document.pointerLockElement === canvas

    if (freeMouse !== locked) {
      setFreeMouse(locked)
    }
  }

  function startDrag(x: number, y: number) {
    if (freeMouse) {
      return
    }

    dragging = true
    dragMoved = false
    returning = false
    dragX = x
    dragY = y
  }

  function moveDrag(x: number, y: number) {
    const dx = x - dragX
    const dy = y - dragY

    if (!dragMoved && dx * dx + dy * dy < dragMoveThreshold * dragMoveThreshold) {
      return
    }

    dragMoved = true
    dragX = x
    dragY = y

    moveCamera(dx, dy)
  }

  function moveCamera(dx: number, dy: number) {
    turn -= dx * cameraTurnSensitivity
    pitch = clamp(pitch + dy * cameraPitchSensitivity, -2.4, 4.2)
    holdingManualCamera = true
    manualCameraHoldUntil = performance.now() + manualCameraHoldTime
    cameraBouncePausedUntil = performance.now() + cameraBouncePauseTime
  }

  canvas.style.touchAction = 'none'
  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || options.suppressManualDrag?.()) {
      return
    }

    event.preventDefault()
    startDrag(event.clientX, event.clientY)
    canvas.setPointerCapture(event.pointerId)
  })

  canvas.addEventListener('pointermove', event => {
    if (dragging) {
      event.preventDefault()
      moveDrag(event.clientX, event.clientY)
    }
  })

  canvas.addEventListener('pointerup', event => {
    dragging = false
    releasePointerCapture(canvas, event.pointerId)
  })

  canvas.addEventListener('pointercancel', event => {
    dragging = false
    releasePointerCapture(canvas, event.pointerId)
  })

  canvas.addEventListener('touchstart', event => {
    if (dragTouchId !== -1 || interactiveTarget(event.target)) {
      return
    }

    const touch = event.changedTouches[0]!

    event.preventDefault()
    dragTouchId = touch.identifier
    startDrag(touch.clientX, touch.clientY)
  }, { passive: false })

  canvas.addEventListener('touchmove', event => {
    const touch = [...event.changedTouches].find(next => next.identifier === dragTouchId)

    if (!touch) {
      return
    }

    event.preventDefault()
    moveDrag(touch.clientX, touch.clientY)
  }, { passive: false })

  canvas.addEventListener('touchend', event => {
    const touch = [...event.changedTouches].find(next => next.identifier === dragTouchId)

    if (touch) {
      event.preventDefault()
      dragging = false
      dragTouchId = -1
    }
  }, { passive: false })

  canvas.addEventListener('touchcancel', event => {
    const touch = [...event.changedTouches].find(next => next.identifier === dragTouchId)

    if (touch) {
      dragging = false
      dragTouchId = -1
    }
  })

  document.addEventListener('mousedown', event => {
    if (freeMouse || event.button !== 0 || interactiveTarget(event.target) || options.suppressManualDrag?.()) {
      return
    }

    event.preventDefault()
    startDrag(event.clientX, event.clientY)
  }, { capture: true })

  document.addEventListener('mousemove', event => {
    if (freeMouse) {
      event.preventDefault()
      moveCamera(event.movementX, event.movementY)
      return
    }

    if (!dragging) {
      return
    }

    event.preventDefault()
    moveDrag(event.clientX, event.clientY)
  }, { capture: true })

  document.addEventListener('mouseup', () => {
    dragging = false
  }, { capture: true })
  document.addEventListener('pointerlockchange', syncFreeMouseLock)

  return {
    position,
    target,
    get firstPerson() {
      return firstPerson
    },
    set firstPerson(value: boolean) {
      setFirstPerson(value)
    },
    get freeMouse() {
      return freeMouse
    },
    set freeMouse(value: boolean) {
      value ? enterFreeMouse() : exitFreeMouse()
    },
    get turn() {
      return turn
    },
    set turn(value: number) {
      turn = value
    },
    togglePerspective(characterTurn?: number) {
      setFirstPerson(!firstPerson)

      if (firstPerson && characterTurn !== undefined) {
        turn = characterTurn
      }
    },
    toggleFreeMouse() {
      freeMouse ? exitFreeMouse() : enterFreeMouse()
    },
    exitFreeMouse,
    get() {
      return {
        eye: [position[0], position[1], position[2]] as Vec3,
        center: [target[0], target[1], target[2]] as Vec3,
        up: [viewUp[0], viewUp[1], viewUp[2]] as Vec3,
      }
    },
    update(
      delta: number,
      input: Vec3,
      characterTurn: number,
      bounceActive: boolean,
      options: CameraUpdateOptions = {},
    ) {
      const lookDown = options.lookDown === true
      const loft = options.loft === true
      const manualHold = options.manualHold === true
      const cameraUp = options.cameraUp
      const moving = lengthSq(input) > 0
      const movingBack = moving && input[2] < 0
      const faceBasis = firstPerson && options.face
        ? cameraBasisFromFace(options.face)
        : cameraBasis(characterTurn, cameraUp)
      const followTurn = firstPerson ? cameraBasisTurn(faceBasis) : characterTurn
      const sideViewTurn = options.sideViewTurn
      const manualCameraActive = dragging || freeMouse

      if (dragging && !dragMoved) {
        wasMoving = moving
        return
      }

      if (!firstPerson && holdingManualCamera && !manualCameraActive && !manualHold
        && performance.now() > manualCameraHoldUntil)
      {
        holdingManualCamera = false
      }

      if (!firstPerson && lookDown && !manualCameraActive) {
        pitch = mix(pitch, 0.9, 1 - Math.exp(-7 * delta))
      }

      if (!firstPerson && sideViewTurn !== undefined && !manualCameraActive && !holdingManualCamera) {
        returning = false
        turn = smoothAngle(turn, sideViewTurn, 5, delta)
        pitch = mix(pitch, 0.05, 1 - Math.exp(-5 * delta))
      }

      if (!freeMouse && holdingManualCamera && moving) {
        holdingManualCamera = false
        returning = true
      }

      if (!manualCameraActive && wasMoving && !moving) {
        returning = true
      }

      if (!manualCameraActive && movingBack) {
        returning = false
      }

      if (sideViewTurn === undefined && !manualCameraActive && ((moving && input[2] >= 0) || returning)) {
        const turnSpeed = returning ? 5 : mix(0.8, 2.2, input[2])
        const targetPitch = firstPerson ? 0 : lookDown ? 0.9 : 0

        turn = smoothAngle(turn, followTurn, turnSpeed, delta)
        pitch = mix(pitch, targetPitch, 1 - Math.exp(-4 * delta))

        if (returning) {
          const angle = Math.abs(Math.atan2(Math.sin(followTurn - turn), Math.cos(followTurn - turn)))

          if (angle < 0.01 && Math.abs(pitch) < 0.01) {
            returning = false
          }
        }
      }

      if (firstPerson && !manualCameraActive && !holdingManualCamera && !returning) {
        turn = followTurn
        pitch = 0
      }

      wasMoving = moving

      const basis = firstPerson && !manualCameraActive && !holdingManualCamera && !returning
        ? faceBasis
        : cameraBasis(turn, firstPerson ? options.face?.up ?? cameraUp : cameraUp)

      viewUp[0] = basis.upX
      viewUp[1] = basis.upY
      viewUp[2] = basis.upZ

      if (firstPerson) {
        if (options.face) {
          position[0] = options.face.position[0] + faceBasis.upX * firstPersonEyeLift
            + faceBasis.forwardX * firstPersonFaceOffset
          position[1] = options.face.position[1] + faceBasis.upY * firstPersonEyeLift
            + faceBasis.forwardY * firstPersonFaceOffset
          position[2] = options.face.position[2] + faceBasis.upZ * firstPersonEyeLift
            + faceBasis.forwardZ * firstPersonFaceOffset
        }
        else {
          const height = 1.2 + firstPersonEyeLift

          position[0] = characterPosition[0] + faceBasis.upX * height + faceBasis.forwardX * firstPersonFaceOffset
          position[1] = characterPosition[1] + faceBasis.upY * height + faceBasis.forwardY * firstPersonFaceOffset
          position[2] = characterPosition[2] + faceBasis.upZ * height + faceBasis.forwardZ * firstPersonFaceOffset
        }
        target[0] = position[0] + basis.forwardX * firstPersonLookDistance - basis.upX * pitch
        target[1] = position[1] + basis.forwardY * firstPersonLookDistance - basis.upY * pitch
        target[2] = position[2] + basis.forwardZ * firstPersonLookDistance - basis.upZ * pitch

        return
      }

      const lookAt = options.lookAt

      if (lookAt) {
        target[0] = lookAt[0]
        target[1] = lookAt[1]
        target[2] = lookAt[2]
      }
      else {
        const targetHeight = 1.2

        target[0] = characterPosition[0] + basis.upX * targetHeight
        target[1] = characterPosition[1] + basis.upY * targetHeight
        target[2] = characterPosition[2] + basis.upZ * targetHeight
      }
      const zone = loft ? 'loft' : roomAt(characterPosition)

      if (holdingManualCamera && !manualCameraActive) {
        clampCameraToZone(position, zone, characterPosition)
        wasMoving = moving
        return
      }

      const outside = !loft && zone !== 'inside'
      const cameraOutside = isOutside(position)
      const crossingOutside = outside && !cameraOutside
      const elevatedOutside = outside && characterPosition[1] > characterFloor + 0.8
      const time = performance.now() * 0.001
      const bouncePaused = manualCameraActive || performance.now() < cameraBouncePausedUntil
      const bounceAllowed = bounceActive && !bouncePaused
      const distance = bounceAllowed && !outside ? cameraDanceDistance(time) : 2.2
      const bounce = bounceAllowed ? cameraDanceBounce(time) : 0
      const cameraHeight = 1.35 + pitch + bounce
      const ideal: Vec3 = [
        characterPosition[0] - basis.forwardX * distance + basis.upX * cameraHeight,
        characterPosition[1] - basis.forwardY * distance + basis.upY * cameraHeight,
        characterPosition[2] - basis.forwardZ * distance + basis.upZ * cameraHeight,
      ]

      ideal[0] = zone === 'loft'
        ? clamp(ideal[0], loftBounds.left + 0.65, loftBounds.right - 0.65)
        : zone === 'tent'
        ? clamp(ideal[0], tent.x - tent.radius + 1, tent.x + tent.radius - 1)
        : outside
        ? clamp(ideal[0], outsideBounds.left + 1, outsideBounds.right - 1)
        : clamp(ideal[0], roomBounds.left + 0.4, roomBounds.right - 0.4)
      ideal[1] = clamp(ideal[1], characterFloor + 0.35, cameraMaxY(zone, characterPosition, elevatedOutside))
      ideal[2] = zone === 'loft'
        ? clamp(ideal[2], loftBounds.back + 0.65, loftBounds.front - 0.65)
        : zone === 'tent'
        ? clamp(ideal[2], tent.z - tent.radius + 1, tent.z + tent.radius - 1)
        : outside
        ? clamp(ideal[2], outsideBounds.back + 1, outsideBounds.front - 1)
        : clamp(ideal[2], roomBounds.back + 0.2, insideCameraFront)
      clampCameraToZone(ideal, zone, characterPosition)

      if (crossingOutside && !elevatedOutside && ideal[2] < insideCameraFront) {
        ideal[0] = backDoor.x
        ideal[2] = insideCameraFront
      }

      const crossing = outside !== cameraOutside
      const cameraCollides = outside && !crossing && shouldClampOutsideCameraToBuilding(characterPosition)

      if (cameraCollides) {
        collideBuildingWalls(ideal, 0.65)
      }

      const follow = crossingOutside ? 1 - Math.pow(0.0002, delta) : 1 - Math.pow(0.015, delta)

      lerpVec3(position, ideal, follow)
      if (cameraCollides) {
        collideBuildingWalls(position, 0.65)
      }
      clampCameraToZone(position, zone, characterPosition)

      position[1] = Math.max(position[1],
        (loft ? characterFloor : walkHeight(position[0], characterPosition[1], position[2])) + 0.35)
      position[1] = Math.min(position[1], cameraMaxY(zone, characterPosition, elevatedOutside))
    },
  }
}

function cameraMaxY(zone: ReturnType<typeof roomAt> | 'loft', characterPosition: Vec3, elevatedOutside: boolean) {
  if (zone === 'upstairs') {
    return characterFloor + outsideRooftop.height + upstairsWallHeight - 0.45
  }

  return elevatedOutside ? characterPosition[1] + 3.2 : 4.3
}

function cameraBasisFromFace(face: CameraFace): CameraBasis {
  return {
    forwardX: face.forward[0],
    forwardY: face.forward[1],
    forwardZ: face.forward[2],
    upX: face.up[0],
    upY: face.up[1],
    upZ: face.up[2],
  }
}

function cameraBasisTurn(basis: CameraBasis) {
  const length = Math.hypot(basis.forwardX, basis.forwardZ)

  if (length === 0) {
    throw new Error('Cannot orient first person camera with vertical face forward')
  }

  return Math.atan2(basis.forwardX, basis.forwardZ)
}

function cameraBasis(turn: number, up?: Vec3): CameraBasis {
  const sin = Math.sin(turn)
  const cos = Math.cos(turn)
  let sideX = cos
  let sideY = 0
  let sideZ = -sin
  let upX = 0
  let upY = 1
  let upZ = 0

  if (up) {
    const upLength = Math.sqrt(up[0] * up[0] + up[1] * up[1] + up[2] * up[2])

    if (upLength === 0) {
      throw new Error('Cannot orient camera with zero up vector')
    }

    upX = up[0] / upLength
    upY = up[1] / upLength
    upZ = up[2] / upLength

    const dot = sideX * upX + sideY * upY + sideZ * upZ

    sideX -= upX * dot
    sideY -= upY * dot
    sideZ -= upZ * dot

    const sideLength = Math.sqrt(sideX * sideX + sideY * sideY + sideZ * sideZ)

    if (sideLength === 0) {
      throw new Error('Cannot orient camera with parallel turn and up')
    }

    sideX /= sideLength
    sideY /= sideLength
    sideZ /= sideLength
  }

  return {
    forwardX: sideY * upZ - sideZ * upY,
    forwardY: sideZ * upX - sideX * upZ,
    forwardZ: sideX * upY - sideY * upX,
    upX,
    upY,
    upZ,
  }
}

function releasePointerCapture(canvas: HTMLCanvasElement, pointerId: number) {
  if (canvas.hasPointerCapture(pointerId)) {
    canvas.releasePointerCapture(pointerId)
  }
}

function interactiveTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement
    || target instanceof HTMLButtonElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || target instanceof HTMLDialogElement
    || target instanceof HTMLAnchorElement
}

function clampCameraToZone(position: Vec3, zone: ReturnType<typeof roomAt> | 'loft', characterPosition: Vec3) {
  if (zone === 'loft') {
    position[0] = clamp(position[0], loftBounds.left + 0.65, loftBounds.right - 0.65)
    position[2] = clamp(position[2], loftBounds.back + 0.65, loftBounds.front - 0.65)
    return
  }

  if (zone === 'upstairs') {
    clampUpstairsCamera(position)
    return
  }

  if (inOutsideToilets(characterPosition)) {
    clampOutsideToiletCamera(position, characterPosition)
    return
  }

  if (zone === 'outside' && inOutsideDjCameraZone(characterPosition)) {
    position[2] = Math.min(position[2], outsideCameraFront)
    return
  }

  if (zone === 'outside' && shouldClampOutsideCameraToBuilding(characterPosition)) {
    collideBuildingWalls(position, 0.65)
  }

  if (zone === 'tent') {
    clampTentCamera(position)
  }
}

function clampUpstairsCamera(position: Vec3) {
  position[0] = clamp(position[0], roomBounds.left + 0.65, roomBounds.right - 0.65)
  position[2] = clamp(position[2], roomBounds.back + 0.65, roomBounds.front - 0.65)
}

function shouldClampOutsideCameraToBuilding(position: Vec3) {
  return position[1] <= characterFloor + 0.8 || inOutsideRooftopStairsCameraZone(position)
}

function inOutsideRooftopStairsCameraZone(position: Vec3) {
  return inCameraBounds(position, outsideRooftopStairs, 0.5)
    || inCameraBounds(position, outsideRooftopLanding, 0.35)
}

function inCameraBounds(position: Vec3, bounds: { x: number; z: number; width: number; depth: number },
  padding: number)
{
  return position[0] > bounds.x - bounds.width / 2 - padding
    && position[0] < bounds.x + bounds.width / 2 + padding
    && position[2] > bounds.z - bounds.depth / 2 - padding
    && position[2] < bounds.z + bounds.depth / 2 + padding
}

function inOutsideToilets(position: Vec3) {
  return position[0] > outsideToilets.x - outsideToilets.width / 2
    && position[0] < outsideToilets.x + outsideToilets.width / 2
    && position[2] > outsideToilets.z - outsideToilets.depth / 2
    && position[2] < outsideToilets.z + outsideToilets.depth / 2
}

function inOutsideDjCameraZone(position: Vec3) {
  const side = outsideDjBooth.width / 2 + 0.45
  const back = outsideDjBooth.z - outsideDjBooth.depth / 2 - 1.2
  const front = outsideDjBooth.z + outsideDjBooth.depth / 2 + 0.9

  return position[0] > outsideDjBooth.x - side
    && position[0] < outsideDjBooth.x + side
    && position[2] > back
    && position[2] < front
}

function clampOutsideToiletCamera(position: Vec3, characterPosition: Vec3) {
  const padding = 0.42
  const dividerPadding = 0.3
  const back = outsideToilets.z - outsideToilets.depth / 2 + padding
  const front = outsideToilets.z + outsideToilets.depth / 2 - padding
  const toiletBack = characterPosition[2] < outsideToilets.z
  const minZ = toiletBack ? back : outsideToilets.z + dividerPadding
  const maxZ = toiletBack ? outsideToilets.z - dividerPadding : front

  position[0] = clamp(position[0], outsideToilets.x - outsideToilets.width / 2 + padding,
    outsideToilets.x + outsideToilets.width / 2 - padding)
  position[2] = clamp(position[2], minZ, maxZ)
}

function clampTentCamera(position: Vec3) {
  const y = position[1] - characterFloor
  const roof = clamp((y - tent.wallHeight) / (tent.height - tent.wallHeight), 0, 1)
  const radius = tent.radius * (1 - roof) - 0.7
  const x = position[0] - tent.x
  const z = position[2] - tent.z
  const distance = Math.sqrt(x * x + z * z)

  if (distance > radius) {
    position[0] = tent.x + x / distance * radius
    position[2] = tent.z + z / distance * radius
  }
}

function cameraDanceBounce(time: number) {
  const beat = (time * 2.25) % 1
  const offbeat = (time * 4.3 + 0.5) % 1
  const kick = beat < 0.08 ? beat / 0.08 : 1 - (beat - 0.08) / 0.92
  const tick = offbeat < 0.04 ? offbeat / 0.04 : 1 - (offbeat - 0.04) / 0.96

  return kick * 0.26 + tick * 0.035
}

function cameraDanceDistance(time: number) {
  const beat = (time * 2.15) % 1
  const zoom = beat < 0.1 ? beat / 0.1 : 1 - (beat - 0.1) / 0.9

  return 2.2 + zoom * 0.18
}
