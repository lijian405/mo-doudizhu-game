<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminApi } from '@/services/adminApi'

const cheatTargetPlayerName = ref('')
const message = ref('')
const saved = ref(false)
const loading = ref(false)

async function load() {
  loading.value = true
  message.value = ''
  try {
    const { cheatTargetPlayerName: n } = await adminApi.getCheatTarget()
    cheatTargetPlayerName.value = n
  } catch (e) {
    message.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function save() {
  message.value = ''
  saved.value = false
  loading.value = true
  try {
    const { cheatTargetPlayerName: n } = await adminApi.setCheatTarget(cheatTargetPlayerName.value.trim())
    cheatTargetPlayerName.value = n
    saved.value = true
  } catch (e) {
    message.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="panel">
    <h2>作弊功能</h2>
    <p class="desc">
      设置目标玩家名称（与进房时填写的名称<strong>完全一致</strong>）。开局发牌时，服务端会把<strong>大王、小王和两张
        2</strong>发给该玩家（仍共 17 张手牌）。留空则关闭作弊。
    </p>
    <label>
      <span>目标玩家名称</span>
      <input v-model="cheatTargetPlayerName" type="text" placeholder="例如：玩家A" />
    </label>
    <p v-if="message" class="msg">{{ message }}</p>
    <p v-if="saved" class="ok">已保存</p>
    <button type="button" class="btn primary" :disabled="loading" @click="save">
      {{ loading ? '保存中…' : '保存设置' }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.panel {
  background: #fff;
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  max-width: 520px;

  h2 {
    margin: 0 0 0.75rem;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1a1a1a;
  }
}

.desc {
  margin: 0 0 1.25rem;
  font-size: 0.9rem;
  color: #5f6368;
  line-height: 1.5;
}

label {
  display: block;
  margin-bottom: 1rem;

  span {
    display: block;
    margin-bottom: 0.35rem;
    font-size: 0.85rem;
    color: #3c4043;
  }

  input {
    width: 100%;
    max-width: 400px;
    padding: 0.6rem 0.75rem;
    border: 1px solid #dadce0;
    border-radius: 8px;
    font-size: 1rem;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: #5c9ded;
    }
  }
}

.msg {
  color: #c5221f;
  font-size: 0.875rem;
}

.ok {
  color: #137333;
  font-size: 0.875rem;
}

.btn {
  margin-top: 0.5rem;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  border: none;
  background: #5c9ded;
  color: #0d1117;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    filter: brightness(1.05);
  }
}
</style>
