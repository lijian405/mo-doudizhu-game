/**
 * WebSocket 挂载后由 socket.js 注入，供管理端 HTTP 接口调用
 * @typedef {{
 *   getOnlinePlayers: () => Array<{ id: string, name: string, roomId: string | null }>,
 *   kickPlayer: (connectionId: string) => void,
 *   forceDeleteRoom: (roomId: string) => Promise<void>,
 *   listMemoryRooms: () => Array<Record<string, unknown>>
 * }} AdminContext
 */

/** @type {AdminContext | null} */
let ctx = null;

module.exports = {
  /** @param {AdminContext} c */
  setAdminContext(c) {
    ctx = c;
  },
  /** @returns {AdminContext | null} */
  getAdminContext() {
    return ctx;
  }
};
