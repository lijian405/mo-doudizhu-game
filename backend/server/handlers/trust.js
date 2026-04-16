/**
 * 处理托管请求
 * @param {string} connectionId - 连接ID
 * @param {object} data - 请求数据，包含roomId、trust
 * @param {object} hub - WebSocket连接管理中心
 * @param {Map} players - 玩家信息映射
 */
const handleTrust = (connectionId, data, hub, players) => {
  const { roomId, trust } = data;
  const player = players.get(connectionId);

  if (!player || player.roomId !== roomId) {
    return;
  }

  player.isTrust = trust;

  hub.broadcastRoom(roomId, 'trustUpdated', {
    playerId: connectionId,
    playerName: player.name,
    isTrust: trust
  });

  console.log(`玩家 ${player.name} 托管状态: ${trust}`);
};

module.exports = handleTrust;