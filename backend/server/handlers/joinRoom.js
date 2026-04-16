/**
 * 处理加入房间的请求
 * @param {string} connectionId - 连接ID
 * @param {object} data - 请求数据，包含roomId、playerName、password
 * @param {object} hub - WebSocket连接管理中心
 * @param {object} runtime - 运行时信息
 * @param {Map} rooms - 房间信息映射
 * @param {Map} players - 玩家信息映射
 * @param {function} broadcastRoomList - 广播房间列表的函数
 */
const getRoomByRoomId = require('../../db/db').getRoomByRoomId;
const updateRoomStatus = require('../../db/db').updateRoomStatus;

const handleJoinRoom = async (connectionId, data, hub, runtime, rooms, players, broadcastRoomList) => {
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
    cards: [],
    isTrust: false
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
};

module.exports = handleJoinRoom;