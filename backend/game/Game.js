/**
 * Game.js - 斗地主游戏核心类
 * 负责管理游戏状态、玩家操作、游戏流程控制等
 */
const { dealCards } = require('./deck');
const { getCardType } = require('./cardType');
const { canPlay } = require('./canPlay');

class Game {
  constructor(roomId, players) {
    this.roomId = roomId;
    this.players = players;
    this.status = 'waiting';
    this.currentPlayerIndex = Math.floor(Math.random() * 3); // 随机第一个叫牌
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
    this.countdown = 30; // 默认倒计时 30 秒
    this.countdownTimer = null;
    /** @type {string | null} 重开发牌时沿用 */
    this._cheatTargetName = null;
  }

  start(cheatTargetName) {
    if (cheatTargetName !== undefined) {
      this._cheatTargetName = cheatTargetName && String(cheatTargetName).trim() ? cheatTargetName : null;
    }
    const result = dealCards(this.players, this._cheatTargetName);
    this.players = result.players;
    this.地主Cards = result.地主Cards;
    this.status = 'calling';
  }

  call地主(playerId, score) {
    if (playerId !== this.players[this.叫牌状态.currentCallerIndex].id) return false;

    if (score > 0 && score <= 3 && score > this.叫牌状态.highestScore) {
      this.叫牌状态.highestScore = score;
      this.叫牌状态.highestBidder = playerId;
    }

    this.叫牌状态.currentCallerIndex = (this.叫牌状态.currentCallerIndex + 1) % 3;

    if (this.叫牌状态.currentCallerIndex === this.currentPlayerIndex || this.叫牌状态.highestScore === 3) {
      if (this.叫牌状态.highestBidder) {
        this.地主PlayerId = this.叫牌状态.highestBidder;
        this.底分 = this.叫牌状态.highestScore;
        const 地主Player = this.players.find(p => p.id === this.地主PlayerId);
        if (地主Player) {
          地主Player.cards = [...地主Player.cards, ...this.地主Cards];
          地主Player.cards.sort((a, b) => b.value - a.value);
          地主Player.cardCount = 地主Player.cards.length;
        }

        this.currentPlayerIndex = this.players.findIndex(p => p.id === this.地主PlayerId);
        this.status = 'playing';
      } else {
        this.start(undefined);
      }
    }

    return true;
  }

  playCards(playerId, cards) {
    if (playerId !== this.players[this.currentPlayerIndex].id) return false;

    const cardType = getCardType(cards);
    if (cardType === 'invalid') return false;
    // 轮到自己：不必压过上一手，但须为合法牌型
    if (this.lastPlayerId !== playerId && !canPlay(cards, this.lastCards)) return false;

    const player = this.players.find(p => p.id === playerId);
    if (player) {
      if (cardType === 'bomb') {
        this.炸弹数量++;
        this.倍数 *= 2;
      }

      const removeNeed = new Map();
      for (const card of cards) {
        const key = `${card.suit}\0${card.rank}`;
        removeNeed.set(key, (removeNeed.get(key) || 0) + 1);
      }
      const kept = [];
      for (const c of player.cards) {
        const key = `${c.suit}\0${c.rank}`;
        const n = removeNeed.get(key) || 0;
        if (n > 0) {
          removeNeed.set(key, n - 1);
          continue;
        }
        kept.push(c);
      }
      player.cards = kept;

      player.cardCount = player.cards.length;

      this.lastCards = cards;
      this.lastPlayerId = playerId;

      if (player.cards.length === 0) {
        this.status = 'ended';

        const otherPlayers = this.players.filter(p => p.id !== playerId);
        if (otherPlayers.every(p => p.cards.length === 17)) {
          this.春天 = true;
          this.倍数 *= 2;
        }

        return true;
      }

      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 3;
      return true;
    }

    return false;
  }

  calculateScores() {
    const scores = {};
    const winner = this.players.find((p) => p.cards.length === 0);
    if (!winner) {
      for (const player of this.players) {
        scores[player.id] = 0;
      }
      return scores;
    }
    const winnerId = winner.id;
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

module.exports = { Game };
