const express = require('express');
const http = require('http');
const cors = require('cors');
const { initDatabase } = require('../db/db');
const apiRouter = require('./routes/api');
const adminRouter = require('./routes/admin');
const state = require('./state');
const { attachWebSocketHandlers } = require('./socket');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.static('frontend'));
app.use(express.json());
app.use('/api/admin', adminRouter);
app.use('/api', apiRouter);

initDatabase();
attachWebSocketHandlers(server, state);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`WebSocket 路径: ws://localhost:${PORT}/ws`);
});
