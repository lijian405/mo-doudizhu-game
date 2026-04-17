const { randomUUID } = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');
const { Game, canPlayerBeatCards, getHintCards } = require('../game/gameLogic');
const { updateRoomStatus, deleteRoom, getRoomByRoomId, getParameter } = require('../db/db');
const { WsHub } = require('./wsHub');
const { setAdminContext } = require('./adminContext');
const handlers = require('./handlers');

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

  // 常量提取（可统一配置）
  const COUNTDOWN_SECONDS = 30;
  const CALLING_COUNTDOWN_SECONDS = 10;

  /** 清除指定 Game 实例上的出牌倒计时（含已从 games 中替换掉的旧局） */
  function clearGameCountdownTimer(game) {
    if (!game?.countdownTimer) return;
    clearInterval(game.countdownTimer);
    game.countdownTimer = null;
  }

  /**
   * 开始叫分阶段倒计时（仅处理叫分）
   * @param {string} roomId - 房间ID
   */
  function startCallingCountdown(roomId) {
    const game = games.get(roomId);
    if (!game || game.status !== 'calling') return;

    clearGameCountdownTimer(game);
    game.countdown = CALLING_COUNTDOWN_SECONDS;

    const currentPlayer = game.players[game.叫牌状态.currentCallerIndex];

    broadcastCallingCountdown(roomId, game);

    game.countdownTimer = setInterval(() => {
      game.countdown--;
      broadcastCallingCountdown(roomId, game);

      // AI玩家3秒后自动叫分
      if (currentPlayer.type === 'robot' && game.countdown <= CALLING_COUNTDOWN_SECONDS - 3) {
        clearGameCountdownTimer(game);
        handleAICallLandlord(roomId, game, currentPlayer);
        return;
      }

      if (game.countdown <= 0) {
        clearGameCountdownTimer(game);
        handleAICallLandlord(roomId, game, currentPlayer);
      }
    }, 1000);
  }

  function broadcastCallingCountdown(roomId, game) {
    hub.broadcastRoom(roomId, 'countdownUpdated', {
      countdown: game.countdown,
      currentPlayerIndex: game.叫牌状态.currentCallerIndex,
      players: game.players.map(p => ({ id: p.id, name: p.name, type: p.type }))
    });
  }

  function handleAICallLandlord(roomId, game, currentPlayer) {
    if (game.status !== 'calling') return;

    const aiCallScore = Math.floor(Math.random() * 2) + 1;
    const maxPossibleScore = 3 - game.叫牌状态.highestScore > 0 ? game.叫牌状态.highestScore + 1 : 3;
    const callScore = Math.min(aiCallScore, maxPossibleScore);

    game.call地主(currentPlayer.id, callScore);

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
    } else {
      startCallingCountdown(roomId);
    }
  }

  /**
   * 开始房间倒计时
   * @param {string} roomId - 房间ID
   */
  function startCountdown(roomId) {
    const game = games.get(roomId);
    // 基础校验：游戏不存在/未开始，直接退出
    if (!game || game.status !== 'playing') return;

    // 清空已有定时器，防止重复计时
    clearGameCountdownTimer(game);
    // 重置倒计时
    game.countdown = COUNTDOWN_SECONDS;

    const currentPlayer = game.players[game.currentPlayerIndex];
    const currentPlayerId = currentPlayer.id;


    // ============== 非托管玩家 → 启动正常倒计时 ==============
    // 广播初始倒计时
    broadcastCountdown(roomId, game);

    // 启动定时器
    game.countdownTimer = setInterval(() => {
      game.countdown--;
      broadcastCountdown(roomId, game);
      // ============== 托管玩家或AI玩家 → 3秒后立即自动出牌 ==============
      const isAutoPlay = currentPlayer.isTrust || currentPlayer.type === 'robot';
      if (isAutoPlay && game.countdown >= COUNTDOWN_SECONDS - 3) {
        handleAutoPlay(roomId, game, currentPlayer, currentPlayerId);
        return;
      }

      // 倒计时结束 → 自动出牌/过牌
      if (game.countdown <= 0) {
        clearGameCountdownTimer(game);
        handleAutoPlay(roomId, game, currentPlayer, currentPlayerId);
      }
    }, 1000);
  }

  // -------------------------- 以下为抽离的公共工具函数 --------------------------
  /**
   * 广播倒计时状态（抽离重复代码）
   */
  function broadcastCountdown(roomId, game) {
    hub.broadcastRoom(roomId, 'countdownUpdated', {
      countdown: game.countdown,
      currentPlayerIndex: game.currentPlayerIndex,
      players: game.players.map(p => ({ id: p.id, name: p.name }))
    });
  }

  /**
   * 处理【托管/超时】自动出牌/过牌（核心公共逻辑，消除90%冗余）
   */
  function handleAutoPlay(roomId, game, currentPlayer, currentPlayerId) {
    if (game.status !== 'playing') {
      clearGameCountdownTimer(game);
      return;
    }

    const isFreeTurn = !game.lastCards || game.lastCards.length === 0 || game.lastPlayerId === currentPlayerId;
    const hintCards = getHintCards(currentPlayer.cards, game.lastCards, isFreeTurn);

    let playedCards = [];
    const passPlayerId = currentPlayerId;

    // 1. 执行出牌逻辑
    if (hintCards?.length) {
      const playSuccess = game.playCards(currentPlayerId, hintCards);
      if (playSuccess) {
        playedCards = hintCards;
        broadcastPlayCards(roomId, game, currentPlayerId, playedCards);

        // 检查游戏是否结束
        if (game.status === 'ended') {
          handleGameEnd(roomId, game);
          return;
        }
      }
    }

    // 2. 出牌失败/无牌可出 → 切换玩家
    if (!playedCards.length) {
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 3;
      broadcastPassCards(roomId, game, passPlayerId);
    }

    // 3. 重启下一轮倒计时
    startCountdown(roomId);
  }

  /**
   * 广播【出牌】事件（抽离重复代码）
   */
  function broadcastPlayCards(roomId, game, playerId, cards) {
    hub.broadcastRoomEach(roomId, 'cardsPlayed', (cid) => {
      const nextPlayer = game.players[game.currentPlayerIndex];
      let canBeatLastCards = true;
      // 托管玩家不需要显示"要不起"，因为会自动出牌
      // 非托管玩家需要检查是否能大过当前出的牌
      if (!nextPlayer.isTrust && game.lastPlayerId !== nextPlayer.id) {
        canBeatLastCards = canPlayerBeatCards(nextPlayer.cards, cards);
      }

      return {
        playerId,
        cards,
        players: buildPlayersForConnection(game.players, cid),
        currentPlayerIndex: game.currentPlayerIndex,
        gameStatus: game.status,
        multiplier: game.倍数,
        canBeatLastCards: cid === nextPlayer.id ? canBeatLastCards : undefined
      };
    });
  }

  /**
   * 广播【过牌】事件（抽离重复代码）
   * 须带上 canBeatLastCards，否则客户端会沿用上一轮出牌里的旧值，人类玩家看不到「要不起」
   */
  function broadcastPassCards(roomId, game, playerId) {
    hub.broadcastRoomEach(roomId, 'cardsPlayed', (cid) => {
      const nextPlayer = game.players[game.currentPlayerIndex];
      let canBeatLastCards = true;
      // 托管玩家不需要显示"要不起"，因为会自动出牌
      // 非托管玩家需要检查是否能大过上家出的牌
      if (!nextPlayer.isTrust && game.lastPlayerId !== nextPlayer.id) {
        canBeatLastCards = canPlayerBeatCards(nextPlayer.cards, game.lastCards);
      }
      return {
        playerId: playerId,
        cards: [],
        players: buildPlayersForConnection(game.players, cid),
        currentPlayerIndex: game.currentPlayerIndex,
        gameStatus: game.status,
        multiplier: game.倍数,
        canBeatLastCards: cid === nextPlayer.id ? canBeatLastCards : undefined
      };
    });
  }

  /**
   * 处理游戏结束逻辑（抽离重复代码）
   */
  function handleGameEnd(roomId, game) {
    clearGameCountdownTimer(game);
    stopRoomTimer(roomId);

    const winner = game.players.find((p) => p.cards.length === 0);
    if (!winner) {
      console.warn('handleGameEnd: no player with empty hand, skip settlement broadcast');
      broadcastRoomList();
      return;
    }

    const scores = game.calculateScores();
    const winnerId = winner.id;
    const isLandlordWin = winnerId === game.地主PlayerId;

    // 广播游戏结束
    hub.broadcastRoom(roomId, 'gameEnded', {
      winner: isLandlordWin ? 'landlord' : 'farmers',
      landlordPlayerId: game.地主PlayerId,
      scores,
      baseScore: game.底分,
      multiplier: game.倍数,
      isSpring: game.春天,
      players: game.players.map(p => ({ id: p.id, name: p.name, cards: p.cards }))
    });

    // 重置玩家托管状态
    const room = rooms.get(roomId);
    if (room) {
      room.players.forEach(p => {
        p.isTrust = false;
        hub.broadcastRoom(roomId, 'trustUpdated', {
          playerId: p.id,
          playerName: p.name,
          isTrust: false
        });
      });

      // 更新房间状态（捕获异常）
      updateRoomStatus(roomId, 'waiting', room.players.length).catch(err =>
        console.error('更新房间状态失败:', err)
      );
    }

    // 刷新房间列表
    broadcastRoomList();
  }

  function stopCountdown(roomId) {
    clearGameCountdownTimer(games.get(roomId));
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
    } else if (player.type === 'human') {
      const hasHuman = room.players.some(p => p.type === 'human');
      if (!hasHuman) {
        console.log(`房间${roomId}内无人类玩家，销毁房间`);
        stopRoomTimer(roomId);
        stopCountdown(roomId);
        games.delete(roomId);
        rooms.delete(roomId);
        try {
          await deleteRoom(roomId);
        } catch (error) {
          console.error('删除房间失败:', error);
        }
        hub.broadcastRoom(roomId, 'roomDeleted', {
          roomId,
          message: '所有人类玩家已离开，房间已关闭'
        });
        broadcastRoomList();
        return;
      }
    }

    if (room.players.length > 0) {
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
        players: room.players.map((p) => ({ id: p.id, name: p.name, type: p.type }))
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
            await handlers.getOnlineCount(connectionId, data, hub, runtime);
            break;

          case 'joinRoom':
            await handlers.joinRoom(connectionId, data, hub, runtime, rooms, players, broadcastRoomList);
            break;

          case 'leaveRoom':
            await handlers.leaveRoom(connectionId, data, hub, players, removePlayerFromRoom);
            break;

          case 'startGame':
            await handlers.startGame(connectionId, data, hub, runtime, rooms, games, broadcastRoomList, buildPlayersForConnection, startRoomTimer, startCallingCountdown);
            break;

          case 'callLandlord':
            await handlers.callLandlord(connectionId, data, hub, rooms, games, broadcastRoomList, buildPlayersForConnection, startCountdown, startCallingCountdown);
            break;

          case 'playCards':
            await handlers.playCards(connectionId, data, hub, rooms, games, broadcastRoomList, buildPlayersForConnection, startCountdown, stopCountdown, stopRoomTimer);
            break;

          case 'pass':
            await handlers.pass(connectionId, data, hub, games, buildPlayersForConnection, startCountdown, stopCountdown);
            break;

          case 'hintRequest':
            await handlers.hintRequest(connectionId, data, hub, games);
            break;

          case 'getRooms':
            await handlers.getRooms(connectionId, data, hub, rooms, games);
            break;

          case 'addAI':
            await handlers.addAI(connectionId, data, hub, runtime, rooms, players, broadcastRoomList);
            break;

          case 'kickPlayer':
            await handlers.kickPlayer(connectionId, data, hub, rooms, players, removePlayerFromRoom);
            break;

          case 'trust':
            await handlers.trust(connectionId, data, hub, players);
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
