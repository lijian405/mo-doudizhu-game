<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { adminApi, type AdminOnlinePlayer } from '@/services/adminApi'

const players = ref<AdminOnlinePlayer[]>([])
const message = ref('')
const loading = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

async function load() {
  loading.value = true
  message.value = ''
  try {
    const { players: list } = await adminApi.getOnlinePlayers()
    players.value = list
  } catch (e) {
    message.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function kick(id: string) {
  if (!confirm(`确定踢出连接 ${id.slice(0, 8)}…？`)) return
  try {
    await adminApi.kick(id)
    await load()
  } catch (e) {
    message.value = e instanceof Error ? e.message : '操作失败'
  }
}

onMounted(() => {
  load()
  timer = setInterval(load, 5000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="panel">
    <header class="header">
      <h2>在线玩家</h2>
      <button type="button" class="btn" :disabled="loading" @click="load">刷新</button>
    </header>
    <p v-if="message" class="msg">{{ message }}</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>连接 ID</th>
            <th>玩家名</th>
            <th>房间</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in players" :key="p.id">
            <td class="mono">{{ p.id }}</td>
            <td>{{ p.name }}</td>
            <td class="mono">{{ p.roomId ?? '—' }}</td>
            <td>
              <button type="button" class="btn danger" @click="kick(p.id)">踢出</button>
            </td>
          </tr>
          <tr v-if="!loading && players.length === 0">
            <td colspan="4" class="empty">当前无在线连接</td>
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
