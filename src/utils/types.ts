export type CardColor = 'red' | 'yellow' | 'blue' | 'green'

export type CardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4'

export interface Card {
  id: string
  color: CardColor | null
  type: CardType
  value?: number
}

export type Direction = 'clockwise' | 'counterclockwise'

export type GamePhase = 'idle' | 'dealing' | 'playing' | 'color-picking' | 'round-over' | 'challenge' | 'stacking' | 'seven-swap' | 'uno-call'

export interface Player {
  id: string
  name: string
  hand: Card[]
  isHuman: boolean
}

export interface DealItem {
  playerIndex: number
  card: Card
}

export interface DealAnimConfig {
  singleCardDuration: number
  cardInterval: number
  timeout: number
  easing: string
}

export type GameEventType = 'deal' | 'play' | 'draw' | 'skip' | 'reverse' | 'color-pick'
  | 'draw2-stack' | 'wild4-challenge' | 'uno-call' | 'game-start' | 'round-over'

export interface GameLogEntry {
  timestamp: number
  event: GameEventType
  playerName: string
  cardInfo?: string
  extra?: string
}

export type DrawResolution =
  | { type: 'advanceTurn'; skipCount: number }
  | { type: 'setPlayer'; playerIndex: number }
  | null
