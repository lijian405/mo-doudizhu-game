/**
 * 卡牌辅助函数
 */

import type { Card, CardSuit, CardRank, CardCombination, CardCombinationType } from '@/types'

// 卡牌点数对应的数值
const RANK_VALUES: Record<CardRank, number> = {
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
  '2': 15,
  '小王': 16,
  '大王': 17
}

// 创建卡牌
export function createCard(suit: CardSuit, rank: CardRank): Card {
  return {
    suit,
    rank,
    value: RANK_VALUES[rank]
  }
}

// 获取卡牌显示文本
export function getCardDisplay(card: Card): string {
  if (card.suit === 'joker') {
    return card.rank
  }
  return `${card.suit}${card.rank}`
}

// 获取卡牌颜色
export function getCardColor(suit: CardSuit): string {
  if (suit === 'joker') return 'red'
  return suit === '♥' || suit === '♦' ? 'red' : 'black'
}

// 排序卡牌
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => a.value - b.value)
}

// 判断是否是王炸
export function isRocket(cards: Card[]): boolean {
  return cards.length === 2 &&
    cards.some(c => c.rank === '小王') &&
    cards.some(c => c.rank === '大王')
}

// 判断是否是炸弹
export function isBomb(cards: Card[]): boolean {
  if (cards.length !== 4) return false
  const firstValue = cards[0]?.value
  if (firstValue === undefined) return false
  return cards.every(c => c.value === firstValue)
}

// 获取卡牌组合类型
export function getCardCombinationType(cards: Card[]): CardCombinationType | null {
  if (cards.length === 0) return null

  // 王炸
  if (isRocket(cards)) return 'rocket'

  // 炸弹
  if (isBomb(cards)) return 'bomb'

  // 单牌
  if (cards.length === 1) return 'single'

  // 对子
  if (cards.length === 2 && cards[0]?.value === cards[1]?.value) return 'pair'

  // 三张
  const firstCardValue = cards[0]?.value
  if (firstCardValue !== undefined && cards.length === 3 && cards.every(c => c.value === firstCardValue)) return 'triple'

  // 三带一
  if (cards.length === 4) {
    const valueCounts = getValueCounts(cards)
    const values = Object.values(valueCounts)
    if (values.includes(3) && values.includes(1)) return 'tripleWithSingle'
  }

  // 三带二
  if (cards.length === 5) {
    const valueCounts = getValueCounts(cards)
    const values = Object.values(valueCounts)
    if (values.includes(3) && values.includes(2)) return 'tripleWithPair'
  }

  // 顺子
  if (cards.length >= 5 && isStraight(cards)) return 'straight'

  // 双顺
  if (cards.length >= 6 && isDoubleStraight(cards)) return 'doubleStraight'

  // 三顺
  if (cards.length >= 6 && isTripleStraight(cards)) return 'tripleStraight'

  return null
}

// 获取卡牌数值计数
function getValueCounts(cards: Card[]): Record<number, number> {
  const counts: Record<number, number> = {}
  cards.forEach(card => {
    counts[card.value] = (counts[card.value] || 0) + 1
  })
  return counts
}

// 判断是否是顺子
function isStraight(cards: Card[]): boolean {
  if (cards.length < 5) return false

  const sorted = sortCards(cards)
  // 顺子不能包含2和王
  if (sorted.some(c => c.value >= 15)) return false

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]?.value
    const prev = sorted[i - 1]?.value
    if (current === undefined || prev === undefined || current - prev !== 1) return false
  }
  return true
}

// 判断是否是双顺
function isDoubleStraight(cards: Card[]): boolean {
  if (cards.length < 6 || cards.length % 2 !== 0) return false

  const sorted = sortCards(cards)
  // 双顺不能包含2和王
  if (sorted.some(c => c.value >= 15)) return false

  const valueCounts = getValueCounts(cards)
  const values = Object.keys(valueCounts).map(Number).sort((a, b) => a - b)

  // 每个值必须有2张
  if (!Object.values(valueCounts).every(count => count === 2)) return false

  // 必须是连续的
  for (let i = 1; i < values.length; i++) {
    const current = values[i]
    const prev = values[i - 1]
    if (current === undefined || prev === undefined || current - prev !== 1) return false
  }

  return true
}

// 判断是否是三顺
function isTripleStraight(cards: Card[]): boolean {
  if (cards.length < 6 || cards.length % 3 !== 0) return false

  const sorted = sortCards(cards)
  // 三顺不能包含2和王
  if (sorted.some(c => c.value >= 15)) return false

  const valueCounts = getValueCounts(cards)
  const values = Object.keys(valueCounts).map(Number).sort((a, b) => a - b)

  // 每个值必须有3张
  if (!Object.values(valueCounts).every(count => count === 3)) return false

  // 必须是连续的
  for (let i = 1; i < values.length; i++) {
    const current = values[i]
    const prev = values[i - 1]
    if (current === undefined || prev === undefined || current - prev !== 1) return false
  }

  return true
}

// 比较两个卡牌组合的大小
export function compareCardCombinations(
  prev: CardCombination,
  current: CardCombination
): boolean {
  // 王炸最大
  if (current.type === 'rocket') return true
  if (prev.type === 'rocket') return false

  // 炸弹比其他牌大
  if (current.type === 'bomb' && prev.type !== 'bomb') return true
  if (prev.type === 'bomb' && current.type !== 'bomb') return false

  // 类型必须相同
  if (prev.type !== current.type) return false

  // 张数必须相同
  if (prev.cards.length !== current.cards.length) return false

  // 比较大小
  return current.value > prev.value
}

// 获取卡牌组合的值
export function getCardCombinationValue(cards: Card[]): number {
  const sorted = sortCards(cards)

  // 对于顺子、双顺、三顺，取最大牌的值
  const type = getCardCombinationType(cards)
  if (type === 'straight' || type === 'doubleStraight' || type === 'tripleStraight') {
    const lastCard = sorted[sorted.length - 1]
    return lastCard?.value ?? 0
  }

  // 对于三带一、三带二、飞机，取三张牌的值
  if (type === 'tripleWithSingle' || type === 'tripleWithPair') {
    const valueCounts = getValueCounts(cards)
    const tripleValue = Object.entries(valueCounts).find(([_, count]) => count === 3)?.[0]
    return Number(tripleValue) || 0
  }

  // 其他情况取第一张牌的值
  return sorted[0]?.value ?? 0
}
