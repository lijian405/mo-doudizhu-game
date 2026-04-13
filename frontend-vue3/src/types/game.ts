/**
 * 游戏类型定义
 */

import type { Card } from './card'
import type { Player, PlayerBase } from './player'
export type { PlayerBase } from './player'

// 游戏状态
export type GameStatus = 'waiting' | 'calling' | 'playing' | 'ended'

// 房间列表项
export interface RoomListItem {
  id: string
  players: PlayerBase[]
  status: GameStatus
  playerCount: number
  maxPlayers: number
  roomStatus: 'waiting' | 'full' | 'playing' // 房间状态：等待中、满员中、已开始
}

// 房间信息
export interface Room {
  id: string
  players: PlayerBase[]
  status: GameStatus
  maxPlayers: number
}

// 叫分信息
export interface CallingInfo {
  currentCallerIndex: number
  highestScore: number
  highestScorePlayerId: string | null
  scores: Record<string, number> // playerId -> score
}

// 游戏状态
export interface GameState {
  status: GameStatus
  players: Player[]
  currentPlayerIndex: number
  landlordPlayerId: string | null
  landlordCards: Card[]
  playedCards: PlayedCards[]
  baseScore: number
  multiplier: number
  lastPlayedCards: Card[] | null
  lastPlayedPlayerId: string | null
}

// 已出牌记录
export interface PlayedCards {
  playerId: string
  playerName: string
  cards: Card[]
  timestamp: number
}

// 游戏结果
export interface GameResult {
  winner: 'landlord' | 'farmers'
  landlordPlayerId: string
  scores: Record<string, number> // playerId -> scoreChange
  baseScore: number
  multiplier: number
  isSpring: boolean
}

// 倒计时信息
export interface CountdownInfo {
  currentPlayerIndex: number
  countdown: number
  players: { id: string; name: string }[]
}
