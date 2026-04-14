<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminApi, type AdminRoomRow } from '@/services/adminApi'

const rooms = ref<AdminRoomRow[]>([])
const message = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  message.value = ''
  try {
    const { rooms: list } = await adminApi.getRooms()
    rooms.value = list
  } catch (e) {
    message.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function removeRoom(roomId: string) {
  if (!confirm(`确定删除房间「${roomId}」？在线玩家将被断开相关状态。`)) return
  try {
    await adminApi.deleteRoom(roomId)
    await load()
  } catch (e) {
    message.value = e instanceof Error ? e.message : '删除失败'
  }
}

function statusLabel(r: AdminRoomRow) {
  if (r.roomStatus === 'playing') return '游戏中'
  if (r.roomStatus === 'full') return '满员'
  return '等待中'
}

onMounted(load)
</script>

<template>
  <div class="panel">
    <header class="header">
      <h2>房间列表</h2>
      <button type="button" class="btn" :disabled="loading" @click="load">刷新</button>
    </header>
    <p v-if="message" class="msg">{{ message }}</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>房间 ID</th>
            <th>状态</th>
            <th>人数</th>
            <th>玩家</th>
            <th>来源</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rooms" :key="r.id">
            <td class="mono">{{ r.id }}</td>
            <td>{{ statusLabel(r) }}</td>
            <td>{{ r.playerCount }} / {{ r.maxPlayers ?? 3 }}</td>
            <td class="names">{{ r.players?.map((p) => p.name).join('、') || '—' }}</td>
            <td>{{ r.source === 'db_only' ? '仅数据库' : '内存' }}</td>
            <td>
              <button type="button" class="btn danger" @click="removeRoom(r.id)">删除</button>
            </td>
          </tr>
          <tr v-if="!loading && rooms.length === 0">
            <td colspan="6" class="empty">暂无房间</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped lang="scss">
.panel {
  background: #fff;
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;

  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1a1a1a;
  }
}

.msg {
  color: #c5221f;
  font-size: 0.875rem;
  margin: 0 0 0.75rem;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th,
td {
  text-align: left;
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid #e8eaed;
  vertical-align: top;
}

th {
  color: #5f6368;
  font-weight: 600;
}

.mono {
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
  word-break: break-all;
}

.names {
  max-width: 220px;
  color: #3c4043;
}

.empty {
  text-align: center;
  color: #80868b;
  padding: 2rem !important;
}

.btn {
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  border: 1px solid #dadce0;
  background: #fff;
  cursor: pointer;
  font-size: 0.875rem;

  &:hover:not(:disabled) {
    background: #f8f9fa;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &.danger {
    border-color: #fce8e6;
    color: #c5221f;
    background: #fce8e6;

    &:hover {
      background: #f9dedc;
    }
  }
}
</style>
