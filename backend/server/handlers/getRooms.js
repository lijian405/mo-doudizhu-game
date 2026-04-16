/**
 * 处理获取房间列表的请求
 * @param {string} connectionId - 连接ID
 * @param {object} data - 请求数据
 * @param {object} hub - WebSocket连接管理中心
 * @param {Map} rooms - 房间信息映射
 * @param {Map} games - 游戏信息映射
 */


const handleGetRooms = (connectionId, data, hub, rooms, games) => {
  const buildRoomListPayload = () => {
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
  };
  hub.sendTo(connectionId, 'roomListUpdated', { rooms: buildRoomListPayload() });
};

module.exports = handleGetRooms;