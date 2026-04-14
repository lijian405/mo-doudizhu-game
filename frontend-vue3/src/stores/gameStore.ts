/**
 * 游戏状态管理 Store
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  Card,
  Player,
  PlayerBase,
  GameState,
  GameResult,
  CallingInfo,
  PlayedCards,
  CountdownInfo,
  PlayerPosition
} from '@/types'
import { usePlayerStore } from './playerStore'
import { useRoomStore } from './roomStore'

export const useGameStore = defineStore('game', () => {
  // State
  const gameState = ref<GameState | null>(null)
  const callingInfo = ref<CallingInfo | null>(null)
  const myCards = ref<Card[]>([])
  const selectedCards = ref<Card[]>([])
  const playedCards = ref<PlayedCards[]>([])
  const countdown = ref<number>(30)
  const gameResult = ref<GameResult | null>(null)
  const isProcessing = ref(false)
  const errorMessage = ref<string | null>(null)

  // Getters
  const isGameStarted = computed(() => gameState.value !== null)
  const currentPlayerIndex = computed(() => gameState.value?.currentPlayerIndex ?? 0)
  const landlordPlayerId = computed(() => gameState.value?.landlordPlayerId ?? null)
  const landlordCards = computed(() => gameState.value?.landlordCards ?? [])
  const baseScore = computed(() => gameState.value?.baseScore ?? 0)
  const multiplier = computed(() => gameState.value?.multiplier ?? 1)
  const lastPlayedCards = computed(() => gameState.value?.lastPlayedCards ?? null)
  const lastPlayedPlayerId = computed(() => gameState.value?.lastPlayedPlayerId ?? null)

  // 是否是当前玩家的回合
  const isMyTurn = computed(() => {
    const playerStore = usePlayerStore()
    const players = gameState.value?.players ?? []
    const currentPlayer = players[currentPlayerIndex.value]
    return currentPlayer?.id === playerStore.playerId
  })

  // 是否是地主
  const isLandlord = computed(() => {
    const playerStore = usePlayerStore()
    return landlordPlayerId.value === playerStore.playerId
  })

  // 获取玩家手牌数量（服务端往往只带 cards，不带 cardCount）
  const getPlayerCardCount = (playerId: string): number => {
    const player = gameState.value?.players.find(p => p.id === playerId)
    if (!player) return 0
    console.log('player', player)
    return player.cardCount ?? player.cards?.length ?? 0
  }

  // 获取玩家位置
  const getPlayerPosition = (playerId: string): PlayerPosition | null => {
    const playerStore = usePlayerStore()
    const roomStore = useRoomStore()

    if (playerId === playerStore.playerId) return 'bottom'

    const otherPlayers = roomStore.otherPlayers
    const index = otherPlayers.findIndex((p: PlayerBase) => p.id === playerId)

    if (index === 0) return 'top'
    if (index === 1) return 'left'
    return null
  }

  // 是否是第一次出牌（出牌区域为空）
  const isFirstMove = computed(() => {
    return playedCards.value.length === 0
  })

  // 是否可以不出牌
  const canPass = computed(() => {
    // 如果是第一次出牌，不能不出
    if (isFirstMove.value) return false
    // 如果出牌区的牌是当前玩家出的，不能不出
    if (lastPlayedPlayerId.value === usePlayerStore().playerId) return false
    return true
  })

  // Actions
  const initGame = (state: GameState) => {
    gameState.value = {
      ...state,
      players: state.players.map(p => ({
        ...p,
        cardCount: p.cardCount ?? p.cards?.length ?? 0
      }))
    }
    playedCards.value = []
    selectedCards.value = []
    myCards.value = []
    gameResult.value = null
  }

  /** 用服务端玩家快照同步手牌与张数（出牌、过牌等事件会带全量 players） */
  const applyServerPlayersSnapshot = (
    serverPlayers: Array<{ id: string; name: string; cards?: Card[]; cardCount?: number }>
  ) => {
    if (!gameState.value) return
    for (const sp of serverPlayers) {
      const local = gameState.value.players.find(p => p.id === sp.id)
      if (!local) continue
      if (sp.cards) {
        local.cards = sp.cards
      }
      local.cardCount = sp.cardCount ?? sp.cards?.length ?? local.cardCount ?? 0
    }
  }

  const setMyCards = (cards: Card[]) => {
    // 清空旧的手牌数据，避免重复叠加
    myCards.value = []
    // 设置新的手牌数据
    myCards.value = cards
  }

  const toggleCardSelection = (card: Card) => {
    const index = selectedCards.value.findIndex(
      c => c.suit === card.suit && c.rank === card.rank
    )
    if (index >= 0) {
      selectedCards.value.splice(index, 1)
    } else {
      selectedCards.value.push(card)
    }
  }

  const clearSelectedCards = () => {
    selectedCards.value = []
  }

  const addPlayedCards = (played: PlayedCards) => {
    playedCards.value.push(played)
  }

  const updateCurrentPlayer = (index: number) => {
    if (gameState.value) {
      gameState.value.currentPlayerIndex = index
    }
  }

  const updateGameStatus = (status: string) => {
    if (gameState.value) {
      gameState.value.status = status as any
    }
  }

  const updateMultiplier = (value: number) => {
    if (gameState.value) {
      gameState.value.multiplier = value
    }
  }

  const setCallingInfo = (info: CallingInfo) => {
    callingInfo.value = info
  }

  const setCountdown = (value: number) => {
    countdown.value = value
  }

  const setGameResult = (result: GameResult) => {
    gameResult.value = result
  }

  const setProcessing = (value: boolean) => {
    isProcessing.value = value
  }

  const setError = (message: string | null) => {
    errorMessage.value = message
  }

  const clearGame = () => {
    gameState.value = null
    callingInfo.value = null
    myCards.value = []
    selectedCards.value = []
    playedCards.value = []
    countdown.value = 30
    gameResult.value = null
    isProcessing.value = false
    errorMessage.value = null
  }

  // 更新玩家手牌数量
  const updatePlayerCardCount = (playerId: string, count: number) => {
    const player = gameState.value?.players.find(p => p.id === playerId)
    if (player) {
      player.cardCount = count
    }
  }

  // 移除已出的牌
  const removePlayedCards = (cards: Card[]) => {
    cards.forEach(card => {
      const index = myCards.value.findIndex(
        c => c.suit === card.suit && c.rank === card.rank
      )
      if (index >= 0) {
        myCards.value.splice(index, 1)
      }
    })
  }

  // 更新地主玩家ID
  const updateLandlordPlayerId = (landlordId: string | null) => {
    if (gameState.value) {
      gameState.value.landlordPlayerId = landlordId
    }
  }

  return {
    // State
    gameState,
    callingInfo,
    myCards,
    selectedCards,
    playedCards,
    countdown,
    gameResult,
    isProcessing,
    errorMessage,
    // Getters
    isGameStarted,
    currentPlayerIndex,
    landlordPlayerId,
    landlordCards,
    baseScore,
    multiplier,
    lastPlayedCards,
    lastPlayedPlayerId,
    isMyTurn,
    isLandlord,
    isFirstMove,
    canPass,
    // Actions
    initGame,
    applyServerPlayersSnapshot,
    setMyCards,
    toggleCardSelection,
    clearSelectedCards,
    addPlayedCards,
    updateCurrentPlayer,
    updateGameStatus,
    updateMultiplier,
    setCallingInfo,
    setCountdown,
    setGameResult,
    setProcessing,
    setError,
    clearGame,
    getPlayerCardCount,
    getPlayerPosition,
    updatePlayerCardCount,
    removePlayedCards,
    updateLandlordPlayerId
  }
})
