// 游戏核心逻辑

// 生成牌组
function generateDeck() {
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
  const deck = [];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, value: getCardValue(rank) });
    }
  }
  
  // 添加大小王
  deck.push({ suit: 'JOKER', rank: '小王', value: 15 });
  deck.push({ suit: 'JOKER', rank: '大王', value: 16 });
  
  return deck;
}

// 获取牌的数值
function getCardValue(rank) {
  const values = {
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13,
    'A': 14,
    '2': 15,
    '小王': 15,
    '大王': 16
  };
  return values[rank] || 0;
}

// 洗牌
function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// 发牌
function dealCards(players) {
  const deck = shuffleDeck(generateDeck());
  const 地主Cards = deck.splice(0, 3);
  
  // 给三个玩家发牌
  for (let i = 0; i < deck.length; i++) {
    players[i % 3].cards.push(deck[i]);
  }
  
  // 对每个玩家的牌进行排序
  for (const player of players) {
    player.cards.sort((a, b) => b.value - a.value);
  }
  
  return { players, 地主Cards };
}

// 统计牌值出现的次数
function countCardValues(cards) {
  const counts = {};
  for (const card of cards) {
    counts[card.value] = (counts[card.value] || 0) + 1;
  }
  return counts;
}

// 判断牌型
function getCardType(cards) {
  if (cards.length === 0) return 'invalid';
  
  // 单牌
  if (cards.length === 1) return 'single';
  
  // 对子
  if (cards.length === 2) {
    if (cards[0].value === cards[1].value) return 'pair';
    // 王炸
    if ((cards[0].rank === '大王' && cards[1].rank === '小王') || (cards[0].rank === '小王' && cards[1].rank === '大王')) {
      return 'bomb';
    }
    return 'invalid';
  }
  
  // 三张牌
  if (cards.length === 3) {
    if (cards[0].value === cards[1].value && cards[1].value === cards[2].value) {
      return 'triple';
    }
    return 'invalid';
  }
  
  // 炸弹
  if (cards.length === 4) {
    if (cards[0].value === cards[1].value && cards[1].value === cards[2].value && cards[2].value === cards[3].value) {
      return 'bomb';
    }
    // 三带一
    const counts = countCardValues(cards);
    const values = Object.values(counts);
    if (values.includes(3) && values.includes(1)) {
      return 'triple_with_single';
    }
    return 'invalid';
  }
  
  // 四带二
  if (cards.length === 6) {
    const counts = countCardValues(cards);
    const values = Object.values(counts);
    if (values.includes(4) && (values.includes(1) || values.includes(2))) {
      return 'four_with_two';
    }
    return 'invalid';
  }
  
  // 顺子（单顺）
  if (cards.length >= 5) {
    const sorted = [...cards].sort((a, b) => a.value - b.value);
    // 检查是否包含2或王
    for (const card of sorted) {
      if (card.value >= 15) return 'invalid';
    }
    // 检查是否连续
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].value !== sorted[i - 1].value + 1) {
        return 'invalid';
      }
    }
    return 'straight';
  }
  
  // 双顺
  if (cards.length >= 6 && cards.length % 2 === 0) {
    const sorted = [...cards].sort((a, b) => a.value - b.value);
    // 检查是否包含2或王
    for (const card of sorted) {
      if (card.value >= 15) return 'invalid';
    }
    // 检查是否是连续的对子
    for (let i = 0; i < sorted.length; i += 2) {
      if (sorted[i].value !== sorted[i + 1].value) return 'invalid';
      if (i > 0 && sorted[i].value !== sorted[i - 1].value + 1) return 'invalid';
    }
    return 'double_straight';
  }
  
  // 三顺
  if (cards.length >= 6 && cards.length % 3 === 0) {
    const sorted = [...cards].sort((a, b) => a.value - b.value);
    // 检查是否包含2或王
    for (const card of sorted) {
      if (card.value >= 15) return 'invalid';
    }
    // 检查是否是连续的三张
    for (let i = 0; i < sorted.length; i += 3) {
      if (sorted[i].value !== sorted[i + 1].value || sorted[i + 1].value !== sorted[i + 2].value) {
        return 'invalid';
      }
      if (i > 0 && sorted[i].value !== sorted[i - 1].value + 1) return 'invalid';
    }
    return 'triple_straight';
  }
  
  // 飞机带翅膀
  if (cards.length >= 8 && (cards.length - 3) % 4 === 0) {
    // 简化处理，实际需要更复杂的逻辑
    return 'plane_with_wings';
  }
  
  return 'invalid';
}

// 获取牌组的大小
function getCardsValue(cards) {
  if (cards.length === 0) return 0;
  // 对牌进行排序，取最大值
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  return sorted[0].value;
}

// 判断牌是否可以出
function canPlay(cards, lastCards) {
  if (!lastCards || lastCards.length === 0) return true;
  
  const currentType = getCardType(cards);
  const lastType = getCardType(lastCards);
  
  if (currentType === 'invalid') return false;
  
  // 火箭可以打任何牌
  if (currentType === 'bomb' && cards.length === 2 && 
      ((cards[0].rank === '大王' && cards[1].rank === '小王') || (cards[0].rank === '小王' && cards[1].rank === '大王'))) {
    return true;
  }
  
  // 炸弹可以打除火箭外的任何牌
  if (currentType === 'bomb' && lastType !== 'bomb') {
    return true;
  }
  
  // 炸弹之间比较大小
  if (currentType === 'bomb' && lastType === 'bomb') {
    return getCardsValue(cards) > getCardsValue(lastCards);
  }
  
  // 类型不同不能打
  if (currentType !== lastType) return false;
  
  // 长度不同不能打
  if (cards.length !== lastCards.length) return false;
  
  // 比较大小
  return getCardsValue(cards) > getCardsValue(lastCards);
}

// 游戏状态管理
class Game {
  constructor(roomId, players) {
    this.roomId = roomId;
    this.players = players;
    this.status = 'waiting';
    this.currentPlayerIndex = Math.floor(Math.random() * 3); // 随机选择第一个叫牌的玩家
    this.lastCards = [];
    this.lastPlayerId = null;
    this.地主Cards = [];
    this.地主PlayerId = null;
    this.叫牌状态 = {
      currentCallerIndex: this.currentPlayerIndex,
      highestScore: 0,
      highestBidder: null
    };
    this.底分 = 1;
    this.倍数 = 1;
    this.炸弹数量 = 0;
    this.春天 = false;
    this.countdown = 30; // 默认倒计时30秒
    this.countdownTimer = null;
  }
  
  start() {
    const result = dealCards(this.players);
    this.players = result.players;
    this.地主Cards = result.地主Cards;
    this.status = 'calling';
  }
  
  call地主(playerId, score) {
    // 检查是否是当前叫牌玩家
    if (playerId !== this.players[this.叫牌状态.currentCallerIndex].id) return false;
    
    // 检查叫牌是否有效
    if (score > 0 && score <= 3 && score > this.叫牌状态.highestScore) {
      this.叫牌状态.highestScore = score;
      this.叫牌状态.highestBidder = playerId;
    }
    
    // 下一个玩家
    this.叫牌状态.currentCallerIndex = (this.叫牌状态.currentCallerIndex + 1) % 3;
    
    // 检查叫牌是否结束
    if (this.叫牌状态.currentCallerIndex === this.currentPlayerIndex || this.叫牌状态.highestScore === 3) {
      if (this.叫牌状态.highestBidder) {
        // 确定地主
        this.地主PlayerId = this.叫牌状态.highestBidder;
        this.底分 = this.叫牌状态.highestScore;
        
        // 给地主发底牌
        const 地主Player = this.players.find(p => p.id === this.地主PlayerId);
        if (地主Player) {
          地主Player.cards = [...地主Player.cards, ...this.地主Cards];
          地主Player.cards.sort((a, b) => b.value - a.value);
        }
        
        // 开始游戏，地主先出牌
        this.currentPlayerIndex = this.players.findIndex(p => p.id === this.地主PlayerId);
        this.status = 'playing';
      } else {
        // 重新发牌
        this.start();
      }
    }
    
    return true;
  }
  
  playCards(playerId, cards) {
    if (playerId !== this.players[this.currentPlayerIndex].id) return false;
    
    // 如果出牌区的牌是当前玩家出的，则允许出任意牌
    if (!(this.lastPlayerId === playerId || canPlay(cards, this.lastCards))) return false;
    
    // 从玩家手中移除牌
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      // 检查是否是炸弹
      const cardType = getCardType(cards);
      if (cardType === 'bomb') {
        this.炸弹数量++;
        this.倍数 *= 2;
      }
      
      // 移除牌
      for (const card of cards) {
        const index = player.cards.findIndex(c => c.suit === card.suit && c.rank === card.rank);
        if (index !== -1) {
          player.cards.splice(index, 1);
        }
      }
      
      this.lastCards = cards;
      this.lastPlayerId = playerId;
      
      // 检查是否获胜
      if (player.cards.length === 0) {
        this.status = 'ended';
        
        // 检查是否春天
        const otherPlayers = this.players.filter(p => p.id !== playerId);
        if (otherPlayers.every(p => p.cards.length === 17)) {
          this.春天 = true;
          this.倍数 *= 2;
        }
        
        return true;
      }
      
      // 下一个玩家
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 3;
      return true;
    }
    
    return false;
  }
  
  // 计算积分
  calculateScores() {
    const scores = {};
    const winnerId = this.players.find(p => p.cards.length === 0).id;
    const is地主Win = winnerId === this.地主PlayerId;
    
    for (const player of this.players) {
      if (player.id === this.地主PlayerId) {
        scores[player.id] = is地主Win ? 2 * this.底分 * this.倍数 : -2 * this.底分 * this.倍数;
      } else {
        scores[player.id] = is地主Win ? -this.底分 * this.倍数 : this.底分 * this.倍数;
      }
    }
    
    return scores;
  }
}

module.exports = {
  generateDeck,
  shuffleDeck,
  dealCards,
  getCardType,
  canPlay,
  getCardsValue,
  Game
};
