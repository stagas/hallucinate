import type { Vec3 } from './types.ts'

export type InputLayout = 'wasd' | 'ijkl' | 'zqsd'

const inputLayouts: InputLayout[] = ['wasd', 'ijkl', 'zqsd']
const moveKeys: Record<InputLayout, { back: string; forward: string; left: string; right: string }> = {
  ijkl: { back: 'k', forward: 'i', left: 'j', right: 'l' },
  wasd: { back: 's', forward: 'w', left: 'a', right: 'd' },
  zqsd: { back: 's', forward: 'z', left: 'q', right: 'd' },
}
let inputLayout: InputLayout = 'wasd'
let touchMoveX = 0
let touchMoveZ = 0

export function readMoveInput(keys: Set<string>, target: Vec3) {
  const { back, forward, left, right } = moveKeys[inputLayout]

  target[0] = Number(keys.has(right) || keys.has('arrowright')) - Number(keys.has(left) || keys.has('arrowleft'))
    + touchMoveX
  target[1] = 0
  target[2] = Number(keys.has(forward) || keys.has('arrowup')) - Number(keys.has(back) || keys.has('arrowdown'))
    + touchMoveZ

  return target
}

export function setInputLayout(value: InputLayout) {
  inputLayout = value
}

export function setTouchMoveInput(x: number, z: number) {
  touchMoveX = x
  touchMoveZ = z
}

export function clearTouchMoveInput() {
  setTouchMoveInput(0, 0)
}

export function bindKeyboardInput(options: {
  activeInputs: HTMLInputElement[]
  keys: Set<string>
  openChatInput: () => void
  setInputLayout: (value: InputLayout) => void
  toggleHelp: () => void
  startJumping: () => void
  stopJumping: () => void
  jetpackActive: () => boolean
  startJetpackThrust: () => void
  stopJetpackThrust: () => void
  startWave: () => void
  stopWave: () => void
  startBubbles: () => void
  stopBubbles: () => void
  startFoam: () => void
  stopFoam: () => void
  startBreakdance: () => void
  cycleHair: (direction: number) => void
  cycleHairColor: (direction: number) => void
  cycleSkin: (direction: number) => void
  cycleIdle: (direction: number) => void
  cycleShirt: (direction: number) => void
  cyclePants: (direction: number) => void
  cycleAccessory: (direction: number) => void
  toggleSunglasses: () => void
  toggleCameraControl: () => void
  toggleView: () => void
}) {
  let bThrusting = false

  window.addEventListener('keydown', event => {
    if (options.activeInputs.includes(document.activeElement as HTMLInputElement)) {
      return
    }

    if (event.code === 'Space') {
      event.preventDefault()
      options.openChatInput()
      return
    }

    if (event.code === 'Tab') {
      event.preventDefault()
      inputLayout = inputLayouts[(inputLayouts.indexOf(inputLayout) + 1) % inputLayouts.length]!
      options.keys.clear()
      options.setInputLayout(inputLayout)
      return
    }

    const key = event.key.toLowerCase()
    const alternativeStyleInput = inputLayout !== 'ijkl'

    if (key === '?' || key === 'h') {
      options.toggleHelp()
      return
    }

    if (key === 'b') {
      if (options.keys.has(key)) {
        return
      }

      options.keys.add(key)
      bThrusting = options.jetpackActive()
      if (bThrusting) {
        options.startJetpackThrust()
      }
      else {
        options.startJumping()
      }
      return
    }

    if (key === 'v') {
      options.startWave()
      return
    }

    if (key === 'c') {
      options.startBubbles()
      return
    }

    if (key === 'n') {
      options.startFoam()
      return
    }

    if (key === 'g') {
      if (options.keys.has(key)) {
        return
      }

      options.keys.add(key)
      options.toggleSunglasses()
      return
    }

    if (key === 't') {
      if (options.keys.has(key)) {
        return
      }

      options.keys.add(key)
      options.toggleView()
      return
    }

    const cameraKey = inputLayout === 'ijkl' ? 'o' : 'f'

    if (key === cameraKey) {
      if (options.keys.has(key)) {
        return
      }

      options.keys.add(key)
      options.toggleCameraControl()
      return
    }

    if (key === 'y') {
      if (options.keys.has(key)) {
        return
      }

      options.keys.add(key)
      options.startBreakdance()
      return
    }

    if ((!alternativeStyleInput && key === 'q') || (alternativeStyleInput && key === 'u')) {
      options.cycleHair(-1)
      return
    }

    if ((!alternativeStyleInput && key === 'w') || (alternativeStyleInput && key === 'i')) {
      options.cycleHair(1)
      return
    }

    if ((!alternativeStyleInput && key === 'd') || (alternativeStyleInput && key === 'l')) {
      options.cycleIdle(-1)
      return
    }

    if ((!alternativeStyleInput && key === 'f') || (alternativeStyleInput && key === ';')) {
      options.cycleIdle(1)
      return
    }

    if ((!alternativeStyleInput && event.key === '1') || (alternativeStyleInput && event.key === '7')) {
      options.cycleHairColor(-1)
      return
    }

    if ((!alternativeStyleInput && event.key === '2') || (alternativeStyleInput && event.key === '8')) {
      options.cycleHairColor(1)
      return
    }

    if ((!alternativeStyleInput && event.key === '3') || (alternativeStyleInput && event.key === '9')) {
      options.cycleSkin(-1)
      return
    }

    if ((!alternativeStyleInput && event.key === '4') || (alternativeStyleInput && event.key === '0')) {
      options.cycleSkin(1)
      return
    }

    if ((!alternativeStyleInput && key === 'a') || (alternativeStyleInput && key === 'j')) {
      options.cycleShirt(-1)
      return
    }

    if ((!alternativeStyleInput && key === 's') || (alternativeStyleInput && key === 'k')) {
      options.cycleShirt(1)
      return
    }

    if ((!alternativeStyleInput && key === 'z') || (alternativeStyleInput && key === 'm')) {
      options.cyclePants(-1)
      return
    }

    if ((!alternativeStyleInput && key === 'x') || (alternativeStyleInput && key === ',')) {
      options.cyclePants(1)
      return
    }

    if ((!alternativeStyleInput && key === 'e') || (alternativeStyleInput && key === 'o')) {
      options.cycleAccessory(-1)
      return
    }

    if ((!alternativeStyleInput && key === 'r') || (alternativeStyleInput && key === 'p')) {
      options.cycleAccessory(1)
      return
    }

    options.keys.add(key)
  })

  window.addEventListener('keyup', event => {
    const key = event.key.toLowerCase()

    if (key === 'v') {
      options.stopWave()
      return
    }

    if (key === 'c') {
      options.stopBubbles()
      return
    }

    if (key === 'n') {
      options.stopFoam()
      return
    }

    if (key === 'b') {
      if (bThrusting) {
        options.stopJetpackThrust()
      }
      else {
        options.stopJumping()
      }
      bThrusting = false
    }

    options.keys.delete(key)
  })
}
