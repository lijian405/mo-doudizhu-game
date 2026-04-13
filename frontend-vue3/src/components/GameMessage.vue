<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="game-message"
      :class="`game-message--${type}`"
    >
      {{ message }}
    </div>
  </Transition>
</template>

<script setup lang="ts">
interface Props {
  show: boolean
  message: string
  type?: 'error' | 'success' | 'info'
}

withDefaults(defineProps<Props>(), {
  type: 'info'
})
</script>

<style scoped lang="scss">
.game-message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 10px;
  color: white;
  font-weight: 600;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);

  &--error {
    background-color: rgba(244, 67, 54, 0.9);
  }

  &--success {
    background-color: rgba(76, 175, 80, 0.9);
  }

  &--info {
    background-color: rgba(33, 150, 243, 0.9);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>
