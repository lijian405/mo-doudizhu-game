/**
 * deck.js - 牌堆管理模块
 * 生成、洗牌、发牌等功能
 */
const { getCardValue } = require('./cardValue');

function generateDeck() {
  const suits = ['\u2660\uFE0F', '\u2665\uFE0F', '\u2666\uFE0F', '\u2663\uFE0F'];
  const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
  const deck = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, value: getCardValue(rank) });
    }
  }

  const crown = '\u{1F451}';
  deck.push({ suit: crown, rank: '小王', value: 16 });
  deck.push({ suit: crown, rank: '大王', value: 17 });

  return deck;
}

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// 发牌（cheatTargetName 与某位玩家 name 完全一致时，该玩家获得大王、小王与任意两张 2，其余牌随机）
function dealCards(players, cheatTargetName) {
  for (const player of players) {
    player.cards = [];
  }

  const trimmed = cheatTargetName && String(cheatTargetName).trim();
  const targetIdx = trimmed ? players.findIndex((p) => p.name === trimmed) : -1;

  if (targetIdx < 0) {
    const deck = shuffleDeck(generateDeck());
    const 地主Cards = deck.splice(0, 3);
    for (let i = 0; i < deck.length; i++) {
      players[i % 3].cards.push(deck[i]);
    }
    for (const player of players) {
      player.cards.sort((a, b) => b.value - a.value);
      player.cardCount = player.cards.length;
    }
    return { players, 地主Cards };
  }

  const deck = generateDeck();
  const rigged = [];
  const takeOne = (pred) => {
    const i = deck.findIndex(pred);
    if (i === -1) return false;
    rigged.push(deck.splice(i, 1)[0]);
    return true;
  };
  takeOne((c) => c.rank === '大王');
  takeOne((c) => c.rank === '小王');
  let foundTwos = 0;
  for (let t = 0; t < deck.length && foundTwos < 2; ) {
    const c = deck[t];
    if (c.rank === '2') {
      rigged.push(deck.splice(t, 1)[0]);
      foundTwos++;
    } else {
      t++;
    }
  }

  if (rigged.length < 4) {
    return dealCards(players, null);
  }

  shuffleDeck(deck);
  const 地主Cards = deck.splice(0, 3);
  const rest = deck;
  const need = [17, 17, 17];
  need[targetIdx] = 13;
  let i = 0;
  for (let p = 0; p < 3; p++) {
    while (players[p].cards.length < need[p] && i < rest.length) {
      players[p].cards.push(rest[i++]);
    }
  }
  players[targetIdx].cards.push(...rigged);
  for (const player of players) {
    player.cards.sort((a, b) => b.value - a.value);
    player.cardCount = player.cards.length;
  }
  return { players, 地主Cards };
}

module.exports = { generateDeck, shuffleDeck, dealCards };
