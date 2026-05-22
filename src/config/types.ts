export type CardColor = 'red' | 'yellow' | 'blue' | 'green'

export type Difficulty = 'easy' | 'medium' | 'hard'

export type ColorStrategy = 'most' | 'best'

export interface AIConfig {
  difficulty: Difficulty
  playRandomness: number
  stackAggression: number
  challengeAggression: number
  wild4BluffChance: number
  considerOpponent: boolean
  colorStrategy: ColorStrategy
}

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
  ai: AIConfig
}

export type PresetName = 'classic' | 'casual' | 'hardcore' | 'custom'

export type RulesConfig = Omit<GameConfig, 'ai'>

export interface PresetConfig {
  name: PresetName
  label: string
  description: string
  config: RulesConfig
}
