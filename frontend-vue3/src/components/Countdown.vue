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
  width: 32px;
  height: 32px;
  background-color: #f44336;
  color: white;
  border-radius: 50%;
  font-weight: bold;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.4);
  animation: pulse 1s infinite;

  &--warning {
    background-color: #ff9800;
    box-shadow: 0 2px 8px rgba(255, 152, 0, 0.4);
  }

  &--danger {
    background-color: #f44336;
    box-shadow: 0 2px 8px rgba(244, 67, 54, 0.6);
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
