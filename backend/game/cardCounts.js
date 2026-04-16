/**
 * cardCounts.js - 牌值计数模块
 * 统计手牌中各牌值的数量，提供连牌判断等辅助功能
 */
const { STRAIGHT_VALUE_CAP } = require('./constants');

function countCardValues(cards) {
  const counts = {};
  for (const card of cards) {
    counts[card.value] = (counts[card.value] || 0) + 1;
  }
  return counts;
}

/**
 * 在点数集合中是否存在从某起点开始、连续 runLen 个整数（每个都须在 valueSet 内）
 * @param {Set<number>} valueSet
 * @returns {number} 起点 s，找不到返回 -1
 */
function findConsecutiveRunStart(valueSet, runLen, minStart) {
  const upper = STRAIGHT_VALUE_CAP - runLen;
  for (let s = minStart; s <= upper; s++) {
    let ok = true;
    for (let i = 0; i < runLen; i++) {
      if (!valueSet.has(s + i)) {
        ok = false;
        break;
      }
    }
    if (ok) return s;
  }
  return -1;
}

module.exports = { countCardValues, findConsecutiveRunStart };
