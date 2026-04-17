/**
 * 处理叫地主的请求
 * @param {string} connectionId - 连接ID
 * @param {object} data - 请求数据，包含roomId、score
 * @param {object} hub - WebSocket连接管理中心
 * @param {Map} rooms - 房间信息映射
 * @param {Map} games - 游戏信息映射
 * @param {function} broadcastRoomList - 广播房间列表的函数
 * @param {function} buildPlayersForConnection - 为连接构建玩家信息的函数
 * @param {function} startCountdown - 启动出牌倒计时的函数
 * @param {function} startCallingCountdown - 启动叫分倒计时的函数
 */


const handleCallLandlord = (connectionId, data, hub, rooms, games, broadcastRoomList, buildPlayersForConnection, startCountdown, startCallingCountdown) => {
  const { roomId, score } = data;
  const game = games.get(roomId);
  if (game) {
    const success = game.call地主(connectionId, score);
    if (success) {
      hub.broadcastRoom(roomId, 'callingUpdated', {
        currentCallerIndex: game.叫牌状态.currentCallerIndex,
        highestScore: game.叫牌状态.highestScore,
        highestBidder: game.叫牌状态.highestBidder,
        gameStatus: game.status,
        players: game.players.map((p) => ({ id: p.id, name: p.name, type: p.type }))
      });

      if (game.status === 'playing') {
        const room = rooms.get(roomId);
        hub.broadcastRoomEach(roomId, 'gameStarted', (cid) => ({
          room: {
            id: room.id,
            players: room.players.map((p) => ({ id: p.id, name: p.name, type: p.type })),
            status: room.status
          },
          players: buildPlayersForConnection(game.players, cid),
          landlordCards: game.地主Cards,
          landlordPlayerId: game.地主PlayerId,
          currentPlayerIndex: game.currentPlayerIndex,
          baseScore: game.底分,
          multiplier: game.倍数,
          gameStarted: true
        }));

        startCountdown(roomId);
        broadcastRoomList();
      } else {
        startCallingCountdown(roomId);
      }
    }
  }
};

module.exports = handleCallLandlord;