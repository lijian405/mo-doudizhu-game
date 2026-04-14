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

    <!-- 游戏主界面 -->
    <div class="game-container">
      <!-- 地主牌 -->
      <LandlordCards :cards="gameStore.landlordCards" />

      <!-- 顶部玩家 -->
      <PlayerArea
        v-if="topPlayer"
        position="top"
        :player-name="topPlayer.name"
        :score="playerStore.getPlayerScore(topPlayer.id)"
        :card-count="gameStore.getPlayerCardCount(topPlayer.id)"
        :is-current-turn="isPlayerTurn(topPlayer.id)"
        :is-landlord="topPlayer.id === gameStore.landlordPlayerId"
        :countdown="gameStore.countdown"
      />

      <!-- 中间区域 -->
      <div class="middle-area">
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
        />

        <!-- 出牌区域 -->
        <PlayArea
          :cards="lastPlayedCards"
          :last-player-name="lastPlayerName"
        />
      </div>

      <!-- 底部玩家（自己） -->
      <div class="bottom-area">
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
          @card-click="handleCardClick"
        />

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <button
            class="btn btn--play"
            :disabled="!gameStore.isMyTurn || gameStore.selectedCards.length === 0"
            @click="handlePlayCards"
          >
            出牌
          </button>
          <button
            class="btn btn--pass"
            :disabled="!gameStore.isMyTurn || !gameStore.canPass"
            @click="handlePass"
          >
            不出
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/playerStore'
import { useRoomStore } from '@/stores/roomStore'
import { useGameStore } from '@/stores/gameStore'
import { useSocket } from '@/composables/useSocket'
import PlayerArea from '@/components/PlayerArea.vue'
import PlayArea from '@/components/PlayArea.vue'
import LandlordCards from '@/components/LandlordCards.vue'
import GameMessage from '@/components/GameMessage.vue'
import type {
  Card,
  CardsPlayedData,
  GameEndedData,
  CountdownUpdatedData,
  PlayCardsFailedData,
  CallingUpdatedData
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
const callingInfo = ref({
  currentCallerIndex: 0,
  highestScore: 0,
  highestScorePlayerId: null,
  scores: {}
})
const myScore = ref(0)
const currentCallerIndex = ref(0)

// 计算属性
const topPlayer = computed(() => roomStore.getPlayerByPosition(0))
const leftPlayer = computed(() => roomStore.getPlayerByPosition(1))

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
  console.log('游戏开始:', data)
  console.log('玩家数据:', data.players)
  // 检查是否是游戏真正开始（叫分结束）
  if (data.gameStarted) {
    // 隐藏叫分弹窗
    showCallingModal.value = false
    
    // 更新游戏状态为 playing
    gameStore.updateGameStatus('playing')
    gameStore.updateCurrentPlayer(data.currentPlayerIndex)
    
    console.log('叫分结束，游戏正式开始')
    // 更新地主玩家ID
    if (data.landlordPlayerId) {
      gameStore.updateLandlordPlayerId(data.landlordPlayerId)
      // 这里需要两次更新自己的手牌，因为地主玩家会多三张牌,防止客户端无法渲染出新添加的地主牌
      
      // 再次设置自己的手牌，确保包含地主牌
      let myPlayerData = data.players.find((p: any) => p.id === playerStore.playerId)
      if (!myPlayerData) {
        myPlayerData = data.players.find((p: any) => p.name === playerStore.playerName)
      }
      if (myPlayerData) {
        gameStore.setMyCards(myPlayerData.cards)
      }
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
      baseScore: 1,
      multiplier: 1,
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
      console.log('我的牌:', myPlayerData.cards)
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
const handleCardsPlayed = (data: CardsPlayedData) => {
  console.log('出牌:', data)

  // 只有当 cards 不为空时，才添加出牌记录
  if (data.cards && data.cards.length > 0) {
    // 添加出牌记录
    gameStore.addPlayedCards({
      playerId: data.playerId,
      playerName: data.playerName,
      cards: data.cards,
      timestamp: Date.now()
    })
  }

  // 更新当前玩家
  gameStore.updateCurrentPlayer(data.currentPlayerIndex)

  // 更新倍数
  gameStore.updateMultiplier(data.multiplier)

  // 如果是自己出的牌，从手牌中移除
  if (data.playerId === playerStore.playerId) {
    gameStore.removePlayedCards(data.cards)
    gameStore.clearSelectedCards()
  } else {
    // 更新其他玩家的手牌数量
    const player = gameStore.gameState?.players.find(p => p.id === data.playerId)
    if (player) {
      player.cardCount = Math.max(0, player.cardCount - data.cards.length)
    }
  }
}

// 监听游戏结束
const handleGameEnded = (data: GameEndedData) => {
  console.log('游戏结束:', data)
  gameStore.setGameResult(data)

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
})
</script>

<style scoped lang="scss">
.game-view {
  background: linear-gradient(135deg, #2c7d34 0%, #1b5e20 100%);
  min-height: 100vh;
  padding: 20px;
}

.game-container {
  display: grid;
  grid-template-areas:
    "landlord landlord landlord"
    "top top top"
    "left play play"
    "bottom bottom bottom";
  grid-template-columns: 1fr 2fr 1fr;
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.landlord-cards {
  grid-area: landlord;
  justify-self: center;
}

.player-area--top {
  grid-area: top;
}

.player-area--left {
  grid-area: left;
}

.play-area {
  grid-area: play;
}

.bottom-area {
  grid-area: bottom;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.middle-area {
  display: contents;
}

.action-buttons {
  display: flex;
  gap: 20px;
  margin-top: 10px;
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

  &--play {
    background-color: #4CAF50;
    color: white;
    box-shadow: 0 3px 10px rgba(76, 175, 80, 0.3);

    &:hover:not(:disabled) {
      background-color: #45a049;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(76, 175, 80, 0.4);
    }
  }

  &--pass {
    background-color: #f44336;
    color: white;
    box-shadow: 0 3px 10px rgba(244, 67, 54, 0.3);

    &:hover:not(:disabled) {
      background-color: #da190b;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(244, 67, 54, 0.4);
    }
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

@media (max-width: 768px) {
  .game-container {
    grid-template-areas:
      "landlord"
      "top"
      "play"
      "bottom";
    grid-template-columns: 1fr;
  }

  .player-area--left {
    display: none;
  }
}
</style>
