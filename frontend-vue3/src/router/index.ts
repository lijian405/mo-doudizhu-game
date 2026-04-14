import { createRouter, createWebHistory } from 'vue-router'
import { useRoomStore } from '@/stores/roomStore'
import LoginView from '@/views/LoginView.vue'
import RoomView from '@/views/RoomView.vue'
import GameView from '@/views/GameView.vue'
import AdminLoginView from '@/views/admin/AdminLoginView.vue'
import AdminLayout from '@/views/admin/AdminLayout.vue'
import AdminOnlineView from '@/views/admin/AdminOnlineView.vue'
import AdminRoomsView from '@/views/admin/AdminRoomsView.vue'
import AdminCheatView from '@/views/admin/AdminCheatView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: AdminLoginView
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAdmin: true },
      children: [
        { path: '', redirect: '/admin/online' },
        { path: 'online', name: 'admin-online', component: AdminOnlineView },
        { path: 'rooms', name: 'admin-rooms', component: AdminRoomsView },
        { path: 'cheat', name: 'admin-cheat', component: AdminCheatView }
      ]
    },
    {
      path: '/room',
      name: 'room',
      component: RoomView,
      beforeEnter: (to, from) => {
        const roomStore = useRoomStore()
        if (!roomStore.isInRoom) {
          return '/'
        }
        return true
      }
    },
    {
      path: '/game',
      name: 'game',
      component: GameView,
      beforeEnter: (to, from) => {
        const roomStore = useRoomStore()
        if (!roomStore.isInRoom) {
          return '/'
        }
        return true
      }
    }
  ]
})

router.beforeEach((to) => {
  const needAdmin = to.matched.some((r) => r.meta.requiresAdmin)
  if (needAdmin && !sessionStorage.getItem('adminToken')) {
    return { path: '/admin/login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'admin-login' && sessionStorage.getItem('adminToken')) {
    return '/admin'
  }
})

export default router
