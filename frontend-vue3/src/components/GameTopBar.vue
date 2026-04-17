<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '@/types'

const props = defineProps<{
  baseScore: number
  multiplier: number
  landlordCards: Card[]
  elapsedSeconds: number
}>()

const timeText = computed(() => {
  const s = Math.max(0, Math.floor(props.elapsedSeconds || 0))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
})

function cardLabel(c: Card): string {
  if (c.rank === '大王' || c.rank === '小王') return c.rank
  return `${c.suit}${c.rank}`
}
</script>

<template>
  <div class="game-top-bar">
    <div class="left">
      <div class="item">
        <span class="label">底分</span>
        <span class="value">{{ baseScore }}</span>
      </div>
      <div class="item">
        <span class="label">倍数</span>
        <span class="value">{{ multiplier }}</span>
      </div>
    </div>

    <div class="center">
      <span class="label">地主牌</span>
      <div class="cards">
        <span v-for="c in landlordCards" :key="`${c.suit}-${c.rank}`" class="card">
          {{ cardLabel(c) }}
        </span>
        <span v-if="landlordCards.length === 0" class="empty">—</span>
      </div>
    </div>

    <div class="right">
      <div class="item">
        <span class="label">用时</span>
        <span class="timer">{{ timeText }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.game-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  backdrop-filter: blur(6px);
}

.left,
.right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.center {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.item {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
  letter-spacing: 0.04em;
}

.value {
  font-size: 18px;
  font-weight: 800;
  color: #ffd700;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.25);
}

.cards {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.card {
  padding: 3px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  font-size: 13px;
  font-weight: 700;
}

.empty {
  color: rgba(255, 255, 255, 0.6);
}

.timer {
  font-size: 18px;
  font-weight: 900;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #7ee8ff;
  text-shadow: 0 0 12px rgba(126, 232, 255, 0.22);
}
</style>

