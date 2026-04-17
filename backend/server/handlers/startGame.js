/**
 * 处理开始游戏的请求
 * @param {string} connectionId - 连接ID
 * @param {object} data - 请求数据，包含roomId
 * @param {object} hub - WebSocket连接管理中心
 * @param {object} runtime - 运行时信息
 * @param {Map} rooms - 房间信息映射
 * @param {Map} games - 游戏信息映射
 * @param {function} broadcastRoomList - 广播房间列表的函数
 * @param {function} buildPlayersForConnection - 为连接构建玩家信息的函数
 * @param {function} startRoomTimer - 启动房间计时器的函数
 * @param {function} startCallingCountdown - 启动叫分倒计时的函数
 */
const { Game } = require('../../game/gameLogic');
const updateRoomStatus = require('../../db/db').updateRoomStatus;

const handleStartGame = async (connectionId, data, hub, runtime, rooms, games, broadcastRoomList, buildPlayersForConnection, startRoomTimer, startCallingCountdown) => {
  const { roomId } = data;
  const room = rooms.get(roomId);
  if (room && room.players.length >= 3) {
    room.status = 'calling';

    const previousGame = games.get(roomId);
    if (previousGame?.countdownTimer) {
      clearInterval(previousGame.countdownTimer);
      previousGame.countdownTimer = null;
    }

    const game = new Game(roomId, room.players);
    game.start(runtime.cheatTargetPlayerName || '');
    games.set(roomId, game);

    try {
      await updateRoomStatus(roomId, 'playing', room.players.length);
    } catch (error) {
      console.error('更新房间状态失败:', error);
    }

    startRoomTimer(roomId);
    hub.broadcastRoom(roomId, 'callingStart', { roomId });

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
      callingInfo: {
        currentCallerIndex: game.叫牌状态.currentCallerIndex,
        highestScore: game.叫牌状态.highestScore,
        highestBidder: game.叫牌状态.highestBidder
      }
    }));

    startCallingCountdown(roomId);
    broadcastRoomList();
    console.log(`房间${roomId}开始游戏`);
  }
};

module.exports = handleStartGame;