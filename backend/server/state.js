/**
 * 进程内游戏与房间状态（与 Socket 会话绑定，非持久化）
 */
module.exports = {
  rooms: new Map(),
  players: new Map(),
  games: new Map(),
  runtime: {
    onlinePlayerCount: 0
  }
};
