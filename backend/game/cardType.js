/**
 * cardType.js - 牌型判断模块
 * 判断给定手牌属于哪种牌型（单牌、对子、顺子、炸弹等）
 */
const { STRAIGHT_VALUE_CAP } = require('./constants');
const { countCardValues } = require('./cardCounts');

function getCardType(cards) {
  if (cards.length === 0) return 'invalid';
  if (cards.length === 1) return 'single';

  if (cards.length === 2) {
    if (cards[0].value === cards[1].value) return 'pair';
    if ((cards[0].rank === '大王' && cards[1].rank === '小王') || (cards[0].rank === '小王' && cards[1].rank === '大王')) {
      return 'bomb';
    }
    return 'invalid';
  }

  if (cards.length === 3) {
    if (cards[0].value === cards[1].value && cards[1].value === cards[2].value) {
      return 'triple';
    }
    return 'invalid';
  }

  const counts = countCardValues(cards);
  const countVals = Object.values(counts);

  if (cards.length === 4 && countVals.length === 1) return 'bomb';

  if (cards.length === 4 && countVals.includes(3) && countVals.includes(1)) {
    return 'triple_with_single';
  }

  if (cards.length === 4) return 'invalid';

  if (cards.length === 5 && countVals.includes(3) && countVals.includes(2)) {
    return 'triple_with_pair';
  }

  if (cards.length === 6 && countVals.includes(4)) {
    return 'four_with_two';
  }

  const sorted = [...cards].sort((a, b) => a.value - b.value);
  const noHighCards = sorted.every(c => c.value < STRAIGHT_VALUE_CAP);

  if (cards.length >= 5 && noHighCards && countVals.every(c => c === 1)) {
    let ok = true;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].value !== sorted[i - 1].value + 1) { ok = false; break; }
    }
    if (ok) return 'straight';
  }

  if (cards.length >= 6 && cards.length % 2 === 0 && noHighCards && countVals.every(c => c === 2)) {
    const pairVals = Object.keys(counts).map(Number).sort((a, b) => a - b);
    let ok = true;
    for (let i = 1; i < pairVals.length; i++) {
      if (pairVals[i] !== pairVals[i - 1] + 1) { ok = false; break; }
    }
    if (ok) return 'double_straight';
  }

  if (cards.length >= 6 && cards.length % 3 === 0 && noHighCards && countVals.every(c => c === 3)) {
    const triVals = Object.keys(counts).map(Number).sort((a, b) => a - b);
    let ok = true;
    for (let i = 1; i < triVals.length; i++) {
      if (triVals[i] !== triVals[i - 1] + 1) { ok = false; break; }
    }
    if (ok) return 'triple_straight';
  }

  {
    const entries = Object.entries(counts).map(([v, c]) => [Number(v), c]);
    const tripleVals = entries.filter(([, c]) => c >= 3).map(([v]) => v).sort((a, b) => a - b);

    if (tripleVals.length >= 2) {
      const validTriples = tripleVals.filter(v => v < STRAIGHT_VALUE_CAP);
      const seqs = [];
      for (let i = 0; i < validTriples.length; i++) {
        const seq = [validTriples[i]];
        while (i + 1 < validTriples.length && validTriples[i + 1] === validTriples[i] + 1) {
          i++;
          seq.push(validTriples[i]);
        }
        if (seq.length >= 2) seqs.push(seq);
      }

      for (const seq of seqs) {
        const planeCount = seq.length;
        const tripleTotal = planeCount * 3;
        const wingTotal = cards.length - tripleTotal;

        if (wingTotal === planeCount) {
          return 'plane_with_singles';
        }
        if (wingTotal === planeCount * 2) {
          const remaining = { ...counts };
          for (const v of seq) {
            remaining[v] = (remaining[v] || 0) - 3;
            if (remaining[v] === 0) delete remaining[v];
          }
          if (Object.values(remaining).every(c => c === 2)) return 'plane_with_pairs';
        }
      }
    }
  }

  return 'invalid';
}

module.exports = { getCardType };
