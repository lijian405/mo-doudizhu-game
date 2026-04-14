/**
 * 实时通信事件类型（WebSocket JSON 帧：{ type, payload }，type 与下列名称一致）
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
  /** 部分服务端/旧客户端可能嵌套在 room 下 */
  room?: {
    id?: string
    players?: PlayerBase[]
    status?: string
  }
}

// 游戏开始
export interface GameStartedData {
  players: Player[]
  currentPlayerIndex: number
  landlordPlayerId: string | null
  landlordCards: Card[]
  /** 底分（叫分结束后确定；叫分阶段通常为 1） */
  baseScore?: number
  /** 倍数（叫几分就是几倍；后续炸弹/春天翻倍） */
  multiplier?: number
  /** 服务端二次 gameStarted（叫分结束进入出牌阶段） */
  gameStarted?: boolean
  /** 房间信息（服务端会带） */
  room?: Room
  callingInfo?: CallingInfo
}

// 叫分更新
export interface CallingUpdatedData extends CallingInfo {
  players: PlayerBase[]
  /** 服务端字段名（与 highestScorePlayerId 同义） */
  highestBidder?: string | null
  gameStatus?: string
}

// 出牌
export interface CardsPlayedData {
  playerId: string
  playerName?: string
  cards: Card[]
  currentPlayerIndex: number
  multiplier: number
  /** 服务端下发的全量玩家手牌快照 */
  players?: Player[]
  gameStatus?: string
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

// 游戏中途终止（玩家离开导致不足 3 人等）
export interface GameAbortedData {
  roomId: string
  message: string
}

// 倒计时更新
export interface CountdownUpdatedData extends CountdownInfo {}

export interface OnlineCountData {
  count: number
}

export interface CallingStartData {
  roomId: string
}

export interface RoomDeletedData {
  roomId: string
  message: string
}

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
  JOIN_ROOM_FAILED: 'joinRoomFailed',
  GAME_STARTED: 'gameStarted',
  CALLING_UPDATED: 'callingUpdated',
  CARDS_PLAYED: 'cardsPlayed',
  GAME_ENDED: 'gameEnded',
  PLAY_CARDS_FAILED: 'playCardsFailed',
  COUNTDOWN_UPDATED: 'countdownUpdated',
  ROOM_LIST_UPDATED: 'roomListUpdated',
  GAME_ABORTED: 'gameAborted',
  ONLINE_COUNT_UPDATED: 'onlineCountUpdated',
  CALLING_START: 'callingStart',
  ROOM_DELETED: 'roomDeleted',
  ROOM_TIMER_UPDATED: 'roomTimerUpdated',
  GET_ONLINE_COUNT: 'getOnlineCount'
} as const

// Socket 事件类型映射
export interface JoinRoomFailedData {
  message: string
}

export interface ServerToClientEvents {
  roomUpdated: (data: RoomUpdatedData) => void
  joinRoomFailed: (data: JoinRoomFailedData) => void
  gameStarted: (data: GameStartedData) => void
  callingUpdated: (data: CallingUpdatedData) => void
  cardsPlayed: (data: CardsPlayedData) => void
  gameEnded: (data: GameEndedData) => void
  playCardsFailed: (data: PlayCardsFailedData) => void
  countdownUpdated: (data: CountdownUpdatedData) => void
  roomListUpdated: (data: RoomListData) => void
  gameAborted: (data: GameAbortedData) => void
  onlineCountUpdated: (data: OnlineCountData) => void
  callingStart: (data: CallingStartData) => void
  roomDeleted: (data: RoomDeletedData) => void
  roomTimerUpdated: (data: RoomTimerUpdatedData) => void
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
  getOnlineCount: () => void
}

export interface RoomTimerUpdatedData {
  roomId: string
  elapsedSeconds: number
}
