<template>
  <div class="card-back" :style="cardStyle">
    <div class="card-back__pattern"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium'
})

const cardStyle = computed(() => ({
  width: props.size === 'small' ? '50px' : props.size === 'large' ? '70px' : '60px',
  height: props.size === 'small' ? '70px' : props.size === 'large' ? '95px' : '80px'
}))
</script>

<style scoped lang="scss">
.card-back {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;

  &__pattern {
    width: 80%;
    height: 80%;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 60%;
      height: 60%;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 50%;
    }

    &::after {
      content: '♠';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 20px;
      color: rgba(255, 255, 255, 0.4);
    }
  }
}
</style>
