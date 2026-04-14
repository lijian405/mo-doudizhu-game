/**
 * 玩家类型定义
 */

import type { Card } from './card'

// 玩家角色
export type PlayerRole = 'landlord' | 'farmer'

// 玩家基础信息
export interface PlayerBase {
  id: string
  name: string
  role?: PlayerRole
  isLandlord: boolean
  score: number
}

// 游戏中的玩家
export interface Player extends PlayerBase {
  cards: Card[]
  cardCount: number
}

// 玩家位置（主界面：left / bottom(self) / right）
export type PlayerPosition = 'left' | 'right' | 'bottom'

// 玩家状态
export interface PlayerState {
  id: string
  name: string
  score: number
  isLandlord: boolean
  isCurrentTurn: boolean
  cardCount: number
  position: PlayerPosition
}

// 当前登录玩家
export interface CurrentPlayer {
  id: string
  name: string
  roomId: string
  score: number
}
