<template>
  <div class="player-area" :class="`player-area--${position}`">
    <!-- 底部玩家特殊布局 -->
    <template v-if="position === 'bottom' && isSelf">
      <div class="player-area__bottom-layout">
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
          <div class="player-area__cards-container">
            <div
              v-for="(card, index) in cards"
              :key="`${card.suit}-${card.rank}`"
              class="card-drag-wrapper"
              :data-card-index="index"
              @mousedown.prevent="onCardMouseDown(card)"
              @mouseenter="onCardMouseEnter(card)"
              @touchstart.prevent="onCardTouchStart(card)"
              @touchmove.prevent="onCardTouchMove(card)"
              @touchend="onTouchEnd"
            >
              <CardComponent
                :card="card"
                :is-selected="isCardSelected(card)"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 其他玩家布局 -->
    <template v-else>
      <div class="player-area__content">
        <!-- 倒计时 -->
        <Countdown
          v-if="isCurrentTurn && countdown > 0"
          :countdown="countdown"
          class="player-area__countdown"
        />

        <!-- 玩家信息 -->
        <div class="player-area__info">
          <!-- 头像区域（包含地主帽子） -->
          <div class="player-area__avatar-container">
            <!-- 地主帽子 -->
            <div v-if="isLandlord" class="player-area__landlord-hat">
              <img :src="landlordHat" alt="地主" />
            </div>
            <!-- 头像 -->
            <div class="player-area__avatar">
              <img
                :src="avatarUrl || defaultAvatar"
                :alt="playerName"
              />
            </div>
          </div>

          <!-- 玩家名称和分值 -->
          <div class="player-area__details">
            <div class="player-area__name">
              {{ playerName }}
            </div>
            <div class="player-area__score">分值: {{ score }}</div>
          </div>
        </div>
      </div>

      <!-- 卡牌区域 -->
      <div class="player-area__cards">
        <!-- 其他玩家的牌（背面） -->
        <CardBack size="large" :count="cardCount" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import type { Card, PlayerPosition } from '@/types'
import CardComponent from './Card.vue'
import CardBack from './CardBack.vue'
import Countdown from './Countdown.vue'
import defaultAvatar from '@/assets/images/default_avatar.jpg'
import landlordHat from '@/assets/images/dz_hat.png'

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
  avatarUrl?: string
  isAnimating?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  cards: () => [],
  isSelf: false,
  isCurrentTurn: false,
  isLandlord: false,
  countdown: 0,
  selectedCards: () => [],
  showTurnHint: false,
  avatarUrl: '',
  isAnimating: false
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

// 触摸事件相关
let isTouching = false
let touchStartY = 0

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

// 触摸事件处理
const onCardTouchStart = (card: Card) => {
  if (!props.isSelf) return
  isTouching = true
  isDragging = false
  dragMode = isCardSelected(card) ? 'deselect' : 'select'
  processedCards.clear()
  startCard = card
}

const onCardTouchMove = (card: Card) => {
  if (!isTouching || !props.isSelf) return
  if (!isDragging) {
    isDragging = true
    if (startCard) processCard(startCard)
  }
  processCard(card)
}

const onTouchEnd = () => {
  if (!isTouching) return
  if (!isDragging && startCard) {
    emit('card-click', startCard)
  }
  isTouching = false
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
    width: 100%;
  }

  &__content {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__bottom-layout {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  &__cards {
    position: relative;
    width: 100%;
    max-width: 100%;
    user-select: none;
    display: flex;
    justify-content: center;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__cards-container {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: center;
    padding: 10px 0;
    flex: 0 0 auto;
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
    display: flex;
    align-items: center;
    gap: 12px;
    color: white;
  }

  &__avatar-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__landlord-hat {
    position: absolute;
    top: -30px;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  &__avatar {
    width: 50px;
    height: 50px;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid #ffcc00;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__details {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__name {
    font-size: 16px;
    font-weight: 600;
  }

  &__score {
    font-size: 14px;
    color: #ffcc00;
    font-weight: bold;
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
  margin-right: -29px;
  transition: transform 0.2s ease;

  &:last-child {
    margin-right: 0;
  }

  &:hover {
    transform: translateY(-5px);
  }
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
