// 全局变量
let socket = null;
let playerName = '';
let roomId = '';
let selectedCards = [];
let playerScores = {}; // 存储玩家分值

// DOM元素
const loginScreen = document.getElementById('login-screen');
const roomScreen = document.getElementById('room-screen');
const callingScreen = document.getElementById('calling-screen');
const gameScreen = document.getElementById('game-screen');
const playerNameInput = document.getElementById('player-name');
const roomIdInput = document.getElementById('room-id');
const joinRoomBtn = document.getElementById('join-room-btn');
const createRoomBtn = document.getElementById('create-room-btn');
const currentRoomIdSpan = document.getElementById('current-room-id');
const playersUl = document.getElementById('players-ul');
const startGameBtn = document.getElementById('start-game-btn');
const leaveRoomBtn = document.getElementById('leave-room-btn');
const gameMessage = document.getElementById('game-message'); // 游戏消息提示
const topPlayerName = document.getElementById('top-player-name');
const leftPlayerName = document.getElementById('left-player-name');
const bottomPlayerName = document.getElementById('bottom-player-name');
const topPlayerCards = document.getElementById('top-player-cards');
const leftPlayerCards = document.getElementById('left-player-cards');
const bottomPlayerCards = document.getElementById('bottom-player-cards');
const landlordCardsContainer = document.getElementById('landlord-cards-container');
const playCardsContainer = document.getElementById('play-cards-container');
const playBtn = document.getElementById('play-btn');
const passBtn = document.getElementById('pass-btn');
const currentCallerSpan = document.getElementById('current-caller');
const highestScoreSpan = document.getElementById('highest-score');
const call1Btn = document.getElementById('call-1-btn');
const call2Btn = document.getElementById('call-2-btn');
const call3Btn = document.getElementById('call-3-btn');
const callPassBtn = document.getElementById('call-pass-btn');

// 初始化
function init() {
  // 连接socket.io服务器
  socket = io('http://localhost:3000');
  
  // 事件监听
  joinRoomBtn.addEventListener('click', joinRoom);
  createRoomBtn.addEventListener('click', createRoom);
  leaveRoomBtn.addEventListener('click', leaveRoom);
  startGameBtn.addEventListener('click', startGame);
  playBtn.addEventListener('click', playCards);
  passBtn.addEventListener('click', pass);
  call1Btn.addEventListener('click', () => callScore(1));
  call2Btn.addEventListener('click', () => callScore(2));
  call3Btn.addEventListener('click', () => callScore(3));
  callPassBtn.addEventListener('click', () => callScore(0));
  
  // 服务器事件
  socket.on('roomUpdated', handleRoomUpdated);
  socket.on('gameStarted', handleGameStarted);
  socket.on('callingUpdated', handleCallingUpdated);
  socket.on('cardsPlayed', handleCardsPlayed);
  socket.on('gameEnded', handleGameEnded);
  socket.on('playCardsFailed', handlePlayCardsFailed);
  socket.on('countdownUpdated', handleCountdownUpdated);
}

// 加入房间
function joinRoom() {
  playerName = playerNameInput.value.trim();
  roomId = roomIdInput.value.trim();
  
  if (!playerName || !roomId) {
    alert('请输入玩家名称和房间ID');
    return;
  }
  
  socket.emit('joinRoom', {
    roomId: roomId,
    playerName: playerName
  });
  loginScreen.style.display = 'none';
  roomScreen.style.display = 'block';
  currentRoomIdSpan.textContent = roomId;
}

// 创建房间
function createRoom() {
  playerName = playerNameInput.value.trim();
  if (!playerName) {
    alert('请输入玩家名称');
    return;
  }
  
  // 生成随机房间ID
  roomId = Math.random().toString(36).substr(2, 9);
  socket.emit('joinRoom', {
    roomId: roomId,
    playerName: playerName
  });
  loginScreen.style.display = 'none';
  roomScreen.style.display = 'block';
  currentRoomIdSpan.textContent = roomId;
}

// 离开房间
function leaveRoom() {
  socket.emit('leaveRoom', {
    roomId: roomId
  });
  roomScreen.style.display = 'none';
  gameScreen.style.display = 'none';
  loginScreen.style.display = 'block';
  playersUl.innerHTML = '';
  selectedCards = [];
}

// 开始游戏
function startGame() {
  socket.emit('startGame', {
    roomId: roomId
  });
  roomScreen.style.display = 'none';
  gameScreen.style.display = 'block';
}

// 处理房间更新
function handleRoomUpdated(data) {
  const room = data.room;
  playersUl.innerHTML = '';
  room.players.forEach(player => {
    const li = document.createElement('li');
    li.textContent = player.name;
    playersUl.appendChild(li);
  });
  
  // 更新开始游戏按钮状态
  startGameBtn.disabled = room.players.length < 3;
}

// 处理游戏开始
function handleGameStarted(data) {
  console.log('=== 游戏开始 ===');
  console.log('游戏数据:', data);
  console.log('玩家列表:', data.players);
  console.log('地主PlayerId:', data.landlordPlayerId);
  console.log('当前玩家索引:', data.currentPlayerIndex);
  
  // 切换到游戏界面
  roomScreen.style.display = 'none';
  gameScreen.style.display = 'block';
  
  // 初始化玩家分值为1000分
  data.players.forEach(player => {
    if (!playerScores[player.id]) {
      playerScores[player.id] = 1000;
      console.log(`初始化玩家 ${player.name} 分值为 1000`);
    }
  });
  
  // 更新玩家名称和分值
  bottomPlayerName.textContent = playerName;
  const bottomPlayer = data.players.find(p => p.name === playerName);
  if (bottomPlayer) {
    document.getElementById('bottom-player-score').textContent = `分值: ${playerScores[bottomPlayer.id]}`;
    console.log(`自己的牌数: ${bottomPlayer.cards.length}`);
  }
  
  // 假设其他玩家的位置
  const otherPlayers = data.players.filter(p => p.name !== playerName);
  console.log('其他玩家:', otherPlayers);
  
  if (otherPlayers.length >= 1) {
    topPlayerName.textContent = otherPlayers[0].name;
    document.getElementById('top-player-score').textContent = `分值: ${playerScores[otherPlayers[0].id]}`;
    console.log(`顶部玩家: ${otherPlayers[0].name}`);
  }
  if (otherPlayers.length >= 2) {
    leftPlayerName.textContent = otherPlayers[1].name;
    document.getElementById('left-player-score').textContent = `分值: ${playerScores[otherPlayers[1].id]}`;
    console.log(`左侧玩家: ${otherPlayers[1].name}`);
  }
  
  // 显示地主标识
  if (data.landlordPlayerId) {
    console.log('地主ID:', data.landlordPlayerId);
    // 隐藏所有地主标识
    document.getElementById('top-player-landlord').classList.remove('show');
    document.getElementById('left-player-landlord').classList.remove('show');
    document.getElementById('bottom-player-landlord').classList.remove('show');
    
    // 显示当前地主标识
    const bottomPlayer = data.players.find(p => p.name === playerName);
    const otherPlayers = data.players.filter(p => p.name !== playerName);
    
    if (otherPlayers.length >= 1 && otherPlayers[0].id === data.landlordPlayerId) {
      document.getElementById('top-player-landlord').textContent = '地主';
      document.getElementById('top-player-landlord').classList.add('show');
      console.log(`顶部玩家 ${otherPlayers[0].name} 是地主`);
    } else if (otherPlayers.length >= 2 && otherPlayers[1].id === data.landlordPlayerId) {
      document.getElementById('left-player-landlord').textContent = '地主';
      document.getElementById('left-player-landlord').classList.add('show');
      console.log(`左侧玩家 ${otherPlayers[1].name} 是地主`);
    } else if (bottomPlayer && bottomPlayer.id === data.landlordPlayerId) {
      document.getElementById('bottom-player-landlord').textContent = '地主';
      document.getElementById('bottom-player-landlord').classList.add('show');
      console.log(`自己是地主`);
    }
  }
  
  // 显示当前出牌玩家
  console.log('更新当前出牌玩家标识，索引:', data.currentPlayerIndex);
  updateTurnIndicator(data.currentPlayerIndex, data.players);
  
  // 显示自己的牌
  const myCards = data.players.find(p => p.name === playerName).cards;
  console.log('自己的牌:', myCards);
  renderCards(bottomPlayerCards, myCards, true);
  
  // 显示地主牌
  console.log('地主牌:', data.landlordCards);
  renderCards(landlordCardsContainer, data.landlordCards, false);
  
  // 显示其他玩家的牌（背面）
  console.log('显示其他玩家的牌（背面）');
  renderCardBacks(topPlayerCards, 17);
  renderCardBacks(leftPlayerCards, 17);
  
  // 清空出牌区域
  console.log('清空出牌区域');
  playCardsContainer.innerHTML = '';
  
  console.log('=== 游戏开始完成 ===');
}

// 更新当前出牌玩家标识
function updateTurnIndicator(currentPlayerIndex, players) {
  console.log('=== 更新当前出牌玩家标识 ===');
  console.log('当前玩家索引:', currentPlayerIndex);
  console.log('玩家列表:', players);
  
  // 隐藏所有轮到标识
  const topTurn = document.getElementById('top-player-turn');
  const leftTurn = document.getElementById('left-player-turn');
  const bottomTurn = document.getElementById('bottom-player-turn');
  
  console.log('隐藏所有轮到标识');
  if (topTurn) topTurn.classList.remove('show');
  if (leftTurn) leftTurn.classList.remove('show');
  if (bottomTurn) bottomTurn.classList.remove('show');
  
  if (players && players.length > 0 && currentPlayerIndex !== undefined) {
    // 获取当前轮到的玩家
    const currentPlayer = players[currentPlayerIndex];
    if (currentPlayer) {
      console.log('当前轮到的玩家:', currentPlayer.name);
      
      // 获取自己和其他玩家
      const bottomPlayer = players.find(p => p.name === playerName);
      const otherPlayers = players.filter(p => p.name !== playerName);
      
      console.log('自己:', bottomPlayer ? bottomPlayer.name : '未找到');
      console.log('其他玩家:', otherPlayers.map(p => p.name));
      
      // 确定当前玩家的位置并显示轮到标识
      if (otherPlayers.length >= 1 && currentPlayer.id === otherPlayers[0].id) {
        // 当前玩家是顶部玩家
        console.log('当前玩家是顶部玩家:', currentPlayer.name);
        if (topTurn) topTurn.classList.add('show');
      } else if (otherPlayers.length >= 2 && currentPlayer.id === otherPlayers[1].id) {
        // 当前玩家是左侧玩家
        console.log('当前玩家是左侧玩家:', currentPlayer.name);
        if (leftTurn) leftTurn.classList.add('show');
      } else if (bottomPlayer && currentPlayer.id === bottomPlayer.id) {
        // 当前玩家是自己（底部玩家）
        console.log('当前玩家是自己（底部玩家）:', currentPlayer.name);
        if (bottomTurn) bottomTurn.classList.add('show');
      }
      
      // 启用或禁用出牌按钮
      if (currentPlayer.name === playerName) {
        console.log('轮到自己出牌，启用出牌按钮');
        document.getElementById('play-btn').disabled = false;
        document.getElementById('pass-btn').disabled = false;
      } else {
        console.log('轮到其他玩家出牌，禁用出牌按钮');
        document.getElementById('play-btn').disabled = true;
        document.getElementById('pass-btn').disabled = true;
      }
    } else {
      console.log('未找到当前玩家');
    }
  } else {
    console.log('玩家列表为空或当前玩家索引未定义');
  }
  
  console.log('=== 更新当前出牌玩家标识完成 ===');
}

// 渲染卡牌
function renderCards(container, cards, isClickable) {
  container.innerHTML = '';
  cards.forEach(card => {
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    cardElement.dataset.suit = card.suit;
    cardElement.dataset.rank = card.rank;
    
    const suitElement = document.createElement('div');
    suitElement.className = 'suit';
    suitElement.textContent = card.suit;
    
    const rankElement = document.createElement('div');
    rankElement.className = 'rank';
    rankElement.textContent = card.rank;
    
    cardElement.appendChild(suitElement);
    cardElement.appendChild(rankElement);
    
    if (isClickable) {
      cardElement.addEventListener('click', () => toggleCardSelection(cardElement, card));
    }
    
    // 添加入场动画
    cardElement.style.opacity = '0';
    cardElement.style.transform = 'scale(0.5)';
    container.appendChild(cardElement);
    
    // 动画效果
    setTimeout(() => {
      cardElement.style.transition = 'all 0.3s ease';
      cardElement.style.opacity = '1';
      cardElement.style.transform = 'scale(1)';
    }, 50);
  });
}

// 渲染卡牌背面
function renderCardBacks(container, count) {
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    cardElement.style.backgroundColor = '#333';
    cardElement.style.color = 'white';
    cardElement.textContent = '♠';
    
    // 添加入场动画
    cardElement.style.opacity = '0';
    cardElement.style.transform = 'scale(0.5)';
    container.appendChild(cardElement);
    
    // 动画效果
    setTimeout(() => {
      cardElement.style.transition = 'all 0.3s ease';
      cardElement.style.opacity = '1';
      cardElement.style.transform = 'scale(1)';
    }, 50);
  }
}

// 切换卡牌选择状态
function toggleCardSelection(cardElement, card) {
  cardElement.classList.toggle('selected');
  
  // 添加选择动画
  if (cardElement.classList.contains('selected')) {
    cardElement.style.transform = 'translateY(-10px) scale(1.1)';
  } else {
    cardElement.style.transform = 'translateY(0) scale(1)';
  }
  
  const index = selectedCards.findIndex(c => c.suit === card.suit && c.rank === card.rank);
  if (index === -1) {
    selectedCards.push(card);
  } else {
    selectedCards.splice(index, 1);
  }
}

// 出牌
function playCards() {
  console.log('=== 出牌函数 ===');
  console.log('选中的牌:', selectedCards);
  
  if (selectedCards.length === 0) {
    console.log('未选择牌，提示用户');
    showGameMessage('请选择要出的牌', 'error');
    return;
  }
  
  // 保存选中的牌，以便在出牌失败时恢复
  const savedSelectedCards = [...selectedCards];
  
  // 添加出牌动画
  console.log('添加出牌动画');
  const selectedCardElements = document.querySelectorAll('.card.selected');
  selectedCardElements.forEach(cardElement => {
    cardElement.style.transition = 'all 0.5s ease';
    cardElement.style.transform = 'translateY(-50px) scale(1.2)';
    cardElement.style.opacity = '0';
  });
  
  setTimeout(() => {
    console.log('发送出牌请求到服务器');
    socket.emit('playCards', {
      roomId: roomId,
      cards: selectedCards
    });
    // 暂时不清空选中的牌，等待服务器响应
    console.log('出牌请求已发送，等待服务器响应');
  }, 500);
  
  console.log('=== 出牌函数完成 ===');
}

// 不出
function pass() {
  console.log('=== 不出牌函数 ===');
  
  // 添加不出牌动画
  console.log('添加不出牌动画');
  const passBtn = document.getElementById('pass-btn');
  passBtn.style.backgroundColor = '#f44336';
  passBtn.style.transform = 'scale(1.1)';
  
  setTimeout(() => {
    passBtn.style.transition = 'all 0.3s ease';
    passBtn.style.backgroundColor = '#4CAF50';
    passBtn.style.transform = 'scale(1)';
  }, 300);
  
  // 发送不出牌请求到服务器
  console.log('发送不出牌请求到服务器');
  socket.emit('pass', {
    roomId: roomId
  });
  
  console.log('=== 不出牌函数完成 ===');
}

// 处理出牌
function handleCardsPlayed(data) {
  console.log('=== 处理出牌 ===');
  console.log('出牌数据:', data);
  console.log('出牌玩家ID:', data.playerId);
  console.log('出牌:', data.cards);
  console.log('当前玩家索引:', data.currentPlayerIndex);
  console.log('游戏状态:', data.gameStatus);
  console.log('倍数:', data.multiplier);
  
  // 只有当cards不为空时才更新出牌区域
  if (data.cards && data.cards.length > 0) {
    // 清空出牌区域
    playCardsContainer.innerHTML = '';
    
    // 添加出牌动画
    console.log('添加出牌动画');
    data.cards.forEach((card, index) => {
      setTimeout(() => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.suit = card.suit;
        cardElement.dataset.rank = card.rank;
        
        const suitElement = document.createElement('div');
        suitElement.className = 'suit';
        suitElement.textContent = card.suit;
        
        const rankElement = document.createElement('div');
        rankElement.className = 'rank';
        rankElement.textContent = card.rank;
        
        cardElement.appendChild(suitElement);
        cardElement.appendChild(rankElement);
        
        // 动画效果
        cardElement.style.opacity = '0';
        cardElement.style.transform = 'scale(0.5) translateY(-50px)';
        playCardsContainer.appendChild(cardElement);
        
        setTimeout(() => {
          cardElement.style.transition = 'all 0.5s ease';
          cardElement.style.opacity = '1';
          cardElement.style.transform = 'scale(1) translateY(0)';
        }, 50);
      }, index * 100);
    });
  } else {
    console.log('玩家不出牌，保持出牌区域不变');
  }
  
  // 更新玩家手牌
  console.log('更新玩家手牌');
  data.players.forEach(player => {
    if (player.name === playerName) {
      console.log(`自己的剩余牌数: ${player.cards.length}`);
      console.log(`自己的剩余牌: ${JSON.stringify(player.cards)}`);
      renderCards(bottomPlayerCards, player.cards, true);
      // 出牌成功，清空选中的牌
      selectedCards = [];
      console.log('出牌成功，清空选中的牌');
    }
  });
  
  // 更新当前出牌玩家
  console.log('更新当前出牌玩家标识，索引:', data.currentPlayerIndex);
  updateTurnIndicator(data.currentPlayerIndex, data.players);
  
  // 检查游戏是否结束
  if (data.gameStatus === 'ended') {
    console.log('游戏结束，赢家ID:', data.winnerId);
    // 添加游戏结束动画
    setTimeout(() => {
      gameEndAnimation(data.winnerId === socket.id, data.scores, data.baseScore, data.multiplier);
    }, 1000);
  }
  
  console.log('=== 处理出牌完成 ===');
}

// 游戏结束动画
function gameEndAnimation(isWinner, scores, 底分, 倍数) {
  const gameScreen = document.getElementById('game-screen');
  const message = isWinner ? '恭喜你获胜了！' : '游戏结束，下次加油！';
  
  // 创建胜利/失败消息
  const messageElement = document.createElement('div');
  messageElement.style.position = 'fixed';
  messageElement.style.top = '50%';
  messageElement.style.left = '50%';
  messageElement.style.transform = 'translate(-50%, -50%)';
  messageElement.style.backgroundColor = isWinner ? '#4CAF50' : '#f44336';
  messageElement.style.color = 'white';
  messageElement.style.padding = '40px';
  messageElement.style.borderRadius = '10px';
  messageElement.style.fontSize = '24px';
  messageElement.style.fontWeight = 'bold';
  messageElement.style.zIndex = '1000';
  messageElement.style.opacity = '0';
  messageElement.style.transform = 'translate(-50%, -50%) scale(0.5)';
  
  // 添加积分信息
  let scoreText = '';
  if (scores && 底分 && 倍数) {
    scoreText = `<br>底分: ${底分} | 倍数: ${倍数}<br>你的得分: ${scores[socket.id] || 0}`;
  }
  
  messageElement.innerHTML = message + scoreText;
  
  document.body.appendChild(messageElement);
  
  // 动画效果
  setTimeout(() => {
    messageElement.style.transition = 'all 0.5s ease';
    messageElement.style.opacity = '1';
    messageElement.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 100);
  
  // 3秒后返回房间界面
  setTimeout(() => {
    gameScreen.style.display = 'none';
    roomScreen.style.display = 'block';
    document.body.removeChild(messageElement);
  }, 3000);
}

// 叫分函数
function callScore(score) {
  socket.emit('callLandlord', {
    roomId: roomId,
    score: score
  });
}

// 处理叫地主状态更新
function handleCallingUpdated(data) {
  console.log('叫地主状态更新:', data);
  
  // 切换到叫分界面
  roomScreen.style.display = 'none';
  callingScreen.style.display = 'block';
  // 不隐藏游戏界面
  // gameScreen.style.display = 'none';
  
  // 更新叫分信息
  highestScoreSpan.textContent = data.highestScore;
  
  // 更新当前叫分玩家
  if (data.players && data.currentCallerIndex !== undefined) {
    const currentCaller = data.players[data.currentCallerIndex];
    if (currentCaller) {
      currentCallerSpan.textContent = currentCaller.name;
      
      // 只有当前叫分的玩家可以操作
      const isCurrentCaller = currentCaller.name === playerName;
      call1Btn.disabled = !isCurrentCaller;
      call2Btn.disabled = !isCurrentCaller;
      call3Btn.disabled = !isCurrentCaller;
      callPassBtn.disabled = !isCurrentCaller;
    }
  }
  
  // 游戏开始，隐藏叫分界面
  if (data.gameStatus === 'playing') {
    callingScreen.style.display = 'none';
  }
}

// 处理游戏结束
function handleGameEnded(data) {
  // 更新玩家分值
  if (data.scores) {
    for (const [playerId, score] of Object.entries(data.scores)) {
      if (playerScores[playerId]) {
        playerScores[playerId] += score;
      } else {
        playerScores[playerId] = 1000 + score;
      }
    }
  }
  
  gameEndAnimation(data.winnerId === socket.id, data.scores, data.底分, data.倍数);
}

// 处理出牌失败
// 显示游戏消息
function showGameMessage(message, type = 'info') {
  gameMessage.textContent = message;
  gameMessage.className = `game-message show ${type}`;
  
  // 3秒后自动隐藏
  setTimeout(() => {
    gameMessage.classList.remove('show');
  }, 3000);
}

function handlePlayCardsFailed(data) {
  console.log('=== 出牌失败 ===');
  console.log('失败原因:', data.message);
  
  // 显示错误消息
  showGameMessage(data.message, 'error');
  
  // 恢复牌的显示状态
  console.log('恢复牌的显示状态');
  const cardElements = document.querySelectorAll('.card');
  cardElements.forEach(cardElement => {
    // 恢复牌的样式
    cardElement.style.transition = 'all 0.5s ease';
    cardElement.style.transform = '';
    cardElement.style.opacity = '1';
  });
  
  // 确保选中的牌仍然显示为选中状态
  if (selectedCards.length > 0) {
    console.log('恢复选中的牌的选中状态');
    const cardElements = document.querySelectorAll('.card');
    cardElements.forEach(cardElement => {
      const suit = cardElement.dataset.suit;
      const rank = cardElement.dataset.rank;
      
      // 检查当前牌是否在选中的牌中
      const isSelected = selectedCards.some(card => card.suit === suit && card.rank === rank);
      if (isSelected) {
        cardElement.classList.add('selected');
      }
    });
  }
  
  console.log('=== 出牌失败处理完成 ===');
}

// 处理倒计时更新
function handleCountdownUpdated(data) {
  console.log('=== 处理倒计时更新 ===');
  console.log('倒计时:', data.countdown);
  console.log('当前玩家索引:', data.currentPlayerIndex);
  console.log('玩家列表:', data.players);
  
  // 隐藏所有倒计时指示器
  document.getElementById('top-player-countdown').classList.remove('show');
  document.getElementById('left-player-countdown').classList.remove('show');
  document.getElementById('bottom-player-countdown').classList.remove('show');
  
  // 找到当前玩家
  const currentPlayer = data.players && data.players[data.currentPlayerIndex];
  if (!currentPlayer) {
    console.log('当前玩家未找到');
    return;
  }
  
  console.log('当前玩家:', currentPlayer.name);
  console.log('顶部玩家名称:', topPlayerName.textContent);
  console.log('左侧玩家名称:', leftPlayerName.textContent);
  console.log('底部玩家名称:', bottomPlayerName.textContent);
  
  // 显示当前玩家的倒计时
  if (currentPlayer.name === topPlayerName.textContent) {
    const countdownElement = document.getElementById('top-player-countdown');
    countdownElement.textContent = data.countdown;
    countdownElement.classList.add('show');
    console.log('显示顶部玩家倒计时:', data.countdown);
  } else if (currentPlayer.name === leftPlayerName.textContent) {
    const countdownElement = document.getElementById('left-player-countdown');
    countdownElement.textContent = data.countdown;
    countdownElement.classList.add('show');
    console.log('显示左侧玩家倒计时:', data.countdown);
  } else if (currentPlayer.name === bottomPlayerName.textContent) {
    const countdownElement = document.getElementById('bottom-player-countdown');
    countdownElement.textContent = data.countdown;
    countdownElement.classList.add('show');
    console.log('显示底部玩家倒计时:', data.countdown);
  }
  
  console.log('=== 处理倒计时更新完成 ===');
}

// 初始化应用
init();
