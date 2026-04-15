const express = require('express');
const {
  createRoom,
  getRooms,
  updateRoomStatus,
  deleteRoom,
  getRoomByRoomId,
  getParameter
} = require('../../db/db');

const router = express.Router();

router.get('/rooms', async (req, res) => {
  try {
    const rooms = await getRooms();
    const roomList = rooms.map(room => ({
      id: room.room_id,
      status: room.status,
      playerCount: room.player_count,
      maxPlayers: room.max_players,
      roomStatus: room.status,
      hasPassword: !!room.password
    }));
    res.json({ rooms: roomList });
  } catch (error) {
    console.error('获取房间列表失败:', error);
    res.status(500).json({ error: '获取房间列表失败' });
  }
});

router.post('/rooms', async (req, res) => {
  try {
    const { roomId, ownerName, password } = req.body;
    if (!roomId || !ownerName) {
      return res.status(400).json({ error: '房间ID和房主名称不能为空' });
    }
    await createRoom(roomId, ownerName, password || null);
    res.json({ success: true, roomId });
  } catch (error) {
    console.error('创建房间失败:', error);
    res.status(500).json({ error: '创建房间失败' });
  }
});

router.get('/rooms/:id', async (req, res) => {
  try {
    const roomId = req.params.id;
    const room = await getRoomByRoomId(roomId);
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }
    res.json(room);
  } catch (error) {
    console.error('获取房间详情失败:', error);
    res.status(500).json({ error: '获取房间详情失败' });
  }
});

router.put('/rooms/:id', async (req, res) => {
  try {
    const roomId = req.params.id;
    const { status, playerCount } = req.body;
    await updateRoomStatus(roomId, status, playerCount);
    res.json({ success: true });
  } catch (error) {
    console.error('更新房间状态失败:', error);
    res.status(500).json({ error: '更新房间状态失败' });
  }
});

router.delete('/rooms/:id', async (req, res) => {
  try {
    const roomId = req.params.id;
    await deleteRoom(roomId);
    res.json({ success: true });
  } catch (error) {
    console.error('删除房间失败:', error);
    res.status(500).json({ error: '删除房间失败' });
  }
});

// 获取单个参数
router.get('/parameters/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const param = await getParameter(key);
    if (param) {
      res.json({ value: param.value, description: param.description });
    } else {
      res.status(404).json({ error: '参数不存在' });
    }
  } catch (error) {
    console.error('获取参数失败:', error);
    res.status(500).json({ error: '获取参数失败' });
  }
});

module.exports = router;
