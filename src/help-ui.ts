import type { InputLayout } from './input.ts'

type HelpKey = {
  keys: string[]
  label: string
}

const leftRows: HelpKey[][] = [
  [
    { keys: ['1', '2'], label: 'hair color' },
    { keys: ['3', '4'], label: 'skin tone' },
  ],
  [
    { keys: ['q', 'w'], label: 'hair style' },
    { keys: ['e', 'r'], label: 'accessories' },
  ],
  [
    { keys: ['a', 's'], label: 'top wear' },
    { keys: ['d', 'f'], label: 'dance moves' },
  ],
  [
    { keys: ['z', 'x'], label: 'bottom wear' },
  ],
]

const alternativeLeftRows: HelpKey[][] = [
  [
    { keys: ['7', '8'], label: 'hair color' },
    { keys: ['9', '0'], label: 'skin tone' },
  ],
  [
    { keys: ['u', 'i'], label: 'hair style' },
    { keys: ['o', 'p'], label: 'accessories' },
  ],
  [
    { keys: ['j', 'k'], label: 'top wear' },
    { keys: ['l', ';'], label: 'dance moves' },
  ],
  [
    { keys: ['m', ','], label: 'bottom wear' },
  ],
]

const actionRow: HelpKey[] = [
  { keys: ['c'], label: 'bubbles' },
  { keys: ['v'], label: 'wave' },
  { keys: ['b'], label: 'bounce / jetpack' },
  { keys: ['n'], label: 'foam' },
]
const moveRows: HelpKey[][] = [
  [{ keys: ['↑', 'i'], label: 'forward' }],
  [
    { keys: ['←', 'j'], label: 'left' },
    { keys: ['↓', 'k'], label: 'back' },
    { keys: ['→', 'l'], label: 'right' },
  ],
]

const alternativeMoveRows: HelpKey[][] = [
  [{ keys: ['↑', 'w'], label: 'forward' }],
  [
    { keys: ['←', 'a'], label: 'left' },
    { keys: ['↓', 's'], label: 'back' },
    { keys: ['→', 'd'], label: 'right' },
  ],
]
const azertyMoveRows: HelpKey[][] = [
  [{ keys: ['↑', 'z'], label: 'forward' }],
  [
    { keys: ['←', 'q'], label: 'left' },
    { keys: ['↓', 's'], label: 'back' },
    { keys: ['→', 'd'], label: 'right' },
  ],
]

export function createHelpUi() {
  const root = document.createElement('div')
  const left = document.createElement('div')
  const move = document.createElement('div')
  const actions = helpRow(actionRow)
  const alternativeActions = helpRow(alternativeActionRowForLayout('wasd'))
  const speak = helpBox({ keys: ['space'], label: 'speak' })
  const alternative = helpBox({ keys: ['tab'], label: 'alt inputs' })
  const toggle = helpBox({ keys: ['?', 'h'], label: 'help' })
  const video = helpNote('If the video doesn\'t start, press play on it')

  root.id = 'help-ui'
  root.dataset.open = 'true'
  left.className = 'help-cluster help-cluster-left'
  move.className = 'help-cluster help-cluster-move'
  actions.className = 'help-row help-row-actions'
  alternativeActions.className = 'help-row help-row-alternative-actions'
  speak.className = 'help-box help-box-speak'
  alternative.className = 'help-box help-box-alternative'
  toggle.className = 'help-box help-box-toggle'
  video.className = 'help-box help-box-video'
  video.addEventListener('click', dismissVideoHint)

  renderCluster(left, leftRows)
  renderCluster(move, moveRows)

  root.append(left, move, speak, actions, alternative, alternativeActions, video, toggle)
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
    dismissVideoHint,
    setInputLayout(value: InputLayout) {
      renderCluster(left, value === 'ijkl' ? leftRows : alternativeLeftRows)
      renderCluster(move, moveRowsForLayout(value))
      renderRow(alternativeActions, alternativeActionRowForLayout(value))
    },
  }
}

function alternativeActionRowForLayout(value: InputLayout): HelpKey[] {
  return [
    { keys: ['g'], label: 'sunglasses' },
    { keys: ['t'], label: 'view' },
    { keys: [value === 'ijkl' ? 'o' : 'f'], label: 'camera' },
    { keys: ['y'], label: 'breakdance' },
  ]
}

function moveRowsForLayout(value: InputLayout) {
  return value === 'ijkl' ? moveRows : value === 'wasd' ? alternativeMoveRows : azertyMoveRows
}

function dismissVideoHint() {
  document.documentElement.dataset.videoHintDismissed = 'true'
}

function renderCluster(cluster: HTMLElement, rows: HelpKey[][]) {
  cluster.replaceChildren(...rows.map(helpRow))
}

function renderRow(row: HTMLElement, items: HelpKey[]) {
  row.replaceChildren(...items.map(helpBox))
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

  element.className = key === 'space' ? 'help-key help-key-space' : key === 'tab' ? 'help-key help-key-tab' : 'help-key'
  element.textContent = key

  return element
}
