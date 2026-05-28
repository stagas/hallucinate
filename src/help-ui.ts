type HelpKey = {
  keys: string[]
  label: string
}

const leftRows: HelpKey[][] = [
  [{ keys: ['1', '2'], label: 'hair color' }],
  [{ keys: ['q', 'w'], label: 'hair style' }],
  [
    { keys: ['a', 's'], label: 'top wear' },
    { keys: ['d', 'f'], label: 'dance moves' },
  ],
  [{ keys: ['z', 'x'], label: 'bottom wear' }],
  [{ keys: ['3', '4'], label: 'skin color' }],
]

const moveRows: HelpKey[][] = [
  [{ keys: ['↑', 'i'], label: 'forward' }],
  [
    { keys: ['←', 'j'], label: 'left' },
    { keys: ['↓', 'k'], label: 'back' },
    { keys: ['→', 'l'], label: 'right' },
  ],
]

export function createHelpUi() {
  const root = document.createElement('div')
  const left = document.createElement('div')
  const move = document.createElement('div')
  const speak = helpBox({ keys: ['space'], label: 'speak' })
  const toggle = helpBox({ keys: ['h'], label: 'help' })
  const video = helpNote("If the video doesn't start, press play on it")

  root.id = 'help-ui'
  root.dataset.open = 'true'
  left.className = 'help-cluster help-cluster-left'
  move.className = 'help-cluster help-cluster-move'
  speak.className = 'help-box help-box-speak'
  toggle.className = 'help-box help-box-toggle'
  video.className = 'help-box help-box-video'

  for (const row of leftRows) {
    left.append(helpRow(row))
  }

  for (const row of moveRows) {
    move.append(helpRow(row))
  }

  root.append(left, move, speak, video, toggle)
  document.body.append(root)

  return {
    root,
    hide() {
      root.dataset.open = 'false'
    },
    show() {
      root.dataset.open = 'true'
    },
    toggle() {
      const open = root.dataset.open !== 'true'

      root.dataset.open = String(open)

      return open
    },
  }
}

function helpRow(items: HelpKey[]) {
  const row = document.createElement('div')

  row.className = 'help-row'
  row.append(...items.map(helpBox))

  return row
}

function helpBox(item: HelpKey) {
  const box = document.createElement('div')
  const keys = document.createElement('span')
  const label = document.createElement('span')

  box.className = 'help-box'
  keys.className = 'help-keys'
  label.className = 'help-label'
  keys.append(...item.keys.map(helpKey))
  label.textContent = item.label
  box.append(keys, label)

  return box
}

function helpNote(text: string) {
  const box = document.createElement('div')
  const label = document.createElement('span')

  box.className = 'help-box'
  label.className = 'help-label'
  label.textContent = text
  box.append(label)

  return box
}

function helpKey(key: string) {
  const element = document.createElement('kbd')

  element.className = key === 'space' ? 'help-key help-key-space' : 'help-key'
  element.textContent = key

  return element
}
