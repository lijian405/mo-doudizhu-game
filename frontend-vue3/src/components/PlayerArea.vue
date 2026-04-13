<template>
  <div class="player-area" :class="`player-area--${position}`">
    <!-- 轮到标识 -->
    <div
      v-if="isCurrentTurn"
      class="player-area__turn-indicator"
    ></div>

    <!-- 倒计时 -->
    <Countdown
      v-if="isCurrentTurn && countdown > 0"
      :countdown="countdown"
      class="player-area__countdown"
    />

    <!-- 地主标识 -->
    <div
      v-if="isLandlord"
      class="player-area__landlord-badge"
    >
      地主
    </div>

    <!-- 玩家信息 -->
    <div class="player-area__info">
      <div class="player-area__name">{{ playerName }}</div>
      <div class="player-area__score">分值: {{ score }}</div>
    </div>

    <!-- 卡牌区域 -->
    <div class="player-area__cards">
      <!-- 自己的牌 -->
      <template v-if="isSelf">
        <CardComponent
          v-for="card in cards"
          :key="`${card.suit}-${card.rank}`"
          :card="card"
          :is-selected="isCardSelected(card)"
          @click="handleCardClick(card)"
        />
      </template>

      <!-- 其他玩家的牌（背面） -->
      <template v-else>
        <CardBack
          v-for="i in cardCount"
          :key="i"
          size="small"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Card, PlayerPosition } from '@/types'
import CardComponent from './Card.vue'
import CardBack from './CardBack.vue'
import Countdown from './Countdown.vue'

interface Props {
  position: PlayerPosition
  playerName: string
  score: number
  cardCount: number
  cards?: Card[]
  isSelf?: boolean
  isCurrentTurn?: boolean
  isLandlord?: boolean
  countdown?: number
  selectedCards?: Card[]
}

const props = withDefaults(defineProps<Props>(), {
  cards: () => [],
  isSelf: false,
  isCurrentTurn: false,
  isLandlord: false,
  countdown: 0,
  selectedCards: () => []
})

const emit = defineEmits<{
  'card-click': [card: Card]
}>()

const isCardSelected = (card: Card): boolean => {
  return props.selectedCards.some(
    c => c.suit === card.suit && c.rank === card.rank
  )
}

const handleCardClick = (card: Card) => {
  if (props.isSelf) {
    emit('card-click', card)
  }
}
</script>

<style scoped lang="scss">
.player-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;

  &--top {
    grid-area: top;
  }

  &--left {
    grid-area: left;
  }

  &--bottom {
    grid-area: bottom;
  }

  &__turn-indicator {
    width: 20px;
    height: 20px;
    background-color: #4CAF50;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.4);
    animation: pulse 1.5s infinite;
  }

  &__countdown {
    margin-bottom: 5px;
  }

  &__landlord-badge {
    display: inline-block;
    padding: 4px 12px;
    background-color: #ff6b6b;
    color: white;
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
    box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
  }

  &__info {
    text-align: center;
    color: white;
  }

  &__name {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  &__score {
    font-size: 14px;
    color: #ffcc00;
    font-weight: bold;
  }

  &__cards {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 5px;
    max-width: 100%;
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(0.8);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
}
</style>
