import {
  C_HEARTBEAT,
  C_MOTION,
  C_ROOM_CHANGE,
  decodeClientMessage,
  decodeClientMotion,
  decodeRoomChange,
  encodeLeave,
  encodeRoomState,
  encodeServerMessage,
  encodeServerMotion,
  encodeSpawn,
  MESSAGE,
  positionScale,
  protocolToScene,
  roomCount,
  type SpawnPacket,
  type MotionPacket,
  truncateMessage,
} from './src/protocol.ts'
import { hairPalette, jewelPalette, skinPalette } from './src/character-data.ts'
import { outsideBounds, roomBounds } from './src/scene-data.ts'
import { seatAt } from './src/scene.ts'
import { extname, isAbsolute, join, relative, resolve } from 'node:path'

type Client = {
  id: number
  ip: string
  lastSeen: number
  lastMotionAt: number
  poseSynced: boolean
  room: number
  socket: Bun.ServerWebSocket<SocketData>
  pose: SpawnPacket
}

type SocketData = {
  ip: string
}

const port = Number(process.env.PORT ?? 3001)
const dist = join(import.meta.dir, 'dist')
const rooms = Array.from({ length: roomCount }, () => new Set<Client>())
const clients = new Map<Bun.ServerWebSocket<SocketData>, Client>()
const heartbeatInterval = 10_000
const clientTimeout = 30_000
const maxConnectionsPerIp = 4
const maxClientSpeed = 8
const maxClientStep = 1.2
const maxHairIndex = 32
let nextId = 1

const server = Bun.serve<SocketData>({
  port,
  async fetch(request, server) {
    const ip = clientIp(request)

    if (ipConnections(ip) >= maxConnectionsPerIp) {
      return new Response('Too Many Connections', { status: 429 })
    }

    if (server.upgrade(request, { data: { ip } })) {
      return
    }

    return serveStatic(request)
  },
  websocket: {
    open(socket) {
      const id = nextId++
      const client: Client = {
        id,
        ip: socket.data.ip,
        lastSeen: Date.now(),
        lastMotionAt: Date.now(),
        poseSynced: false,
        room: 0,
        socket,
        pose: {
          id,
          x: 0,
          y: 0,
          keys: 0,
          angle: 0,
          idleClipIndex: 0,
          mode: 0,
          style: {
            topStyleIndex: 0,
            bottomStyleIndex: 0,
            hairIndex: 0,
            hairColorIndex: 0,
            skinColorIndex: 2,
          },
        },
      }

      clients.set(socket, client)
      addToRoom(client, 0)
      sendRoomState(client)
      broadcast(client.room, encodeSpawn(client.pose), client)
    },
    message(socket, message) {
      const client = clients.get(socket)!

      try {
        const view = messageView(message)
        const type = view.getUint8(0)

        client.lastSeen = Date.now()

        if (type === C_HEARTBEAT) {
          return
        }

        if (type === C_MOTION) {
          const motion = decodeClientMotion(view)

          validateMotion(client, motion)
          client.pose = { id: client.id, ...motion }
          client.lastMotionAt = Date.now()
          client.poseSynced = true
          broadcast(client.room, encodeServerMotion(client.pose), client)
          return
        }

        if (type === C_ROOM_CHANGE) {
          changeRoom(client, decodeRoomChange(view))
          return
        }

        if (type === MESSAGE) {
          const text = truncateMessage(decodeClientMessage(view))
          const normalizedText = normalizeChatText(text)
          const slur = slurMatch(text)

          if (normalizedText && !binaryText(text) && !slur) {
            console.log(`Chat from ${client.ip}: ${text}`)
            broadcast(client.room, encodeServerMessage({ id: client.id, text }))
          }

          return
        }

        throw new Error(`Invalid client packet type ${type}`)
      }
      catch (e) {
        clients.delete(socket)
        removeFromRoom(client)
        socket.close(1003, 'invalid packet')
      }
    },
    close(socket) {
      const client = clients.get(socket)

      if (!client) {
        return
      }

      clients.delete(socket)
      removeFromRoom(client)
    },
  },
})

console.log(`club multiplayer: ws://localhost:${server.port}`)
console.log(`club static: http://localhost:${server.port}`)

setInterval(syncRooms, heartbeatInterval)

function clientIp(request: Request) {
  return request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-real-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'direct'
}

function ipConnections(ip: string) {
  let count = 0

  for (const client of clients.values()) {
    count += Number(client.ip === ip)
  }

  return count
}

async function serveStatic(request: Request) {
  const method = request.method

  if (method !== 'GET' && method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        allow: 'GET, HEAD',
      },
    })
  }

  const url = new URL(request.url)
  const path = decodeURIComponent(url.pathname)
  const assetPath = path === '/' ? join(dist, 'index.html') : resolve(dist, `.${path}`)
  const assetRelativePath = relative(dist, assetPath)

  if (assetRelativePath.startsWith('..') || isAbsolute(assetRelativePath)) {
    throw new Error(`Invalid static path ${url.pathname}`)
  }

  const response = await fileResponse(assetPath, request)

  if (response) {
    return response
  }

  if (extname(path)) {
    return new Response('Not Found', { status: 404 })
  }

  return await fileResponse(join(dist, 'index.html'), request) ?? new Response('Not Found', { status: 404 })
}

async function fileResponse(path: string, request: Request) {
  const file = Bun.file(path)

  if (!await file.exists()) {
    return
  }

  const headers = cacheHeaders(path)
  const modified = new Date(file.lastModified)
  const tag = `"${file.size.toString(16)}-${file.lastModified.toString(16)}"`

  headers.set('content-type', file.type || contentType(path))
  headers.set('content-length', String(file.size))
  headers.set('etag', tag)
  headers.set('last-modified', modified.toUTCString())

  if (request.headers.get('if-none-match') === tag) {
    headers.delete('content-length')
    return new Response(null, { status: 304, headers })
  }

  if (request.method === 'HEAD') {
    return new Response(null, { headers })
  }

  return new Response(file, { headers })
}

function cacheHeaders(path: string) {
  const headers = new Headers()

  headers.set('x-content-type-options', 'nosniff')

  if (path.endsWith('index.html')) {
    headers.set('cache-control', 'no-cache')
    return headers
  }

  if (/[/\\]assets[/\\].+-[A-Za-z0-9_-]{8,}\./.test(path)) {
    headers.set('cache-control', 'public, max-age=31536000, immutable')
    return headers
  }

  headers.set('cache-control', 'public, max-age=3600')

  return headers
}

function contentType(path: string) {
  const type = contentTypes.get(extname(path))

  if (!type) {
    throw new Error(`Missing content type for ${path}`)
  }

  return type
}

const contentTypes = new Map([
  ['.avif', 'image/avif'],
  ['.css', 'text/css; charset=utf-8'],
  ['.fbx', 'application/octet-stream'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.wasm', 'application/wasm'],
  ['.webp', 'image/webp'],
])

function changeRoom(client: Client, room: number) {
  if (room < 0 || room >= roomCount) {
    throw new Error(`Invalid room ${room}`)
  }

  if (client.poseSynced && room !== clientPoseRoom(client)) {
    throw new Error(`Invalid room change ${room}`)
  }

  if (client.room === room) {
    sendRoomState(client)
    return
  }

  removeFromRoom(client)
  addToRoom(client, room)
  sendRoomState(client)
  broadcast(client.room, encodeSpawn(client.pose), client)
}

function addToRoom(client: Client, room: number) {
  client.room = room
  rooms[room]!.add(client)
}

function removeFromRoom(client: Client) {
  rooms[client.room]!.delete(client)
  broadcast(client.room, encodeLeave(client.id))
}

function validateMotion(client: Client, motion: MotionPacket) {
  validateMotionValues(motion)
  validateMotionStep(client, motion)
}

function binaryText(text: string) {
  return /^[01]+$/.test(text)
}

function slurMatch(text: string) {
  const normalized = normalizeChatText(text)
  const squashed = normalized.replace(/(.)\1+/g, '$1')
  const matched = slurs.find(slur => normalized.includes(slur) || squashed.includes(slur))
  const pattern = slurPatterns.find(pattern => pattern.test(normalized))

  return matched || pattern ? { matched: matched ?? String(pattern), normalized } : undefined
}

function normalizeChatText(text: string) {
  return text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[àáâãäåāăąɑαа]/g, 'a')
    .replace(/[ƄЬᏏᖯ]/g, 'b')
    .replace(/[çćĉċčсϲ]/g, 'c')
    .replace(/[ďđԁ]/g, 'd')
    .replace(/[èéêëēĕėęěеєε]/g, 'e')
    .replace(/[ĝğġģɡց]/g, 'g')
    .replace(/[ĥħһн]/g, 'h')
    .replace(/[ìíîïĩīĭįıιіїӏ]/g, 'i')
    .replace(/[јʝ]/g, 'j')
    .replace(/[ķκк]/g, 'k')
    .replace(/[ĺļľŀłⅼӏ]/g, 'l')
    .replace(/[ｍм]/g, 'm')
    .replace(/[ñńņňŋռոηп]/g, 'n')
    .replace(/[òóôõöōŏőοоօ]/g, 'o')
    .replace(/[ρр]/g, 'p')
    .replace(/[ŕŗřг]/g, 'r')
    .replace(/[śŝşšѕ]/g, 's')
    .replace(/[ţťŧт]/g, 't')
    .replace(/[ùúûüũūŭůűųυս]/g, 'u')
    .replace(/[νѵ]/g, 'v')
    .replace(/[ŵԝ]/g, 'w')
    .replace(/[хχ]/g, 'x')
    .replace(/[ýÿŷуү]/g, 'y')
    .replace(/[źżžʐ]/g, 'z')
    .replace(/[0@]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5|\$/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z]/g, '')
}

const slurs = [
  'nigger',
  'niggers',
  'nigga',
  'niggas',
  'niggah',
  'niggahs',
  'nigguh',
  'nigguhs',
  'niglet',
  'coon',
  'jigaboo',
  'porchmonkey',
  'mooncricket',
  'faggot',
  'fag',
  'dyke',
  'homo',
  'kike',
  'yid',
  'hebe',
  'spic',
  'beaner',
  'greaser',
  'chink',
  'gook',
  'zipperhead',
  'wetback',
  'raghead',
  'towelhead',
  'sandnigger',
  'cameljockey',
  'paki',
  'gypsy',
  'dago',
  'wop',
  'kraut',
  'polack',
  'mick',
  'redskin',
  'squaw',
  'injun',
  'jap',
  'tranny',
  'shemale',
  'retard',
  'mongoloid',
]

const slurPatterns = [
  /n+[il]+g+e+r+s?/,
  /n+[il]+g+a+s?/,
  /n+[il]+g+u+h+s?/,
  /n+[il]+g+l+e+t+s?/,
  /f+a+g+o+t+s?/,
  /f+a+g+s?/,
  /k+i+k+e+s?/,
  /s+p+i+c+s?/,
  /c+h+i+n+k+s?/,
  /g+o+o+k+s?/,
]

function validateMotionValues(motion: MotionPacket) {
  const x = protocolToScene(motion.x)
  const z = protocolToScene(motion.y)

  if (motion.keys > 15 || (motion.keys & 0b0101) === 0b0101 || (motion.keys & 0b1010) === 0b1010) {
    throw new Error(`Invalid keys ${motion.keys}`)
  }

  if (motion.mode < 0 || motion.mode > 3) {
    throw new Error(`Invalid mode ${motion.mode}`)
  }

  if (motion.idleClipIndex > 19) {
    throw new Error(`Invalid idle clip ${motion.idleClipIndex}`)
  }

  if (motion.style.topStyleIndex >= jewelPalette.length * 2 + 2
    || motion.style.bottomStyleIndex >= jewelPalette.length * 2
    || motion.style.hairIndex > maxHairIndex
    || motion.style.hairColorIndex >= hairPalette.length
    || motion.style.skinColorIndex >= skinPalette.length)
  {
    throw new Error('Invalid style')
  }

  if (x < outsideBounds.left || x > outsideBounds.right || z < outsideBounds.back || z > outsideBounds.front) {
    throw new Error(`Invalid position ${x}, ${z}`)
  }

  if ((motion.mode === 2 || motion.mode === 3) && !seatAt([x, 0, z], new Set(), 0.46, true)) {
    throw new Error(`Invalid seated position ${x}, ${z}`)
  }
}

function validateMotionStep(client: Client, motion: MotionPacket) {
  if (!client.poseSynced) {
    return
  }

  const now = Date.now()
  const delta = Math.max(0, (now - client.lastMotionAt) / 1000)
  const dx = motion.x - client.pose.x
  const dy = motion.y - client.pose.y
  const distance = Math.hypot(dx, dy) / positionScale

  if (distance > maxClientStep + delta * maxClientSpeed) {
    throw new Error(`Invalid movement ${distance.toFixed(2)} in ${delta.toFixed(2)}s`)
  }
}

function clientPoseRoom(client: Client) {
  const x = protocolToScene(client.pose.x)
  const z = protocolToScene(client.pose.y)

  return Number(!(x < roomBounds.left || x > roomBounds.right || z < roomBounds.back || z > roomBounds.front))
}

function sendRoomState(client: Client) {
  client.socket.send(encodeRoomState({
    selfId: client.id,
    room: client.room,
    players: [...rooms[client.room]!.values()].map(player => player.pose),
  }))
}

function syncRooms() {
  const now = Date.now()

  for (const client of clients.values()) {
    if (now - client.lastSeen > clientTimeout) {
      clients.delete(client.socket)
      removeFromRoom(client)
      client.socket.close(1001, 'timeout')
    }
  }

  for (const client of clients.values()) {
    sendRoomState(client)
  }
}

function broadcast(room: number, data: ArrayBuffer, except?: Client) {
  for (const client of rooms[room]!) {
    if (client !== except) {
      client.socket.send(data)
    }
  }
}

function messageView(message: string | Buffer) {
  if (typeof message === 'string') {
    throw new Error('Expected binary websocket message')
  }

  return new DataView(message.buffer, message.byteOffset, message.byteLength)
}
