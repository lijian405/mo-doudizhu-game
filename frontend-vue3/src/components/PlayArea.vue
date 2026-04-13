<template>
  <div class="play-area">
    <h4 class="play-area__title">出牌区</h4>
    <div class="play-area__cards">
      <template v-if="cards.length > 0">
        <CardComponent
          v-for="card in cards"
          :key="`${card.suit}-${card.rank}`"
          :card="card"
          size="small"
          disabled
        />
      </template>
      <div v-else class="play-area__empty">
        等待出牌...
      </div>
    </div>
    <div v-if="lastPlayerName" class="play-area__info">
      最后出牌: {{ lastPlayerName }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Card } from '@/types'
import CardComponent from './Card.vue'

interface Props {
  cards: Card[]
  lastPlayerName?: string
}

withDefaults(defineProps<Props>(), {
  lastPlayerName: ''
})
</script>

<style scoped lang="scss">
.play-area {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
  backdrop-filter: blur(10px);
  text-align: center;

  &__title {
    color: #ffcc00;
    font-size: 1.2rem;
    margin-bottom: 15px;
  }

  &__cards {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    min-height: 80px;
    align-items: center;
  }

  &__empty {
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
  }

  &__info {
    margin-top: 10px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
  }
}
</style>
