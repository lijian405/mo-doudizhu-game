<template>
  <div class="room-view">
    <div class="room-container">
      <div class="room-left">
        <div class="room-header">
          <h2>房间: {{ roomStore.roomId }}</h2>
          <p class="room-subtitle">{{ statusText }}</p>
        </div>

        <div class="room-buttons">
          <button
            class="btn btn--primary"
            :disabled="!roomStore.canStartGame || isStarting"
            @click="handleStartGame"
          >
            {{ isStarting ? '启动中...' : '开始游戏' }}
          </button>
          <button
            class="btn btn--secondary"
            :disabled="isStarting"
            @click="handleLeaveRoom"
          >
            离开房间
          </button>
        </div>
      </div>

      <div class="room-right">
        <div class="players-list">
          <h3>玩家列表 ({{ roomStore.playerCount }}/3)</h3>
          <ul class="players-ul">
            <li
              v-for="player in roomStore.players"
              :key="player.id"
              :class="{ 'is-self': player.id === playerStore.playerId }"
            >
              {{ player.name }}
              <span v-if="player.id === playerStore.playerId" class="self-tag">(我)</span>
            </li>
          </ul>
        </div>

        <div class="room-info">
          <div class="info-item">
            <span class="info-label">当前玩家:</span>
            <span class="info-value">{{ playerStore.playerName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">当前分值:</span>
            <span class="info-value">{{ playerStore.currentScore }}</span>
          </div>
        </div>
      </div>
    </div>

    <GameMessage
      :show="showMessage"
      :message="messageText"
      :type="messageType"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/playerStore'
import { useRoomStore } from '@/stores/roomStore'
import { useSocket } from '@/composables/useSocket'
import { useGameStore } from '@/stores/gameStore'
import GameMessage from '@/components/GameMessage.vue'
import type { RoomUpdatedData, GameStartedData, CallingUpdatedData, GameAbortedData } from '@/types'

const router = useRouter()
const playerStore = usePlayerStore()
const roomStore = useRoomStore()
const gameStore = useGameStore()
const socket = useSocket()

// 状态
const isStarting = ref(false)

// 消息提示
const showMessage = ref(false)
const messageText = ref('')
const messageType = ref<'error' | 'success' | 'info'>('info')

// 状态文本
const statusText = computed(() => {
  if (roomStore.isFull) {
    return '房间已满，可以开始游戏'
  }
  return `等待其他玩家加入... (${roomStore.playerCount}/3)`
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

// 开始游戏
const handleStartGame = () => {
  if (!roomStore.canStartGame) {
    showToast('需要3名玩家才能开始游戏', 'error')
    return
  }

  isStarting.value = true
  socket.startGame({
    roomId: roomStore.roomId
  })
  // 跳转到游戏页面
  router.push('/game')
}

// 离开房间
const handleLeaveRoom = () => {
  socket.leaveRoom({
    roomId: roomStore.roomId
  })
  // 等待服务器响应后再清空状态
  // 这里不立即清空，让服务器的roomUpdated事件处理完成
  // 延迟一点时间确保事件处理完成
  setTimeout(() => {
    roomStore.clearRoom()
    playerStore.clearPlayer()
    router.push('/')
  }, 500)
}

// 监听房间更新
const handleRoomUpdated = (data: RoomUpdatedData) => {
  console.log('房间更新:', data)
  // 注意：服务器发送的结构是 data.room.players
  const players = data.room?.players || data.players || []
  roomStore.updatePlayers(players)
}

// 监听叫分开始，跳转到游戏页面
const handleCallingStart = (data: any) => {
  console.log('叫分开始，跳转到游戏页面:', data)
  router.push('/game')
}

// 监听房间被删除
const handleRoomDeleted = (data: any) => {
  console.log('房间被删除:', data)
  showToast(data.message || '房间已被删除', 'error')
  roomStore.clearRoom()
  playerStore.clearPlayer()
  gameStore.clearGame()
  router.push('/')
}

// 游戏中途终止（仍在房间界面时也会收到）
const handleGameAborted = (data: GameAbortedData) => {
  if (data.roomId !== roomStore.roomId) return
  showToast(data.message, 'info')
  gameStore.clearGame()
}

onMounted(() => {
  // 检查是否在房间中
  if (!roomStore.isInRoom) {
    router.push('/')
    return
  }

  // 注册事件监听
  socket.on('roomUpdated', handleRoomUpdated)
  socket.on('callingStart', handleCallingStart)
  socket.on('roomDeleted', handleRoomDeleted)
  socket.on('gameAborted', handleGameAborted)
})

onUnmounted(() => {
  // 清理事件监听
  socket.off('roomUpdated', handleRoomUpdated)
  socket.off('callingStart', handleCallingStart)
  socket.off('roomDeleted', handleRoomDeleted)
  socket.off('gameAborted', handleGameAborted)
})
</script>

<style scoped lang="scss">
.room-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.room-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 900px;
  gap: 12px;
}

.room-left {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.room-right {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 16px;
}

.room-header {
  margin-bottom: 12px;

  h2 {
    margin-bottom: 4px;
    font-size: 1.2rem;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .room-subtitle {
    margin-bottom: 0;
    color: #666;
    font-size: 0.85rem;
  }
}

.room-buttons {
  width: 100%;
  display: flex;
  gap: 10px;
}

.btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &--primary {
    background-color: #667eea;
    color: white;

    &:hover:not(:disabled) {
      background-color: #5a6fd8;
    }
  }

  &--secondary {
    background-color: #f0f0f0;
    color: #333;

    &:hover:not(:disabled) {
      background-color: #e0e0e0;
    }
  }
}

.players-list {
  margin-bottom: 12px;

  h3 {
    margin-bottom: 8px;
    color: #333;
    font-size: 0.9rem;
  }
}

.players-ul {
  list-style: none;
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 10px;

  li {
    padding: 8px;
    color: #333;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;

    &:not(:last-child) {
      border-bottom: 1px solid #e0e0e0;
    }

    &.is-self {
      font-weight: 600;
      color: #667eea;
    }

    .self-tag {
      font-size: 0.7rem;
      color: #999;
    }
  }
}

.room-info {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 0.85rem;

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

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.room-left {
  animation: fadeIn 0.3s ease;
}

.room-right {
  animation: fadeIn 0.3s ease 0.1s both;
}

@media (min-width: 768px) {
  .room-view {
    padding: 20px;
    justify-content: center;
  }

  .room-container {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: stretch;
    gap: 16px;
  }

  .room-left {
    width: 30%;
    min-width: 240px;
    padding: 24px;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  }

  .room-right {
    width: 68%;
    padding: 24px;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  }

  .room-header {
    margin-bottom: 20px;

    h2 {
      font-size: 1.6rem;
      margin-bottom: 8px;
    }

    .room-subtitle {
      font-size: 1rem;
      margin-bottom: 0;
    }
  }

  .room-buttons {
    gap: 12px;
  }

  .btn {
    padding: 14px;
    font-size: 1rem;
    border-radius: 10px;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
    }

    &--primary:hover:not(:disabled) {
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    &--secondary:hover:not(:disabled) {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }

  .players-list {
    margin-bottom: 20px;

    h3 {
      font-size: 1.1rem;
      margin-bottom: 12px;
    }
  }

  .players-ul {
    padding: 16px;
    border-radius: 10px;

    li {
      padding: 10px;
      font-size: 1rem;

      .self-tag {
        font-size: 0.8rem;
      }
    }
  }

  .room-info {
    padding: 16px;
    border-radius: 10px;
    margin-bottom: 16px;
  }

  .info-item {
    margin-bottom: 8px;
    font-size: 0.95rem;
  }
}
</style>
