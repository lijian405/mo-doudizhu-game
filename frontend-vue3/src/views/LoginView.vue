<template>
  <div class="login-view">
    <div class="login-container">
      <div class="login-header">
        <h1>联机斗地主</h1>
        <p class="login-subtitle">AI时代的多人在线游戏体验</p>
      </div>

      <div class="login-form">
        <div class="form-group">
          <label for="player-name">玩家名称</label>
          <div class="input-container">
            <span class="input-icon">👤</span>
            <input
              id="player-name"
              v-model="playerName"
              type="text"
              placeholder="请输入您的名称"
              @keyup.enter="handleJoinRoom"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="room-id">房间ID</label>
          <div class="input-container">
            <span class="input-icon">🏠</span>
            <input
              id="room-id"
              v-model="roomId"
              type="text"
              placeholder="请输入房间ID"
              @keyup.enter="handleJoinRoom"
            />
          </div>
        </div>

        <div class="login-buttons">
          <button
            class="btn btn--primary"
            :disabled="isLoading"
            @click="handleJoinRoom"
          >
            {{ isLoading ? '加入中...' : '加入房间' }}
          </button>
          <button
            class="btn btn--secondary"
            :disabled="isLoading"
            @click="showCreateModal = true"
          >
            {{ isLoading ? '创建中...' : '创建房间' }}
          </button>
        </div>
      </div>

      <!-- 房间列表 -->
      <div class="room-list-section">
        <h3 class="room-list-title">房间列表</h3>
        <div class="room-list">
          <div
            v-for="room in rooms"
            :key="room.id"
            class="room-item"
            :class="`room-item--${room.roomStatus}`"
            @click="handleRoomClick(room)"
          >
            <div class="room-info">
              <div class="room-id">房间: {{ room.id }}</div>
              <div class="room-players">{{ room.playerCount }}/3 人</div>
            </div>
            <div class="room-status">
              <span :class="`status-badge status-badge--${room.roomStatus}`">
                {{ roomStatusText(room.roomStatus) }}
              </span>
            </div>
          </div>
          <div v-if="rooms.length === 0" class="room-list-empty">
            暂无房间，快来创建一个吧！
          </div>
        </div>
      </div>

      <div class="login-footer">
        <p>© 2026 联机斗地主 - AI时代的游戏体验</p>
      </div>
    </div>

    <!-- 创建房间 Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
      <div class="modal-content" @click.stop>
        <h3>创建房间</h3>
        <div class="modal-form">
          <div class="form-group">
            <label for="create-player-name">玩家名称</label>
            <input
              id="create-player-name"
              v-model="createPlayerName"
              type="text"
              placeholder="请输入您的名称"
              @keyup.enter="handleCreateRoomModal"
            />
          </div>
        </div>
        <div class="modal-buttons">
          <button class="btn btn--secondary" @click="showCreateModal = false">取消</button>
          <button class="btn btn--primary" @click="handleCreateRoomModal">创建</button>
        </div>
      </div>
    </div>

    <!-- 加入房间 Modal -->
    <div v-if="showJoinModal" class="modal-overlay" @click="showJoinModal = false">
      <div class="modal-content" @click.stop>
        <h3>加入房间</h3>
        <div class="modal-form">
          <div class="form-group">
            <label for="join-player-name">玩家名称</label>
            <input
              id="join-player-name"
              v-model="joinPlayerName"
              type="text"
              placeholder="请输入您的名称"
              @keyup.enter="handleJoinRoomModal"
            />
          </div>
          <div class="form-group">
            <label>房间ID</label>
            <div class="room-id-display">{{ selectedRoomId }}</div>
          </div>
        </div>
        <div class="modal-buttons">
          <button class="btn btn--secondary" @click="showJoinModal = false">取消</button>
          <button class="btn btn--primary" @click="handleJoinRoomModal">加入</button>
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
import { roomApi } from '@/services/apiService'
import GameMessage from '@/components/GameMessage.vue'
import { validatePlayerName, validateRoomId, generateRoomId } from '@/utils/gameHelper'
import type { RoomUpdatedData, GameStartedData, RoomListItem, RoomListData } from '@/types'

const router = useRouter()
const playerStore = usePlayerStore()
const roomStore = useRoomStore()
const socket = useSocket()

// 表单数据
const playerName = ref('')
const roomId = ref('')
const isLoading = ref(false)

// 房间列表
const rooms = ref<RoomListItem[]>([])

// Modal 状态
const showCreateModal = ref(false)
const showJoinModal = ref(false)
const createPlayerName = ref('')
const joinPlayerName = ref('')
const selectedRoomId = ref('')

// 消息提示
const showMessage = ref(false)
const messageText = ref('')
const messageType = ref<'error' | 'success' | 'info'>('info')

// 显示消息
const showToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
  messageText.value = message
  messageType.value = type
  showMessage.value = true
  setTimeout(() => {
    showMessage.value = false
  }, 3000)
}

// 房间状态文本
const roomStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    waiting: '等待中',
    full: '满员中',
    playing: '已开始'
  }
  return statusMap[status] || status
}

// 加入房间
const handleJoinRoom = () => {
  // 验证输入
  const nameValidation = validatePlayerName(playerName.value)
  if (!nameValidation.valid) {
    showToast(nameValidation.message!, 'error')
    return
  }

  const roomValidation = validateRoomId(roomId.value)
  if (!roomValidation.valid) {
    showToast(roomValidation.message!, 'error')
    return
  }

  isLoading.value = true

  // 设置当前玩家
  playerStore.setCurrentPlayer({
    id: '', // 服务器会分配
    name: playerName.value.trim(),
    roomId: roomId.value.trim().toUpperCase(),
    score: 1000
  })

  // 发送加入房间请求
  socket.joinRoom({
    roomId: roomId.value.trim().toUpperCase(),
    playerName: playerName.value.trim()
  })
}



// 处理房间点击
const handleRoomClick = (room: RoomListItem) => {
  if (room.roomStatus === 'waiting') {
    // 显示加入房间 Modal
    selectedRoomId.value = room.id
    joinPlayerName.value = playerName.value
    showJoinModal.value = true
  } else if (room.roomStatus === 'full') {
    showToast('该房间已满员', 'info')
  } else if (room.roomStatus === 'playing') {
    showToast('该房间游戏已开始', 'info')
  }
}

// Modal 加入房间
const handleJoinRoomModal = () => {
  // 验证输入
  const nameValidation = validatePlayerName(joinPlayerName.value)
  if (!nameValidation.valid) {
    showToast(nameValidation.message!, 'error')
    return
  }

  isLoading.value = true
  showJoinModal.value = false

  // 设置当前玩家
  playerStore.setCurrentPlayer({
    id: '', // 服务器会分配
    name: joinPlayerName.value.trim(),
    roomId: selectedRoomId.value,
    score: 1000
  })

  // 发送加入房间请求
  socket.joinRoom({
    roomId: selectedRoomId.value,
    playerName: joinPlayerName.value.trim()
  })
}

// 监听房间更新
const handleRoomUpdated = (data: RoomUpdatedData) => {
  console.log('房间更新:', data)
  roomStore.setRoom({
    id: data.roomId,
    players: data.players,
    status: 'waiting',
    maxPlayers: 3
  })
  
  // 更新当前玩家的 playerId
  const currentPlayerName = playerStore.playerName
  const player = data.players.find(p => p.name === currentPlayerName)
  if (player && player.id) {
    const currentPlayer = playerStore.currentPlayer
    if (currentPlayer) {
      playerStore.setCurrentPlayer({
        ...currentPlayer,
        id: player.id
      })
    }
  }
  
  roomStore.setJoining(false)
  isLoading.value = false

  // 跳转到房间页面
  router.push('/room')
}

// 监听游戏开始
const handleGameStarted = (data: GameStartedData) => {
  console.log('游戏开始:', data)
  // 游戏开始时跳转到游戏页面
  router.push('/game')
}

// 加载房间列表
const loadRooms = async () => {
  try {
    const data = await roomApi.getRooms()
    rooms.value = data.rooms || []
    console.log('房间列表加载完成:', data.rooms)
  } catch (error) {
    console.error('加载房间列表失败:', error)
    rooms.value = []
  }
}

// 监听房间列表更新 (WebSocket fallback)
const handleRoomListUpdated = (data: RoomListData) => {
  console.log('房间列表更新 (WebSocket):', data)
  rooms.value = data.rooms
}

// 创建房间
const handleCreateRoom = () => {
  // 验证输入
  const nameValidation = validatePlayerName(playerName.value)
  if (!nameValidation.valid) {
    showToast(nameValidation.message!, 'error')
    return
  }

  isLoading.value = true

  // 生成房间ID
  const newRoomId = generateRoomId()
  roomId.value = newRoomId

  // 设置当前玩家
  playerStore.setCurrentPlayer({
    id: '', // 服务器会分配
    name: playerName.value.trim(),
    roomId: newRoomId,
    score: 1000
  })

  // 通过API创建房间
  roomApi.createRoom(newRoomId, playerName.value.trim()).then(() => {
    // 通过WebSocket加入房间
    socket.joinRoom({
      roomId: newRoomId,
      playerName: playerName.value.trim()
    })
    isLoading.value = false
  }).catch(error => {
    console.error('创建房间失败:', error)
    showToast('创建房间失败', 'error')
    isLoading.value = false
  })
}

// Modal 创建房间
const handleCreateRoomModal = () => {
  // 验证输入
  const nameValidation = validatePlayerName(createPlayerName.value)
  if (!nameValidation.valid) {
    showToast(nameValidation.message!, 'error')
    return
  }

  isLoading.value = true
  showCreateModal.value = false

  // 生成房间ID
  const newRoomId = generateRoomId()

  // 设置当前玩家
  playerStore.setCurrentPlayer({
    id: '', // 服务器会分配
    name: createPlayerName.value.trim(),
    roomId: newRoomId,
    score: 1000
  })

  // 通过API创建房间
  roomApi.createRoom(newRoomId, createPlayerName.value.trim()).then(() => {
    // 通过WebSocket加入房间
    socket.joinRoom({
      roomId: newRoomId,
      playerName: createPlayerName.value.trim()
    })
    isLoading.value = false
  }).catch(error => {
    console.error('创建房间失败:', error)
    showToast('创建房间失败', 'error')
    isLoading.value = false
  })
}

let intervalId: number | null = null

onMounted(() => {
  // 注册事件监听
  socket.on('roomUpdated', handleRoomUpdated)
  socket.on('gameStarted', handleGameStarted)
  socket.on('roomListUpdated', handleRoomListUpdated)
  
  // 加载房间列表 (API)
  loadRooms()
  
  // 每30秒刷新一次房间列表
  intervalId = window.setInterval(loadRooms, 30000)
})

onUnmounted(() => {
  // 清理事件监听
  socket.off('roomUpdated', handleRoomUpdated)
  socket.off('gameStarted', handleGameStarted)
  socket.off('roomListUpdated', handleRoomListUpdated)
  
  // 清理定时器
  if (intervalId) {
    clearInterval(intervalId)
  }
})
</script>

<style scoped lang="scss">
.login-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-container {
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 450px;
  text-align: center;
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  h1 {
    margin-bottom: 10px;
    font-size: 2.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .login-subtitle {
    margin-bottom: 30px;
    color: #666;
    font-size: 1.1rem;
  }
}

.login-form {
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
  text-align: left;

  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #333;
    font-size: 0.9rem;
  }
}

.input-container {
  position: relative;
  background-color: #f8f9fa;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid transparent;
  transition: all 0.3s ease;

  &:hover {
    border-color: #667eea;
  }

  &:focus-within {
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .input-icon {
    position: absolute;
    left: 15px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.2rem;
  }

  input {
    width: 100%;
    padding: 15px 15px 15px 45px;
    border: none;
    background-color: transparent;
    font-size: 1rem;
    color: #333;
    outline: none;

    &::placeholder {
      color: #999;
    }
  }
}

.login-buttons {
  display: flex;
  gap: 15px;
  margin-top: 30px;
}

.btn {
  flex: 1;
  padding: 15px;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &--primary {
    background-color: #667eea;
    color: white;

    &:hover:not(:disabled) {
      background-color: #5a6fd8;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
  }

  &--secondary {
    background-color: #f8f9fa;
    color: #333;
    border: 2px solid #e9ecef;

    &:hover:not(:disabled) {
      background-color: #e9ecef;
      border-color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    }
  }
}

.login-footer {
  margin-top: 30px;
  color: #999;
  font-size: 0.8rem;
}

/* 房间列表 */
.room-list-section {
  margin-top: 40px;
  border-top: 1px solid #e9ecef;
  padding-top: 30px;
}

.room-list-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  text-align: left;
}

.room-list {
  max-height: 300px;
  overflow-y: auto;
  background-color: #f8f9fa;
  border-radius: 10px;
  padding: 10px;
}

.room-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: white;
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &--waiting {
    border-color: #4CAF50;
  }

  &--full {
    border-color: #ff9800;
  }

  &--playing {
    border-color: #f44336;
  }
}

.room-info {
  flex: 1;
}

.room-id {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
}

.room-players {
  font-size: 0.9rem;
  color: #666;
}

.room-status {
  flex-shrink: 0;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;

  &--waiting {
    background-color: #e8f5e8;
    color: #4CAF50;
  }

  &--full {
    background-color: #fff3e0;
    color: #ff9800;
  }

  &--playing {
    background-color: #ffebee;
    color: #f44336;
  }
}

.room-list-empty {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-size: 1rem;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 16px;
  padding: 30px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease;
}

.modal-content h3 {
  margin-bottom: 20px;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.modal-form {
  margin-bottom: 20px;
}

.modal-form .form-group {
  margin-bottom: 15px;
}

.modal-form label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
  font-size: 0.9rem;
}

.modal-form input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
}

.room-id-display {
  padding: 12px;
  background-color: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: #667eea;
  text-align: center;
}

.modal-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.modal-buttons .btn {
  flex: 1;
  padding: 12px;
  font-size: 1rem;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
