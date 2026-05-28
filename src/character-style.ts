import { hairPalette, jewelPalette, pants, shirt, shirtLight, shoe, skinPalette } from './character-data.ts'
import { normalizeIndex, scale, setVec3 } from './math.ts'
import type { BottomMode, PlayerStyle, ResolvedPlayerStyle, TopMode } from './types.ts'

const topStyleCache = new Map<number, ReturnType<typeof createTopStyleData>>()
const resolvedStyleCache = new Map<number, ResolvedPlayerStyle>()

export function createCharacterStyleController() {
  let shirtColorIndex = 0
  let topStyleIndex = 0
  let topMode: TopMode = 'shirt'
  let pantsColorIndex = 0
  let bottomStyleIndex = 0
  let bottomMode: BottomMode = 'pants'
  let skinColorIndex = 2

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
      skinColorIndex = normalizeIndex(skinColorIndex + direction, skinPalette.length)
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
  const key = (topIndex * jewelPalette.length * 2 + bottomIndex) * hairPalette.length * skinPalette.length + hairColorIndex * skinPalette.length + skinColorIndex
  const cached = resolvedStyleCache.get(key)

  if (cached) {
    return cached
  }

  const top = topStyleData(topIndex)
  const bottomMode: BottomMode = bottomIndex < jewelPalette.length ? 'pants' : 'skirt'
  const pantsColor = jewelPalette[bottomIndex % jewelPalette.length]!
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
    skinColor: skinPalette[skinColorIndex]!,
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
