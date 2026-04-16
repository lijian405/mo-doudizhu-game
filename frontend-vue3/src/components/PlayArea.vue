<template>
  <div class="play-area">
    <h4 class="play-area__title">出牌区</h4>
    <div class="play-area__cards">
      <template v-if="cards.length > 0">
        <div
          v-for="(card, index) in cards"
          :key="`${card.suit}-${card.rank}`"
          class="play-area__card-wrapper"
        >
          <CardComponent
            :card="card"
            size="small"
            disabled
          />
        </div>
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
  border-radius: 16px;
  padding: 20px;
  text-align: center;

  &__title {
    color: #ffcc00;
    font-size: 1.2rem;
    margin-bottom: 15px;
  }

  &__cards {
    display: flex;
    justify-content: center;
    min-height: 80px;
    align-items: center;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__card-wrapper {
    display: inline-flex;
    margin-right: -29px;
    transition: transform 0.2s ease;

    &:last-child {
      margin-right: 0;
    }
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
