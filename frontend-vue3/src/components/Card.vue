<template>
  <div
    class="card"
    :class="{
      'card--selected': isSelected,
      'card--disabled': disabled
    }"
    :style="cardStyle"
    @click="handleClick"
  >
    <div class="card__suit">{{ card.suit }}</div>
    <div class="card__rank">{{ card.rank }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Card as CardType } from '@/types'
import { getCardColor } from '@/utils/cardHelper'

interface Props {
  card: CardType
  isSelected?: boolean
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
  disabled: false,
  size: 'medium'
})

const emit = defineEmits<{
  click: [card: CardType]
}>()

const cardColor = computed(() => getCardColor(props.card.suit))

const cardStyle = computed(() => ({
  color: cardColor.value === 'red' ? '#e53935' : '#333',
  width: props.size === 'small' ? '50px' : props.size === 'large' ? '70px' : '60px',
  height: props.size === 'small' ? '70px' : props.size === 'large' ? '95px' : '80px'
}))

const handleClick = () => {
  if (!props.disabled) {
    emit('click', props.card)
  }
}
</script>

<style scoped lang="scss">
.card {
  background-color: white;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;

  &:hover:not(&--disabled) {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  }

  &--selected {
    border: 2px solid #ffcc00;
    background-color: #fff3cd;
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(255, 204, 0, 0.4);
  }

  &--disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  &__suit {
    font-size: 24px;
    margin-bottom: 5px;
  }

  &__rank {
    font-size: 16px;
    font-weight: bold;
  }
}
</style>
