<template>
  <div class="card-back" :style="cardStyle">
    <div class="card-back__pattern"></div>
    <div v-if="count != null" class="card-back__count">
      {{ count }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'small' | 'medium' | 'large'
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  count: undefined
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

  &__count {
    position: absolute;
    right: 6px;
    bottom: 6px;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.45);
    border: 1px solid rgba(255, 215, 0, 0.55);
    color: #ffd700;
    font-size: 12px;
    font-weight: 900;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
    box-sizing: border-box;
  }

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
