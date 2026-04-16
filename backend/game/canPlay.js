/**
 * canPlay.js - 出牌合法性判断模块
 * 判断玩家选择的牌是否符合出牌规则
 */
const { countCardValues } = require('./cardCounts');
const { getCardType } = require('./cardType');
const { getCardsValue } = require('./cardsValue');

function canPlay(cards, lastCards) {
  if (!lastCards || lastCards.length === 0) return true;

  const currentType = getCardType(cards);
  const lastType = getCardType(lastCards);

  if (currentType === 'invalid') return false;

  if (currentType === 'bomb' && cards.length === 2 &&
      ((cards[0].rank === '大王' && cards[1].rank === '小王') || (cards[0].rank === '小王' && cards[1].rank === '大王'))) {
    return true;
  }

  if (currentType === 'bomb' && lastType !== 'bomb') {
    return true;
  }

  if (currentType === 'bomb' && lastType === 'bomb') {
    const cc = countCardValues(cards);
    const lc = countCardValues(lastCards);
    return getCardsValue(cards, currentType, cc) > getCardsValue(lastCards, lastType, lc);
  }

  if (currentType !== lastType) return false;

  if (cards.length !== lastCards.length) return false;

  const currentCounts = countCardValues(cards);
  const lastCounts = countCardValues(lastCards);
  return getCardsValue(cards, currentType, currentCounts) > getCardsValue(lastCards, lastType, lastCounts);
}

module.exports = { canPlay };
