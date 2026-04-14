const { Game } = require('../game/gameLogic');
const { updateRoomStatus, deleteRoom, getRoomByRoomId } = require('../db/db');

/**
 * @param {import('socket.io').Server} io
 * @param {{ rooms: Map, players: Map, games: Map, runtime: { onlinePlayerCount: number } }} state
 */
function attachSocketHandlers(io, state) {
  const { rooms, players, games, runtime } = state;

  function broadcastOnlineCount() {
    io.emit('onlineCountUpdated', { count: runtime.onlinePlayerCount });
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
        players: room.players.map(p => ({ id: p.id, name: p.name, isLandlord: false, score: 1000 })),
        status,
        playerCount: room.players.length,
        maxPlayers: 3,
        roomStatus
      });
    });
    return roomList;
  }

  function broadcastRoomList() {
    io.emit('roomListUpdated', { rooms: buildRoomListPayload() });
  }

  function startCountdown(roomId) {
    const game = games.get(roomId);
    if (!game || game.status !== 'playing') return;

    if (game.countdownTimer) {
      clearInterval(game.countdownTimer);
    }

    if (game.lastPlayerId === game.players[game.currentPlayerIndex].id) {
      io.to(roomId).emit('countdownUpdated', {
        countdown: 0,
        currentPlayerIndex: game.currentPlayerIndex
      });
      return;
    }

    game.countdown = 30;

    io.to(roomId).emit('countdownUpdated', {
      countdown: game.countdown,
      currentPlayerIndex: game.currentPlayerIndex,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name
      }))
    });

    game.countdownTimer = setInterval(() => {
      game.countdown--;

      io.to(roomId).emit('countdownUpdated', {
        countdown: game.countdown,
        currentPlayerIndex: game.currentPlayerIndex,
        players: game.players.map(p => ({
          id: p.id,
          name: p.name
        }))
      });

      if (game.countdown <= 0) {
        clearInterval(game.countdownTimer);
        game.countdownTimer = null;

        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 3;

        io.to(roomId).emit('cardsPlayed', {
          playerId: game.players[(game.currentPlayerIndex + 2) % 3].id,
          cards: [],
          players: game.players.map(p => ({
            id: p.id,
            name: p.name,
            cards: p.cards
          })),
          currentPlayerIndex: game.currentPlayerIndex,
          gameStatus: game.status,
          multiplier: game.倍数
        });

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

  io.on('connection', (socket) => {
    console.log('新玩家连接:', socket.id);

    runtime.onlinePlayerCount++;
    broadcastOnlineCount();

    socket.on('getOnlineCount', () => {
      socket.emit('onlineCountUpdated', { count: runtime.onlinePlayerCount });
    });

    socket.on('joinRoom', async (data) => {
      console.log('加入房间请求:', data);
      const { roomId, playerName } = data;

      try {
        const dbRoom = await getRoomByRoomId(roomId);
        if (!dbRoom) {
          socket.emit('joinRoomFailed', { message: '房间不存在' });
          return;
        }

        if (!rooms.has(roomId)) {
          rooms.set(roomId, {
            id: roomId,
            players: [],
            status: dbRoom.status,
            ownerId: null
          });
        }
      } catch (error) {
        console.error('查询房间失败:', error);
        socket.emit('joinRoomFailed', { message: '查询房间失败' });
        return;
      }

      const room = rooms.get(roomId);
      const player = {
        id: socket.id,
        name: playerName,
        roomId,
        cards: []
      };

      room.players.push(player);

      if (room.players.length === 1) {
        room.ownerId = socket.id;
        console.log(`${playerName}成为房间${roomId}的房主`);
      }

      players.set(socket.id, player);

      socket.join(roomId);

      let roomStatus = 'waiting';
      if (room.players.length >= 3) {
        roomStatus = 'full';
      }

      try {
        await updateRoomStatus(roomId, roomStatus, room.players.length);
      } catch (error) {
        console.error('更新房间状态失败:', error);
      }

      io.to(roomId).emit('roomUpdated', {
        roomId: room.id,
        players: room.players.map(p => ({ id: p.id, name: p.name }))
      });

      broadcastRoomList();
      console.log(`${playerName}加入房间${roomId}`);
    });

    socket.on('leaveRoom', async (data) => {
      const { roomId } = data;
      const player = players.get(socket.id);
      if (player) {
        const room = rooms.get(roomId);
        if (room) {
          const isOwner = room.ownerId === socket.id;
          room.players = room.players.filter(p => p.id !== socket.id);
          console.log(`${player.name}离开房间${roomId}`);
          if (isOwner || room.players.length === 0) {
            rooms.delete(roomId);
            games.delete(roomId);
            try {
              await deleteRoom(roomId);
            } catch (error) {
              console.error('删除房间失败:', error);
            }

            io.to(roomId).emit('roomDeleted', {
              roomId,
              message: '房主已离开，房间已被删除'
            });
          } else {
            let roomStatus = 'waiting';
            if (room.players.length >= 3) {
              roomStatus = 'full';
            }
            try {
              await updateRoomStatus(roomId, roomStatus, room.players.length);
            } catch (error) {
              console.error('更新房间状态失败:', error);
            }

            io.to(roomId).emit('roomUpdated', {
              roomId: room.id,
              players: room.players.map(p => ({ id: p.id, name: p.name }))
            });
          }
          broadcastRoomList();
        }
        players.delete(socket.id);
        socket.leave(roomId);
        console.log(`${player.name}离开房间${roomId}`);
      }
    });

    socket.on('startGame', async (data) => {
      const { roomId } = data;
      const room = rooms.get(roomId);
      if (room && room.players.length >= 3) {
        room.status = 'calling';

        const game = new Game(roomId, room.players);
        game.start();
        games.set(roomId, game);

        try {
          await updateRoomStatus(roomId, 'playing', room.players.length);
        } catch (error) {
          console.error('更新房间状态失败:', error);
        }

        io.to(roomId).emit('callingStart', { roomId });

        io.to(roomId).emit('gameStarted', {
          room: {
            id: room.id,
            players: room.players.map(p => ({ id: p.id, name: p.name })),
            status: room.status
          },
          players: game.players.map(p => ({
            id: p.id,
            name: p.name,
            cards: p.cards
          })),
          landlordCards: game.地主Cards,
          landlordPlayerId: game.地主PlayerId,
          currentPlayerIndex: game.currentPlayerIndex,
          callingInfo: {
            currentCallerIndex: game.叫牌状态.currentCallerIndex,
            highestScore: game.叫牌状态.highestScore,
            highestBidder: game.叫牌状态.highestBidder
          }
        });

        broadcastRoomList();
        console.log(`房间${roomId}开始游戏`);
      }
    });

    socket.on('callLandlord', (data) => {
      const { roomId, score } = data;
      const game = games.get(roomId);
      if (game) {
        const success = game.call地主(socket.id, score);
        if (success) {
          io.to(roomId).emit('callingUpdated', {
            currentCallerIndex: game.叫牌状态.currentCallerIndex,
            highestScore: game.叫牌状态.highestScore,
            highestBidder: game.叫牌状态.highestBidder,
            gameStatus: game.status,
            players: game.players.map(p => ({ id: p.id, name: p.name }))
          });

          if (game.status === 'playing') {
            const room = rooms.get(roomId);
            io.to(roomId).emit('gameStarted', {
              room: {
                id: room.id,
                players: room.players.map(p => ({ id: p.id, name: p.name })),
                status: room.status
              },
              players: game.players.map(p => ({
                id: p.id,
                name: p.name,
                cards: p.cards
              })),
              landlordCards: game.地主Cards,
              landlordPlayerId: game.地主PlayerId,
              currentPlayerIndex: game.currentPlayerIndex,
              gameStarted: true
            });

            startCountdown(roomId);
            broadcastRoomList();
          }
        }
      }
    });

    socket.on('playCards', async (data) => {
      const { roomId, cards } = data;
      const game = games.get(roomId);
      if (!game) return;

      const success = game.playCards(socket.id, cards);
      if (success) {
        stopCountdown(roomId);

        io.to(roomId).emit('cardsPlayed', {
          playerId: socket.id,
          cards,
          players: game.players.map(p => ({
            id: p.id,
            name: p.name,
            cards: p.cards
          })),
          currentPlayerIndex: game.currentPlayerIndex,
          gameStatus: game.status,
          multiplier: game.倍数
        });

        if (game.status === 'ended') {
          const scores = game.calculateScores();
          const winnerId = game.players.find(p => p.cards.length === 0).id;
          const isLandlordWin = winnerId === game.地主PlayerId;

          io.to(roomId).emit('gameEnded', {
            winner: isLandlordWin ? 'landlord' : 'farmers',
            landlordPlayerId: game.地主PlayerId,
            scores,
            baseScore: game.底分,
            multiplier: game.倍数,
            isSpring: game.春天,
            players: game.players.map(p => ({
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
        socket.emit('playCardsFailed', { message: '出牌无效' });
      }
    });

    socket.on('pass', (data) => {
      const { roomId } = data;
      const game = games.get(roomId);
      if (!game) return;

      if (socket.id === game.players[game.currentPlayerIndex].id) {
        if (game.lastPlayerId === socket.id) {
          socket.emit('playCardsFailed', {
            message: '当前出牌区的牌是您出的，必须出牌'
          });
          return;
        }

        stopCountdown(roomId);

        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 3;

        io.to(roomId).emit('cardsPlayed', {
          playerId: socket.id,
          cards: [],
          players: game.players.map(p => ({
            id: p.id,
            name: p.name,
            cards: p.cards
          })),
          currentPlayerIndex: game.currentPlayerIndex,
          gameStatus: game.status,
          multiplier: game.倍数
        });

        startCountdown(roomId);
      }
    });

    socket.on('getRooms', () => {
      socket.emit('roomListUpdated', { rooms: buildRoomListPayload() });
    });

    socket.on('disconnect', async () => {
      const player = players.get(socket.id);
      if (player) {
        const room = rooms.get(player.roomId);
        if (room) {
          const isOwner = room.ownerId === socket.id;
          room.players = room.players.filter(p => p.id !== socket.id);
          if (isOwner || room.players.length === 0) {
            rooms.delete(player.roomId);
            games.delete(player.roomId);
            try {
              await deleteRoom(player.roomId);
            } catch (error) {
              console.error('删除房间失败:', error);
            }

            io.to(player.roomId).emit('roomDeleted', {
              roomId: player.roomId,
              message: '房主已离开，房间已被删除'
            });
          } else {
            let roomStatus = 'waiting';
            if (room.players.length >= 3) {
              roomStatus = 'full';
            }
            try {
              await updateRoomStatus(player.roomId, roomStatus, room.players.length);
            } catch (error) {
              console.error('更新房间状态失败:', error);
            }

            io.to(player.roomId).emit('roomUpdated', {
              roomId: room.id,
              players: room.players.map(p => ({ id: p.id, name: p.name }))
            });
          }
          broadcastRoomList();
        }
        players.delete(socket.id);
        console.log(`${player.name}断开连接`);
      }

      if (runtime.onlinePlayerCount > 0) {
        runtime.onlinePlayerCount--;
        broadcastOnlineCount();
      }
    });
  });
}

module.exports = { attachSocketHandlers };
