const mysql = require('mysql2');

// 创建数据库连接
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'doudizhu',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 初始化数据库表
function initDatabase() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      score INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  
  const createGamesTable = `
    CREATE TABLE IF NOT EXISTS games (
      id INT AUTO_INCREMENT PRIMARY KEY,
      room_id VARCHAR(50) NOT NULL,
      winner_id INT,
      score INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (winner_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  
  pool.execute(createUsersTable, (err) => {
    if (err) {
      console.error('创建用户表失败:', err);
    } else {
      console.log('用户表创建成功');
    }
  });
  
  pool.execute(createGamesTable, (err) => {
    if (err) {
      console.error('创建游戏表失败:', err);
    } else {
      console.log('游戏表创建成功');
    }
  });
}

// 注册用户
function registerUser(name) {
  return new Promise((resolve, reject) => {
    const sql = 'INSERT INTO users (name) VALUES (?)';
    pool.execute(sql, [name], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results.insertId);
      }
    });
  });
}

// 获取用户信息
function getUserById(id) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM users WHERE id = ?';
    pool.execute(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results[0]);
      }
    });
  });
}

// 保存游戏结果
function saveGameResult(roomId, winnerId, score) {
  return new Promise((resolve, reject) => {
    const sql = 'INSERT INTO games (room_id, winner_id, score) VALUES (?, ?, ?)';
    pool.execute(sql, [roomId, winnerId, score], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results.insertId);
      }
    });
  });
}

// 更新用户分数
function updateUserScore(userId, score) {
  return new Promise((resolve, reject) => {
    const sql = 'UPDATE users SET score = score + ? WHERE id = ?';
    pool.execute(sql, [score, userId], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results.affectedRows > 0);
      }
    });
  });
}

module.exports = {
  initDatabase,
  registerUser,
  getUserById,
  saveGameResult,
  updateUserScore,
  pool
};
