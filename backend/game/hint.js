/**
 * hint.js - 出牌提示模块
 * 根据玩家手牌和上家出的牌，计算最优出牌方案
 */
const { STRAIGHT_VALUE_CAP } = require('./constants');
const { countCardValues, findConsecutiveRunStart } = require('./cardCounts');
const { getCardType } = require('./cardType');
const { getCardsValue } = require('./cardsValue');
const { canPlay } = require('./canPlay');

function getHintCards(playerCards, lastCards, isFreeTurn) {
  const cards = Array.isArray(playerCards) ? playerCards : [];
  if (cards.length === 0) return [];

  const sortCardAsc = (a, b) => {
    if (a.value !== b.value) return a.value - b.value;
    const ar = String(a.rank);
    const br = String(b.rank);
    if (ar !== br) return ar.localeCompare(br);
    return String(a.suit).localeCompare(String(b.suit));
  };

  const byValue = new Map();
  for (const c of cards) {
    if (!byValue.has(c.value)) byValue.set(c.value, []);
    byValue.get(c.value).push(c);
  }
  for (const arr of byValue.values()) arr.sort(sortCardAsc);

  const pickNOfValue = (v, n) => {
    const arr = byValue.get(v) || [];
    if (arr.length < n) return null;
    return arr.slice(0, n);
  };

  const allSorted = [...cards].sort(sortCardAsc);

  if (isFreeTurn || !lastCards || lastCards.length === 0) {
    /** @type {any[][]} */
    const freeCandidates = [];
    if (allSorted.length) freeCandidates.push([allSorted[0]]);

    const valsAsc = [...byValue.keys()].sort((a, b) => a - b);
    for (const v of valsAsc) {
      const arr = byValue.get(v) || [];
      if (arr.length >= 2) { freeCandidates.push(arr.slice(0, 2)); break; }
    }
    for (const v of valsAsc) {
      const arr = byValue.get(v) || [];
      if (arr.length >= 3) { freeCandidates.push(arr.slice(0, 3)); break; }
    }
    for (const v of valsAsc) {
      const arr = byValue.get(v) || [];
      if (arr.length >= 4) { freeCandidates.push(arr.slice(0, 4)); break; }
    }

    const uniqueVals = valsAsc.filter(v => v < STRAIGHT_VALUE_CAP);
    const straightStart = findConsecutiveRunStart(new Set(uniqueVals), 5, 3);
    if (straightStart >= 0) {
      const res = [];
      for (let i = 0; i < 5; i++) res.push(pickNOfValue(straightStart + i, 1)[0]);
      freeCandidates.push(res);
    }

    const pairVals = valsAsc.filter(v => v < STRAIGHT_VALUE_CAP && (byValue.get(v)?.length ?? 0) >= 2);
    const pairSetForStraight = new Set(pairVals);
    const doubleStraightStart = findConsecutiveRunStart(pairSetForStraight, 3, 3);
    if (doubleStraightStart >= 0) {
      const res = [];
      for (let i = 0; i < 3; i++) res.push(...pickNOfValue(doubleStraightStart + i, 2));
      freeCandidates.push(res);
    }

    const triVals = valsAsc.filter(v => v < STRAIGHT_VALUE_CAP && (byValue.get(v)?.length ?? 0) >= 3);
    const triSetForStraight = new Set(triVals);
    const tripleStraightStart = findConsecutiveRunStart(triSetForStraight, 2, 3);
    if (tripleStraightStart >= 0) {
      const res = [];
      for (let i = 0; i < 2; i++) res.push(...pickNOfValue(tripleStraightStart + i, 3));
      freeCandidates.push(res);
    }

    const valid = freeCandidates
      .map(cs => [...cs].sort(sortCardAsc))
      .filter(cs => cs.length > 0 && getCardType(cs) !== 'invalid');
    if (!valid.length) return [];

    const validMeta = valid.map((cs) => {
      const t = getCardType(cs);
      const cnt = countCardValues(cs);
      return { cs, mainVal: getCardsValue(cs, t, cnt) };
    });
    validMeta.sort((a, b) => {
      if (a.mainVal !== b.mainVal) return a.mainVal - b.mainVal;
      if (a.cs.length !== b.cs.length) return b.cs.length - a.cs.length;
      for (let i = 0; i < Math.min(a.cs.length, b.cs.length); i++) {
        const ak = `${a.cs[i].value}|${a.cs[i].rank}|${a.cs[i].suit}`;
        const bk = `${b.cs[i].value}|${b.cs[i].rank}|${b.cs[i].suit}`;
        if (ak !== bk) return ak.localeCompare(bk);
      }
      return 0;
    });
    return validMeta[0].cs;
  }

  const lastType = getCardType(lastCards);
  if (lastType === 'invalid') {
    return allSorted.length ? [allSorted[0]] : [];
  }
  const lastCountsHint = countCardValues(lastCards);
  const lastValue = getCardsValue(lastCards, lastType, lastCountsHint);

  const hasRocket = cards.some(c => c.rank === '大王') && cards.some(c => c.rank === '小王');
  const rocketCards = () => {
    const small = cards.find(c => c.rank === '小王');
    const big = cards.find(c => c.rank === '大王');
    if (small && big) return [small, big].sort(sortCardAsc);
    return null;
  };

  const findMinBomb = (minValueExclusive) => {
    const vals = [...byValue.keys()].sort((a, b) => a - b);
    for (const v of vals) {
      if (v <= minValueExclusive) continue;
      const picked = pickNOfValue(v, 4);
      if (picked) return picked;
    }
    return null;
  };

  const pickSmallestOthers = (excludeValuesSet, needCount) => {
    const res = [];
    for (const c of allSorted) {
      if (excludeValuesSet.has(c.value)) continue;
      res.push(c);
      if (res.length >= needCount) return res;
    }
    return null;
  };

  const pickSmallestPairs = (excludeValuesSet, needPairs) => {
    const res = [];
    const vals = [...byValue.keys()].sort((a, b) => a - b);
    for (const v of vals) {
      if (excludeValuesSet.has(v)) continue;
      const arr = byValue.get(v) || [];
      if (arr.length >= 2) {
        res.push(arr[0], arr[1]);
        if (res.length >= needPairs * 2) return res;
      }
    }
    return null;
  };

  let candidate = null;

  if (lastType === 'single') {
    for (const c of allSorted) {
      const count = byValue.get(c.value)?.length ?? 0;
      if (count === 1 && c.value > lastValue) {
        candidate = [c];
        break;
      }
    }
  } else if (lastType === 'pair') {
    const vals = [...byValue.keys()].sort((a, b) => a - b);
    for (const v of vals) {
      if (v > lastValue) {
        const picked = pickNOfValue(v, 2);
        if (picked) { candidate = picked; break; }
      }
    }
  } else if (lastType === 'triple') {
    const vals = [...byValue.keys()].sort((a, b) => a - b);
    for (const v of vals) {
      if (v > lastValue) {
        const picked = pickNOfValue(v, 3);
        if (picked) { candidate = picked; break; }
      }
    }
  } else if (lastType === 'triple_with_single') {
    const vals = [...byValue.keys()].sort((a, b) => a - b);
    for (const v of vals) {
      if (v > lastValue) {
        const triple = pickNOfValue(v, 3);
        if (!triple) continue;
        const other = pickSmallestOthers(new Set([v]), 1);
        if (other) { candidate = [...triple, ...other]; break; }
      }
    }
  } else if (lastType === 'triple_with_pair') {
    const vals = [...byValue.keys()].sort((a, b) => a - b);
    for (const v of vals) {
      if (v > lastValue) {
        const triple = pickNOfValue(v, 3);
        if (!triple) continue;
        const pair = pickSmallestPairs(new Set([v]), 1);
        if (pair) { candidate = [...triple, ...pair]; break; }
      }
    }
  } else if (lastType === 'four_with_two') {
    const vals = [...byValue.keys()].sort((a, b) => a - b);
    for (const v of vals) {
      if (v > lastValue) {
        const four = pickNOfValue(v, 4);
        if (!four) continue;
        const other2 = pickSmallestOthers(new Set([v]), 2);
        if (other2) { candidate = [...four, ...other2]; break; }
      }
    }
  } else if (lastType === 'straight') {
    const len = lastCards.length;
    const uniqueVals = [...byValue.keys()].filter(v => v < STRAIGHT_VALUE_CAP).sort((a, b) => a - b);
    const start = findConsecutiveRunStart(new Set(uniqueVals), len, lastValue - len + 2);
    if (start >= 0) {
      const res = [];
      for (let i = 0; i < len; i++) res.push(pickNOfValue(start + i, 1)[0]);
      candidate = res;
    }
  } else if (lastType === 'double_straight') {
    const pairLen = lastCards.length / 2;
    const pairVals = [...byValue.entries()]
      .filter(([v, arr]) => v < STRAIGHT_VALUE_CAP && arr.length >= 2)
      .map(([v]) => v)
      .sort((a, b) => a - b);
    const start = findConsecutiveRunStart(new Set(pairVals), pairLen, lastValue - pairLen + 2);
    if (start >= 0) {
      const res = [];
      for (let i = 0; i < pairLen; i++) res.push(...pickNOfValue(start + i, 2));
      candidate = res;
    }
  } else if (lastType === 'triple_straight') {
    const triLen = lastCards.length / 3;
    const triVals = [...byValue.entries()]
      .filter(([v, arr]) => v < STRAIGHT_VALUE_CAP && arr.length >= 3)
      .map(([v]) => v)
      .sort((a, b) => a - b);
    const start = findConsecutiveRunStart(new Set(triVals), triLen, lastValue - triLen + 2);
    if (start >= 0) {
      const res = [];
      for (let i = 0; i < triLen; i++) res.push(...pickNOfValue(start + i, 3));
      candidate = res;
    }
  } else if (lastType === 'plane_with_singles') {
    const n = lastCards.length / 4;
    for (let s = lastValue + 1; s <= STRAIGHT_VALUE_CAP - n; s++) {
      let ok = true;
      for (let i = 0; i < n; i++) {
        if (!byValue.has(s + i) || byValue.get(s + i).length < 3) { ok = false; break; }
      }
      if (!ok) continue;
      const triples = [];
      for (let i = 0; i < n; i++) triples.push(...pickNOfValue(s + i, 3));
      const exclude = new Set(Array.from({ length: n }, (_, i) => s + i));
      const wings = pickSmallestOthers(exclude, n);
      if (wings) { candidate = [...triples, ...wings]; break; }
    }
  } else if (lastType === 'plane_with_pairs') {
    const n = lastCards.length / 5;
    for (let s = lastValue + 1; s <= STRAIGHT_VALUE_CAP - n; s++) {
      let ok = true;
      for (let i = 0; i < n; i++) {
        if (!byValue.has(s + i) || byValue.get(s + i).length < 3) { ok = false; break; }
      }
      if (!ok) continue;
      const triples = [];
      for (let i = 0; i < n; i++) triples.push(...pickNOfValue(s + i, 3));
      const exclude = new Set(Array.from({ length: n }, (_, i) => s + i));
      const wingsPairs = pickSmallestPairs(exclude, n);
      if (wingsPairs) { candidate = [...triples, ...wingsPairs]; break; }
    }
  } else if (lastType === 'bomb') {
    candidate = findMinBomb(lastValue);
  }

  if (candidate && candidate.length && canPlay(candidate, lastCards)) {
    return [...candidate].sort(sortCardAsc);
  }

  if (lastType !== 'bomb') {
    const bomb = findMinBomb(0);
    if (bomb && canPlay(bomb, lastCards)) return [...bomb].sort(sortCardAsc);
  }

  if (hasRocket) {
    const r = rocketCards();
    if (r && canPlay(r, lastCards)) return r;
  }

  return [];
}

module.exports = { getHintCards };
