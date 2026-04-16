/**
 * cardsValue.js - 牌组价值计算模块
 * 计算牌组的价值分，用于比较牌组大小和提示功能
 */
const { STRAIGHT_VALUE_CAP } = require('./constants');
const { countCardValues } = require('./cardCounts');
const { getCardType } = require('./cardType');

function getCardsValue(cards, knownType, knownCounts) {
  if (cards.length === 0) return 0;
  const type = knownType !== undefined ? knownType : getCardType(cards);
  const counts = knownCounts !== undefined ? knownCounts : countCardValues(cards);

  if (type === 'triple_with_single' || type === 'triple_with_pair') {
    for (const [v, c] of Object.entries(counts)) {
      if (c === 3) return Number(v);
    }
  }

  if (type === 'four_with_two') {
    for (const [v, c] of Object.entries(counts)) {
      if (c === 4) return Number(v);
    }
  }

  if (type === 'plane_with_singles' || type === 'plane_with_pairs') {
    const tripleVals = Object.entries(counts)
      .filter(([, c]) => c >= 3)
      .map(([v]) => Number(v))
      .filter((v) => v < STRAIGHT_VALUE_CAP)
      .sort((a, b) => a - b);
    if (tripleVals.length >= 2) return tripleVals[0];
  }

  const sorted = [...cards].sort((a, b) => b.value - a.value);
  return sorted[0].value;
}

module.exports = { getCardsValue };
