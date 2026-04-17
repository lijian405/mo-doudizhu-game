/**
 * 原生 WebSocket（JSON 帧：{ type, payload }），全局单例，事件名与旧 Socket.io 一致
 */

import { ref, shallowRef, onMounted } from 'vue'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  JoinRoomData,
  CreateRoomData,
  LeaveRoomData,
  StartGameData,
  CallLandlordData,
  PlayCardsData,
  PassData,
  HintRequestData,
  TrustData,
  AddAIData,
  KickPlayerData
} from '@/types'

function getWsUrl(): string {
  const fromEnv = import.meta.env.VITE_WS_URL as string | undefined
  if (fromEnv) return fromEnv
  const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:5173'
  return `${proto}//${host}/ws`
}

const RECONNECT_BASE_MS = 2000
const RECONNECT_MAX_MS = 30000

type ServerEventKey = keyof ServerToClientEvents
type Listener = (data: unknown) => void

const listeners = new Map<ServerEventKey, Set<Listener>>()

const wsRef = shallowRef<WebSocket | null>(null)
const isConnected = ref(false)
const connectionError = ref<string | null>(null)

let reconnectAttempt = 0
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let manualClose = false

function dispatch(type: string, payload: unknown) {
  const set = listeners.get(type as ServerEventKey)
  if (!set) return
  for (const cb of set) {
    try {
      cb(payload)
    } catch (e) {
      console.error('WS listener error:', type, e)
    }
  }
}

function scheduleReconnect() {
  if (reconnectTimer != null || manualClose) return
  const delay = Math.min(
    RECONNECT_BASE_MS * Math.pow(2, reconnectAttempt),
    RECONNECT_MAX_MS
  )
  reconnectAttempt++
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connectInternal()
  }, delay)
}

function connectInternal() {
  if (
    wsRef.value?.readyState === WebSocket.OPEN ||
    wsRef.value?.readyState === WebSocket.CONNECTING
  ) {
    return
  }

  const ws = new WebSocket(getWsUrl())
  wsRef.value = ws

  ws.addEventListener('open', () => {
    reconnectAttempt = 0
    isConnected.value = true
    connectionError.value = null
    console.log('WebSocket connected')
  })

  ws.addEventListener('message', (ev) => {
    let msg: { type?: string; payload?: unknown }
    try {
      msg = JSON.parse(ev.data as string)
    } catch {
      return
    }
    if (!msg.type || typeof msg.type !== 'string') return
    dispatch(msg.type, msg.payload ?? {})
  })

  ws.addEventListener('close', () => {
    isConnected.value = false
    if (wsRef.value === ws) {
      wsRef.value = null
    }
    if (!manualClose) {
      scheduleReconnect()
    }
  })

  ws.addEventListener('error', () => {
    connectionError.value = 'WebSocket error'
  })
}

function connect() {
  manualClose = false
  connectInternal()
}

function disconnect() {
  manualClose = true
  if (reconnectTimer != null) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  wsRef.value?.close()
  wsRef.value = null
  isConnected.value = false
}

function reconnect() {
  disconnect()
  manualClose = false
  reconnectAttempt = 0
  connectInternal()
}

export function useSocket() {
  const on = <K extends ServerEventKey>(event: K, callback: ServerToClientEvents[K]) => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set())
    }
    listeners.get(event)!.add(callback as Listener)
  }

  const off = <K extends ServerEventKey>(event: K, callback?: ServerToClientEvents[K]) => {
    const set = listeners.get(event)
    if (!set) return
    if (callback) {
      set.delete(callback as Listener)
    } else {
      set.clear()
    }
  }

  const emit = <K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ) => {
    const w = wsRef.value
    if (!w || w.readyState !== WebSocket.OPEN) return
    const payload = args.length > 0 ? args[0] : {}
    w.send(JSON.stringify({ type: event, payload }))
  }

  const joinRoom = (data: JoinRoomData) => emit('joinRoom', data)
  const createRoom = (data: CreateRoomData) => emit('createRoom', data)
  const leaveRoom = (data: LeaveRoomData) => emit('leaveRoom', data)
  const startGame = (data: StartGameData) => emit('startGame', data)
  const callLandlord = (data: CallLandlordData) => emit('callLandlord', data)
  const playCards = (data: PlayCardsData) => emit('playCards', data)
  const pass = (data: PassData) => emit('pass', data)
  const hintRequest = (data: HintRequestData) => emit('hintRequest', data)
  const getRooms = () => emit('getRooms')
  const setTrust = (data: TrustData) => emit('trust', data)
  const addAI = (data: AddAIData) => emit('addAI', data)
  const kickPlayer = (data: KickPlayerData) => emit('kickPlayer', data)

  onMounted(() => {
    connect()
  })

  return {
    socket: wsRef,
    isConnected,
    connectionError,
    connect,
    disconnect,
    reconnect,
    on,
    off,
    emit,
    joinRoom,
    createRoom,
    leaveRoom,
    startGame,
    callLandlord,
    playCards,
    pass,
    hintRequest,
    getRooms,
    setTrust,
    addAI,
    kickPlayer
  }
}
