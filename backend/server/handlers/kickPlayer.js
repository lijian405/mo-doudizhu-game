/**
 * 处理踢出玩家的请求
 * @param {string} connectionId - 连接ID（房主）
 * @param {object} data - 请求数据，包含roomId和targetPlayerId
 * @param {object} hub - WebSocket连接管理中心
 * @param {Map} rooms - 房间信息映射
 * @param {Map} players - 玩家信息映射
 * @param {function} removePlayerFromRoom - 移除玩家从房间的函数
 */

const handleKickPlayer = async (connectionId, data, hub, rooms, players, removePlayerFromRoom) => {
  const { roomId, targetPlayerId } = data;
  const room = rooms.get(roomId);

  if (!room) {
    hub.sendTo(connectionId, 'kickPlayerFailed', { message: '房间不存在' });
    return;
  }

  if (room.ownerId !== connectionId) {
    hub.sendTo(connectionId, 'kickPlayerFailed', { message: '只有房主才能踢出玩家' });
    return;
  }

  if (connectionId === targetPlayerId) {
    hub.sendTo(connectionId, 'kickPlayerFailed', { message: '不能踢出自己' });
    return;
  }

  const targetPlayer = room.players.find(p => p.id === targetPlayerId);
  if (!targetPlayer) {
    hub.sendTo(connectionId, 'kickPlayerFailed', { message: '目标玩家不在房间中' });
    return;
  }

  await removePlayerFromRoom(targetPlayerId, roomId);

  hub.sendTo(targetPlayerId, 'kicked', {
    roomId,
    message: '你已被房主移出房间'
  });

  hub.broadcastRoom(roomId, 'playerKicked', {
    roomId,
    kickedPlayerId: targetPlayerId,
    kickedPlayerName: targetPlayer.name,
    message: `玩家 ${targetPlayer.name} 已被移出房间`
  });

  console.log(`房主 ${connectionId} 将玩家 ${targetPlayerId} 踢出房间 ${roomId}`);
};

module.exports = handleKickPlayer;
