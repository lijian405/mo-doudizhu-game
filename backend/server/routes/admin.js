const express = require('express');
const crypto = require('crypto');
const { getRooms, deleteRoom } = require('../../db/db');
const state = require('../state');
const { getAdminContext } = require('../adminContext');

const router = express.Router();

const ADMIN_USER = 'admin';
const ADMIN_PASS = '123456';

/** @type {Set<string>} */
const adminTokens = new Set();

function requireAdmin(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权' });
  }
  const token = h.slice(7);
  if (!adminTokens.has(token)) {
    return res.status(401).json({ error: '未授权' });
  }
  next();
}

router.post('/login', express.json(), (req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  adminTokens.add(token);
  res.json({ token });
});

router.post('/logout', requireAdmin, (req, res) => {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) {
    adminTokens.delete(h.slice(7));
  }
  res.json({ success: true });
});

router.get('/online-players', requireAdmin, (req, res) => {
  const ctx = getAdminContext();
  if (!ctx) {
    return res.status(503).json({ error: '服务未就绪' });
  }
  res.json({ players: ctx.getOnlinePlayers() });
});

router.post('/kick/:connectionId', requireAdmin, (req, res) => {
  const ctx = getAdminContext();
  if (!ctx) {
    return res.status(503).json({ error: '服务未就绪' });
  }
  const { connectionId } = req.params;
  ctx.kickPlayer(connectionId);
  res.json({ success: true });
});

router.get('/rooms', requireAdmin, async (req, res) => {
  const ctx = getAdminContext();
  if (!ctx) {
    return res.status(503).json({ error: '服务未就绪' });
  }
  try {
    const memory = ctx.listMemoryRooms();
    const dbRows = await getRooms();
    const byId = new Map();
    for (const r of memory) {
      byId.set(r.id, { ...r, source: 'memory' });
    }
    for (const row of dbRows) {
      const id = row.room_id;
      if (byId.has(id)) {
        const m = byId.get(id);
        m.dbStatus = row.status;
        m.dbPlayerCount = row.player_count;
      } else {
        byId.set(id, {
          id,
          players: [],
          status: 'waiting',
          playerCount: row.player_count || 0,
          maxPlayers: row.max_players || 3,
          roomStatus: row.status === 'playing' ? 'playing' : 'waiting',
          source: 'db_only'
        });
      }
    }
    res.json({ rooms: [...byId.values()] });
  } catch (e) {
    console.error('admin rooms', e);
    res.status(500).json({ error: '获取房间失败' });
  }
});

router.delete('/rooms/:roomId', requireAdmin, async (req, res) => {
  const ctx = getAdminContext();
  if (!ctx) {
    return res.status(503).json({ error: '服务未就绪' });
  }
  const { roomId } = req.params;
  try {
    await ctx.forceDeleteRoom(roomId);
    res.json({ success: true });
  } catch (e) {
    console.error('admin delete room', e);
    res.status(500).json({ error: '删除房间失败' });
  }
});

router.get('/cheat-target', requireAdmin, (req, res) => {
  res.json({ cheatTargetPlayerName: state.runtime.cheatTargetPlayerName || '' });
});

router.put('/cheat-target', requireAdmin, express.json(), (req, res) => {
  const name = req.body?.cheatTargetPlayerName;
  state.runtime.cheatTargetPlayerName =
    typeof name === 'string' ? name.trim() : '';
  res.json({ cheatTargetPlayerName: state.runtime.cheatTargetPlayerName });
});

module.exports = router;
