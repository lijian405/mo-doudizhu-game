const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Game } = require('../game/gameLogic');
const { initDatabase, createRoom, getRooms, updateRoomStatus, deleteRoom, getRoomByRoomId } = require('../db/db');

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
app.use(express.json());

// API 接口
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await getRooms();
    // 转换房间数据格式
    const roomList = rooms.map(room => ({
      id: room.room_id,
      status: room.status,
      playerCount: room.player_count,
      maxPlayers: room.max_players,
      roomStatus: room.status
    }));
    res.json({ rooms: roomList });
  } catch (error) {
    console.error('获取房间列表失败:', error);
    res.status(500).json({ error: '获取房间列表失败' });
  }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const { roomId, ownerName } = req.body;
    if (!roomId || !ownerName) {
      return res.status(400).json({ error: '房间ID和房主名称不能为空' });
    }
    
    await createRoom(roomId, ownerName);
    res.json({ success: true, roomId });
  } catch (error) {
    console.error('创建房间失败:', error);
    res.status(500).json({ error: '创建房间失败' });
  }
});

app.get('/api/rooms/:id', async (req, res) => {
  try {
    const roomId = req.params.id;
    const room = await getRoomByRoomId(roomId);
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }
    res.json(room);
  } catch (error) {
    console.error('获取房间详情失败:', error);
    res.status(500).json({ error: '获取房间详情失败' });
  }
});

app.put('/api/rooms/:id', async (req, res) => {
  try {
    const roomId = req.params.id;
    const { status, playerCount } = req.body;
    await updateRoomStatus(roomId, status, playerCount);
    res.json({ success: true });
  } catch (error) {
    console.error('更新房间状态失败:', error);
    res.status(500).json({ error: '更新房间状态失败' });
  }
});

app.delete('/api/rooms/:id', async (req, res) => {
  try {
    const roomId = req.params.id;
    await deleteRoom(roomId);
    res.json({ success: true });
  } catch (error) {
    console.error('删除房间失败:', error);
    res.status(500).json({ error: '删除房间失败' });
  }
});

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
  socket.on('joinRoom', async (data) => {
    console.log('加入房间请求:', data);
    const { roomId, playerName } = data;
    
    // 先从数据库查询房间是否存在
    try {
      const dbRoom = await getRoomByRoomId(roomId);
      if (!dbRoom) {
        // 数据库中房间不存在，返回错误
        socket.emit('joinRoomFailed', {
          message: '房间不存在'
        });
        return;
      }
      
      // 如果内存中没有该房间，从数据库加载
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          id: roomId,
          players: [],
          status: dbRoom.status,
          ownerId: null // 记录房主ID
        });
      }
    } catch (error) {
      console.error('查询房间失败:', error);
      socket.emit('joinRoomFailed', {
        message: '查询房间失败'
      });
      return;
    }
    
    const room = rooms.get(roomId);
    const player = {
      id: socket.id,
      name: playerName,
      roomId: roomId,
      cards: []
    };
    
    room.players.push(player);
    
    // 记录第一个加入的玩家为房主
    if (room.players.length === 1) {
      room.ownerId = socket.id;
      console.log(`${playerName}成为房间${roomId}的房主`);
    }
    
    players.set(socket.id, player);
    
    socket.join(roomId);
    
    // 更新房间状态
    let roomStatus = 'waiting';
    if (room.players.length >= 3) {
      roomStatus = 'full';
    }
    
    // 同步到数据库
    try {
      await updateRoomStatus(roomId, roomStatus, room.players.length);
    } catch (error) {
      console.error('更新房间状态失败:', error);
    }
    
    // 发送房间更新事件给房间内所有玩家
    io.to(roomId).emit('roomUpdated', {
      roomId: room.id,
      players: room.players.map(p => ({ id: p.id, name: p.name }))
    });
    
    // 广播房间列表更新
    broadcastRoomList();
    console.log(`${playerName}加入房间${roomId}`);
  });
  
  // 离开房间
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
          // 房主离开或房间空了，删除房间
          rooms.delete(roomId);
          games.delete(roomId);
          // 从数据库删除房间
          try {
            await deleteRoom(roomId);
          } catch (error) {
            console.error('删除房间失败:', error);
          }
          
          // 通知房间内其他玩家房间已被删除
          io.to(roomId).emit('roomDeleted', {
            roomId: roomId,
            message: '房主已离开，房间已被删除'
          });
        } else {
          // 更新房间状态
          let roomStatus = 'waiting';
          if (room.players.length >= 3) {
            roomStatus = 'full';
          }
          // 同步到数据库
          try {
            await updateRoomStatus(roomId, roomStatus, room.players.length);
          } catch (error) {
            console.error('更新房间状态失败:', error);
          }
          
          // 发送房间更新事件给房间内所有玩家
          io.to(roomId).emit('roomUpdated', {
            roomId: room.id,
            players: room.players.map(p => ({ id: p.id, name: p.name }))
          });
        }
        // 广播房间列表更新
        broadcastRoomList();
      }
      players.delete(socket.id);
      socket.leave(roomId);
      console.log(`${player.name}离开房间${roomId}`);
    }
  });
  
  // 启动倒计时
  function startCountdown(roomId) {
    const game = games.get(roomId);
    if (!game || game.status !== 'playing') return;
    
    // 清除之前的计时器
    if (game.countdownTimer) {
      clearInterval(game.countdownTimer);
    }
    
    // 检查是否是最后出牌的玩家（出牌区的牌是当前玩家出的）
    if (game.lastPlayerId === game.players[game.currentPlayerIndex].id) {
      // 最后出牌的玩家必须出牌，不需要倒计时
      io.to(roomId).emit('countdownUpdated', {
        countdown: 0,
        currentPlayerIndex: game.currentPlayerIndex
      });
      return;
    }
    
    // 重置倒计时
    game.countdown = 30;
    
    // 发送初始倒计时
    io.to(roomId).emit('countdownUpdated', {
      countdown: game.countdown,
      currentPlayerIndex: game.currentPlayerIndex,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name
      }))
    });
    
    // 启动倒计时
    game.countdownTimer = setInterval(() => {
      game.countdown--;
      
      // 发送倒计时更新
      io.to(roomId).emit('countdownUpdated', {
        countdown: game.countdown,
        currentPlayerIndex: game.currentPlayerIndex,
        players: game.players.map(p => ({
          id: p.id,
          name: p.name
        }))
      });
      
      // 倒计时结束
      if (game.countdown <= 0) {
        clearInterval(game.countdownTimer);
        game.countdownTimer = null;
        
        // 流转到下一个玩家
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 3;
        
        // 通知所有玩家
        io.to(roomId).emit('cardsPlayed', {
          playerId: game.players[(game.currentPlayerIndex + 2) % 3].id, // 上一个玩家
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
        
        // 为下一个玩家启动倒计时
        startCountdown(roomId);
      }
    }, 1000);
  }

  // 停止倒计时
  function stopCountdown(roomId) {
    const game = games.get(roomId);
    if (game && game.countdownTimer) {
      clearInterval(game.countdownTimer);
      game.countdownTimer = null;
    }
  }

  // 开始游戏
  socket.on('startGame', async (data) => {
    const { roomId } = data;
    const room = rooms.get(roomId);
    if (room && room.players.length >= 3) {
      room.status = 'calling';
      
      // 创建游戏实例
      const game = new Game(roomId, room.players);
      game.start();
      games.set(roomId, game);
      
      // 更新房间状态为 playing
      try {
        await updateRoomStatus(roomId, 'playing', room.players.length);
      } catch (error) {
        console.error('更新房间状态失败:', error);
      }
      
      // 发送叫分开始事件，通知所有玩家跳转到游戏页面
      io.to(roomId).emit('callingStart', {
        roomId: roomId
      });
      
      // 直接发送游戏开始事件，包含叫分信息
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
      
      // 广播房间列表更新
      broadcastRoomList();
      console.log(`房间${roomId}开始游戏`);
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
            currentPlayerIndex: game.currentPlayerIndex,
            gameStarted: true // 标记游戏真正开始
          });
          
          // 游戏开始后启动倒计时
          startCountdown(roomId);
          
          // 广播房间列表更新
          broadcastRoomList();
        }
      }
    }
  });
  
  // 出牌
  socket.on('playCards', async (data) => {
    const { roomId, cards } = data;
    const game = games.get(roomId);
    if (game) {
      const success = game.playCards(socket.id, cards);
      if (success) {
          // 停止当前倒计时
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
          
          // 检查游戏是否结束
          if (game.status === 'ended') {
            const scores = game.calculateScores();
            io.to(roomId).emit('gameEnded', {
            winnerId: socket.id,
            scores: scores,
            baseScore: game.底分,
            multiplier: game.倍数
          });
          
          // 更新房间状态为 waiting
          try {
            const room = rooms.get(roomId);
            if (room) {
              await updateRoomStatus(roomId, 'waiting', room.players.length);
            }
          } catch (error) {
            console.error('更新房间状态失败:', error);
          }
          
          // 广播房间列表更新
          broadcastRoomList();
          } else {
            // 为下一个玩家启动倒计时
            startCountdown(roomId);
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
        
        // 停止当前倒计时
        stopCountdown(roomId);
        
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
        
        // 为下一个玩家启动倒计时
        startCountdown(roomId);
      }
    }
  });
  
  // 获取房间列表
  socket.on('getRooms', () => {
    const roomList = [];
    rooms.forEach((room, roomId) => {
      const game = games.get(roomId);
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
        status: status,
        playerCount: room.players.length,
        maxPlayers: 3,
        roomStatus: roomStatus
      });
    });
    
    socket.emit('roomListUpdated', {
      rooms: roomList
    });
  });

  // 处理断开连接
  socket.on('disconnect', async () => {
    const player = players.get(socket.id);
    if (player) {
      const room = rooms.get(player.roomId);
      if (room) {
        const isOwner = room.ownerId === socket.id;
        room.players = room.players.filter(p => p.id !== socket.id);
        if (isOwner || room.players.length === 0) {
          // 房主离开或房间空了，删除房间
          rooms.delete(player.roomId);
          games.delete(player.roomId);
          // 从数据库删除房间
          try {
            await deleteRoom(player.roomId);
          } catch (error) {
            console.error('删除房间失败:', error);
          }
          
          // 通知房间内其他玩家房间已被删除
          io.to(player.roomId).emit('roomDeleted', {
            roomId: player.roomId,
            message: '房主已离开，房间已被删除'
          });
        } else {
          // 更新房间状态
          let roomStatus = 'waiting';
          if (room.players.length >= 3) {
            roomStatus = 'full';
          }
          // 同步到数据库
          try {
            await updateRoomStatus(player.roomId, roomStatus, room.players.length);
          } catch (error) {
            console.error('更新房间状态失败:', error);
          }
          
          // 发送房间更新事件给房间内所有玩家
          io.to(player.roomId).emit('roomUpdated', {
            roomId: room.id,
            players: room.players.map(p => ({ id: p.id, name: p.name }))
          });
        }
        // 广播房间列表更新
        broadcastRoomList();
      }
      players.delete(socket.id);
      console.log(`${player.name}断开连接`);
    }
  });

  // 广播房间列表
  function broadcastRoomList() {
    const roomList = [];
    rooms.forEach((room, roomId) => {
      const game = games.get(roomId);
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
        status: status,
        playerCount: room.players.length,
        maxPlayers: 3,
        roomStatus: roomStatus
      });
    });
    
    io.emit('roomListUpdated', {
      rooms: roomList
    });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
