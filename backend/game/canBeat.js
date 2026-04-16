/**
 * canBeat.js - 牌的压制判断模块
 * 判断玩家手牌是否能压制上家出的牌
 */
const { STRAIGHT_VALUE_CAP } = require('./constants');
const { countCardValues, findConsecutiveRunStart } = require('./cardCounts');
const { getCardType } = require('./cardType');
const { getCardsValue } = require('./cardsValue');

function canPlayerBeatCards(playerCards, lastCards) {
  if (!lastCards || lastCards.length === 0) return true;

  const lastType = getCardType(lastCards);
  if (lastType === 'invalid') return true;

  const lastCounts = countCardValues(lastCards);
  const lastValue = getCardsValue(lastCards, lastType, lastCounts);
  const counts = countCardValues(playerCards);

  const hasRocket = playerCards.some(c => c.rank === '大王') &&
                    playerCards.some(c => c.rank === '小王');
  if (hasRocket) return true;

  if (lastType === 'bomb') {
    for (const [v, c] of Object.entries(counts)) {
      if (c >= 4 && Number(v) > lastValue) return true;
    }
  } else {
    for (const c of Object.values(counts)) {
      if (c >= 4) return true;
    }
  }

  switch (lastType) {
    case 'single': {
      for (const card of playerCards) {
        if (card.value > lastValue) return true;
      }
      break;
    }

    case 'pair': {
      for (const [v, c] of Object.entries(counts)) {
        if (c >= 2 && Number(v) > lastValue) return true;
      }
      break;
    }

    case 'triple': {
      for (const [v, c] of Object.entries(counts)) {
        if (c >= 3 && Number(v) > lastValue) return true;
      }
      break;
    }

    case 'triple_with_single': {
      for (const [v, c] of Object.entries(counts)) {
        if (c >= 3 && Number(v) > lastValue) {
          let others = 0;
          for (const [v2, c2] of Object.entries(counts)) {
            if (v2 !== v) others += c2;
          }
          if (others >= 1) return true;
        }
      }
      break;
    }

    case 'triple_with_pair': {
      for (const [v, c] of Object.entries(counts)) {
        if (c >= 3 && Number(v) > lastValue) {
          for (const [v2, c2] of Object.entries(counts)) {
            if (v2 !== v && c2 >= 2) return true;
          }
        }
      }
      break;
    }

    case 'four_with_two': {
      for (const [v, c] of Object.entries(counts)) {
        if (c >= 4 && Number(v) > lastValue) {
          let others = 0;
          for (const [v2, c2] of Object.entries(counts)) {
            if (v2 !== v) others += c2;
          }
          if (others >= 2) return true;
        }
      }
      break;
    }

    case 'straight': {
      const len = lastCards.length;
      const available = new Set(
        Object.keys(counts).map(Number).filter(v => v < STRAIGHT_VALUE_CAP)
      );
      if (findConsecutiveRunStart(available, len, lastValue - len + 2) >= 0) return true;
      break;
    }

    case 'double_straight': {
      const pairLen = lastCards.length / 2;
      const pairSet = new Set(
        Object.entries(counts)
          .filter(([v, c]) => c >= 2 && Number(v) < STRAIGHT_VALUE_CAP)
          .map(([v]) => Number(v))
      );
      if (findConsecutiveRunStart(pairSet, pairLen, lastValue - pairLen + 2) >= 0) return true;
      break;
    }

    case 'triple_straight': {
      const triLen = lastCards.length / 3;
      const triSet = new Set(
        Object.entries(counts)
          .filter(([v, c]) => c >= 3 && Number(v) < STRAIGHT_VALUE_CAP)
          .map(([v]) => Number(v))
      );
      if (findConsecutiveRunStart(triSet, triLen, lastValue - triLen + 2) >= 0) return true;
      break;
    }

    case 'plane_with_singles': {
      const planeN = lastCards.length / 4;
      const triSet = new Set(
        Object.entries(counts)
          .filter(([v, c]) => c >= 3 && Number(v) < STRAIGHT_VALUE_CAP)
          .map(([v]) => Number(v))
      );
      for (let s = lastValue + 1; s <= STRAIGHT_VALUE_CAP - planeN; s++) {
        let ok = true;
        for (let i = 0; i < planeN; i++) {
          if (!triSet.has(s + i)) { ok = false; break; }
        }
        if (ok) {
          let wings = 0;
          for (const [v, c] of Object.entries(counts)) {
            const nv = Number(v);
            wings += (nv >= s && nv < s + planeN) ? c - 3 : c;
          }
          if (wings >= planeN) return true;
        }
      }
      break;
    }

    case 'plane_with_pairs': {
      const planeN = lastCards.length / 5;
      const triSet = new Set(
        Object.entries(counts)
          .filter(([v, c]) => c >= 3 && Number(v) < STRAIGHT_VALUE_CAP)
          .map(([v]) => Number(v))
      );
      for (let s = lastValue + 1; s <= STRAIGHT_VALUE_CAP - planeN; s++) {
        let ok = true;
        for (let i = 0; i < planeN; i++) {
          if (!triSet.has(s + i)) { ok = false; break; }
        }
        if (ok) {
          let pairWings = 0;
          for (const [v, c] of Object.entries(counts)) {
            const nv = Number(v);
            const avail = (nv >= s && nv < s + planeN) ? c - 3 : c;
            pairWings += Math.floor(avail / 2);
          }
          if (pairWings >= planeN) return true;
        }
      }
      break;
    }
  }

  return false;
}

module.exports = { canPlayerBeatCards };
