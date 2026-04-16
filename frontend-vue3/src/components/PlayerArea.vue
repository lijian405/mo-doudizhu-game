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
              @touchstart.prevent="onCardTouchStart(card, $event)"
              @touchmove.prevent="onCardTouchMove"
              @touchend="onTouchEnd"
              @touchcancel="onTouchEnd"
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
        <CardBack size="small" :count="cardCount" />
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
let lastTouchKey: string | null = null
let touchStartX = 0
let touchStartY = 0
const TOUCH_DRAG_THRESHOLD_PX = 6

function cardKey(card: Card): string {
  return `${card.suit}-${card.rank}`
}

function processCard(card: Card, forceMode?: 'select' | 'deselect') {
  const key = cardKey(card)
  const currentSelected = isCardSelected(card)
  const mode = forceMode ?? (currentSelected ? 'deselect' : 'select')

  if (processedCards.has(key + mode)) return
  processedCards.add(key + mode)

  if (mode === 'select' && !currentSelected) {
    emit('card-click', card)
  } else if (mode === 'deselect' && currentSelected) {
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
    processCard(startCard)
  }
  isMouseDown = false
  isDragging = false
  processedCards.clear()
  startCard = null
}

// 触摸事件处理
const onCardTouchStart = (card: Card, event: TouchEvent) => {
  if (!props.isSelf) return
  isTouching = true
  isDragging = false
  dragMode = isCardSelected(card) ? 'deselect' : 'select'
  processedCards.clear()
  startCard = card
  lastTouchKey = cardKey(card)

  const touch = event.touches[0]
  if (touch) {
    touchStartX = touch.clientX
    touchStartY = touch.clientY
  }
}

const onCardTouchMove = (event: TouchEvent) => {
  if (!isTouching || !props.isSelf) return
  event.preventDefault()

  const touch = event.touches[0]
  if (!touch) return

  // 轻微抖动视为点击，不进入滑动多选逻辑（否则可能造成“点一下触发两次切换”）
  if (!isDragging) {
    const dx = touch.clientX - touchStartX
    const dy = touch.clientY - touchStartY
    if (Math.hypot(dx, dy) < TOUCH_DRAG_THRESHOLD_PX) return
  }

  const target = document.elementFromPoint(touch.clientX, touch.clientY)
  if (!target) return

  const cardWrapper = target.closest('.card-drag-wrapper')
  if (!cardWrapper) return

  const cardIndex = parseInt(cardWrapper.getAttribute('data-card-index') || '-1', 10)
  if (cardIndex < 0 || cardIndex >= props.cards.length) return

  const card = props.cards[cardIndex]
  if (!card) return
  const key = cardKey(card)
  if (key === lastTouchKey) return

  if (!isDragging) {
    isDragging = true
    // 滑动多选：保持模式一致（选中/取消选中），避免每次根据当前状态“来回翻转”
    if (startCard) processCard(startCard, dragMode)
  }

  lastTouchKey = key
  processCard(card, dragMode)
}

const onTouchEnd = () => {
  if (!isTouching) return
  if (!isDragging && startCard) {
    // 点击：切换选中状态
    processCard(startCard)
  }
  isTouching = false
  isDragging = false
  processedCards.clear()
  startCard = null
  lastTouchKey = null
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
    flex-wrap: nowrap;
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
    flex-shrink: 0;

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
    touch-action: none;
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
    flex-shrink: 0;
  }

  &__info {
    display: flex;
    align-items: center;
    gap: 12px;
    color: white;
    flex-shrink: 0;
    flex-wrap: nowrap;
  }

  &__avatar-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
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
    flex-shrink: 0;
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

}

/* 仅在真正支持 hover 的设备（鼠标）上启用悬浮上移，避免移动端触摸残留 hover 导致最后一张牌“更高” */
@media (hover: hover) and (pointer: fine) {
  .card-drag-wrapper:hover {
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

@media (max-width: 480px) {
  .player-area {
    &__countdown {
      font-size: 18px;
      padding: 6px 10px;
    }

    &__avatar {
      width: 40px;
      height: 40px;
    }

    &__landlord-hat {
      width: 36px;
      height: 36px;
      top: -24px;
    }

    &__name {
      font-size: 13px;
    }

    &__score {
      font-size: 11px;
    }

    &__details {
      gap: 2px;
    }
  }

  .card-drag-wrapper {
    margin-right: -26px;
  }
}
</style>
