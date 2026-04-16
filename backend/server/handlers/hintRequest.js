/**
 * 处理提示请求
 * @param {string} connectionId - 连接ID
 * @param {object} data - 请求数据，包含roomId
 * @param {object} hub - WebSocket连接管理中心
 * @param {Map} games - 游戏信息映射
 */
const getHintCards = require('../../game/gameLogic').getHintCards;

const handleHintRequest = (connectionId, data, hub, games) => {
  const { roomId } = data;
  const game = games.get(roomId);
  if (!game) {
    hub.sendTo(connectionId, 'hintResult', { cards: [], message: '游戏不存在' });
    return;
  }

  const current = game.players[game.currentPlayerIndex];
  if (!current || current.id !== connectionId) {
    hub.sendTo(connectionId, 'hintResult', { cards: [], message: '还没轮到您' });
    return;
  }

  const isFreeTurn = !game.lastCards || game.lastCards.length === 0 || game.lastPlayerId === connectionId;
  const hintCards = getHintCards(current.cards, game.lastCards, isFreeTurn);
  if (!hintCards || hintCards.length === 0) {
    hub.sendTo(connectionId, 'hintResult', {
      cards: [],
      message: isFreeTurn ? '没有可用的牌' : '没有更大的牌了'
    });
    return;
  }

  hub.sendTo(connectionId, 'hintResult', { cards: hintCards });
};

module.exports = handleHintRequest;