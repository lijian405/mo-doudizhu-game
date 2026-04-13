/**
 * 倒计时逻辑 Composable
 */

import { ref, computed, onUnmounted } from 'vue'

export function useCountdown(defaultTime: number = 30) {
  const countdown = ref(defaultTime)
  const isRunning = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null

  const isTimeout = computed(() => countdown.value <= 0)

  const start = (time: number = defaultTime) => {
    stop()
    countdown.value = time
    isRunning.value = true

    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        stop()
      }
    }, 1000)
  }

  const stop = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    isRunning.value = false
  }

  const reset = (time: number = defaultTime) => {
    stop()
    countdown.value = time
  }

  onUnmounted(() => {
    stop()
  })

  return {
    countdown,
    isRunning,
    isTimeout,
    start,
    stop,
    reset
  }
}
