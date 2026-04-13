import { createRouter, createWebHistory } from 'vue-router'
import { useRoomStore } from '@/stores/roomStore'
import LoginView from '@/views/LoginView.vue'
import RoomView from '@/views/RoomView.vue'
import GameView from '@/views/GameView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView
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

export default router
