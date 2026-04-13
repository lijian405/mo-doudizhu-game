/**
 * Socket.io 连接管理 Composable
 * 使用单例模式确保全局只有一个Socket连接
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'
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
  RoomListItem
} from '@/types'

const SOCKET_SERVER_URL = 'http://localhost:3000'

// 单例Socket实例
let socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

export function useSocket() {
  const socket = ref<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
  const isConnected = ref(false)
  const connectionError = ref<string | null>(null)

  // 初始化连接
  const connect = () => {
    if (socketInstance?.connected) {
      socket.value = socketInstance
      isConnected.value = true
      return
    }

    if (!socketInstance) {
      socketInstance = io(SOCKET_SERVER_URL, {
        transports: ['websocket'],
        autoConnect: true
      })

      socketInstance.on('connect', () => {
        console.log('Socket connected:', socketInstance?.id)
        isConnected.value = true
        connectionError.value = null
      })

      socketInstance.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason)
        isConnected.value = false
      })

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
        connectionError.value = error.message
        isConnected.value = false
      })
    }

    socket.value = socketInstance
    isConnected.value = socketInstance.connected
  }

  // 断开连接（不再自动断开，保持socket连接在整个应用生命周期内活跃）
  const disconnect = () => {
    // 不再自动断开连接，只在需要时手动断开
  }

  // 重新连接
  const reconnect = () => {
    if (socketInstance) {
      socketInstance.disconnect()
      socketInstance = null
    }
    connect()
  }

  // 事件监听封装
  const on = <K extends keyof ServerToClientEvents>(
    event: K,
    callback: ServerToClientEvents[K]
  ) => {
    socket.value?.on(event, callback as any)
  }

  const off = <K extends keyof ServerToClientEvents>(
    event: K,
    callback?: ServerToClientEvents[K]
  ) => {
    if (callback) {
      socket.value?.off(event, callback as any)
    } else {
      socket.value?.off(event)
    }
  }

  // 发送事件封装
  const emit = <K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ) => {
    socket.value?.emit(event, ...args)
  }

  // 游戏相关方法
  const joinRoom = (data: JoinRoomData) => {
    emit('joinRoom', data)
  }

  const createRoom = (data: CreateRoomData) => {
    emit('createRoom', data)
  }

  const leaveRoom = (data: LeaveRoomData) => {
    emit('leaveRoom', data)
  }

  const startGame = (data: StartGameData) => {
    emit('startGame', data)
  }

  const callLandlord = (data: CallLandlordData) => {
    emit('callLandlord', data)
  }

  const playCards = (data: PlayCardsData) => {
    emit('playCards', data)
  }

  const pass = (data: PassData) => {
    emit('pass', data)
  }

  // 获取房间列表 (WebSocket)
  const getRooms = () => {
    emit('getRooms')
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    // 不再断开连接，保持socket连接活跃
  })

  return {
    socket,
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
    getRooms
  }
}
