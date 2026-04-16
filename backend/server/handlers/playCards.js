/**
 * 处理出牌的请求
 * @param {string} connectionId - 连接ID
 * @param {object} data - 请求数据，包含roomId、cards
 * @param {object} hub - WebSocket连接管理中心
 * @param {Map} rooms - 房间信息映射
 * @param {Map} games - 游戏信息映射
 * @param {function} broadcastRoomList - 广播房间列表的函数
 * @param {function} buildPlayersForConnection - 为连接构建玩家信息的函数
 * @param {function} startCountdown - 启动倒计时的函数
 * @param {function} stopCountdown - 停止倒计时的函数
 * @param {function} stopRoomTimer - 停止房间计时器的函数
 */
const canPlayerBeatCards = require('../../game/gameLogic').canPlayerBeatCards;
const updateRoomStatus = require('../../db/db').updateRoomStatus;

const handlePlayCards = async (connectionId, data, hub, rooms, games, broadcastRoomList, buildPlayersForConnection, startCountdown, stopCountdown, stopRoomTimer) => {
  const { roomId, cards } = data;
  const game = games.get(roomId);
  if (!game) return;

  const success = game.playCards(connectionId, cards);
  if (success) {
    stopCountdown(roomId);

    hub.broadcastRoomEach(roomId, 'cardsPlayed', (cid) => {
      // 计算下家是否能大过当前出牌
      const nextPlayerIndex = game.currentPlayerIndex;
      const nextPlayer = game.players[nextPlayerIndex];
      let canBeatLastCards = true;
      
      // 如果最后是自己出的牌就不要判断
      if ((game.lastPlayerId !== nextPlayer.id) && !nextPlayer.isTrust) {
        canBeatLastCards = canPlayerBeatCards(nextPlayer.cards, cards);
      }
      
      return {
        playerId: connectionId,
        cards,
        players: buildPlayersForConnection(game.players, cid),
        currentPlayerIndex: game.currentPlayerIndex,
        gameStatus: game.status,
        multiplier: game.倍数,
        canBeatLastCards: cid === nextPlayer.id ? canBeatLastCards : undefined
      };
    });

    if (game.status === 'ended') {
      console.log('handlePlayCards,游戏结束');
      stopRoomTimer(roomId);
      const winner = game.players.find((p) => p.cards.length === 0);
      if (!winner) {
        console.warn('handlePlayCards: game ended but no empty hand, skip settlement broadcast');
        broadcastRoomList();
        return;
      }
      const scores = game.calculateScores();
      const winnerId = winner.id;
      const isLandlordWin = winnerId === game.地主PlayerId;

      hub.broadcastRoom(roomId, 'gameEnded', {
        winner: isLandlordWin ? 'landlord' : 'farmers',
        landlordPlayerId: game.地主PlayerId,
        scores,
        baseScore: game.底分,
        multiplier: game.倍数,
        isSpring: game.春天,
        players: game.players.map((p) => ({
          id: p.id,
          name: p.name,
          cards: p.cards
        }))
      });

      try {
        const room = rooms.get(roomId);
        if (room) {
          await updateRoomStatus(roomId, 'waiting', room.players.length);
        }
      } catch (error) {
        console.error('更新房间状态失败:', error);
      }

      broadcastRoomList();
    } else {
      startCountdown(roomId);
    }
  } else {
    hub.sendTo(connectionId, 'playCardsFailed', { message: '出牌无效' });
  }
};

module.exports = handlePlayCards;