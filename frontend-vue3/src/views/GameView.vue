<template>
  <div class="game-view">
    <!-- 游戏消息 -->
    <GameMessage
      :show="showMessage"
      :message="messageText"
      :type="messageType"
    />

    <!-- 叫分弹窗 -->
    <div v-if="showCallingModal" class="calling-modal">
      <div class="calling-content">
        <div class="calling-buttons">
          <button
            class="btn btn--score"
            :class="{ 'btn--disabled': !canCallScore(1) }"
            :disabled="!isMyTurn || !canCallScore(1)"
            @click="handleCallScore(1)"
          >
            1分
          </button>
          <button
            class="btn btn--score"
            :class="{ 'btn--disabled': !canCallScore(2) }"
            :disabled="!isMyTurn || !canCallScore(2)"
            @click="handleCallScore(2)"
          >
            2分
          </button>
          <button
            class="btn btn--score btn--highlight"
            :class="{ 'btn--disabled': !canCallScore(3) }"
            :disabled="!isMyTurn || !canCallScore(3)"
            @click="handleCallScore(3)"
          >
            3分
          </button>
          <button
            class="btn btn--pass"
            :disabled="!isMyTurn"
            @click="handleCallScore(0)"
          >
            不叫
          </button>
        </div>
      </div>
    </div>

    <!-- 游戏结果弹窗 -->
    <div v-if="gameStore.gameResult" class="game-result-modal">
      <div class="game-result-content">
        <h2>{{ gameResultTitle }}</h2>
        <p>{{ gameResultMessage }}</p>
        <div class="score-changes">
          <div
            v-for="(score, playerId) in gameStore.gameResult.scores"
            :key="playerId"
            class="score-item"
          >
            <span>{{ roomStore.getPlayerName(playerId) }}:</span>
            <span :class="score > 0 ? 'positive' : 'negative'">
              {{ score > 0 ? '+' : '' }}{{ score }}
            </span>
          </div>
        </div>
        <button class="btn btn--primary" @click="handleBackToRoom">
          返回房间
        </button>
      </div>
    </div>

    <!-- 卡牌飞行动画 -->
    <CardFlyAnimation
      :show="isPlayingAnimation"
      :cards="animationCards"
      :start-position="animationStartPosition"
      :end-position="animationEndPosition"
      :direction="animationDirection"
      @animation-end="handleAnimationEnd"
    />

    <!-- 游戏主界面 -->
    <div class="game-container">
      <!-- 顶部信息条 -->
      <GameTopBar
        :base-score="gameStore.baseScore"
        :multiplier="gameStore.multiplier"
        :landlord-cards="gameStore.landlordCards"
        :elapsed-seconds="gameStore.roomTimerSeconds"
      />

      <!-- 左侧玩家 -->
      <PlayerArea
        v-if="leftPlayer"
        position="left"
        :player-name="leftPlayer.name"
        :score="playerStore.getPlayerScore(leftPlayer.id)"
        :card-count="gameStore.getPlayerCardCount(leftPlayer.id)"
        :is-current-turn="isPlayerTurn(leftPlayer.id)"
        :is-landlord="leftPlayer.id === gameStore.landlordPlayerId"
        :countdown="gameStore.countdown"
        :avatar-url="leftPlayer.avatar"
        :is-animating="isPlayingAnimation"
      />

      <!-- 出牌区域（中间） -->
      <PlayArea
        :cards="lastPlayedCards"
        :last-player-name="lastPlayerName"
        :is-animating="isPlayingAnimation"
      />

      <!-- 右侧玩家 -->
      <PlayerArea
        v-if="rightPlayer"
        position="right"
        :player-name="rightPlayer.name"
        :score="playerStore.getPlayerScore(rightPlayer.id)"
        :card-count="gameStore.getPlayerCardCount(rightPlayer.id)"
        :is-current-turn="isPlayerTurn(rightPlayer.id)"
        :is-landlord="rightPlayer.id === gameStore.landlordPlayerId"
        :countdown="gameStore.countdown"
        :avatar-url="rightPlayer.avatar"
        :is-animating="isPlayingAnimation"
      />

      <!-- 底部玩家（自己） -->
      <div class="bottom-area">
        <!-- 底部区域布局 -->
        <div class="bottom-area__layout">
          <!-- 左侧玩家信息（固定位置） -->
          <div class="bottom-area__player-info">
            <div class="player-area__info">
              <!-- 头像区域（包含地主帽子） -->
              <div class="player-area__avatar-container">
                <!-- 地主帽子 -->
                <div v-if="gameStore.isLandlord" class="player-area__landlord-hat">
                  <img :src="landlordHat" alt="地主" />
                </div>
                <!-- 头像 -->
                <div class="player-area__avatar">
                  <img
                    :src="playerStore.currentPlayer?.avatar || defaultAvatar"
                    :alt="playerStore.playerName"
                  />
                </div>
              </div>

              <!-- 玩家名称和分值 -->
              <div class="player-area__details">
                <div class="player-area__name">
                  {{ playerStore.playerName }}
                </div>
                <div class="player-area__score">分值: {{ playerStore.currentScore }}</div>
              </div>

              <!-- 倒计时 -->
              <Countdown
                v-if="gameStore.isMyTurn && gameStore.countdown > 0"
                :countdown="gameStore.countdown"
                class="player-area__countdown"
              />
            </div>
          </div>

          <!-- 右侧操作按钮（顺序与常见斗地主 UI：左不出、右出牌） -->
          <div class="action-buttons">
            <!-- 要不起按钮 -->
            <button
              v-if="!canBeatLastCards && gameStore.isMyTurn"
              type="button"
              class="btn btn--pass btn--game-action"
              @click="handlePass"
            >
              要不起
            </button>
            <!-- 不出和出牌按钮 -->
            <template v-else>
              <button
                type="button"
                class="btn btn--pass btn--game-action"
                :disabled="!gameStore.isMyTurn || !gameStore.canPass"
                @click="handlePass"
              >
                不出
              </button>
              <button
                type="button"
                class="btn btn--hint btn--game-action"
                :disabled="!gameStore.isMyTurn || isHintLoading"
                @click="handleHint"
              >
                提示
              </button>
              <button
                type="button"
                class="btn btn--play btn--game-action"
                :disabled="!gameStore.isMyTurn || gameStore.selectedCards.length === 0"
                @click="handlePlayCards"
              >
                出牌
              </button>
            </template>
          </div>
        </div>

        <PlayerArea
          position="bottom"
          :player-name="playerStore.playerName"
          :score="playerStore.currentScore"
          :cards="gameStore.myCards"
          :card-count="gameStore.myCards.length"
          :is-self="true"
          :is-current-turn="gameStore.isMyTurn"
          :is-landlord="gameStore.isLandlord"
          :countdown="gameStore.countdown"
          :selected-cards="gameStore.selectedCards"
          :show-turn-hint="(gameStore.gameState?.status ?? '') === 'playing'"
          :avatar-url="playerStore.currentPlayer?.avatar"
          :is-animating="isPlayingAnimation"
          @card-click="handleCardClick"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/playerStore'
import { useRoomStore } from '@/stores/roomStore'
import { useGameStore } from '@/stores/gameStore'
import { useSocket } from '@/composables/useSocket'
import PlayerArea from '@/components/PlayerArea.vue'
import PlayArea from '@/components/PlayArea.vue'
import GameTopBar from '@/components/GameTopBar.vue'
import GameMessage from '@/components/GameMessage.vue'
import CardFlyAnimation from '@/components/CardFlyAnimation.vue'
import Countdown from '@/components/Countdown.vue'
import defaultAvatar from '@/assets/images/default_avatar.jpg'
import landlordHat from '@/assets/images/dz_hat.png'
import type {
  Card,
  CardsPlayedData,
  GameEndedData,
  CountdownUpdatedData,
  PlayCardsFailedData,
  CallingUpdatedData,
  GameAbortedData,
  CallingInfo,
  RoomTimerUpdatedData,
  HintResultData
} from '@/types'

const router = useRouter()
const playerStore = usePlayerStore()
const roomStore = useRoomStore()
const gameStore = useGameStore()
const socket = useSocket()

// 消息提示
const showMessage = ref(false)
const messageText = ref('')
const messageType = ref<'error' | 'success' | 'info'>('info')

// 叫分相关状态
const showCallingModal = ref(false) // 默认不显示叫分弹窗
const callingInfo = ref<CallingInfo>({
  currentCallerIndex: 0,
  highestScore: 0,
  highestScorePlayerId: null,
  scores: {}
})
const myScore = ref(0)
const currentCallerIndex = ref(0)

// 动画相关状态
const isPlayingAnimation = ref(false)
const animationCards = ref<Card[]>([])
const animationStartPosition = ref({ x: 0, y: 0 })
const animationEndPosition = ref({ x: 0, y: 0 })
const animationDirection = ref<'left' | 'right' | 'bottom'>('bottom')

// 是否能大过上家出的牌
const canBeatLastCards = ref(true)
const isHintLoading = ref(false)

// 计算属性
const leftPlayer = computed(() => roomStore.getPlayerByPosition(0))
const rightPlayer = computed(() => roomStore.getPlayerByPosition(1))

const lastPlayedCards = computed(() => {
  const lastPlayed = gameStore.playedCards[gameStore.playedCards.length - 1]
  return lastPlayed?.cards ?? []
})

const lastPlayerName = computed(() => {
  const lastPlayed = gameStore.playedCards[gameStore.playedCards.length - 1]
  return lastPlayed?.playerName ?? ''
})

const gameResultTitle = computed(() => {
  if (!gameStore.gameResult) return ''
  const isWinner = gameStore.gameResult.winner === 'landlord'
    ? gameStore.isLandlord
    : !gameStore.isLandlord
  return isWinner ? '恭喜获胜！' : '游戏结束'
})

const gameResultMessage = computed(() => {
  if (!gameStore.gameResult) return ''
  return gameStore.gameResult.winner === 'landlord' ? '地主获胜' : '农民获胜'
})

// 叫分相关计算属性
const isMyTurn = computed(() => {
  const players = gameStore.gameState?.players ?? roomStore.players
  const currentPlayer = players[currentCallerIndex.value]
  return currentPlayer?.id === playerStore.playerId
})

const currentCallerName = computed(() => {
  const players = gameStore.gameState?.players ?? roomStore.players
  const currentPlayer = players[currentCallerIndex.value]
  return currentPlayer?.name ?? ''
})

const callingStatusText = computed(() => {
  if (isMyTurn.value) {
    return '轮到您了，请选择叫分'
  }
  return `等待 ${currentCallerName.value} 叫分...`
})

// 显示消息
const showToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
  messageText.value = message
  messageType.value = type
  showMessage.value = true
  setTimeout(() => {
    showMessage.value = false
  }, 3000)
}

// 获取元素位置
const getElementPosition = (selector: string) => {
  const element = document.querySelector(selector)
  if (element) {
    const rect = element.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    }
  }
  return { x: 0, y: 0 }
}

// 开始卡牌飞行动画
const startCardFlyAnimation = (cards: Card[], direction: 'left' | 'right' | 'bottom') => {
  return new Promise<void>((resolve) => {
    // 计算起始位置
    let startX = 0
    let startY = 0
    
    // 根据方向计算起始位置
    switch (direction) {
      case 'left':
        // 左侧玩家位置
        startX = 100
        startY = 100
        break
      case 'right':
        // 右侧玩家位置
        startX = window.innerWidth - 200
        startY = 100
        break
      case 'bottom':
        // 底部玩家卡牌区域位置
        const bottomCardsPosition = getElementPosition('.player-area--bottom .player-area__cards')
        startX = bottomCardsPosition.x
        startY = bottomCardsPosition.y
        break
    }
    
    // 计算出牌区位置
    const playAreaPosition = getElementPosition('.play-area__cards')
    const endX = playAreaPosition.x
    const endY = playAreaPosition.y
    
    // 设置动画状态
    animationCards.value = cards
    animationStartPosition.value = { x: startX, y: startY }
    animationEndPosition.value = { x: endX, y: endY }
    animationDirection.value = direction
    isPlayingAnimation.value = true
    
    // 监听动画结束
    const handleEnd = () => {
      isPlayingAnimation.value = false
      resolve()
    }
    
    // 临时添加事件监听器
    setTimeout(() => {
      handleEnd()
    }, 600)
  })
}

// 处理动画结束
const handleAnimationEnd = () => {
  isPlayingAnimation.value = false
}

// 检查是否是某个玩家的回合
const isPlayerTurn = (playerId: string): boolean => {
  const players = gameStore.gameState?.players ?? []
  const currentPlayer = players[gameStore.currentPlayerIndex]
  return currentPlayer?.id === playerId
}

// 卡牌点击
const handleCardClick = (card: Card) => {
  if (gameStore.isMyTurn) {
    gameStore.toggleCardSelection(card)
  }
}

// 出牌
const handlePlayCards = () => {
  if (!gameStore.isMyTurn) {
    showToast('还没轮到您出牌', 'error')
    return
  }

  if (gameStore.selectedCards.length === 0) {
    showToast('请选择要出的牌', 'error')
    return
  }

  socket.playCards({
    roomId: roomStore.roomId,
    cards: gameStore.selectedCards
  })
}

// 不出
const handlePass = () => {
  if (!gameStore.isMyTurn) {
    showToast('还没轮到您', 'error')
    return
  }

  if (!gameStore.canPass) {
    showToast('您必须出牌', 'error')
    return
  }

  socket.pass({
    roomId: roomStore.roomId
  })
}

const handleHint = () => {
  if (!gameStore.isMyTurn) {
    showToast('还没轮到您', 'error')
    return
  }
  isHintLoading.value = true
  socket.hintRequest({ roomId: roomStore.roomId })
  // 兜底：避免网络异常导致一直 loading
  setTimeout(() => {
    isHintLoading.value = false
  }, 1500)
}
// 叫分相关方法
const canCallScore = (score: number): boolean => {
  return score > callingInfo.value.highestScore
}

const handleCallScore = (score: number) => {
  if (!isMyTurn.value) {
    showToast('还没轮到您', 'error')
    return
  }

  // 验证叫分是否有效
  if (score > 0 && score <= callingInfo.value.highestScore) {
    showToast('必须叫比当前最高分更高的分数', 'error')
    return
  }

  myScore.value = score

  socket.callLandlord({
    roomId: roomStore.roomId,
    score
  })
}

// 监听叫分更新
const handleCallingUpdated = (data: CallingUpdatedData) => {
  console.log('叫分更新:', data)
  callingInfo.value = {
    currentCallerIndex: data.currentCallerIndex,
    highestScore: data.highestScore,
    highestScorePlayerId: data.highestBidder || data.highestScorePlayerId,
    scores: {}
  }
  currentCallerIndex.value = data.currentCallerIndex
  gameStore.setCallingInfo(data)
}

// 监听游戏开始
const handleGameStarted = (data: any) => {
  // 检查是否是游戏真正开始（叫分结束）
  if (data.gameStarted) {
    // 隐藏叫分弹窗
    showCallingModal.value = false

    // 更新游戏状态为 playing
    gameStore.updateGameStatus('playing')
    gameStore.updateCurrentPlayer(data.currentPlayerIndex)
    if (typeof data.baseScore === 'number') {
      gameStore.updateBaseScore(data.baseScore)
    }
    if (typeof data.multiplier === 'number') {
      gameStore.updateMultiplier(data.multiplier)
    }

    console.log('叫分结束，游戏正式开始')

    if (data.landlordPlayerId) {
      gameStore.updateLandlordPlayerId(data.landlordPlayerId)
    }

    // 同步所有人手牌与张数（含地主多三张底牌）
    if (data.players?.length) {
      gameStore.applyServerPlayersSnapshot(data.players)
    }

    let myPlayerData = data.players?.find((p: any) => p.id === playerStore.playerId)
    if (!myPlayerData) {
      myPlayerData = data.players?.find((p: any) => p.name === playerStore.playerName)
    }
    if (myPlayerData?.cards) {
      gameStore.setMyCards(myPlayerData.cards)
    }
  } else {
    // 初始化游戏状态
    gameStore.initGame({
      status: data.gameStarted ? 'playing' : 'calling', // 根据游戏是否真正开始设置状态
      players: data.players,
      currentPlayerIndex: data.currentPlayerIndex,
      landlordPlayerId: data.landlordPlayerId,
      landlordCards: data.landlordCards,
      playedCards: [],
      baseScore: typeof data.baseScore === 'number' ? data.baseScore : 1,
      multiplier: typeof data.multiplier === 'number' ? data.multiplier : 1,
      lastPlayedCards: null,
      lastPlayedPlayerId: null
    })

    // 设置自己的手牌
    let myPlayerData = data.players.find((p: any) => p.id === playerStore.playerId)
    // 如果通过 playerId 找不到，尝试通过玩家名称查找
    if (!myPlayerData) {
      myPlayerData = data.players.find((p: any) => p.name === playerStore.playerName)
    }
    if (myPlayerData) {
      gameStore.setMyCards(myPlayerData.cards)
      // 如果找到玩家数据，更新 playerId
      if (myPlayerData.id && playerStore.playerId === '') {
        const currentPlayer = playerStore.currentPlayer
        if (currentPlayer) {
          playerStore.setCurrentPlayer({
            ...currentPlayer,
            id: myPlayerData.id
          })
        }
      }
    }
    
    // 初始化叫分信息
    if (data.callingInfo) {
      callingInfo.value = {
        currentCallerIndex: data.callingInfo.currentCallerIndex,
        highestScore: data.callingInfo.highestScore,
        highestScorePlayerId: data.callingInfo.highestBidder || data.callingInfo.highestScorePlayerId,
        scores: {}
      }
      currentCallerIndex.value = data.callingInfo.currentCallerIndex
    }
    
    // 只有在游戏未真正开始时才显示叫分弹窗
    if (!data.gameStarted) {
      // 确保手牌已设置后再显示叫分弹窗
      setTimeout(() => {
        showCallingModal.value = true
        console.log('游戏初始化，进入叫分阶段')
      }, 500)
    }
  }
}

// 返回房间
const handleBackToRoom = () => {
  gameStore.clearGame()
  router.push('/room')
}

// 监听出牌
const handleCardsPlayed = async (data: CardsPlayedData) => {
  console.log('出牌:', data)

  // 更新是否能大过上家出的牌的状态
  if (data.canBeatLastCards !== undefined) {
    canBeatLastCards.value = data.canBeatLastCards
  }

  if (data.cards && data.cards.length > 0) {
    // 确定出牌方向
    let direction: 'left' | 'right' | 'bottom' = 'bottom'
    if (data.playerId === leftPlayer.value?.id) {
      direction = 'left'
    } else if (data.playerId === rightPlayer.value?.id) {
      direction = 'right'
    }
    
    // 只有非底部玩家（自己）才触发动画
    if (data.playerId !== playerStore.playerId) {
      // 开始动画
      await startCardFlyAnimation(data.cards, direction)
    }
    
    // 添加出牌记录
    const name =
      data.playerName ??
      gameStore.gameState?.players.find(p => p.id === data.playerId)?.name ??
      roomStore.getPlayerName(data.playerId)
    gameStore.addPlayedCards({
      playerId: data.playerId,
      playerName: name,
      cards: data.cards,
      timestamp: Date.now()
    })
  }

  gameStore.updateCurrentPlayer(data.currentPlayerIndex)
  gameStore.updateMultiplier(data.multiplier)

  if (data.players?.length) {
    gameStore.applyServerPlayersSnapshot(data.players)
    const me = data.players.find(p => p.id === playerStore.playerId)
    if (me?.cards) {
      gameStore.setMyCards(me.cards)
    }
    gameStore.clearSelectedCards()
  } else {
    if (data.playerId === playerStore.playerId) {
      gameStore.removePlayedCards(data.cards)
      gameStore.clearSelectedCards()
    } else {
      const player = gameStore.gameState?.players.find(p => p.id === data.playerId)
      if (player && data.cards?.length) {
        const prev = player.cardCount ?? player.cards?.length ?? 0
        player.cardCount = Math.max(0, prev - data.cards.length)
      }
    }
  }
}

// 监听游戏结束
const handleGameEnded = (data: GameEndedData) => {
  console.log('游戏结束:', data)
  gameStore.setGameResult(data)
  gameStore.setRoomTimerSeconds(0)

  // 更新玩家分值
  Object.entries(data.scores).forEach(([playerId, scoreChange]) => {
    const currentScore = playerStore.getPlayerScore(playerId)
    playerStore.updateScore(playerId, currentScore + scoreChange)
  })
}

// 监听倒计时更新
const handleCountdownUpdated = (data: CountdownUpdatedData) => {
  gameStore.setCountdown(data.countdown)
}

// 监听出牌失败
const handlePlayCardsFailed = (data: PlayCardsFailedData) => {
  showToast(data.message, 'error')
  gameStore.clearSelectedCards()
}

const handleHintResult = (data: HintResultData) => {
  isHintLoading.value = false
  if (data.cards?.length) {
    gameStore.setSelectedCards(data.cards)
    return
  }
  showToast(data.message || '没有更大的牌了', 'info')
}

const handleGameAborted = (data: GameAbortedData) => {
  if (data.roomId !== roomStore.roomId) return
  showToast(data.message, 'info')
  gameStore.setRoomTimerSeconds(0)
  gameStore.clearGame()
  router.push('/room')
}

const handleRoomTimerUpdated = (data: RoomTimerUpdatedData) => {
  if (data.roomId !== roomStore.roomId) return
  gameStore.setRoomTimerSeconds(data.elapsedSeconds)
}

onMounted(() => {
  // 检查是否在房间中
  if (!roomStore.isInRoom) {
    router.push('/')
    return
  }

  // 注册事件监听
  socket.on('cardsPlayed', handleCardsPlayed)
  socket.on('gameEnded', handleGameEnded)
  socket.on('countdownUpdated', handleCountdownUpdated)
  socket.on('playCardsFailed', handlePlayCardsFailed)
  socket.on('callingUpdated', handleCallingUpdated)
  socket.on('gameStarted', handleGameStarted)
  socket.on('gameAborted', handleGameAborted)
  socket.on('roomTimerUpdated', handleRoomTimerUpdated)
  socket.on('hintResult', handleHintResult)
})

onUnmounted(() => {
  socket.off('cardsPlayed', handleCardsPlayed)
  socket.off('gameEnded', handleGameEnded)
  socket.off('countdownUpdated', handleCountdownUpdated)
  socket.off('playCardsFailed', handlePlayCardsFailed)
  socket.off('callingUpdated', handleCallingUpdated)
  socket.off('gameStarted', handleGameStarted)
  socket.off('gameAborted', handleGameAborted)
  socket.off('roomTimerUpdated', handleRoomTimerUpdated)
  socket.off('hintResult', handleHintResult)
})
</script>

<style scoped lang="scss">
.game-view {
  min-height: 100vh;
  background-color: #1b5e20;
  background-image:
    linear-gradient(135deg, rgba(44, 125, 52, 0.4) 0%, rgba(27, 94, 32, 0.5) 100%),
    url('@/assets/images/game_table_bg.jpg');
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center center;
}

.game-container {
  display: grid;
  grid-template-areas:
    "info info info"
    "left play right"
    "bottom bottom bottom";
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr) minmax(0, 1fr);
  max-width: 1200px;
  margin: 0 auto;
}

.player-area--left {
  grid-area: left;
}

.player-area--right {
  grid-area: right;
}

.play-area {
  grid-area: play;
  min-width: 0;
}

.game-top-bar {
  grid-area: info;
}

.bottom-area {
  grid-area: bottom;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.bottom-area__layout {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  gap: 20px;
}

.bottom-area__player-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  flex-shrink: 0;
}

.player-area__info {
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
}

.player-area__avatar-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-area__landlord-hat {
  position: absolute;
  top: -30px;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.player-area__avatar {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #ffcc00;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.player-area__details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.player-area__name {
  font-size: 16px;
  font-weight: 600;
}

.player-area__score {
  font-size: 14px;
  color: #ffcc00;
  font-weight: bold;
}

.player-area__countdown {
  font-size: 24px;
  font-weight: bold;
  color: #ff6b6b;
  background-color: rgba(255, 107, 107, 0.1);
  padding: 8px 16px;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(0.8);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
}

.action-buttons {
  display: flex;
  gap: clamp(18px, 5vw, 28px);
  margin-top: 10px;
  justify-content: center;
  align-items: center;
  flex: 1;
}

// 主界面：光泽立体「不出 / 出牌」（参考休闲手游按钮）
.action-buttons .btn--game-action {
  position: relative;
  padding: 14px 38px;
  min-width: 132px;
  font-size: clamp(18px, 4.2vw, 22px);
  font-weight: 800;
  letter-spacing: 0.06em;
  border: none;
  border-radius: 18px;
  cursor: pointer;
  color: #fff;
  overflow: visible;
  isolation: isolate;
  transition:
    transform 0.12s ease,
    filter 0.12s ease,
    box-shadow 0.12s ease;
  -webkit-font-smoothing: antialiased;

  // 顶沿高光
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 16px;
    pointer-events: none;
    box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.45);
    z-index: 0;
  }

  &:disabled {
    opacity: 0.52;
    cursor: not-allowed;
    filter: saturate(0.75);
    transform: none;
    box-shadow: none;
  }

  &:hover:not(:disabled) {
    filter: brightness(1.04);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(2px);
  }
}

// 不出：金橙渐变 + 深描边字
.action-buttons .btn--pass.btn--game-action {
  text-shadow:
    0 2px 0 rgba(120, 55, 0, 0.35),
    0 1px 2px rgba(0, 0, 0, 0.25);
  -webkit-text-stroke: 1.5px #7a3d12;
  paint-order: stroke fill;

  background: linear-gradient(
    180deg,
    #ffeb7a 0%,
    #ffc53d 35%,
    #f59e1b 70%,
    #d97706 100%
  );
  box-shadow:
    0 5px 0 #9a5410,
    0 8px 16px rgba(120, 55, 0, 0.35),
    inset 0 -3px 6px rgba(180, 90, 0, 0.25);

  &:active:not(:disabled) {
    box-shadow:
      0 2px 0 #9a5410,
      0 4px 10px rgba(120, 55, 0, 0.3),
      inset 0 -2px 4px rgba(180, 90, 0, 0.2);
  }
}

// 出牌：青蓝渐变 + 底部光泽条 + 深蓝描边字
.action-buttons .btn--play.btn--game-action {
  text-shadow:
    0 2px 0 rgba(0, 40, 100, 0.35),
    0 1px 2px rgba(0, 0, 0, 0.25);
  -webkit-text-stroke: 1.5px #0d3d6e;
  paint-order: stroke fill;

  background: linear-gradient(
    180deg,
    #7ee8ff 0%,
    #38bdf8 38%,
    #2563eb 72%,
    #1d4ed8 100%
  );
  box-shadow:
    0 5px 0 #0c3066,
    0 8px 18px rgba(13, 61, 110, 0.4),
    inset 0 -3px 8px rgba(15, 60, 120, 0.3);

  &::after {
    content: '';
    position: absolute;
    bottom: 18%;
    left: 28%;
    right: 28%;
    height: 5px;
    border-radius: 3px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.75) 45%,
      rgba(255, 255, 255, 0.9) 50%,
      rgba(255, 255, 255, 0.75) 55%,
      transparent 100%
    );
    pointer-events: none;
    z-index: 1;
  }

  &:active:not(:disabled) {
    box-shadow:
      0 2px 0 #0c3066,
      0 4px 12px rgba(13, 61, 110, 0.35),
      inset 0 -2px 6px rgba(15, 60, 120, 0.25);
  }
}

// 提示：绿色渐变 + 深绿描边字
.action-buttons .btn--hint.btn--game-action {
  text-shadow:
    0 2px 0 rgba(0, 60, 20, 0.35),
    0 1px 2px rgba(0, 0, 0, 0.25);
  -webkit-text-stroke: 1.5px #0f5a2a;
  paint-order: stroke fill;

  background: linear-gradient(
    180deg,
    #b7f7b1 0%,
    #4ade80 38%,
    #22c55e 72%,
    #16a34a 100%
  );
  box-shadow:
    0 5px 0 #0f6b35,
    0 8px 18px rgba(10, 80, 40, 0.35),
    inset 0 -3px 8px rgba(10, 80, 40, 0.25);

  &:active:not(:disabled) {
    box-shadow:
      0 2px 0 #0f6b35,
      0 4px 10px rgba(10, 80, 40, 0.3),
      inset 0 -2px 4px rgba(10, 80, 40, 0.2);
  }
}

.btn {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 120px;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &--primary {
    background-color: #667eea;
    color: white;

    &:hover {
      background-color: #5a6fd8;
    }
  }
}

// 叫分弹窗
.calling-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.calling-content {
  background-color: white;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  max-width: 500px;
  width: 90%;
  animation: slideIn 0.3s ease;

  h2 {
    font-size: 2rem;
    margin-bottom: 10px;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .calling-subtitle {
    margin-bottom: 30px;
    color: #666;
    font-size: 1.1rem;
  }
}

.calling-info {
  background-color: #f8f9fa;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 30px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;

  &:last-child {
    margin-bottom: 0;
  }
}

.info-label {
  color: #666;
  font-weight: 500;
}

.info-value {
  color: #333;
  font-weight: 600;
}

.calling-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;

  // 叫分「不叫」：与主局「不出」样式区分，保持醒目红色
  .btn--pass {
    background-color: #f44336;
    color: white;
    box-shadow: 0 3px 10px rgba(244, 67, 54, 0.35);

    &:hover:not(:disabled) {
      background-color: #da190b;
    }
  }
}

// 游戏结果弹窗
.game-result-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.game-result-content {
  background-color: white;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  max-width: 400px;
  width: 90%;
  animation: slideIn 0.3s ease;

  h2 {
    font-size: 2rem;
    margin-bottom: 20px;
    color: #333;
  }

  p {
    font-size: 1.2rem;
    color: #666;
    margin-bottom: 20px;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.score-changes {
  margin: 20px 0;
  text-align: left;
}

.score-item {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  border-bottom: 1px solid #eee;

  &:last-child {
    border-bottom: none;
  }

  .positive {
    color: #4CAF50;
    font-weight: bold;
  }

  .negative {
    color: #f44336;
    font-weight: bold;
  }
}

/* 移动端：保持左-中-右三列，缩小中间出牌区比例，避免误用 (orientation: landscape) 隐藏两侧玩家 */
@media (max-width: 768px) {
  .game-view {
    padding: 10px;
    min-height: 100vh;
    background-position: center 55%;
  }

  .game-container {
    grid-template-areas:
      "info info info"
      "left play right"
      "bottom bottom bottom";
    grid-template-columns: minmax(0, 0.82fr) minmax(0, 1fr) minmax(0, 0.82fr);
    gap: 8px;
    align-items: start;
  }

  :deep(.player-area--left),
  :deep(.player-area--right) {
    min-width: 0;
  }

  :deep(.player-area--left .player-area__content),
  :deep(.player-area--right .player-area__content) {
    flex-direction: column;
    gap: 6px;
  }

  :deep(.player-area--left .player-area__info),
  :deep(.player-area--right .player-area__info) {
    flex-direction: column;
    gap: 4px;
    align-items: center;
    text-align: center;
  }

  :deep(.player-area--left .player-area__name),
  :deep(.player-area--right .player-area__name) {
    font-size: 12px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :deep(.player-area--left .player-area__score),
  :deep(.player-area--right .player-area__score) {
    font-size: 11px;
  }

  :deep(.player-area--left .player-area__avatar),
  :deep(.player-area--right .player-area__avatar) {
    width: 40px;
    height: 40px;
  }

  :deep(.player-area--left .player-area__landlord-hat),
  :deep(.player-area--right .player-area__landlord-hat) {
    width: 36px;
    height: 36px;
    top: -22px;
  }

  :deep(.player-area--left .player-area__countdown),
  :deep(.player-area--right .player-area__countdown) {
    font-size: 14px;
    padding: 4px 8px;
  }

  :deep(.player-area--left .card-back),
  :deep(.player-area--right .card-back) {
    width: 52px !important;
    height: 72px !important;
  }

  .bottom-area {
    gap: 10px;
  }

  .bottom-area__layout {
    flex-direction: row;
    gap: 10px;
  }

  .bottom-area__player-info {
    gap: 5px;
  }

  .player-area__info {
    gap: 8px;
  }

  .player-area__avatar {
    width: 40px;
    height: 40px;
  }

  .player-area__landlord-hat {
    width: 40px;
    height: 40px;
    top: -25px;
  }

  .player-area__name {
    font-size: 14px;
  }

  .player-area__score {
    font-size: 12px;
  }

  .player-area__countdown {
    font-size: 20px;
    padding: 6px 12px;
  }

  .action-buttons {
    gap: clamp(10px, 3vw, 18px);
    margin-top: 5px;
  }

  .action-buttons .btn--game-action {
    padding: 10px 24px;
    min-width: 80px;
    font-size: clamp(14px, 3vw, 18px);
  }

  .player-area__bottom-layout {
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }

  .player-area__content {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .player-area__info {
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .player-area__avatar {
    width: 40px;
    height: 40px;
  }

  .player-area__landlord-hat {
    width: 40px;
    height: 40px;
    top: -25px;
  }

  .player-area__name {
    font-size: 14px;
  }

  .player-area__score {
    font-size: 12px;
  }

  .player-area__cards-container {
    gap: -10px;
    padding: 5px 0;
  }

  .card {
    width: 45px !important;
    height: 63px !important;
  }

  .card__rank {
    font-size: 12px !important;
  }

  .card__suit-small {
    font-size: 10px !important;
  }

  .card__suit-large {
    font-size: 20px !important;
  }

  .game-top-bar {
    padding: 8px 12px;
  }

  .play-area {
    padding: 8px 6px;
  }

  :deep(.play-area__title) {
    font-size: 0.95rem;
    margin-bottom: 8px;
  }

  :deep(.play-area__cards) {
    min-height: 56px;
    gap: 4px;
  }

  :deep(.play-area__info) {
    font-size: 12px;
    margin-top: 6px;
  }

  .calling-content,
  .game-result-content {
    padding: 20px;
    max-width: 90%;
  }

  .calling-content h2,
  .game-result-content h2 {
    font-size: 1.5rem;
  }

  .calling-buttons {
    gap: 10px;
  }

  .btn {
    padding: 10px 20px;
    font-size: 14px;
    min-width: 100px;
  }
}
</style>
