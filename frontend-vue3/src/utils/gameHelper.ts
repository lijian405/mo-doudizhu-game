/**
 * 游戏辅助函数
 */

import type { Player, PlayerPosition } from '@/types'

// 获取玩家位置名称
export function getPositionName(position: PlayerPosition): string {
  const names: Record<PlayerPosition, string> = {
    top: '上方',
    left: '左侧',
    bottom: '自己'
  }
  return names[position]
}

// 计算下一个玩家索引
export function getNextPlayerIndex(currentIndex: number, totalPlayers: number): number {
  return (currentIndex + 1) % totalPlayers
}

// 格式化倒计时
export function formatCountdown(seconds: number): string {
  return seconds.toString()
}

// 计算得分变化
export function calculateScoreChange(
  isLandlord: boolean,
  isWinner: boolean,
  baseScore: number,
  multiplier: number
): number {
  if (isLandlord) {
    // 地主得分
    return isWinner ? 2 * baseScore * multiplier : -2 * baseScore * multiplier
  } else {
    // 农民得分
    return isWinner ? baseScore * multiplier : -baseScore * multiplier
  }
}

// 检查是否是春天
export function isSpring(
  landlordWon: boolean,
  farmerCardsPlayed: number,
  landlordCardsPlayed: number
): boolean {
  if (landlordWon) {
    // 地主春天：地主出完牌，农民一张未出
    return farmerCardsPlayed === 0
  } else {
    // 反春天：农民出完牌，地主只出过一手
    return landlordCardsPlayed === 1
  }
}

// 生成房间ID
export function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// 验证玩家名称
export function validatePlayerName(name: string): { valid: boolean; message?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, message: '请输入玩家名称' }
  }
  if (name.trim().length > 20) {
    return { valid: false, message: '玩家名称不能超过20个字符' }
  }
  return { valid: true }
}

// 验证房间ID
export function validateRoomId(roomId: string): { valid: boolean; message?: string } {
  if (!roomId || roomId.trim().length === 0) {
    return { valid: false, message: '请输入房间ID' }
  }
  return { valid: true }
}

// 获取玩家显示名称（带角色标识）
export function getPlayerDisplayName(player: Player): string {
  if (player.isLandlord) {
    return `${player.name} [地主]`
  }
  return player.name
}

// 判断游戏是否结束
export function isGameOver(players: Player[]): boolean {
  return players.some(p => p.cardCount === 0)
}

// 获取获胜者
export function getWinner(players: Player[]): Player | null {
  return players.find(p => p.cardCount === 0) || null
}
