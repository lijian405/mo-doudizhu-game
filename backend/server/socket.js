const { randomUUID } = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');
const { Game } = require('../game/gameLogic');
const { updateRoomStatus, deleteRoom, getRoomByRoomId, getParameter } = require('../db/db');
const { WsHub } = require('./wsHub');
const { setAdminContext } = require('./adminContext');

/**
 * @param {import('http').Server} server
 * @param {{ rooms: Map, players: Map, games: Map, runtime: { onlinePlayerCount: number } }} state
 */
function attachWebSocketHandlers(server, state) {
  const { rooms, players, games, runtime } = state;
  const hub = new WsHub();
  const wss = new WebSocketServer({ server, path: '/ws' });
  /** @type {Map<string, { startedAt: number, interval: NodeJS.Timeout }>} */
  const roomTimers = new Map();
  let ROOM_MAX_SECONDS = 30 * 60;
  
  // 从数据库加载配置
  async function loadConfig() {
    try {
      const roomTimeoutParam = await getParameter('room_timeout_minutes');
      if (roomTimeoutParam) {
        ROOM_MAX_SECONDS = parseInt(roomTimeoutParam.value) * 60;
      }
    } catch (e) {
      console.error('加载配置失败:', e);
    }
  }
  
  loadConfig();

  function stopRoomTimer(roomId) {
    const t = roomTimers.get(roomId);
    if (!t) return;
    clearInterval(t.interval);
    roomTimers.delete(roomId);
  }

  function startRoomTimer(roomId) {
    stopRoomTimer(roomId);
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      hub.broadcastRoom(roomId, 'roomTimerUpdated', { roomId, elapsedSeconds });

      if (elapsedSeconds >= ROOM_MAX_SECONDS) {
        // 超时强制结束本局：停止计时/倒计时，清理对局并通知客户端返回房间
        stopRoomTimer(roomId);
        stopCountdown(roomId);
        games.delete(roomId);
        const room = rooms.get(roomId);
        if (room) {
          room.status = 'waiting';
          updateRoomStatus(roomId, 'waiting', room.players.length).catch((e) => {
            console.error('更新房间状态失败:', e);
          });
        }
        hub.broadcastRoom(roomId, 'gameAborted', {
          roomId,
          message: `房间计时超过${ROOM_MAX_SECONDS / 60}分钟，游戏已结束`
        });
        broadcastRoomList();
      }
    }, 1000);
    roomTimers.set(roomId, { startedAt, interval });
    hub.broadcastRoom(roomId, 'roomTimerUpdated', { roomId, elapsedSeconds: 0 });
  }

  function broadcastOnlineCount() {
    hub.broadcastAll('onlineCountUpdated', { count: runtime.onlinePlayerCount });
  }

  function buildRoomListPayload() {
    const roomList = [];
    rooms.forEach((room) => {
      const game = games.get(room.id);
      const status = game?.status || 'waiting';
      let roomStatus = 'waiting';
      if (status === 'playing') {
        roomStatus = 'playing';
      } else if (room.players.length >= 3) {
        roomStatus = 'full';
      } else {
        roomStatus = 'waiting';
      }
      roomList.push({
        id: room.id,
        players: room.players.map((p) => ({ id: p.id, name: p.name, isLandlord: false, score: 1000 })),
        status,
        playerCount: room.players.length,
        maxPlayers: 3,
        roomStatus,
        hasPassword: room.hasPassword || false
      });
    });
    return roomList;
  }

  function broadcastRoomList() {
    hub.broadcastAll('roomListUpdated', { rooms: buildRoomListPayload() });
  }

  /**
   * 生成玩家视角的 players 数组：自己能看到 cards，其他人只能看到 cardCount
   */
  function buildPlayersForConnection(gamePlayers, viewerId) {
    return gamePlayers.map((p) => {
      if (p.id === viewerId) {
        return { id: p.id, name: p.name, cards: p.cards, cardCount: p.cards.length };
      }
      return { id: p.id, name: p.name, cardCount: p.cards.length };
    });
  }

  function startCountdown(roomId) {
    const game = games.get(roomId);
    if (!game || game.status !== 'playing') return;

    if (game.countdownTimer) {
      clearInterval(game.countdownTimer);
    }

    if (game.lastPlayerId === game.players[game.currentPlayerIndex].id) {
      hub.broadcastRoom(roomId, 'countdownUpdated', {
        countdown: 0,
        currentPlayerIndex: game.currentPlayerIndex
      });
      return;
    }

    game.countdown = 30;

    hub.broadcastRoom(roomId, 'countdownUpdated', {
      countdown: game.countdown,
      currentPlayerIndex: game.currentPlayerIndex,
      players: game.players.map((p) => ({
        id: p.id,
        name: p.name
      }))
    });

    game.countdownTimer = setInterval(() => {
      game.countdown--;

      hub.broadcastRoom(roomId, 'countdownUpdated', {
        countdown: game.countdown,
        currentPlayerIndex: game.currentPlayerIndex,
        players: game.players.map((p) => ({
          id: p.id,
          name: p.name
        }))
      });

      if (game.countdown <= 0) {
        clearInterval(game.countdownTimer);
        game.countdownTimer = null;

        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 3;

        const passPlayerId = game.players[(game.currentPlayerIndex + 2) % 3].id;
        hub.broadcastRoomEach(roomId, 'cardsPlayed', (cid) => ({
          playerId: passPlayerId,
          cards: [],
          players: buildPlayersForConnection(game.players, cid),
          currentPlayerIndex: game.currentPlayerIndex,
          gameStatus: game.status,
          multiplier: game.倍数
        }));

        startCountdown(roomId);
      }
    }, 1000);
  }

  function stopCountdown(roomId) {
    const game = games.get(roomId);
    if (game && game.countdownTimer) {
      clearInterval(game.countdownTimer);
      game.countdownTimer = null;
    }
  }

  function isGameInProgress(roomId) {
    const game = games.get(roomId);
    return game && (game.status === 'calling' || game.status === 'playing');
  }

  /**
   * @param {string} leavingSocketId
   * @param {string} roomId
   */
  async function removePlayerFromRoom(leavingSocketId, roomId) {
    const player = players.get(leavingSocketId);
    if (!player || player.roomId !== roomId) {
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      players.delete(leavingSocketId);
      broadcastRoomList();
      return;
    }

    const wasActive = isGameInProgress(roomId);
    const isOwner = room.ownerId === leavingSocketId;

    room.players = room.players.filter((p) => p.id !== leavingSocketId);
    console.log(`${player.name}离开房间${roomId}`);

    if (wasActive && room.players.length < 3) {
      stopCountdown(roomId);
      stopRoomTimer(roomId);
      games.delete(roomId);
      room.status = 'waiting';
      try {
        await updateRoomStatus(roomId, 'waiting', room.players.length);
      } catch (error) {
        console.error('更新房间状态失败:', error);
      }
      hub.broadcastRoom(roomId, 'gameAborted', {
        roomId,
        message: '有玩家离开，本局游戏已终止，请返回房间'
      });
    }

    if (room.players.length === 0) {
      stopRoomTimer(roomId);
      rooms.delete(roomId);
      games.delete(roomId);
      try {
        await deleteRoom(roomId);
      } catch (error) {
        console.error('删除房间失败:', error);
      }
      hub.broadcastRoom(roomId, 'roomDeleted', {
        roomId,
        message: '房间内已无玩家，房间已关闭'
      });
    } else {
      if (isOwner) {
        room.ownerId = room.players[0].id;
        console.log(`房主离开，${room.players[0].name} 成为新房主`);
      }
      const roomStatus = room.players.length >= 3 ? 'full' : 'waiting';
      try {
        await updateRoomStatus(roomId, roomStatus, room.players.length);
      } catch (error) {
        console.error('更新房间状态失败:', error);
      }
      hub.broadcastRoom(roomId, 'roomUpdated', {
        roomId: room.id,
        players: room.players.map((p) => ({ id: p.id, name: p.name }))
      });
    }

    players.delete(leavingSocketId);
    broadcastRoomList();
  }

  async function forceDeleteRoom(roomId) {
    const room = rooms.get(roomId);
    const ids = room ? room.players.map((p) => p.id) : [];
    for (const id of [...ids]) {
      await removePlayerFromRoom(id, roomId);
    }
    if (rooms.has(roomId)) {
      stopCountdown(roomId);
      stopRoomTimer(roomId);
      games.delete(roomId);
      rooms.delete(roomId);
    }
    try {
      await deleteRoom(roomId);
    } catch (e) {
      console.error('删除房间DB记录', e);
    }
    for (const id of ids) {
      const conn = hub.connections.get(id);
      if (conn && conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.close();
      }
    }
    broadcastRoomList();
  }

  setAdminContext({
    getOnlinePlayers() {
      const list = [];
      for (const [id, c] of hub.connections) {
        const p = players.get(id);
        list.push({
          id,
          name: p?.name ?? '(未加入房间)',
          roomId: p?.roomId ?? c.roomId ?? null
        });
      }
      return list;
    },
    kickPlayer(connectionId) {
      const conn = hub.connections.get(connectionId);
      if (conn && conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.close();
      }
    },
    forceDeleteRoom,
    listMemoryRooms: buildRoomListPayload
  });

  wss.on('connection', (ws) => {
    const connectionId = randomUUID();
    hub.addConnection(connectionId, ws);
    console.log('新玩家连接:', connectionId);

    runtime.onlinePlayerCount++;
    broadcastOnlineCount();

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      const { type, payload } = msg;
      if (!type || typeof type !== 'string') return;
      const data = payload && typeof payload === 'object' ? payload : {};

      try {
        switch (type) {
          case 'getOnlineCount':
            hub.sendTo(connectionId, 'onlineCountUpdated', { count: runtime.onlinePlayerCount });
            break;

          case 'joinRoom': {
            const { roomId, playerName, password } = data;
            console.log('加入房间请求:', data);

            try {
              const dbRoom = await getRoomByRoomId(roomId);
              if (!dbRoom) {
                hub.sendTo(connectionId, 'joinRoomFailed', { message: '房间不存在' });
                return;
              }

              if (dbRoom.password) {
                if (!password || password !== dbRoom.password) {
                  hub.sendTo(connectionId, 'joinRoomFailed', { message: '房间密码错误' });
                  return;
                }
              }

              if (!rooms.has(roomId)) {
                rooms.set(roomId, {
                  id: roomId,
                  players: [],
                  status: dbRoom.status,
                  ownerId: null,
                  hasPassword: !!dbRoom.password
                });
              }
            } catch (error) {
              console.error('查询房间失败:', error);
              hub.sendTo(connectionId, 'joinRoomFailed', { message: '查询房间失败' });
              return;
            }

            const room = rooms.get(roomId);
            const player = {
              id: connectionId,
              name: playerName,
              roomId,
              cards: []
            };

            room.players.push(player);

            if (room.players.length === 1) {
              room.ownerId = connectionId;
              console.log(`${playerName}成为房间${roomId}的房主`);
            }

            players.set(connectionId, player);
            hub.setRoom(connectionId, roomId);

            let roomStatus = 'waiting';
            if (room.players.length >= 3) {
              roomStatus = 'full';
            }

            try {
              await updateRoomStatus(roomId, roomStatus, room.players.length);
            } catch (error) {
              console.error('更新房间状态失败:', error);
            }

            hub.broadcastRoom(roomId, 'roomUpdated', {
              roomId: room.id,
              players: room.players.map((p) => ({ id: p.id, name: p.name }))
            });

            broadcastRoomList();
            console.log(`${playerName}加入房间${roomId}`);
            break;
          }

          case 'leaveRoom': {
            const { roomId } = data;
            const player = players.get(connectionId);
            if (!player || player.roomId !== roomId) {
              return;
            }
            await removePlayerFromRoom(connectionId, roomId);
            hub.clearRoom(connectionId);
            break;
          }

          case 'startGame': {
            const { roomId } = data;
            const room = rooms.get(roomId);
            if (room && room.players.length >= 3) {
              room.status = 'calling';

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
                  players: room.players.map((p) => ({ id: p.id, name: p.name })),
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

              broadcastRoomList();
              console.log(`房间${roomId}开始游戏`);
            }
            break;
          }

          case 'callLandlord': {
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
                  players: game.players.map((p) => ({ id: p.id, name: p.name }))
                });

                if (game.status === 'playing') {
                  const room = rooms.get(roomId);
                  hub.broadcastRoomEach(roomId, 'gameStarted', (cid) => ({
                    room: {
                      id: room.id,
                      players: room.players.map((p) => ({ id: p.id, name: p.name })),
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
                }
              }
            }
            break;
          }

          case 'playCards': {
            const { roomId, cards } = data;
            const game = games.get(roomId);
            if (!game) return;

            const success = game.playCards(connectionId, cards);
            if (success) {
              stopCountdown(roomId);

              hub.broadcastRoomEach(roomId, 'cardsPlayed', (cid) => ({
                playerId: connectionId,
                cards,
                players: buildPlayersForConnection(game.players, cid),
                currentPlayerIndex: game.currentPlayerIndex,
                gameStatus: game.status,
                multiplier: game.倍数
              }));

              if (game.status === 'ended') {
                stopRoomTimer(roomId);
                const scores = game.calculateScores();
                const winnerId = game.players.find((p) => p.cards.length === 0).id;
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
            break;
          }

          case 'pass': {
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

              hub.broadcastRoomEach(roomId, 'cardsPlayed', (cid) => ({
                playerId: connectionId,
                cards: [],
                players: buildPlayersForConnection(game.players, cid),
                currentPlayerIndex: game.currentPlayerIndex,
                gameStatus: game.status,
                multiplier: game.倍数
              }));

              startCountdown(roomId);
            }
            break;
          }

          case 'getRooms':
            hub.sendTo(connectionId, 'roomListUpdated', { rooms: buildRoomListPayload() });
            break;

          default:
            break;
        }
      } catch (err) {
        console.error('WS handler error:', err);
      }
    });

    ws.on('close', async () => {
      const player = players.get(connectionId);
      if (player) {
        await removePlayerFromRoom(connectionId, player.roomId);
        console.log(`${player.name}断开连接`);
      }
      hub.removeConnection(connectionId);

      if (runtime.onlinePlayerCount > 0) {
        runtime.onlinePlayerCount--;
        broadcastOnlineCount();
      }
    });
  });
}

module.exports = { attachWebSocketHandlers };
