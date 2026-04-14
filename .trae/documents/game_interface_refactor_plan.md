# 游戏界面重构计划

## 1. 项目现状分析

### 1.1 现有界面结构
- **登录界面**：简单的表单，包含玩家名称和房间ID输入
- **房间界面**：显示房间信息和玩家列表
- **叫分界面**：独立的叫分页面
- **游戏界面**：主游戏界面，包含玩家区域、出牌区域等

### 1.2 现有问题
- 房间列表功能缺失
- 房间状态显示不完整
- 房间创建/加入流程不够直观
- 叫分界面与游戏界面切换不够流畅

## 2. 重构目标

### 2.1 功能目标
1. **房间列表及房间等待界面**
   - 显示所有房间列表
   - 显示房间状态（等待中、游戏中、满员）
   - 创建房间功能
   - 加入房间功能
   - 房间状态实时更新

2. **游戏开始界面**
   - 保持现有游戏逻辑
   - 优化叫地主界面，改为modal层形式
   - 提升用户体验和视觉效果

### 2.2 技术实现
- **前端框架**：Vue 3 + TypeScript
- **状态管理**：Pinia
- **UI组件**：自定义组件 + Modal组件
- **通信**：Socket.io-client

## 3. 重构计划

### 3.1 阶段一：房间列表及房间等待界面

#### 3.1.1 组件设计

**1. 房间列表页面 (RoomList.vue)**
- 顶部："创建房间"按钮
- 中部：房间列表
- 底部：版权信息

**2. 房间卡片组件 (RoomCard.vue)**
- 显示房间ID
- 显示当前人数/最大人数
- 显示房间状态（等待中、游戏中、满员）
- 加入按钮（根据状态显示/禁用）

**3. 创建房间Modal (CreateRoomModal.vue)**
- 玩家名称输入
- 创建按钮
- 取消按钮

**4. 加入房间Modal (JoinRoomModal.vue)**
- 玩家名称输入
- 加入按钮
- 取消按钮

#### 3.1.2 状态管理

**房间状态管理 (roomStore.ts)**
- 房间列表
- 当前房间信息
- 房间状态更新
- 创建/加入房间操作

**玩家状态管理 (playerStore.ts)**
- 玩家信息
- 当前房间ID
- 玩家状态

#### 3.1.3 Socket事件

**新增事件**：
- `getRooms` - 获取房间列表
- `roomListUpdated` - 房间列表更新
- `roomCreated` - 房间创建成功
- `roomJoined` - 房间加入成功

**现有事件**：
- `joinRoom` - 加入房间
- `leaveRoom` - 离开房间
- `roomUpdated` - 房间信息更新

### 3.2 阶段二：游戏开始界面

#### 3.2.1 组件设计

**1. 游戏主界面 (GameScreen.vue)**
- 保持现有布局
- 集成叫地主Modal

**2. 叫地主Modal (CallingModal.vue)**
- 叫分信息显示
- 叫分按钮（1分、2分、3分、不叫）
- 关闭按钮（仅在特殊情况下可用）

#### 3.2.2 状态管理

**游戏状态管理 (gameStore.ts)**
- 叫地主状态
- 当前叫分玩家
- 最高叫分
- 游戏状态转换

#### 3.2.3 流程优化
1. 游戏开始后，发牌结束
2. 自动弹出叫地主Modal
3. 叫地主过程中，其他玩家等待
4. 叫地主结束后，Modal自动关闭
5. 游戏正式开始

## 4. 技术实现细节

### 4.1 房间列表及房间等待界面

**房间列表组件**：
```vue
<!-- components/room/RoomList.vue -->
<template>
  <div class="room-list">
    <div class="room-list-header">
      <h1>联机斗地主</h1>
      <button class="create-room-btn" @click="showCreateModal = true">
        创建房间
      </button>
    </div>
    
    <div class="room-list-content">
      <h2>房间列表</h2>
      <div v-if="rooms.length === 0" class="no-rooms">
        暂无房间，快来创建一个吧！
      </div>
      <div v-else class="rooms-grid">
        <RoomCard 
          v-for="room in rooms" 
          :key="room.id" 
          :room="room"
          @join="handleJoinRoom"
        />
      </div>
    </div>
    
    <!-- 创建房间Modal -->
    <CreateRoomModal 
      v-if="showCreateModal" 
      @create="handleCreateRoom"
      @cancel="showCreateModal = false"
    />
    
    <!-- 加入房间Modal -->
    <JoinRoomModal 
      v-if="showJoinModal" 
      :roomId="selectedRoomId"
      @join="handleConfirmJoin"
      @cancel="showJoinModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import RoomCard from './RoomCard.vue';
import CreateRoomModal from './CreateRoomModal.vue';
import JoinRoomModal from './JoinRoomModal.vue';
import { useRoomStore } from '@/stores/room';
import { useSocket } from '@/composables/useSocket';
import { SocketEvent } from '@/types/socket';

const roomStore = useRoomStore();
const { emit, on } = useSocket();

const showCreateModal = ref(false);
const showJoinModal = ref(false);
const selectedRoomId = ref('');

const rooms = computed(() => roomStore.rooms);

const handleCreateRoom = (playerName: string) => {
  // 生成随机房间ID
  const roomId = Math.random().toString(36).substr(2, 9);
  emit(SocketEvent.JOIN_ROOM, {
    roomId,
    playerName
  });
  showCreateModal.value = false;
};

const handleJoinRoom = (roomId: string) => {
  selectedRoomId.value = roomId;
  showJoinModal.value = true;
};

const handleConfirmJoin = (playerName: string) => {
  emit(SocketEvent.JOIN_ROOM, {
    roomId: selectedRoomId.value,
    playerName
  });
  showJoinModal.value = false;
};

onMounted(() => {
  // 获取房间列表
  emit('getRooms');
  
  // 监听房间列表更新
  on('roomListUpdated', (data: any) => {
    roomStore.updateRooms(data.rooms);
  });
});
</script>
```

**房间卡片组件**：
```vue
<!-- components/room/RoomCard.vue -->
<template>
  <div class="room-card" :class="room.status">
    <div class="room-info">
      <h3>房间 {{ room.id }}</h3>
      <div class="room-status">
        <span v-if="room.status === 'waiting'" class="status-waiting">
          等待中
        </span>
        <span v-else-if="room.status === 'playing'" class="status-playing">
          游戏已开始
        </span>
        <span v-else-if="room.status === 'full'" class="status-full">
          满员
        </span>
      </div>
      <div class="room-players">
        {{ room.players.length }}/3 人
      </div>
    </div>
    <button 
      class="join-btn"
      :disabled="room.status === 'playing' || room.status === 'full'"
      @click="$emit('join', room.id)"
    >
      {{ room.status === 'waiting' ? '加入' : '不可加入' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import type { Room } from '@/types/room';

const props = defineProps<{
  room: Room;
}>();

const emit = defineEmits<{
  (e: 'join', roomId: string): void;
}>();
</script>
```

### 4.2 游戏开始界面

**叫地主Modal组件**：
```vue
<!-- components/game/CallingModal.vue -->
<template>
  <div class="calling-modal-overlay">
    <div class="calling-modal">
      <div class="calling-header">
        <h2>叫分阶段</h2>
        <p>轮到 {{ currentCallerName }} 叫分</p>
      </div>
      <div class="calling-info">
        <p>当前最高叫分: {{ highestScore }}</p>
      </div>
      <div class="calling-buttons">
        <button 
          v-for="score in [1, 2, 3]" 
          :key="score"
          class="call-btn"
          :disabled="!isCurrentPlayer || score <= highestScore"
          @click="callScore(score)"
        >
          {{ score }}分
        </button>
        <button 
          class="call-btn pass-btn"
          :disabled="!isCurrentPlayer"
          @click="callScore(0)"
        >
          不叫
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';
import { usePlayerStore } from '@/stores/player';
import { useSocket } from '@/composables/useSocket';
import { SocketEvent } from '@/types/socket';

const gameStore = useGameStore();
const playerStore = usePlayerStore();
const { emit } = useSocket();

const currentCallerIndex = computed(() => gameStore.callingState.currentCallerIndex);
const highestScore = computed(() => gameStore.callingState.highestScore);
const players = computed(() => playerStore.players);

const currentCallerName = computed(() => {
  if (players.value[currentCallerIndex.value]) {
    return players.value[currentCallerIndex.value].name;
  }
  return '';
});

const isCurrentPlayer = computed(() => {
  if (players.value[currentCallerIndex.value]) {
    return players.value[currentCallerIndex.value].id === playerStore.playerId;
  }
  return false;
});

const callScore = (score: number) => {
  emit(SocketEvent.CALL_LANDLORD, {
    roomId: playerStore.currentRoomId,
    score
  });
};
</script>
```

**游戏主界面集成**：
```vue
<!-- components/game/GameScreen.vue -->
<template>
  <div class="game-screen">
    <!-- 游戏界面内容 -->
    <!-- ... 现有游戏界面代码 ... -->
    
    <!-- 叫地主Modal -->
    <CallingModal v-if="gameStore.status === 'calling'" />
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '@/stores/game';
import CallingModal from './CallingModal.vue';

const gameStore = useGameStore();
</script>
```

## 5. 后端修改

### 5.1 新增Socket事件处理

**1. 获取房间列表**
```javascript
// backend/server/index.js

// 处理获取房间列表请求
socket.on('getRooms', () => {
  const roomsList = Array.from(rooms.values()).map(room => ({
    id: room.id,
    players: room.players,
    status: room.players.length >= 3 ? 'full' : room.status
  }));
  socket.emit('roomListUpdated', { rooms: roomsList });
});

// 当房间状态更新时，广播给所有客户端
function broadcastRoomList() {
  const roomsList = Array.from(rooms.values()).map(room => ({
    id: room.id,
    players: room.players,
    status: room.players.length >= 3 ? 'full' : room.status
  }));
  io.emit('roomListUpdated', { rooms: roomsList });
}

// 在房间创建、加入、离开时调用
socket.on('joinRoom', (data) => {
  // 现有代码...
  // 广播房间列表更新
  broadcastRoomList();
});

socket.on('leaveRoom', (data) => {
  // 现有代码...
  // 广播房间列表更新
  broadcastRoomList();
});
```

### 5.2 房间状态管理优化

**1. 房间状态更新**
```javascript
// 当房间玩家数量达到3人时，更新状态为full
function updateRoomStatus(roomId) {
  const room = rooms.get(roomId);
  if (room) {
    if (room.players.length >= 3) {
      room.status = 'full';
    } else if (room.players.length > 0) {
      room.status = 'waiting';
    }
    // 广播房间列表更新
    broadcastRoomList();
  }
}
```

## 6. 时间估计

| 阶段 | 任务 | 时间估计 |
|------|------|----------|
| 阶段一 | 房间列表及房间等待界面 | 2天 |
| 阶段二 | 游戏开始界面（叫地主Modal） | 1天 |
| 阶段三 | 后端修改 | 1天 |
| 阶段四 | 测试与优化 | 1天 |
| **总计** | | **5天** |

## 7. 风险评估

### 7.1 潜在风险
1. **Socket通信延迟**：房间列表更新可能存在延迟
2. **状态同步问题**：多用户同时操作时可能出现状态不一致
3. **UI性能**：房间列表较多时可能影响性能
4. **兼容性问题**：不同浏览器可能存在兼容性问题

### 7.2 风险缓解措施
1. **Socket通信优化**：使用WebSocket心跳机制确保连接稳定
2. **状态管理优化**：使用Pinia确保状态一致性
3. **性能优化**：实现房间列表虚拟滚动
4. **兼容性测试**：在主流浏览器中进行测试

## 8. 结论

通过本次重构，我们将实现以下功能：

1. **房间列表及房间等待界面**
   - 直观的房间列表显示
   - 清晰的房间状态标识
   - 便捷的房间创建/加入流程
   - 实时的房间状态更新

2. **游戏开始界面**
   - 优化的叫地主体验
   - 流畅的界面过渡
   - 清晰的叫分操作

重构后的界面将更加现代化、用户友好，并且具有更好的可维护性和扩展性。