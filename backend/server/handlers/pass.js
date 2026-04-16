/**
 * 处理过牌的请求
 * @param {string} connectionId - 连接ID
 * @param {object} data - 请求数据，包含roomId
 * @param {object} hub - WebSocket连接管理中心
 * @param {Map} games - 游戏信息映射
 * @param {function} buildPlayersForConnection - 为连接构建玩家信息的函数
 * @param {function} startCountdown - 启动倒计时的函数
 * @param {function} stopCountdown - 停止倒计时的函数
 */
const canPlayerBeatCards = require('../../game/gameLogic').canPlayerBeatCards;

const handlePass = (connectionId, data, hub, games, buildPlayersForConnection, startCountdown, stopCountdown) => {
  const { roomId } = data;
  const game = games.get(roomId);
  if (!game) return;

  if (connectionId === game.players[game.currentPlayerIndex].id) {
    if (game.lastPlayerId === connectionId) {
      hub.sendTo(connectionId, 'playCardsFailed', {
        message: '当前出牌区的牌是您出的，必须出牌'
      });
      return;
    }

    stopCountdown(roomId);

    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 3;

    hub.broadcastRoomEach(roomId, 'cardsPlayed', (cid) => {
      // 计算下家是否能大过最后一家出的牌
      const nextPlayerIndex = game.currentPlayerIndex;
      const nextPlayer = game.players[nextPlayerIndex];
      let canBeatLastCards = true;
      
      // 如果最后是自己出的牌就不要判断
      if (game.lastPlayerId !== nextPlayer.id && !nextPlayer.isTrust) {
        canBeatLastCards = canPlayerBeatCards(nextPlayer.cards, game.lastCards);
      }
      
      return {
        playerId: connectionId,
        cards: [],
        players: buildPlayersForConnection(game.players, cid),
        currentPlayerIndex: game.currentPlayerIndex,
        gameStatus: game.status,
        multiplier: game.倍数,
        canBeatLastCards: cid === nextPlayer.id ? canBeatLastCards : undefined
      };
    });

    startCountdown(roomId);
  }
};

module.exports = handlePass;