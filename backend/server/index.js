const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Game } = require('../game/gameLogic');
const { initDatabase } = require('../db/db');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.static('frontend'));

// 初始化数据库
initDatabase();

// 游戏房间管理
const rooms = new Map();
const players = new Map();
const games = new Map();

// 处理客户端连接
io.on('connection', (socket) => {
  console.log('新玩家连接:', socket.id);
  
  // 加入房间
  socket.on('joinRoom', (data) => {
    const { roomId, playerName } = data;
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        players: [],
        status: 'waiting'
      });
    }
    
    const room = rooms.get(roomId);
    const player = {
      id: socket.id,
      name: playerName,
      roomId: roomId,
      cards: []
    };
    
    room.players.push(player);
    players.set(socket.id, player);
    
    socket.join(roomId);
    
    io.to(roomId).emit('roomUpdated', {
      room: {
        id: room.id,
        players: room.players.map(p => ({ id: p.id, name: p.name })),
        status: room.status
      }
    });
    console.log(`${playerName}加入房间${roomId}`);
  });
  
  // 离开房间
  socket.on('leaveRoom', (data) => {
    const { roomId } = data;
    const player = players.get(socket.id);
    if (player) {
      const room = rooms.get(roomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.players.length === 0) {
          rooms.delete(roomId);
          games.delete(roomId);
        } else {
          io.to(roomId).emit('roomUpdated', {
            room: {
              id: room.id,
              players: room.players.map(p => ({ id: p.id, name: p.name })),
              status: room.status
            }
          });
        }
      }
      players.delete(socket.id);
      socket.leave(roomId);
      console.log(`${player.name}离开房间${roomId}`);
    }
  });
  
  // 开始游戏
  socket.on('startGame', (data) => {
    const { roomId } = data;
    const room = rooms.get(roomId);
    if (room && room.players.length >= 3) {
      room.status = 'calling';
      
      // 创建游戏实例
      const game = new Game(roomId, room.players);
      game.start();
      games.set(roomId, game);
      
      // 发送叫分开始事件
      io.to(roomId).emit('callingUpdated', {
        currentCallerIndex: game.叫牌状态.currentCallerIndex,
        highestScore: game.叫牌状态.highestScore,
        highestBidder: game.叫牌状态.highestBidder,
        gameStatus: game.status,
        players: game.players.map(p => ({ id: p.id, name: p.name }))
      });
      console.log(`房间${roomId}开始叫分`);
    }
  });
  
  // 叫地主
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
        
        // 检查游戏是否进入 playing 状态
        if (game.status === 'playing') {
          io.to(roomId).emit('gameStarted', {
            room: {
              id: rooms.get(roomId).id,
              players: rooms.get(roomId).players.map(p => ({ id: p.id, name: p.name })),
              status: rooms.get(roomId).status
            },
            players: game.players.map(p => ({
              id: p.id,
              name: p.name,
              cards: p.cards
            })),
            landlordCards: game.地主Cards,
            landlordPlayerId: game.地主PlayerId,
            currentPlayerIndex: game.currentPlayerIndex
          });
        }
      }
    }
  });
  
  // 出牌
  socket.on('playCards', (data) => {
    const { roomId, cards } = data;
    const game = games.get(roomId);
    if (game) {
      const success = game.playCards(socket.id, cards);
      if (success) {
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
        
        // 检查游戏是否结束
        if (game.status === 'ended') {
          const scores = game.calculateScores();
          io.to(roomId).emit('gameEnded', {
            winnerId: socket.id,
            scores: scores,
            baseScore: game.底分,
            multiplier: game.倍数
          });
        }
      } else {
        socket.emit('playCardsFailed', {
          message: '出牌无效'
        });
      }
    }
  });
  
  // 不出牌
  socket.on('pass', (data) => {
    const { roomId } = data;
    const game = games.get(roomId);
    if (game) {
      // 检查是否是当前玩家
      if (socket.id === game.players[game.currentPlayerIndex].id) {
        // 检查如果出牌区的牌是当前玩家出的，则不允许不出牌
        if (game.lastPlayerId === socket.id) {
          // 发送错误消息
          socket.emit('playCardsFailed', {
            message: '当前出牌区的牌是您出的，必须出牌'
          });
          return;
        }
        
        // 直接转到下一个玩家
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 3;
        
        // 通知所有玩家
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
      }
    }
  });
  
  // 处理断开连接
  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player) {
      const room = rooms.get(player.roomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.players.length === 0) {
          rooms.delete(player.roomId);
          games.delete(player.roomId);
        } else {
          io.to(player.roomId).emit('roomUpdated', room);
        }
      }
      players.delete(socket.id);
      console.log(`${player.name}断开连接`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
