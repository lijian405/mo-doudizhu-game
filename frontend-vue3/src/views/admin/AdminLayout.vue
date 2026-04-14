<script setup lang="ts">
import { useRouter } from 'vue-router'
import { adminApi, setAdminToken } from '@/services/adminApi'

const router = useRouter()

const menu = [
  { path: '/admin/online', label: '在线玩家' },
  { path: '/admin/rooms', label: '房间列表' },
  { path: '/admin/cheat', label: '作弊功能' }
]

async function logout() {
  try {
    await adminApi.logout()
  } catch {
    /* ignore */
  }
  setAdminToken(null)
  await router.replace('/admin/login')
}
</script>

<template>
  <div class="admin-shell">
    <aside class="sidebar">
      <div class="brand">管理后台</div>
      <nav>
        <RouterLink v-for="item in menu" :key="item.path" :to="item.path" class="nav-link">
          {{ item.label }}
        </RouterLink>
      </nav>
      <button type="button" class="logout" @click="logout">退出登录</button>
    </aside>
    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped lang="scss">
.admin-shell {
  display: flex;
  min-height: 100vh;
  background: #f0f2f5;
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #1a1d24;
  color: #e8eaed;
  display: flex;
  flex-direction: column;
  padding: 1.25rem 0;
}

.brand {
  padding: 0 1.25rem 1.25rem;
  font-weight: 700;
  font-size: 1.1rem;
  border-bottom: 1px solid #2d323c;
  margin-bottom: 0.75rem;
}

nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-link {
  padding: 0.75rem 1.25rem;
  color: #bdc1c6;
  text-decoration: none;
  font-size: 0.95rem;

  &:hover {
    background: #252a33;
    color: #fff;
  }

  &.router-link-active {
    background: #2d3a4d;
    color: #8ab4f8;
    border-left: 3px solid #8ab4f8;
    padding-left: calc(1.25rem - 3px);
  }
}

.logout {
  margin: 1rem 1rem 0;
  padding: 0.5rem;
  border: 1px solid #3c4454;
  border-radius: 8px;
  background: transparent;
  color: #9aa0a6;
  cursor: pointer;
  font-size: 0.875rem;

  &:hover {
    color: #f28b82;
    border-color: #f28b82;
  }
}

.main {
  flex: 1;
  padding: 1.5rem 2rem;
  overflow: auto;
}
</style>
