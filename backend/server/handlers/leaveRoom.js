/**
 * 处理离开房间的请求
 * @param {string} connectionId - 连接ID
 * @param {object} data - 请求数据，包含roomId
 * @param {object} hub - WebSocket连接管理中心
 * @param {Map} players - 玩家信息映射
 * @param {function} removePlayerFromRoom - 移除玩家从房间的函数
 */


const handleLeaveRoom = async (connectionId, data, hub, players, removePlayerFromRoom) => {
  const { roomId } = data;
  const player = players.get(connectionId);
  if (!player || player.roomId !== roomId) {
    return;
  }
  await removePlayerFromRoom(connectionId, roomId);
  hub.clearRoom(connectionId);
};

module.exports = handleLeaveRoom;