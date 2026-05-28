import { jewelPalette } from './character-data.ts'
import { createCharacterHairController } from './character-hair-control.ts'
import { createCharacterStyleController } from './character-style.ts'
import { readClubState, writeClubState } from './club-state.ts'
import { createDjVideoUi } from './dj-video-ui.ts'
import { createLocalCharacter } from './local-character.ts'
import { normalizeIndex, setVec3 } from './math.ts'
import type { Vec3 } from './types.ts'

export function restoreClubState(options: {
  camera: {
    position: Vec3
    turn: number
  }
  characterPosition: Vec3
  djVideoUi: ReturnType<typeof createDjVideoUi>
  hairController: ReturnType<typeof createCharacterHairController>
  idleClipIndex: {
    set(value: number): void
  }
  idleClipCount: number
  key: string
  localCharacter: ReturnType<typeof createLocalCharacter>
  styleController: ReturnType<typeof createCharacterStyleController>
}) {
  const state = readClubState(options.key)

  if (state) {
    setVec3(options.characterPosition, [
      state.character[0] ?? options.characterPosition[0],
      state.character[1] ?? options.characterPosition[1],
      state.character[2] ?? options.characterPosition[2],
    ])
    setVec3(options.camera.position, [
      state.camera[0] ?? options.camera.position[0],
      state.camera[1] ?? options.camera.position[1],
      state.camera[2] ?? options.camera.position[2],
    ])
    options.camera.turn = state.cameraTurn ?? options.camera.turn
    options.localCharacter.turn = state.characterTurn ?? options.localCharacter.turn
    options.localCharacter.velocityY = state.velocityY ?? options.localCharacter.velocityY
    options.hairController.index = state.characterHairIndex ?? options.hairController.index
    options.hairController.colorIndex = state.characterHairColorIndex ?? options.hairController.colorIndex
    options.idleClipIndex.set(normalizeIndex(state.idleClipIndex ?? 0, options.idleClipCount))
    options.styleController.topStyleIndex = normalizeIndex(state.topStyleIndex ?? state.shirtColorIndex
      ?? options.styleController.topStyleIndex, jewelPalette.length * 2 + 2)
    options.styleController.bottomStyleIndex = normalizeIndex(state.bottomStyleIndex ?? state.pantsColorIndex
      ?? options.styleController.bottomStyleIndex, jewelPalette.length * 2)
    options.styleController.skinColorIndex = state.skinColorIndex ?? options.styleController.skinColorIndex
    options.djVideoUi.times.inside = state.videoTimes?.inside ?? options.djVideoUi.times.inside
    options.djVideoUi.times.outside = state.videoTimes?.outside ?? options.djVideoUi.times.outside
    options.djVideoUi.trackIndexes.inside = state.videoTrackIndexes?.inside ?? options.djVideoUi.trackIndexes.inside
    options.djVideoUi.trackIndexes.outside = state.videoTrackIndexes?.outside ?? options.djVideoUi.trackIndexes.outside
    options.styleController.setTopStyle()
    options.styleController.setBottomStyle()
  }
}

export function saveClubState(options: {
  camera: {
    position: Vec3
    turn: number
  }
  characterAssetsLoaded: boolean
  characterPosition: Vec3
  djVideoUi: ReturnType<typeof createDjVideoUi>
  hairController: ReturnType<typeof createCharacterHairController>
  idleClipIndex: number
  key: string
  localCharacter: ReturnType<typeof createLocalCharacter>
  room: number
  styleController: ReturnType<typeof createCharacterStyleController>
}) {
  if (!options.characterAssetsLoaded) {
    return
  }

  options.djVideoUi.syncCurrentTime()

  writeClubState(options.key, {
    character: options.characterPosition,
    camera: options.camera.position,
    cameraTurn: options.camera.turn,
    characterTurn: options.localCharacter.turn,
    velocityY: options.localCharacter.velocityY,
    characterHairIndex: options.hairController.index,
    characterHairColorIndex: options.hairController.colorIndex,
    idleClipIndex: options.idleClipIndex,
    shirtColorIndex: options.styleController.shirtColorIndex,
    topStyleIndex: options.styleController.topStyleIndex,
    pantsColorIndex: options.styleController.pantsColorIndex,
    bottomStyleIndex: options.styleController.bottomStyleIndex,
    skinColorIndex: options.styleController.skinColorIndex,
    room: options.room,
    videoTimes: options.djVideoUi.times,
    videoTrackIndexes: options.djVideoUi.trackIndexes,
  })
}
