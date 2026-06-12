import { characterFloor } from './character-data.ts'
import { resolvePlayerStyle } from './character-style.ts'
import { lengthSq } from './math.ts'
import {
  ACTION_BUBBLING,
  ACTION_FOAMING,
  ACTION_JETPACK,
  ACTIONS,
  angleToProtocol,
  BEACH_BALLS,
  type ClientMessagePacket,
  decodeBeachBalls,
  decodeDuckPosition,
  decodeGraffiti,
  decodeKeys,
  decodeLeave,
  decodeModerationMessage,
  decodeOnline,
  decodeRoomState,
  decodeServerActions,
  decodeServerMessage,
  decodeServerMotion,
  decodeServerProfile,
  decodeSpawn,
  decodeVideoPlaylistRequest,
  decodeVideoProgressRequest,
  decodeVideoSync,
  encodeAdminMessage,
  encodeBeachBalls,
  encodeClientActions,
  encodeDuckPosition,
  encodeClientMessage,
  encodeClientMotion,
  encodeClientProfile,
  encodeEnter,
  encodeGraffiti,
  encodeHeartbeat,
  encodeKeys,
  encodeRoomChange,
  encodeVideoEnded,
  encodeVideoPlaylist,
  encodeVideoProgress,
  GRAFFITI,
  DUCK_POSITION,
  type GraffitiPacket,
  MESSAGE,
  type MessagePacket,
  MODERATION,
  modeToProtocol,
  NICKNAME,
  type OnlinePacket,
  type ProfilePacket,
  protocolToAngle,
  protocolToMode,
  protocolToScene,
  protocolVersion,
  S_LEAVE,
  S_MOTION,
  S_ONLINE,
  S_ROOM_STATE,
  S_SPAWN,
  sceneToProtocol,
  type SpawnPacket,
  truncateMessage,
  VIDEO_PLAYLIST_REQUEST,
  VIDEO_PROGRESS_REQUEST,
  VIDEO_SYNC,
  type VideoEndedEntry,
  type VideoPlaylistEntry,
  type VideoPlaylistRequestPacket,
  type VideoProgressEntry,
  type VideoProgressRequestPacket,
  type VideoSyncEntry,
} from './protocol.ts'
import type { DuckPose } from './duck-position.ts'
import { collideRoom, isOutside, seatAt, walkHeight } from './scene.ts'
import type { BeachBall, CharacterMode, CircleBounds, GraffitiSplat, Player, Vec3 } from './types.ts'

const waveOutDuration = (95 - 62) / 30
const breakdanceDuration = 201 / 30

export function createMultiplayer(options: {
  localPosition: Vec3
  localTurn: () => number
  localMoveAngle: () => number
  localInput: Vec3
  localMode: () => CharacterMode
  localIdleClipIndex: () => number
  localSunglasses: () => boolean
  localActions: () => number
  localActionTurn: () => number
  localInstagram: () => string
  localNickname: () => string
  localEntered: () => boolean
  localProfileReady: () => boolean
  localStyle: () => {
    topStyleIndex: number
    bottomStyleIndex: number
    hairIndex: number
    hairColorIndex: number
    skinColorIndex: number
    accessoryIndex: number
  }
  initialRoom: number
  spaceSlug?: string
  onRoomState: (room: number, state: { selfChanged: boolean }) => void
  onMessage: (message: MessagePacket) => void
  onProfile: (profile: ProfilePacket) => void
  onDeleteMessages: (id: number) => void
  onLeave: (id: number) => void
  onOnlineCount: (online: OnlinePacket) => void
  onVideoPlaylistRequest: (zones: VideoPlaylistRequestPacket['zones']) => void
  onVideoSync: (entries: VideoSyncEntry[]) => void
  onBeachBalls: (balls: BeachBall[]) => void
  onDuckPosition: (pose: DuckPose) => void
  onGraffiti: (packet: GraffitiPacket) => void
  videoProgress: () => VideoProgressEntry | undefined
}) {
  const players = new Map<number, Player>()
  const pendingPlayers = new Map<number, SpawnPacket>()
  const profiledPlayers = new Set<number>()
  const heartbeatInterval = 5_000
  const videoProgressInterval = 2_000
  const reconnectDelay = 1_500
  let heartbeat: ReturnType<typeof setInterval> | undefined
  let videoProgress: ReturnType<typeof setInterval> | undefined
  let reconnect: ReturnType<typeof setTimeout> | undefined
  let closed = false
  let connectedOnce = false
  const pending: ArrayBuffer[] = []
  let selfId = 0
  let room = options.initialRoom
  let lastKeys = -1
  let lastAngle = -1
  let lastMode = -1
  let lastHeight = Infinity
  let lastActions = -1
  let lastActionAngle = -1
  let profileQueued = false
  let socket = connect()

  function connect() {
    const next = new WebSocket(connectUrl(connectedOnce))

    next.binaryType = 'arraybuffer'
    next.addEventListener('open', () => {
      connectedOnce = true
      clearTimeout(reconnect)
      heartbeat = setInterval(() => send(encodeHeartbeat()), heartbeatInterval)
      videoProgress = setInterval(() => sendVideoProgress(), videoProgressInterval)
      room = options.initialRoom
      lastActions = -1
      lastActionAngle = -1
      sendMotion()
      if (options.localProfileReady() && !profileQueued) {
        sendProfile()
      }
      send(encodeRoomChange(room))
      if (options.localEntered()) {
        sendEnter()
      }
      flush()
    })
    next.addEventListener('close', event => {
      clearInterval(heartbeat)
      clearInterval(videoProgress)

      if (event.code === 1012 && event.reason === 'version') {
        location.reload()
        return
      }

      if (!closed) {
        reconnect = setTimeout(() => {
          socket = connect()
        }, reconnectDelay)
      }
    })
    next.addEventListener('message', receive)

    return next
  }

  function connectUrl(reconnect: boolean) {
    const base = location.protocol === 'https:'
      ? location.origin.replace(/^http/, 'ws')
      : `ws://${location.hostname}:3001`

    const space = options.spaceSlug ? `&space=${encodeURIComponent(options.spaceSlug)}` : ''

    return `${base}?protocol=${protocolVersion}&session=${reconnect ? 'reconnect' : 'init'}${space}`
  }

  function receive(event: MessageEvent<ArrayBuffer>) {
    const view = new DataView(event.data as ArrayBuffer)
    const type = view.getUint8(0)

    if (type === S_ROOM_STATE) {
      const state = decodeRoomState(view)
      const previousSelfId = selfId
      const previousRoom = room
      const previousIds = new Set(players.keys())
      const previousPendingIds = new Set(pendingPlayers.keys())

      selfId = state.selfId
      room = state.room
      removeRemotePlayer(selfId, true)
      previousIds.delete(selfId)
      previousPendingIds.delete(selfId)

      for (const player of state.players) {
        if (player.id !== selfId && applyRemotePlayerPacket(player)) {
          previousIds.delete(player.id)
          previousPendingIds.delete(player.id)
        }
      }

      for (const id of previousIds) {
        removeRemotePlayer(id, true)
      }
      for (const id of previousPendingIds) {
        removeRemotePlayer(id, false)
      }

      if (selfId !== previousSelfId || room !== previousRoom) {
        options.onRoomState(room, { selfChanged: selfId !== previousSelfId })
      }

      return
    }

    if (type === S_SPAWN) {
      const packet = decodeSpawn(view)

      if (packet.id !== selfId) {
        applyRemotePlayerPacket(packet)
      }

      return
    }

    if (type === S_MOTION) {
      const packet = decodeServerMotion(view)

      if (packet.id === selfId) {
        return
      }

      const player = players.get(packet.id)

      if (player && validRemotePose(packet)) {
        applyRemotePose(player, packet)
      }
      else {
        applyRemotePlayerPacket(packet)
      }

      return
    }

    if (type === S_LEAVE) {
      const id = decodeLeave(view)

      if (id !== selfId) {
        removeRemotePlayer(id, true)
      }
      return
    }

    if (type === S_ONLINE) {
      options.onOnlineCount(decodeOnline(view))
      return
    }

    if (type === VIDEO_SYNC) {
      options.onVideoSync(decodeVideoSync(view).entries)
      return
    }

    if (type === VIDEO_PLAYLIST_REQUEST) {
      options.onVideoPlaylistRequest(decodeVideoPlaylistRequest(view).zones)
      return
    }

    if (type === VIDEO_PROGRESS_REQUEST) {
      sendRequestedVideoProgress(decodeVideoProgressRequest(view).zones)
      return
    }

    if (type === BEACH_BALLS) {
      options.onBeachBalls(decodeBeachBalls(view).balls)
      return
    }

    if (type === DUCK_POSITION) {
      options.onDuckPosition(decodeDuckPosition(view))
      return
    }

    if (type === GRAFFITI) {
      options.onGraffiti(decodeGraffiti(view))
      return
    }

    if (type === MESSAGE) {
      const message = decodeServerMessage(view)

      options.onMessage(message)
      return
    }

    if (type === NICKNAME) {
      const profile = decodeServerProfile(view)

      if (profile.id !== selfId) {
        profiledPlayers.add(profile.id)
        promotePendingPlayer(profile.id)
      }
      options.onProfile(profile)
      return
    }

    if (type === ACTIONS) {
      const packet = decodeServerActions(view)

      if (packet.id === selfId) {
        return
      }

      const player = players.get(packet.id)

      if (player) {
        player.actionTurn = protocolToAngle(packet.angle)
        player.bubbling = (packet.actions & ACTION_BUBBLING) !== 0
        player.foaming = (packet.actions & ACTION_FOAMING) !== 0
        player.jetpacking = (packet.actions & ACTION_JETPACK) !== 0
      }

      return
    }

    if (type === MODERATION) {
      const message = decodeModerationMessage(view)

      if (message.command === 'deleteMessages') {
        options.onDeleteMessages(message.id)
      }
    }
  }

  function send(data: ArrayBuffer) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(data)
    }
  }

  function queue(data: ArrayBuffer) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(data)
    }
    else {
      pending.push(data)
    }
  }

  function flush() {
    while (pending.length) {
      socket.send(pending.shift()!)
    }

    profileQueued = false
  }

  function applyRemotePlayerPacket(packet: SpawnPacket) {
    if (!validRemotePose(packet)) {
      return false
    }

    const player = players.get(packet.id)

    if (player) {
      applyRemotePose(player, packet)
    }
    else if (profiledPlayers.has(packet.id)) {
      players.set(packet.id, createRemotePlayer(packet))
    }
    else {
      pendingPlayers.set(packet.id, packet)
    }

    return true
  }

  function promotePendingPlayer(id: number) {
    const packet = pendingPlayers.get(id)

    if (packet) {
      pendingPlayers.delete(id)
      players.set(id, createRemotePlayer(packet))
    }
  }

  function removeRemotePlayer(id: number, notify: boolean) {
    const removed = players.delete(id)

    pendingPlayers.delete(id)
    profiledPlayers.delete(id)
    if (removed && notify) {
      options.onLeave(id)
    }
  }

  function sendMotion() {
    const mode = options.localMode()
    const protocolMode = modeToProtocol(mode)
    const seated = mode === 'manSitting' || mode === 'womanSitting'
    const keys = seated ? 0 : encodeKeys(options.localInput)
    const angle = angleToProtocol(keys === 0 ? options.localTurn() : options.localMoveAngle())
    const height = sceneToProtocol(options.localPosition[1])

    send(encodeClientMotion({
      x: sceneToProtocol(options.localPosition[0]),
      y: sceneToProtocol(options.localPosition[2]),
      height,
      keys,
      angle,
      idleClipIndex: options.localIdleClipIndex(),
      mode: protocolMode,
      style: options.localStyle(),
      sunglasses: options.localSunglasses(),
    }))
    lastKeys = keys
    lastAngle = angle
    lastMode = protocolMode
    lastHeight = height
  }

  function sendVideoProgress() {
    const entry = options.videoProgress()

    if (entry) {
      send(encodeVideoProgress({ entry }))
    }
  }

  function sendRequestedVideoProgress(zones: VideoProgressRequestPacket['zones']) {
    const entry = options.videoProgress()

    if (entry && zones.includes(entry.zone)) {
      send(encodeVideoProgress({ entry }))
    }
  }

  function sendEnter() {
    send(encodeEnter())
  }

  function sendVideoPlaylist(entries: VideoPlaylistEntry[]) {
    send(encodeVideoPlaylist({ entries }))
  }

  function sendVideoEnded(entry: VideoEndedEntry) {
    send(encodeVideoEnded({ entry }))
  }

  function sendProfile() {
    const data = encodeClientProfile({ insta: options.localInstagram(), nick: options.localNickname() })

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(data)
    }
    else {
      pending.push(data)
      profileQueued = true
    }
  }

  return {
    players,
    get selfId() {
      return selfId
    },
    get room() {
      return room
    },
    sendRoomChange(nextRoom: number) {
      room = nextRoom
      send(encodeRoomChange(nextRoom))
    },
    sendMessage(text: string, photoTimestamp = 0) {
      const next = truncateMessage(text)

      if (next || photoTimestamp) {
        const packet: ClientMessagePacket = { photoTimestamp, text: next }

        queue(encodeClientMessage(packet))

        return packet
      }
    },
    sendProfile,
    sendEnter,
    sendAdmin(pass: string, command: 'ban' | 'banSubnet' | 'randomTrack', id: number) {
      queue(encodeAdminMessage({ pass, command, id }))
    },
    sendMotion,
    sendActionsIfChanged(force = false) {
      const actions = options.localActions()
      const angle = angleToProtocol(options.localActionTurn())

      if (force || actions !== lastActions || (actions !== 0 && angle !== lastActionAngle)) {
        lastActions = actions
        lastActionAngle = angle
        send(encodeClientActions({ actions, angle }))
      }
    },
    sendVideoEnded,
    sendVideoProgress,
    sendVideoPlaylist,
    sendBeachBalls(balls: BeachBall[]) {
      send(encodeBeachBalls({ balls }))
    },
    sendDuckPosition(pose: DuckPose) {
      send(encodeDuckPosition(pose))
    },
    sendGraffiti(splats: GraffitiSplat[]) {
      send(encodeGraffiti({ splats }))
    },
    sendMotionIfKeysChanged() {
      const mode = options.localMode()
      const protocolMode = modeToProtocol(mode)
      const keys = mode === 'manSitting' || mode === 'womanSitting' ? 0 : encodeKeys(options.localInput)
      const angle = angleToProtocol(keys === 0 ? options.localTurn() : options.localMoveAngle())
      const height = sceneToProtocol(options.localPosition[1])

      if (keys !== lastKeys || protocolMode !== lastMode || height !== lastHeight
        || (keys !== 0 && angle !== lastAngle))
      {
        sendMotion()
      }
    },
    close() {
      closed = true
      clearInterval(heartbeat)
      clearInterval(videoProgress)
      clearTimeout(reconnect)
      socket.close()
    },
  }
}

export function updateRemotePlayers(players: Iterable<Player>, delta: number, outsideTree: CircleBounds) {
  for (const player of players) {
    const moving = lengthSq(player.input) > 0

    player.motionBlend += ((moving ? 1 : 0) - player.motionBlend) * (1 - Math.exp(-8 * delta))
    if (player.mode === 'jump' || player.mode === 'wave' || player.mode === 'waveOut'
      || player.mode === 'breakdance')
    {
      player.modeTime = (player.modeTime ?? 0) + delta
      const modeTime = player.modeTime

      if (player.mode === 'waveOut' && modeTime >= waveOutDuration) {
        player.mode = player.motionBlend > 0.5 ? 'run' : 'stand'
        player.modeTime = undefined
      }
      if (player.mode === 'breakdance' && modeTime >= breakdanceDuration) {
        player.mode = player.motionBlend > 0.5 ? 'run' : 'stand'
        player.modeTime = undefined
      }
    }
    else if (player.mode !== 'manSitting' && player.mode !== 'womanSitting') {
      player.mode = player.motionBlend > 0.5 ? 'run' : 'stand'
      player.modeTime = undefined
    }

    if (moving) {
      player.position[0] += player.input[0] * delta * 5
      player.position[2] += player.input[2] * delta * 5
      collideRoom(player.position, outsideTree)
    }

    player.position[1] = seatedMode(player.mode)
      ? remoteSeatHeight(player)
      : player.position[1]
  }
}

function createRemotePlayer(packet: SpawnPacket): Player {
  const player: Player = {
    position: [protocolToScene(packet.x), protocolToScene(packet.height), protocolToScene(packet.y)],
    turn: protocolToAngle(packet.angle),
    motionBlend: packet.keys === 0 ? 0 : 1,
    mode: protocolToMode(packet.mode),
    modeTime: timedMode(protocolToMode(packet.mode)) ? 0 : undefined,
    idleClipIndex: packet.idleClipIndex,
    input: decodeKeys(packet.keys, packet.angle),
    nextDecision: 0,
    travelSpeed: 1,
    destination: {
      kind: 'random',
      outside: false,
      position: [0, characterFloor, 0],
      zone: 'inside',
    },
    style: packet.style,
    resolvedStyle: resolvePlayerStyle(packet.style),
    sunglasses: packet.sunglasses,
    seed: packet.id,
  }

  return player
}

function applyRemotePose(player: Player, packet: SpawnPacket) {
  player.position[0] = protocolToScene(packet.x)
  player.position[1] = protocolToScene(packet.height)
  player.position[2] = protocolToScene(packet.y)
  player.turn = protocolToAngle(packet.angle)
  player.input = decodeKeys(packet.keys, packet.angle)
  const mode = protocolToMode(packet.mode)

  player.modeTime = timedMode(mode)
    ? player.mode === mode
      ? player.modeTime ?? 0
      : 0
    : undefined
  player.mode = mode
  if (seatedMode(player.mode)) {
    player.position[1] = remoteSeatHeight(player)
  }
  player.idleClipIndex = packet.idleClipIndex
  player.style = packet.style
  player.resolvedStyle = resolvePlayerStyle(packet.style)
  player.sunglasses = packet.sunglasses
}

function validRemotePose(packet: SpawnPacket) {
  return !seatedMode(protocolToMode(packet.mode))
    || Boolean(
      seatAt([protocolToScene(packet.x), protocolToScene(packet.height), protocolToScene(packet.y)], undefined, 0.46,
        true),
    )
}

function seatedMode(mode: CharacterMode | undefined) {
  return mode === 'manSitting' || mode === 'womanSitting'
}

function timedMode(mode: CharacterMode | undefined) {
  return mode === 'jump' || mode === 'wave' || mode === 'waveOut' || mode === 'breakdance'
}

function remoteSeatHeight(player: Player) {
  return seatAt(player.position, undefined, 0.46, true)!.position[1]
}
