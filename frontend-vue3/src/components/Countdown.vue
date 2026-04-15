<template>
  <div
    class="countdown"
    :class="{
      'countdown--warning': countdown <= 10,
      'countdown--danger': countdown <= 5
    }"
  >
    {{ countdown }}
  </div>
</template>

<script setup lang="ts">
import countBg from '@/assets/images/count_bg.png'

interface Props {
  countdown: number
}

defineProps<Props>()
</script>

<style scoped lang="scss">
.countdown {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 50px;
  height: 50px;
  background-image: url('@/assets/images/count_bg.png');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  color: #333;
  font-weight: bold;
  font-size: 16px;
  animation: pulse 1s infinite;

  &--warning {
    animation: pulse 0.8s infinite;
  }

  &--danger {
    animation: pulse 0.5s infinite;
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}
</style>
