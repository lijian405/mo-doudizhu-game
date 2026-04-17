<template>
  <div class="login-view">
    <div class="login-main">
      <div class="login-left">
        <div class="login-header">
          <h1>联机斗地主</h1>
          <p class="login-subtitle">AI时代的多人在线游戏体验</p>
          <div class="online-count">
            <span class="online-icon">👥</span>
            <span>当前在线: {{ onlinePlayerCount }} 人</span>
          </div>
        </div>

        <div class="login-actions">
          <button
            class="btn btn--primary create-room-btn"
            :disabled="isLoading"
            @click="showCreateModal = true"
          >
            {{ isLoading ? '创建中...' : '创建房间' }}
          </button>
        </div>
      </div>

      <div class="login-right">
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
                <div class="room-id">
                  <span v-if="room.hasPassword" class="lock-icon">🔒</span>
                  房间: {{ room.id }}
                </div>
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
      </div>
    </div>

    <p class="login-footer">© 2026 联机斗地主 - AI时代的游戏体验</p>

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
          <div class="form-group">
            <label for="create-room-password">房间密码（可选）</label>
            <input
              id="create-room-password"
              v-model="createRoomPassword"
              type="password"
              placeholder="留空则不设置密码"
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
            <label>房间ID</label>
            <div class="room-id-display">{{ selectedRoomId }}</div>
          </div>
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
        
          <div v-if="selectedRoomHasPassword" class="form-group">
            <label for="join-room-password">房间密码</label>
            <input
              id="join-room-password"
              v-model="joinRoomPassword"
              type="password"
              placeholder="请输入房间密码"
              @keyup.enter="handleJoinRoomModal"
            />
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
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/playerStore'
import { useRoomStore } from '@/stores/roomStore'
import { useSocket } from '@/composables/useSocket'
import { roomApi } from '@/services/apiService'
import GameMessage from '@/components/GameMessage.vue'
import { validatePlayerName, generateRoomId } from '@/utils/gameHelper'
import { configApi } from '@/services/apiService'
import type { RoomUpdatedData, GameStartedData, RoomListItem, RoomListData, JoinRoomFailedData } from '@/types'

const router = useRouter()
const playerStore = usePlayerStore()
const roomStore = useRoomStore()
const socket = useSocket()

// 表单数据
const isLoading = ref(false)

// 在线玩家数量
const onlinePlayerCount = ref(0)

// 房间列表
const rooms = ref<RoomListItem[]>([])

// Modal 状态
const showCreateModal = ref(false)
const showJoinModal = ref(false)
const createPlayerName = ref('')
const createRoomPassword = ref('')
const joinPlayerName = ref('')
const joinRoomPassword = ref('')
const selectedRoomId = ref('')
const selectedRoomHasPassword = ref(false)

// 消息提示
const showMessage = ref(false)
const messageText = ref('')
const messageType = ref<'error' | 'success' | 'info'>('info')

// 默认分值
const defaultPlayerScore = ref(1000)

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

// 处理房间点击
const handleRoomClick = (room: RoomListItem) => {
  if (room.roomStatus === 'waiting') {
    selectedRoomId.value = room.id
    selectedRoomHasPassword.value = !!room.hasPassword
    joinRoomPassword.value = ''
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
    score: defaultPlayerScore.value
  })

  // 发送加入房间请求
  const joinData: { roomId: string; playerName: string; password?: string } = {
    roomId: selectedRoomId.value,
    playerName: joinPlayerName.value.trim()
  }
  if (joinRoomPassword.value) {
    joinData.password = joinRoomPassword.value
  }
  socket.joinRoom(joinData)
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

// 监听在线玩家数量更新
const handleOnlineCountUpdated = (data: { count: number }) => {
  console.log('在线玩家数量更新:', data)
  onlinePlayerCount.value = data.count
}

// 监听加入房间失败
const handleJoinRoomFailed = (data: JoinRoomFailedData) => {
  console.log('加入房间失败:', data)
  isLoading.value = false
  showToast(data.message || '加入房间失败', 'error')
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
    score: defaultPlayerScore.value
  })

  const roomPassword = createRoomPassword.value.trim() || undefined

  // 通过API创建房间
  roomApi.createRoom(newRoomId, createPlayerName.value.trim(), roomPassword).then(() => {
    // 通过WebSocket加入房间（房主自动跳过密码验证，因为是第一个加入）
    socket.joinRoom({
      roomId: newRoomId,
      playerName: createPlayerName.value.trim(),
      password: roomPassword
    })
    createRoomPassword.value = ''
    isLoading.value = false
  }).catch(error => {
    console.error('创建房间失败:', error)
    showToast('创建房间失败', 'error')
    isLoading.value = false
  })
}

let intervalId: number | null = null

// 加载默认参数
const loadDefaults = async () => {
  try {
    const scoreValue = await configApi.getParameter('default_player_score', '10')
    defaultPlayerScore.value = parseInt(scoreValue)
  } catch (error) {
    console.error('加载默认参数失败:', error)
  }
}

onMounted(async () => {
  // 注册事件监听
  socket.on('roomUpdated', handleRoomUpdated)
  socket.on('gameStarted', handleGameStarted)
  socket.on('onlineCountUpdated', handleOnlineCountUpdated)
  socket.on('roomListUpdated', handleRoomListUpdated)
  socket.on('joinRoomFailed', handleJoinRoomFailed)
  
  // 加载默认参数
  await loadDefaults()
  
  // 加载房间列表 (API)
  loadRooms()
  
  // 每30秒刷新一次房间列表
  intervalId = window.setInterval(loadRooms, 30000)
  
  // 初始化在线玩家数量
  socket.emit('getOnlineCount')
})

onUnmounted(() => {
  // 清理事件监听
  socket.off('roomUpdated', handleRoomUpdated)
  socket.off('gameStarted', handleGameStarted)
  socket.off('onlineCountUpdated', handleOnlineCountUpdated)
  socket.off('roomListUpdated', handleRoomListUpdated)
  socket.off('joinRoomFailed', handleJoinRoomFailed)
  
  // 清理定时器
  if (intervalId) {
    clearInterval(intervalId)
  }
})
</script>

<style scoped lang="scss">
.login-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.login-main {
  display: flex;
  flex-direction: row;
  gap: 12px;
  flex: 1;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

.login-left {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 240px;
  flex-shrink: 0;
}

.login-right {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 16px;
  flex: 1;
  min-width: 0;
}

.login-footer {
  text-align: center;
  padding: 12px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.75rem;
}

.login-header {
  margin-bottom: 16px;

  h1 {
    font-size: 1.4rem;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 6px;
  }

  .login-subtitle {
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 12px;
  }

  .online-count {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background-color: #f5f5f5;
    padding: 8px 14px;
    border-radius: 18px;
    font-size: 0.8rem;
    color: #333;
    font-weight: 500;

    .online-icon {
      font-size: 1rem;
    }
  }
}

.login-actions {
  width: 100%;
}

.create-room-btn {
  width: 100%;
  padding: 14px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.35);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.room-list-section {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.room-list-title {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.room-list {
  flex: 1;
  overflow-y: auto;
  background-color: #f8f8f8;
  border-radius: 8px;
  padding: 10px;
}

.room-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: white;
  border-radius: 8px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;

  &:active {
    transform: scale(0.98);
  }

  &:last-child {
    margin-bottom: 0;
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

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

.room-info {
  flex: 1;
  text-align: left;
}

.room-id {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 2px;

  .lock-icon {
    margin-right: 4px;
    font-size: 0.8rem;
  }
}

.room-players {
  font-size: 0.8rem;
  color: #666;
}

.room-status {
  flex-shrink: 0;
}

.status-badge {
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 0.75rem;
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
  padding: 24px 12px;
  color: #999;
  font-size: 0.9rem;
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

.login-left {
  animation: fadeIn 0.3s ease;
}

.login-right {
  animation: fadeIn 0.3s ease 0.1s both;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 16px;
}

.modal-content {
  background-color: white;
  border-radius: 12px;
  padding: 16px;
  width: 100%;
  max-width: 340px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.2s ease;

  h3 {
    margin-bottom: 12px;
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
    text-align: center;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-form {
  margin-bottom: 12px;
}

.form-group {
  margin-bottom: 10px;
  text-align: left;

  label {
    display: block;
    margin-bottom: 4px;
    font-weight: 600;
    color: #333;
    font-size: 0.8rem;
  }

  input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 0.9rem;
    transition: all 0.2s ease;

    &:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.15);
    }
  }
}

.room-id-display {
  padding: 10px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #667eea;
  text-align: center;
}

.modal-buttons {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
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
</style>
