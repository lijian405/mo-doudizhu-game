/**
 * 玩家状态管理 Store
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { configApi } from '@/services/apiService'
import type { CurrentPlayer, PlayerBase } from '@/types'

export const usePlayerStore = defineStore('player', () => {
  // State
  const currentPlayer = ref<CurrentPlayer | null>(null)
  const playerScores = ref<Record<string, number>>({})
  const defaultPlayerScore = ref(1000)

  // 加载默认分值
  const loadDefaultScore = async () => {
    try {
      const scoreValue = await configApi.getParameter('default_player_score', '1000')
      defaultPlayerScore.value = parseInt(scoreValue)
    } catch (error) {
      console.error('加载默认分值失败:', error)
    }
  }

  // 初始化时加载默认分值
  loadDefaultScore()

  // Getters
  const isLoggedIn = computed(() => currentPlayer.value !== null)
  const playerName = computed(() => currentPlayer.value?.name ?? '')
  const playerId = computed(() => currentPlayer.value?.id ?? '')
  const roomId = computed(() => currentPlayer.value?.roomId ?? '')
  const currentScore = computed(() => {
    if (!currentPlayer.value) return 0
    return playerScores.value[currentPlayer.value.id] ?? defaultPlayerScore.value
  })

  // Actions
  const setCurrentPlayer = (player: CurrentPlayer) => {
    currentPlayer.value = player
    // 初始化分值
    if (!playerScores.value[player.id]) {
      playerScores.value[player.id] = defaultPlayerScore.value
    }
  }

  const setRoomId = (id: string) => {
    if (currentPlayer.value) {
      currentPlayer.value.roomId = id
    }
  }

  const updateScore = (playerId: string, score: number) => {
    playerScores.value[playerId] = score
  }

  const updateScores = (scores: Record<string, number>) => {
    Object.entries(scores).forEach(([id, score]) => {
      playerScores.value[id] = score
    })
  }

  const getPlayerScore = (playerId: string): number => {
    return playerScores.value[playerId] ?? defaultPlayerScore.value
  }

  const clearPlayer = () => {
    currentPlayer.value = null
  }

  const initScores = (players: PlayerBase[]) => {
    players.forEach(player => {
      if (!playerScores.value[player.id]) {
        playerScores.value[player.id] = defaultPlayerScore.value
      }
    })
  }

  const reloadDefaultScore = async () => {
    await loadDefaultScore()
  }

  return {
    // State
    currentPlayer,
    playerScores,
    defaultPlayerScore,
    // Getters
    isLoggedIn,
    playerName,
    playerId,
    roomId,
    currentScore,
    // Actions
    setCurrentPlayer,
    setRoomId,
    updateScore,
    updateScores,
    getPlayerScore,
    clearPlayer,
    initScores,
    reloadDefaultScore
  }
})
