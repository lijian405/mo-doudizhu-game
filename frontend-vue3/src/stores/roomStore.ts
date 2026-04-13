/**
 * 房间状态管理 Store
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Room, PlayerBase, GameStatus } from '@/types'
import { usePlayerStore } from './playerStore'

export const useRoomStore = defineStore('room', () => {
  // State
  const currentRoom = ref<Room | null>(null)
  const isJoining = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const roomId = computed(() => currentRoom.value?.id ?? '')
  const players = computed(() => currentRoom.value?.players ?? [])
  const playerCount = computed(() => players.value.length)
  const isFull = computed(() => playerCount.value >= 3)
  const canStartGame = computed(() => playerCount.value === 3)
  const gameStatus = computed(() => currentRoom.value?.status ?? 'waiting')
  const isInRoom = computed(() => currentRoom.value !== null)

  // 获取其他玩家（排除当前玩家）
  const otherPlayers = computed(() => {
    const playerStore = usePlayerStore()
    return players.value.filter((p: PlayerBase) => p.id !== playerStore.playerId)
  })

  // 根据位置获取玩家
  const getPlayerByPosition = (position: number): PlayerBase | null => {
    const playerStore = usePlayerStore()
    const otherPlayersList = players.value.filter((p: PlayerBase) => p.id !== playerStore.playerId)
    return otherPlayersList[position] ?? null
  }

  // Actions
  const setRoom = (room: Room) => {
    currentRoom.value = room
  }

  const updatePlayers = (players: PlayerBase[]) => {
    if (currentRoom.value) {
      currentRoom.value.players = players
    }
  }

  const updateGameStatus = (status: GameStatus) => {
    if (currentRoom.value) {
      currentRoom.value.status = status
    }
  }

  const setJoining = (value: boolean) => {
    isJoining.value = value
  }

  const setError = (message: string | null) => {
    error.value = message
  }

  const clearRoom = () => {
    currentRoom.value = null
    isJoining.value = false
    error.value = null
  }

  // 获取玩家名称
  const getPlayerName = (playerId: string): string => {
    const player = players.value.find((p: PlayerBase) => p.id === playerId)
    return player?.name ?? ''
  }

  return {
    // State
    currentRoom,
    isJoining,
    error,
    // Getters
    roomId,
    players,
    playerCount,
    isFull,
    canStartGame,
    gameStatus,
    isInRoom,
    otherPlayers,
    // Actions
    setRoom,
    updatePlayers,
    updateGameStatus,
    setJoining,
    setError,
    clearRoom,
    getPlayerByPosition,
    getPlayerName
  }
})
