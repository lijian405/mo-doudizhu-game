const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { initDatabase } = require('../db/db');
const apiRouter = require('./routes/api');
const state = require('./state');
const { attachSocketHandlers } = require('./socket');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.static('frontend'));
app.use(express.json());
app.use('/api', apiRouter);

initDatabase();
attachSocketHandlers(io, state);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
