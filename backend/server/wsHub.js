const WebSocket = require('ws');

/**
 * 连接与房间订阅：替代 Socket.io 的 join / io.to(room).emit
 */
class WsHub {
  constructor() {
    /** @type {Map<string, { ws: import('ws').WebSocket, roomId: string | null }>} */
    this.connections = new Map();
    /** @type {Map<string, Set<string>>} */
    this.roomMembers = new Map();
  }

  /** @param {string} id @param {import('ws').WebSocket} ws */
  addConnection(id, ws) {
    this.connections.set(id, { ws, roomId: null });
  }

  /** @param {string} id */
  removeConnection(id) {
    const c = this.connections.get(id);
    if (!c) return;
    if (c.roomId) {
      this._leaveRoomSub(id, c.roomId);
    }
    this.connections.delete(id);
  }

  /**
   * 加入某房间的广播组（与 joinRoom 业务成功后调用）
   * @param {string} id
   * @param {string} roomId
   */
  setRoom(id, roomId) {
    const c = this.connections.get(id);
    if (!c) return;
    if (c.roomId === roomId) return;
    if (c.roomId) {
      this._leaveRoomSub(id, c.roomId);
    }
    c.roomId = roomId;
    if (!this.roomMembers.has(roomId)) {
      this.roomMembers.set(roomId, new Set());
    }
    this.roomMembers.get(roomId).add(id);
  }

  /** 离开房间广播组（仍保持 TCP 连接） */
  clearRoom(id) {
    const c = this.connections.get(id);
    if (!c || !c.roomId) return;
    this._leaveRoomSub(id, c.roomId);
    c.roomId = null;
  }

  _leaveRoomSub(id, roomId) {
    const set = this.roomMembers.get(roomId);
    if (!set) return;
    set.delete(id);
    if (set.size === 0) {
      this.roomMembers.delete(roomId);
    }
  }

  /** @param {string} id @param {string} type @param {unknown} [payload] */
  sendTo(id, type, payload) {
    const c = this.connections.get(id);
    if (!c || c.ws.readyState !== WebSocket.OPEN) return;
    c.ws.send(JSON.stringify({ type, payload: payload ?? {} }));
  }

  /** @param {string} roomId @param {string} type @param {unknown} [payload] */
  broadcastRoom(roomId, type, payload) {
    const set = this.roomMembers.get(roomId);
    if (!set) return;
    const msg = JSON.stringify({ type, payload: payload ?? {} });
    for (const cid of set) {
      const c = this.connections.get(cid);
      if (c && c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(msg);
      }
    }
  }

  /** @param {string} type @param {unknown} [payload] */
  broadcastAll(type, payload) {
    const msg = JSON.stringify({ type, payload: payload ?? {} });
    for (const [, c] of this.connections) {
      if (c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(msg);
      }
    }
  }
}

module.exports = { WsHub };
