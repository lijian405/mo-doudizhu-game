<template>
  <div class="landlord-cards">
    <h4 class="landlord-cards__title">地主牌</h4>
    <div class="landlord-cards__cards">
      <CardComponent
        v-for="card in cards"
        :key="`${card.suit}-${card.rank}`"
        :card="card"
        size="small"
        disabled
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Card } from '@/types'
import CardComponent from './Card.vue'

interface Props {
  cards: Card[]
}

defineProps<Props>()
</script>

<style scoped lang="scss">
.landlord-cards {
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
    justify-content: center;
    gap: 10px;
  }
}
</style>
