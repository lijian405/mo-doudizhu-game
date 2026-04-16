<template>
  <div
    v-if="show"
    class="card-fly-animation"
    :style="animationStyle as any"
    @animationend="handleAnimationEnd"
  >
    <div
      v-for="card in cards"
      :key="`${card.suit}-${card.rank}`"
      class="card-fly-animation__card"
    >
      <CardComponent
        :card="card"
        size="small"
        disabled
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Card } from '@/types'
import CardComponent from './Card.vue'

interface Position {
  x: number
  y: number
}

interface Props {
  show: boolean
  cards: Card[]
  startPosition: Position
  endPosition: Position
  direction: 'left' | 'right' | 'bottom'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'animation-end': []
}>()

const animationStyle = computed(() => {
  const startX = props.startPosition.x
  const startY = props.startPosition.y
  const endX = props.endPosition.x
  const endY = props.endPosition.y
  const translateX = endX - startX
  const translateY = endY - startY

  return {
    position: 'fixed',
    left: `${startX}px`,
    top: `${startY}px`,
    zIndex: '1000',
    pointerEvents: 'none',
    animation: `cardFly 0.6s ease-out forwards`,
    animationDelay: '0s',
    '--end-x': `${translateX}px`,
    '--end-y': `${translateY}px`
  }
})

const handleAnimationEnd = () => {
  emit('animation-end')
}
</script>

<style scoped lang="scss">
.card-fly-animation {
  display: inline-flex;

  &__card {
    display: inline-flex;
    margin-right: -29px;

    &:last-child {
      margin-right: 0;
    }
  }

  @keyframes cardFly {
    0% {
      transform: scale(1) translate(0, 0);
      opacity: 1;
    }
    100% {
      transform: scale(0.8) translate(var(--end-x), var(--end-y));
      opacity: 1;
    }
  }
}
</style>