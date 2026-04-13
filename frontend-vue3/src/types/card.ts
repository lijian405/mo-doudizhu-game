/**
 * 卡牌类型定义
 */

// 卡牌花色
export type CardSuit = '♠' | '♥' | '♣' | '♦' | 'joker'

// 卡牌点数
export type CardRank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2' | '小王' | '大王'

// 卡牌对象
export interface Card {
  suit: CardSuit
  rank: CardRank
  value: number // 用于比较大小的数值
}

// 卡牌组合类型
export type CardCombinationType =
  | 'single' // 单牌
  | 'pair' // 对子
  | 'triple' // 三张
  | 'tripleWithSingle' // 三带一
  | 'tripleWithPair' // 三带二
  | 'straight' // 顺子
  | 'doubleStraight' // 双顺
  | 'tripleStraight' // 三顺
  | 'airplaneWithWings' // 飞机带翅膀
  | 'fourWithTwo' // 四带二
  | 'bomb' // 炸弹
  | 'rocket' // 火箭（王炸）

// 卡牌组合
export interface CardCombination {
  type: CardCombinationType
  cards: Card[]
  value: number // 组合的值，用于比较大小
}

// 卡牌区域位置
export type CardAreaPosition = 'top' | 'left' | 'bottom' | 'landlord' | 'play'
