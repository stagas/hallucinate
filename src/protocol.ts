import type { Vec3 } from './types.ts'
import type { CharacterMode, PlayerStyle } from './types.ts'

export const C_MOTION = 1
export const S_ROOM_STATE = 2
export const S_MOTION = 3
export const S_LEAVE = 4
export const C_ROOM_CHANGE = 6
export const S_SPAWN = 7
export const MESSAGE = 8
export const C_HEARTBEAT = 9

export const roomCount = 2
export const messageMaxLength = 120
export const positionScale = 100

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()
const angleScale = 256 / (Math.PI * 2)
const spawnSize = 15

export type MotionPacket = {
  id?: number
  x: number
  y: number
  keys: number
  angle: number
  idleClipIndex: number
  mode: number
  style: PlayerStyle
}

export type SpawnPacket = Required<MotionPacket>

export type RoomStatePacket = {
  selfId: number
  room: number
  players: SpawnPacket[]
}

export type MessagePacket = {
  id: number
  text: string
}

const protocolModes: CharacterMode[] = ['stand', 'run', 'manSitting', 'womanSitting']

export function modeToProtocol(mode: CharacterMode) {
  return protocolModes.indexOf(mode)
}

export function protocolToMode(mode: number) {
  return protocolModes[mode]!
}

export function sceneToProtocol(value: number) {
  return Math.round(value * positionScale)
}

export function protocolToScene(value: number) {
  return value / positionScale
}

export function angleToProtocol(angle: number) {
  return ((Math.round(angle * angleScale) % 256) + 256) % 256
}

export function protocolToAngle(angle: number) {
  return angle / angleScale
}

export function encodeKeys(input: Vec3) {
  return Number(input[2] > 0) | (Number(input[0] > 0) << 1) | (Number(input[2] < 0) << 2)
    | (Number(input[0] < 0) << 3)
}

export function decodeKeys(keys: number, angle: number): Vec3 {
  if (keys === 0) {
    return [0, 0, 0]
  }

  return [Math.sin(protocolToAngle(angle)), 0, Math.cos(protocolToAngle(angle))]
}

export function encodeClientMotion(packet: MotionPacket) {
  const data = new ArrayBuffer(14)
  const view = new DataView(data)

  view.setUint8(0, C_MOTION)
  writeMotion(view, 1, packet)

  return data
}

export function decodeClientMotion(view: DataView): MotionPacket {
  expectSize(view, 1 + spawnSize - 2)

  return {
    ...readMotion(view, 1),
  }
}

export function encodeRoomChange(room: number) {
  const data = new ArrayBuffer(2)
  const view = new DataView(data)

  view.setUint8(0, C_ROOM_CHANGE)
  view.setUint8(1, room)

  return data
}

export function decodeRoomChange(view: DataView) {
  expectSize(view, 2)

  return view.getUint8(1)
}

export function encodeHeartbeat() {
  const data = new ArrayBuffer(1)
  const view = new DataView(data)

  view.setUint8(0, C_HEARTBEAT)

  return data
}

export function encodeSpawn(packet: SpawnPacket) {
  const data = new ArrayBuffer(1 + spawnSize)
  const view = new DataView(data)

  view.setUint8(0, S_SPAWN)
  writeSpawn(view, 1, packet)

  return data
}

export function decodeSpawn(view: DataView, offset = 1): SpawnPacket {
  expectSize(view, offset + spawnSize)

  return readSpawn(view, offset)
}

export function encodeServerMotion(packet: SpawnPacket) {
  const data = new ArrayBuffer(1 + spawnSize)
  const view = new DataView(data)

  view.setUint8(0, S_MOTION)
  writeSpawn(view, 1, packet)

  return data
}

export function decodeServerMotion(view: DataView): SpawnPacket {
  expectSize(view, 1 + spawnSize)

  return readSpawn(view, 1)
}

export function encodeLeave(id: number) {
  const data = new ArrayBuffer(3)
  const view = new DataView(data)

  view.setUint8(0, S_LEAVE)
  view.setUint16(1, id)

  return data
}

export function decodeLeave(view: DataView) {
  expectSize(view, 3)

  return view.getUint16(1)
}

export function encodeRoomState(packet: RoomStatePacket) {
  const data = new ArrayBuffer(6 + packet.players.length * spawnSize)
  const view = new DataView(data)

  view.setUint8(0, S_ROOM_STATE)
  view.setUint16(1, packet.selfId)
  view.setUint8(3, packet.room)
  view.setUint16(4, packet.players.length)
  packet.players.forEach((player, index) => writeSpawn(view, 6 + index * spawnSize, player))

  return data
}

export function decodeRoomState(view: DataView): RoomStatePacket {
  expectAtLeastSize(view, 6)

  const count = view.getUint16(4)
  expectSize(view, 6 + count * spawnSize)
  const players: SpawnPacket[] = []

  for (let i = 0; i < count; i++) {
    players.push(readSpawn(view, 6 + i * spawnSize))
  }

  return {
    selfId: view.getUint16(1),
    room: view.getUint8(3),
    players,
  }
}

export function encodeClientMessage(text: string) {
  const bytes = textEncoder.encode(text)
  const data = new ArrayBuffer(3 + bytes.length)
  const view = new DataView(data)

  view.setUint8(0, MESSAGE)
  view.setUint16(1, bytes.length)
  new Uint8Array(data, 3).set(bytes)

  return data
}

export function decodeClientMessage(view: DataView) {
  expectAtLeastSize(view, 3)

  const length = view.getUint16(1)
  expectTextSize(view, 3, length)

  return textDecoder.decode(new Uint8Array(view.buffer, view.byteOffset + 3, length))
}

export function encodeServerMessage(packet: MessagePacket) {
  const bytes = textEncoder.encode(packet.text)
  const data = new ArrayBuffer(5 + bytes.length)
  const view = new DataView(data)

  view.setUint8(0, MESSAGE)
  view.setUint16(1, packet.id)
  view.setUint16(3, bytes.length)
  new Uint8Array(data, 5).set(bytes)

  return data
}

export function decodeServerMessage(view: DataView): MessagePacket {
  expectAtLeastSize(view, 5)

  const length = view.getUint16(3)
  expectTextSize(view, 5, length)

  return {
    id: view.getUint16(1),
    text: textDecoder.decode(new Uint8Array(view.buffer, view.byteOffset + 5, length)),
  }
}

export function truncateMessage(text: string) {
  return [...text.trim()].slice(0, messageMaxLength).join('')
}

function expectSize(view: DataView, size: number) {
  if (view.byteLength !== size) {
    throw new Error(`Invalid packet size ${view.byteLength}, expected ${size}`)
  }
}

function expectAtLeastSize(view: DataView, size: number) {
  if (view.byteLength < size) {
    throw new Error(`Invalid packet size ${view.byteLength}, expected at least ${size}`)
  }
}

function expectTextSize(view: DataView, offset: number, length: number) {
  const size = offset + length

  if (view.byteLength !== size) {
    throw new Error(`Invalid text packet size ${view.byteLength}, expected ${size}`)
  }
}

function writeSpawn(view: DataView, offset: number, packet: SpawnPacket) {
  view.setUint16(offset, packet.id)
  writeMotion(view, offset + 2, packet)
}

function readSpawn(view: DataView, offset: number): SpawnPacket {
  return {
    id: view.getUint16(offset),
    ...readMotion(view, offset + 2),
  }
}

function writeMotion(view: DataView, offset: number, packet: MotionPacket) {
  view.setInt16(offset, packet.x)
  view.setInt16(offset + 2, packet.y)
  view.setUint8(offset + 4, packet.keys)
  view.setUint8(offset + 5, packet.angle)
  view.setUint8(offset + 6, packet.idleClipIndex)
  view.setUint8(offset + 7, packet.mode)
  view.setUint8(offset + 8, packet.style.topStyleIndex)
  view.setUint8(offset + 9, packet.style.bottomStyleIndex)
  view.setUint8(offset + 10, packet.style.hairIndex)
  view.setUint8(offset + 11, packet.style.hairColorIndex)
  view.setUint8(offset + 12, packet.style.skinColorIndex)
}

function readMotion(view: DataView, offset: number): MotionPacket {
  return {
    x: view.getInt16(offset),
    y: view.getInt16(offset + 2),
    keys: view.getUint8(offset + 4),
    angle: view.getUint8(offset + 5),
    idleClipIndex: view.getUint8(offset + 6),
    mode: view.getUint8(offset + 7),
    style: {
      topStyleIndex: view.getUint8(offset + 8),
      bottomStyleIndex: view.getUint8(offset + 9),
      hairIndex: view.getUint8(offset + 10),
      hairColorIndex: view.getUint8(offset + 11),
      skinColorIndex: view.getUint8(offset + 12),
    },
  }
}
