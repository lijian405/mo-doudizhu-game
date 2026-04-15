<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminApi, type AdminParameter } from '@/services/adminApi'

const parameters = ref<AdminParameter[]>([])
const message = ref('')
const loading = ref(false)
const editingKey = ref<string | null>(null)
const editValue = ref('')
const editDescription = ref('')

async function load() {
  loading.value = true
  message.value = ''
  try {
    const { parameters: list } = await adminApi.getParameters()
    parameters.value = list
  } catch (e) {
    message.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function startEdit(param: AdminParameter) {
  editingKey.value = param.key_name
  editValue.value = param.value
  editDescription.value = param.description || ''
}

async function saveEdit(key: string) {
  try {
    await adminApi.updateParameter(key, editValue.value, editDescription.value)
    await load()
    editingKey.value = null
  } catch (e) {
    message.value = e instanceof Error ? e.message : '保存失败'
  }
}

function cancelEdit() {
  editingKey.value = null
}

onMounted(load)
</script>

<template>
  <div class="panel">
    <header class="header">
      <h2>参数配置</h2>
      <button type="button" class="btn" :disabled="loading" @click="load">刷新</button>
    </header>
    <p v-if="message" class="msg">{{ message }}</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>参数键</th>
            <th>参数值</th>
            <th>描述</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in parameters" :key="p.key_name">
            <td class="mono">{{ p.key_name }}</td>
            <td v-if="editingKey !== p.key_name">{{ p.value }}</td>
            <td v-else>
              <input type="text" v-model="editValue" class="input" />
            </td>
            <td v-if="editingKey !== p.key_name">{{ p.description || '—' }}</td>
            <td v-else>
              <input type="text" v-model="editDescription" class="input" />
            </td>
            <td>
              <template v-if="editingKey !== p.key_name">
                <button type="button" class="btn" @click="startEdit(p)">编辑</button>
              </template>
              <template v-else>
                <button type="button" class="btn" @click="saveEdit(p.key_name)">保存</button>
                <button type="button" class="btn" @click="cancelEdit">取消</button>
              </template>
            </td>
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

.input {
  width: 100%;
  padding: 0.4rem 0.5rem;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #8ab4f8;
    box-shadow: 0 0 0 2px rgba(138, 180, 248, 0.2);
  }
}

.btn {
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  border: 1px solid #dadce0;
  background: #fff;
  cursor: pointer;
  font-size: 0.875rem;
  margin-right: 0.5rem;

  &:hover:not(:disabled) {
    background: #f8f9fa;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>