/**
 * 游戏核心逻辑聚合导出（保持 require('../game/gameLogic') 路径不变）
 * 实现已拆至同目录下各模块。
 */
const { generateDeck, shuffleDeck, dealCards } = require('./deck');
const { getCardType } = require('./cardType');
const { getCardsValue } = require('./cardsValue');
const { canPlay } = require('./canPlay');
const { canPlayerBeatCards } = require('./canBeat');
const { getHintCards } = require('./hint');
const { Game } = require('./Game');

module.exports = {
  generateDeck,
  shuffleDeck,
  dealCards,
  getCardType,
  canPlay,
  canPlayerBeatCards,
  getHintCards,
  getCardsValue,
  Game
};
