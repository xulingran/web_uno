export type CardColor = 'red' | 'yellow' | 'blue' | 'green'

export type CardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4'

export interface Card {
  id: string
  color: CardColor | null
  type: CardType
  value?: number
}

export type Direction = 'clockwise' | 'counterclockwise'

export type GamePhase = 'idle' | 'playing' | 'color-picking' | 'round-over' | 'challenge' | 'stacking' | 'seven-swap' | 'uno-call'

export interface Player {
  id: string
  name: string
  hand: Card[]
  isHuman: boolean
}