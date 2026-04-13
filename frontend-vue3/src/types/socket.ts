/**
 * Socket.io 事件类型定义
 */

import type { Card } from './card'
import type { Player, PlayerBase } from './player'
import type { Room, GameState, CallingInfo, GameResult, CountdownInfo, RoomListItem } from './game'

// ==================== 客户端发送事件 ====================

// 加入房间
export interface JoinRoomData {
  roomId: string
  playerName: string
}

// 创建房间
export interface CreateRoomData {
  roomId: string
  playerName: string
}

// 离开房间
export interface LeaveRoomData {
  roomId: string
}

// 开始游戏
export interface StartGameData {
  roomId: string
}

// 叫分
export interface CallLandlordData {
  roomId: string
  score: number // 0 = 不叫, 1, 2, 3
}

// 出牌
export interface PlayCardsData {
  roomId: string
  cards: Card[]
}

// 不出
export interface PassData {
  roomId: string
}

// ==================== 服务器发送事件 ====================

// 房间更新
export interface RoomUpdatedData {
  roomId: string
  players: PlayerBase[]
}

// 游戏开始
export interface GameStartedData {
  players: Player[]
  currentPlayerIndex: number
  landlordPlayerId: string | null
  landlordCards: Card[]
}

// 叫分更新
export interface CallingUpdatedData extends CallingInfo {
  players: PlayerBase[]
}

// 出牌
export interface CardsPlayedData {
  playerId: string
  playerName: string
  cards: Card[]
  currentPlayerIndex: number
  multiplier: number
}

// 游戏结束
export interface GameEndedData extends GameResult {
  players: Player[]
}

// 出牌失败
export interface PlayCardsFailedData {
  message: string
}

// 房间列表
export interface RoomListData {
  rooms: RoomListItem[]
}

// 倒计时更新
export interface CountdownUpdatedData extends CountdownInfo {}

// ==================== Socket 事件名称 ====================

export const SocketEvents = {
  // 客户端发送
  JOIN_ROOM: 'joinRoom',
  LEAVE_ROOM: 'leaveRoom',
  CREATE_ROOM: 'createRoom',
  START_GAME: 'startGame',
  CALL_LANDLORD: 'callLandlord',
  PLAY_CARDS: 'playCards',
  PASS: 'pass',
  GET_ROOMS: 'getRooms',

  // 服务器发送
  ROOM_UPDATED: 'roomUpdated',
  GAME_STARTED: 'gameStarted',
  CALLING_UPDATED: 'callingUpdated',
  CARDS_PLAYED: 'cardsPlayed',
  GAME_ENDED: 'gameEnded',
  PLAY_CARDS_FAILED: 'playCardsFailed',
  COUNTDOWN_UPDATED: 'countdownUpdated',
  ROOM_LIST_UPDATED: 'roomListUpdated'
} as const

// Socket 事件类型映射
export interface ServerToClientEvents {
  roomUpdated: (data: RoomUpdatedData) => void
  gameStarted: (data: GameStartedData) => void
  callingUpdated: (data: CallingUpdatedData) => void
  cardsPlayed: (data: CardsPlayedData) => void
  gameEnded: (data: GameEndedData) => void
  playCardsFailed: (data: PlayCardsFailedData) => void
  countdownUpdated: (data: CountdownUpdatedData) => void
  roomListUpdated: (data: RoomListData) => void
}

export interface ClientToServerEvents {
  joinRoom: (data: JoinRoomData) => void
  leaveRoom: (data: LeaveRoomData) => void
  createRoom: (data: CreateRoomData) => void
  startGame: (data: StartGameData) => void
  callLandlord: (data: CallLandlordData) => void
  playCards: (data: PlayCardsData) => void
  pass: (data: PassData) => void
  getRooms: () => void
}
