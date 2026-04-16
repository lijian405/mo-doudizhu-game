/**
 * 处理获取在线人数的请求
 * @param {string} connectionId - 连接ID
 * @param {object} data - 请求数据
 * @param {object} hub - WebSocket连接管理中心
 * @param {object} runtime - 运行时信息
 */
const handleGetOnlineCount = (connectionId, data, hub, runtime) => {
  hub.sendTo(connectionId, 'onlineCountUpdated', { count: runtime.onlinePlayerCount });
};

module.exports = handleGetOnlineCount;