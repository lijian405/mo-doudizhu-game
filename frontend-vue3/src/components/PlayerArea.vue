<template>
  <div class="player-area" :class="`player-area--${position}`">
    <!-- 倒计时 -->
    <Countdown
      v-if="isCurrentTurn && countdown > 0"
      :countdown="countdown"
      class="player-area__countdown"
    />

    <!-- 玩家信息 -->
    <div class="player-area__info">
      <div class="player-area__name">
        <!-- 地主标识 -->
        <div
          v-if="isLandlord"
          class="player-area__landlord-badge"
        >
          地主
        </div>
        {{ playerName }}
      </div>
      <div class="player-area__score">分值: {{ score }}</div>
    </div>

    <!-- 卡牌区域 -->
    <div class="player-area__cards">
      <Transition name="turn-hint">
        <div
          v-if="showTurnHint && isSelf && isCurrentTurn"
          class="player-area__turn-hint"
        >
          轮到你出牌了
        </div>
      </Transition>
      <!-- 自己的牌（支持鼠标拖动多选） -->
      <template v-if="isSelf">
        <div
          v-for="card in cards"
          :key="`${card.suit}-${card.rank}`"
          class="card-drag-wrapper"
          @mousedown.prevent="onCardMouseDown(card)"
          @mouseenter="onCardMouseEnter(card)"
        >
          <CardComponent
            :card="card"
            :is-selected="isCardSelected(card)"
          />
        </div>
      </template>

      <!-- 其他玩家的牌（背面） -->
      <template v-else>
        <CardBack size="large" :count="cardCount" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
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
  showTurnHint?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  cards: () => [],
  isSelf: false,
  isCurrentTurn: false,
  isLandlord: false,
  countdown: 0,
  selectedCards: () => [],
  showTurnHint: false
})

const emit = defineEmits<{
  'card-click': [card: Card]
}>()

const isCardSelected = (card: Card): boolean => {
  return props.selectedCards.some(
    c => c.suit === card.suit && c.rank === card.rank
  )
}

// --- Drag multi-select ---
let isMouseDown = false
let isDragging = false
let dragMode: 'select' | 'deselect' = 'select'
const processedCards = new Set<string>()
let startCard: Card | null = null

function cardKey(card: Card): string {
  return `${card.suit}-${card.rank}`
}

function processCard(card: Card) {
  const key = cardKey(card)
  if (processedCards.has(key)) return
  processedCards.add(key)

  const selected = isCardSelected(card)
  if (dragMode === 'select' && !selected) {
    emit('card-click', card)
  } else if (dragMode === 'deselect' && selected) {
    emit('card-click', card)
  }
}

const onCardMouseDown = (card: Card) => {
  if (!props.isSelf) return
  isMouseDown = true
  isDragging = false
  dragMode = isCardSelected(card) ? 'deselect' : 'select'
  processedCards.clear()
  startCard = card
}

const onCardMouseEnter = (card: Card) => {
  if (!isMouseDown || !props.isSelf) return
  if (!isDragging) {
    isDragging = true
    if (startCard) processCard(startCard)
  }
  processCard(card)
}

const onMouseUp = () => {
  if (!isMouseDown) return
  if (!isDragging && startCard) {
    emit('card-click', startCard)
  }
  isMouseDown = false
  isDragging = false
  processedCards.clear()
  startCard = null
}

onMounted(() => {
  document.addEventListener('mouseup', onMouseUp)
})
onUnmounted(() => {
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<style scoped lang="scss">
.player-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;

  &--left {
    grid-area: left;
  }

  &--right {
    grid-area: right;
  }

  &--bottom {
    grid-area: bottom;
  }

  &__countdown {
    font-size: 24px;
    font-weight: bold;
    color: #ff6b6b;
    background-color: rgba(255, 107, 107, 0.1);
    padding: 8px 16px;
    border-radius: 20px;
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
    animation: pulse 1s infinite;
  }

  &__info {
    text-align: center;
    color: white;
  }

  &__name {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
  }

  &__landlord-badge {
    display: inline-block;
    padding: 2px 8px;
    background-color: #ff6b6b;
    color: white;
    border-radius: 10px;
    font-size: 10px;
    font-weight: bold;
    box-shadow: 0 2px 6px rgba(255, 107, 107, 0.3);
  }

  &__score {
    font-size: 14px;
    color: #ffcc00;
    font-weight: bold;
  }

  &__cards {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 5px;
    max-width: 100%;
    user-select: none;
  }

  &__turn-hint {
    position: absolute;
    top: -34px;
    right: 0;
    padding: 6px 10px;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 215, 0, 0.55);
    color: #ffd700;
    font-size: 16px;
    font-weight: 800;
    white-space: nowrap;
    user-select: none;
    pointer-events: none;
    text-shadow:
      0 2px 0 rgba(120, 75, 0, 0.35),
      0 0 10px rgba(255, 215, 0, 0.35);
    box-shadow:
      0 10px 22px rgba(0, 0, 0, 0.25),
      0 0 0 3px rgba(255, 215, 0, 0.08);
  }
}

.card-drag-wrapper {
  display: inline-flex;
}

/* 显示/隐藏动画 */
.turn-hint-enter-active,
.turn-hint-leave-active {
  transition:
    opacity 200ms ease,
    transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
    filter 200ms ease;
}

.turn-hint-enter-from,
.turn-hint-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
  filter: blur(1px);
}

.turn-hint-enter-to,
.turn-hint-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
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
