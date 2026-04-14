<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminApi, setAdminToken } from '@/services/adminApi'

const router = useRouter()
const route = useRoute()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const { token } = await adminApi.login(username.value.trim(), password.value)
    setAdminToken(token)
    const redirect = (route.query.redirect as string) || '/admin/online'
    await router.replace(redirect)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <form class="card" @submit.prevent="submit">
      <h1>后台管理</h1>
      <p class="hint">请输入管理员账号</p>
      <label>
        <span>用户名</span>
        <input v-model="username" type="text" autocomplete="username" required />
      </label>
      <label>
        <span>密码</span>
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>
      <p v-if="error" class="err">{{ error }}</p>
      <button type="submit" :disabled="loading">{{ loading ? '登录中…' : '登录' }}</button>
    </form>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #1e2430 0%, #12151c 100%);
}

.card {
  width: 100%;
  max-width: 380px;
  padding: 2rem;
  background: #252a35;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  color: #e8eaed;

  h1 {
    margin: 0 0 0.5rem;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .hint {
    margin: 0 0 1.5rem;
    font-size: 0.875rem;
    color: #9aa0a6;
  }

  label {
    display: block;
    margin-bottom: 1rem;

    span {
      display: block;
      margin-bottom: 0.35rem;
      font-size: 0.8rem;
      color: #bdc1c6;
    }

    input {
      width: 100%;
      padding: 0.65rem 0.75rem;
      border: 1px solid #3c4454;
      border-radius: 8px;
      background: #1a1f28;
      color: #e8eaed;
      font-size: 1rem;
      box-sizing: border-box;

      &:focus {
        outline: none;
        border-color: #5c9ded;
      }
    }
  }

  .err {
    color: #f28b82;
    font-size: 0.875rem;
    margin: 0 0 1rem;
  }

  button {
    width: 100%;
    padding: 0.75rem;
    border: none;
    border-radius: 8px;
    background: #5c9ded;
    color: #0d1117;
    font-size: 1rem;
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
}
</style>
