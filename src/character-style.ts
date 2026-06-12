import { hairPalette, jewelPalette, pants, shirt, shirtLight, shoe, skin, skinPalette } from './character-data.ts'
import { graffitiColors } from './graffiti.ts'
import { normalizeIndex, scale, setVec3 } from './math.ts'
import type { BottomMode, PlayerStyle, ResolvedPlayerStyle, TopMode } from './types.ts'
import type { Vec3 } from './types.ts'

const topStyleCache = new Map<number, ReturnType<typeof createTopStyleData>>()
const resolvedStyleCache = new Map<number, ResolvedPlayerStyle>()
export const glowstickColors: Vec3[] = [
  [1, 0.03, 0.02],
  [1, 0.03, 0.7],
  [0.05, 0.82, 1],
  [0, 1, 0.18],
  [1, 0.9, 0.04],
  [0.6, 0.12, 1],
  [1, 0.22, 0.04],
]
export const sprayColors: Vec3[] = graffitiColors
export const cigaretteColors: Vec3[] = [
  [0.96, 0.96, 0.92],
]
export const jetpackColors: Vec3[] = [
  [0.23, 0.25, 0.3],
]
export const accessoryPalette: Vec3[] = [...glowstickColors, ...sprayColors, ...cigaretteColors, ...jetpackColors]

export function resolveAccessoryKind(accessoryIndex: number): ResolvedPlayerStyle['accessoryKind'] {
  const index = normalizeIndex(accessoryIndex, accessoryPalette.length + 1)

  return index === 0
    ? undefined
    : index <= glowstickColors.length
    ? 'glowstick'
    : index <= glowstickColors.length + sprayColors.length
    ? 'spray'
    : index <= glowstickColors.length + sprayColors.length + cigaretteColors.length
    ? 'cigarette'
    : 'jetpack'
}

export function createCharacterStyleController() {
  let shirtColorIndex = 0
  let topStyleIndex = 0
  let topMode: TopMode = 'shirt'
  let pantsColorIndex = 0
  let bottomStyleIndex = 0
  let bottomMode: BottomMode = 'pants'
  let skinColorIndex = 2
  let accessoryIndex = 0

  return {
    get shirtColorIndex() {
      return shirtColorIndex
    },
    get topStyleIndex() {
      return topStyleIndex
    },
    set topStyleIndex(value: number) {
      topStyleIndex = value
    },
    get topMode() {
      return topMode
    },
    get pantsColorIndex() {
      return pantsColorIndex
    },
    get bottomStyleIndex() {
      return bottomStyleIndex
    },
    set bottomStyleIndex(value: number) {
      bottomStyleIndex = value
    },
    get bottomMode() {
      return bottomMode
    },
    get skinColorIndex() {
      return skinColorIndex
    },
    set skinColorIndex(value: number) {
      skinColorIndex = normalizeIndex(value, skinPalette.length)
      setVec3(skin, skinPalette[skinColorIndex]!)
    },
    get accessoryIndex() {
      return accessoryIndex
    },
    set accessoryIndex(value: number) {
      accessoryIndex = normalizeIndex(value, accessoryPalette.length + 1)
    },
    cycleShirt(direction: number) {
      topStyleIndex = normalizeIndex(topStyleIndex + direction, jewelPalette.length * 2 + 2)
      this.setTopStyle()
    },
    setTopStyle() {
      const style = applyTopStyle(topStyleIndex)

      topMode = style.mode
      shirtColorIndex = style.colorIndex
    },
    cyclePants(direction: number) {
      bottomStyleIndex = normalizeIndex(bottomStyleIndex + direction, jewelPalette.length * 2)
      this.setBottomStyle()
    },
    setBottomStyle() {
      const style = applyBottomStyle(bottomStyleIndex)

      bottomMode = style.mode
      pantsColorIndex = style.colorIndex
    },
    cycleSkin(direction: number) {
      this.skinColorIndex = skinColorIndex + direction
    },
    cycleAccessory(direction: number) {
      this.accessoryIndex = accessoryIndex + direction
    },
  }
}

export function applyTopStyle(topStyleIndex: number) {
  const style = topStyleData(topStyleIndex)

  setVec3(shirt, jewelPalette[style.colorIndex]!)
  setVec3(shirtLight, scale(jewelPalette[style.colorIndex]!, 1.35))

  return style
}

export function applyBottomStyle(bottomStyleIndex: number) {
  const bottomMode = bottomStyleIndex < jewelPalette.length ? 'pants' : 'skirt'
  const pantsColorIndex = bottomStyleIndex % jewelPalette.length

  setVec3(pants, jewelPalette[pantsColorIndex]!)
  setVec3(shoe, scale(jewelPalette[pantsColorIndex]!, 0.72))

  return {
    mode: bottomMode as BottomMode,
    colorIndex: pantsColorIndex,
  }
}

export function resolvePlayerStyle(style: PlayerStyle): ResolvedPlayerStyle {
  const topIndex = normalizeIndex(style.topStyleIndex, jewelPalette.length * 2 + 2)
  const bottomIndex = normalizeIndex(style.bottomStyleIndex, jewelPalette.length * 2)
  const hairColorIndex = normalizeIndex(style.hairColorIndex, hairPalette.length)
  const skinColorIndex = normalizeIndex(style.skinColorIndex, skinPalette.length)
  const accessoryIndex = normalizeIndex(style.accessoryIndex, accessoryPalette.length + 1)
  const key = (((topIndex * jewelPalette.length * 2 + bottomIndex) * hairPalette.length + hairColorIndex)
          * skinPalette.length + skinColorIndex) * (accessoryPalette.length + 1) + accessoryIndex
  const cached = resolvedStyleCache.get(key)

  if (cached) {
    return cached
  }

  const top = topStyleData(topIndex)
  const bottomMode: BottomMode = bottomIndex < jewelPalette.length ? 'pants' : 'skirt'
  const pantsColor = jewelPalette[bottomIndex % jewelPalette.length]!
  const accessoryKind = resolveAccessoryKind(accessoryIndex)
  const resolved = {
    topMode: top.mode,
    bottomMode,
    shirt: jewelPalette[top.colorIndex]!,
    shirtLight: scale(jewelPalette[top.colorIndex]!, 1.35),
    pants: pantsColor,
    pantsDark: scale(pantsColor, 0.68),
    pantsDim: scale(pantsColor, 0.78),
    pantsLight: scale(pantsColor, 0.88),
    shoe: scale(pantsColor, 0.72),
    hairColor: hairPalette[hairColorIndex]!,
    skin: skinPalette[skinColorIndex]!,
    accessory: accessoryIndex === 0 ? undefined : accessoryPalette[accessoryIndex - 1],
    accessoryKind,
  }

  resolvedStyleCache.set(key, resolved)

  return resolved
}

function topStyleData(topStyleIndex: number) {
  const cached = topStyleCache.get(topStyleIndex)

  if (cached) {
    return cached
  }

  const data = createTopStyleData(topStyleIndex)

  topStyleCache.set(topStyleIndex, data)

  return data
}

function createTopStyleData(topStyleIndex: number) {
  const colorIndex = topStyleIndex < jewelPalette.length
    ? topStyleIndex
    : topStyleIndex < jewelPalette.length * 2
    ? topStyleIndex - jewelPalette.length
    : 0
  const mode = topStyleIndex < jewelPalette.length
    ? 'shirt'
    : topStyleIndex < jewelPalette.length * 2
    ? 'sleeveless'
    : topStyleIndex === jewelPalette.length * 2
    ? 'skin'
    : 'chest'

  return {
    mode: mode as TopMode,
    colorIndex,
  }
}
