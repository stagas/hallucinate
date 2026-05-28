import type { Vec3 } from './types.ts'

export function readMoveInput(keys: Set<string>, target: Vec3) {
  target[0] = Number(keys.has('l') || keys.has('arrowright')) - Number(keys.has('j') || keys.has('arrowleft'))
  target[1] = 0
  target[2] = Number(keys.has('i') || keys.has('arrowup')) - Number(keys.has('k') || keys.has('arrowdown'))

  return target
}

export function bindKeyboardInput(options: {
  activeInput: HTMLInputElement
  keys: Set<string>
  openChatInput: () => void
  toggleHelp: () => void
  cycleHair: (direction: number) => void
  cycleHairColor: (direction: number) => void
  cycleIdle: (direction: number) => void
  cycleShirt: (direction: number) => void
  cyclePants: (direction: number) => void
  cycleSkin: (direction: number) => void
}) {
  addEventListener('keydown', event => {
    if (document.activeElement === options.activeInput) {
      return
    }

    if (event.code === 'Space') {
      event.preventDefault()
      options.openChatInput()
      return
    }

    if (event.key.toLowerCase() === 'h') {
      options.toggleHelp()
      return
    }

    if (event.key.toLowerCase() === 'q') {
      options.cycleHair(-1)
      return
    }

    if (event.key.toLowerCase() === 'w') {
      options.cycleHair(1)
      return
    }

    if (event.key.toLowerCase() === 'd') {
      options.cycleIdle(-1)
      return
    }

    if (event.key.toLowerCase() === 'f') {
      options.cycleIdle(1)
      return
    }

    if (event.key === '1') {
      options.cycleHairColor(-1)
      return
    }

    if (event.key === '2') {
      options.cycleHairColor(1)
      return
    }

    if (event.key.toLowerCase() === 'a') {
      options.cycleShirt(-1)
      return
    }

    if (event.key.toLowerCase() === 's') {
      options.cycleShirt(1)
      return
    }

    if (event.key.toLowerCase() === 'z') {
      options.cyclePants(-1)
      return
    }

    if (event.key.toLowerCase() === 'x') {
      options.cyclePants(1)
      return
    }

    if (event.key === '3') {
      options.cycleSkin(-1)
      return
    }

    if (event.key === '4') {
      options.cycleSkin(1)
      return
    }

    options.keys.add(event.key.toLowerCase())
  })

  addEventListener('keyup', event => {
    options.keys.delete(event.key.toLowerCase())
  })
}
