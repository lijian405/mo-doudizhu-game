/**
 * cardValue.js - 牌值转换模块
 * 将牌的点数转换为对应的数值，用于牌的大小比较
 */
function getCardValue(rank) {
  const values = {
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
  };
  return values[rank] || 0;
}

module.exports = { getCardValue };
