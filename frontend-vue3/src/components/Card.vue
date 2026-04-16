<template>
  <div
    class="card"
    :class="[
      `card--${size}`,
      {
        'card--selected': isSelected,
        'card--disabled': disabled
      }
    ]"
    :style="cardStyle"
    @click="handleClick"
  >
    <div class="card__corner">
      <div class="card__rank">{{ card.rank }}</div>
      <div class="card__suit-small">{{ card.suit }}</div>
    </div>
    <div class="card__suit-large">{{ card.suit }}</div>
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
  width: props.size === 'small' ? '60px' : props.size === 'large' ? '70px' : '60px',
  height: props.size === 'small' ? '90px' : props.size === 'large' ? '105px' : '100px'
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
  justify-content: center;
  align-items: center;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
  position: relative;

  /* 仅在支持 hover 的设备启用，避免移动端触摸残留 hover 导致卡牌“卡住上浮” */
  @media (hover: hover) and (pointer: fine) {
    &:hover:not(&--disabled):not(&--selected) {
      transform: translateY(-5px);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    }
  }

  &:active:not(&--disabled) {
    transform: translateY(-2px);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
  }

  &--selected {
    border: 2px solid #ffcc00;
    background-color: #fff3cd;
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(255, 204, 0, 0.4);

    &:active:not(&--disabled) {
      transform: translateY(-3px);
    }
  }

  &--disabled {
    cursor: not-allowed;
  }

  &__corner {
    position: absolute;
    top: 6px;
    left: 6px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }

  &__rank {
    font-size: 16px;
    font-weight: bold;
    line-height: 1;
  }

  &__suit-small {
    font-size: 12px;
    line-height: 1;
    margin-top: 2px;
  }

  &__suit-large {
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  &--small &__rank {
    font-size: 13px;
  }

  &--small &__suit-small {
    font-size: 10px;
    margin-top: 1px;
  }

  &--small &__suit-large {
    font-size: 22px;
  }

  &--medium &__suit-large {
    font-size: 26px;
  }

  &--large &__rank {
    font-size: 18px;
  }

  &--large &__suit-small {
    font-size: 13px;
  }

  &--large &__suit-large {
    font-size: 30px;
  }
}
</style>
