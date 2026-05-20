export type CardColor = 'red' | 'yellow' | 'blue' | 'green'

export interface ScoreConfig {
  numberCard: number
  actionCard: number
  wildCard: number
}

export interface ActionCardConfig {
  stackingDraw2: boolean
  stackingDraw4: boolean
  challengeWild4: boolean
  reverseAsSkip: boolean
  jumpIn: boolean
  sevenORule: boolean
}

export interface DrawConfig {
  drawToMatch: boolean
  forcePlay: boolean
  multiDrawCount: number
}

export interface UNOConfig {
  requireUNOCall: boolean
  unoPenaltyDraw: number
  autoDetectUNO: boolean
}

export interface GameParams {
  initialHandSize: number
  aiPlayerCount: number
  targetScore: number
  turnTimeLimit: number
}

export interface GameConfig {
  params: GameParams
  actionCards: ActionCardConfig
  draw: DrawConfig
  uno: UNOConfig
  scoring: ScoreConfig
}

export type PresetName = 'classic' | 'casual' | 'hardcore' | 'custom'

export interface PresetConfig {
  name: PresetName
  label: string
  description: string
  config: GameConfig
}