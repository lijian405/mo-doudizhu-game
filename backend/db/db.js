const mysql = require('mysql2');

// 创建数据库连接
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '@wZkVJ$NWnL!RQV$uHHw3N*k3',
  database: 'doudizhu',
  port: 3336,
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
  
  const createRoomsTable = `
    CREATE TABLE IF NOT EXISTS rooms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      room_id VARCHAR(50) NOT NULL UNIQUE,
      status ENUM('waiting', 'full', 'playing') DEFAULT 'waiting',
      player_count INT DEFAULT 0,
      max_players INT DEFAULT 3,
      owner_name VARCHAR(50),
      password VARCHAR(50) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
  
  const createParametersTable = `
    CREATE TABLE IF NOT EXISTS parameters (
      id INT AUTO_INCREMENT PRIMARY KEY,
      key_name VARCHAR(50) NOT NULL UNIQUE,
      value VARCHAR(255) NOT NULL,
      description VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  
  pool.execute(createUsersTable, (err) => {
    if (err) {
      console.error('创建用户表失败:', err);
    } else {
      console.log('用户表创建成功');
    }
  });
  
  pool.execute(createRoomsTable, (err) => {
    if (err) {
      console.error('创建房间表失败:', err);
    } else {
      console.log('房间表创建成功');
      pool.execute(
        "ALTER TABLE rooms ADD COLUMN password VARCHAR(50) DEFAULT NULL",
        (alterErr) => {
          if (alterErr && alterErr.code !== 'ER_DUP_FIELDNAME') {
            console.error('添加password列失败:', alterErr);
          }
        }
      );
    }
  });
  
  pool.execute(createGamesTable, (err) => {
    if (err) {
      console.error('创建游戏表失败:', err);
    } else {
      console.log('游戏表创建成功');
    }
  });
  
  pool.execute(createParametersTable, (err) => {
    if (err) {
      console.error('创建参数表失败:', err);
    } else {
      console.log('参数表创建成功');
      // 插入默认参数
      const defaultParams = [
        ['default_player_score', '1000', '玩家默认分值'],
        ['room_timeout_minutes', '30', '房间超时时间（分钟）'],
        ['play_timeout_seconds', '30', '出牌超时时间（秒）']
      ];
      defaultParams.forEach(([key, value, desc]) => {
        pool.execute(
          'INSERT IGNORE INTO parameters (key_name, value, description) VALUES (?, ?, ?)',
          [key, value, desc],
          (insertErr) => {
            if (insertErr) {
              console.error(`插入默认参数 ${key} 失败:`, insertErr);
            }
          }
        );
      });
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

// 创建房间
function createRoom(roomId, ownerName, password = null) {
  return new Promise((resolve, reject) => {
    const sql = 'INSERT INTO rooms (room_id, status, player_count, owner_name, password) VALUES (?, ?, ?, ?, ?)';
    pool.execute(sql, [roomId, 'waiting', 1, ownerName, password || null], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results.insertId);
      }
    });
  });
}

// 获取房间列表
function getRooms() {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM rooms ORDER BY updated_at DESC';
    pool.execute(sql, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}

// 更新房间状态
function updateRoomStatus(roomId, status, playerCount) {
  return new Promise((resolve, reject) => {
    const sql = 'UPDATE rooms SET status = ?, player_count = ? WHERE room_id = ?';
    pool.execute(sql, [status, playerCount, roomId], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results.affectedRows > 0);
      }
    });
  });
}

// 删除房间
function deleteRoom(roomId) {
  return new Promise((resolve, reject) => {
    const sql = 'DELETE FROM rooms WHERE room_id = ?';
    pool.execute(sql, [roomId], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results.affectedRows > 0);
      }
    });
  });
}

// 获取房间信息
function getRoomByRoomId(roomId) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM rooms WHERE room_id = ?';
    pool.execute(sql, [roomId], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results[0]);
      }
    });
  });
}

// 获取所有参数
function getParameters() {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM parameters ORDER BY key_name';
    pool.execute(sql, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}

// 获取单个参数
function getParameter(keyName) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM parameters WHERE key_name = ?';
    pool.execute(sql, [keyName], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results[0]);
      }
    });
  });
}

// 更新参数
function updateParameter(keyName, value, description = null) {
  return new Promise((resolve, reject) => {
    const sql = 'UPDATE parameters SET value = ?, description = ? WHERE key_name = ?';
    pool.execute(sql, [value, description, keyName], (err, results) => {
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
  createRoom,
  getRooms,
  updateRoomStatus,
  deleteRoom,
  getRoomByRoomId,
  getParameters,
  getParameter,
  updateParameter,
  pool
};
