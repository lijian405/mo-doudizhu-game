/**
 * 处理添加AI陪玩的请求
 * @param {string} connectionId - 连接ID（房主）
 * @param {object} data - 请求数据，包含roomId
 * @param {object} hub - WebSocket连接管理中心
 * @param {object} runtime - 运行时信息
 * @param {Map} rooms - 房间信息映射
 * @param {Map} players - 玩家信息映射
 * @param {function} broadcastRoomList - 广播房间列表的函数
 */

const updateRoomStatus = require('../../db/db').updateRoomStatus;

const AI_NAMES = [
  '小智', '小明', '小红', '小花', '小蓝',
  '阿呆', '阿瓜', '阿萌', '阿骚', '阿乐',
  '笨笨', '嘟嘟', '球球', '豆豆', '泡泡'
];

const handleAddAI = (connectionId, data, hub, runtime, rooms, players, broadcastRoomList) => {
  const { roomId } = data;
  const room = rooms.get(roomId);

  if (!room) {
    hub.sendTo(connectionId, 'addAIFailed', { message: '房间不存在' });
    return;
  }

  if (room.ownerId !== connectionId) {
    hub.sendTo(connectionId, 'addAIFailed', { message: '只有房主才能添加AI' });
    return;
  }

  if (room.players.length >= 3) {
    hub.sendTo(connectionId, 'addAIFailed', { message: '房间已满' });
    return;
  }

  const existingNames = room.players.map(p => p.name);
  const availableNames = AI_NAMES.filter(name => !existingNames.includes(name));
  if (availableNames.length === 0) {
    hub.sendTo(connectionId, 'addAIFailed', { message: 'AI名字已用完' });
    return;
  }

  const aiName = availableNames[Math.floor(Math.random() * availableNames.length)];
  const aiId = `robot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const aiPlayer = {
    id: aiId,
    name: aiName,
    roomId,
    cards: [],
    isTrust: true,
    type: 'robot'
  };

  room.players.push(aiPlayer);
  players.set(aiId, aiPlayer);

  let roomStatus = 'waiting';
  if (room.players.length >= 3) {
    roomStatus = 'full';
  }

  updateRoomStatus(roomId, roomStatus, room.players.length).catch(err => {
    console.error('更新房间状态失败:', err);
  });

  hub.broadcastRoom(roomId, 'roomUpdated', {
    roomId: room.id,
    players: room.players.map((p) => ({ id: p.id, name: p.name, type: p.type }))
  });

  hub.broadcastRoom(roomId, 'aiAdded', {
    aiId,
    aiName,
    playerCount: room.players.length
  });

  broadcastRoomList();
  console.log(`AI玩家 ${aiName} (${aiId}) 加入房间 ${roomId}`);
};

module.exports = handleAddAI;
