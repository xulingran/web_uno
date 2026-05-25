import type { Card, CardColor, Direction, GamePhase } from '@/utils/types'
import type { GameConfig } from '@/config/types'

// 客户端 → 房主的消息
export type ClientMessage =
  | { type: 'room:join'; name: string }
  | { type: 'game:play-card'; cardId: string }
  | { type: 'game:draw-card' }
  | { type: 'game:pick-color'; color: CardColor }
  | { type: 'game:accept-draw' }
  | { type: 'game:resolve-uno'; confirmed: boolean }
  | { type: 'game:resolve-challenge'; challenge: boolean }
  | { type: 'game:advance-turn'; skipCount: number }

// 房主 → 客户端的消息
export type HostMessage =
  | { type: 'room:info'; code: string; players: LobbyPlayer[]; config: GameConfig; yourIndex: number }
  | { type: 'room:player-joined'; playerIndex: number; player: LobbyPlayer }
  | { type: 'room:player-left'; playerIndex: number }
  | { type: 'game:started'; config: GameConfig }
  | { type: 'game:state'; state: GameStateView }
  | { type: 'game:deal-card'; playerIndex: number; card: Card | null; total: number; current: number }
  | { type: 'game:action-effect'; effect: { type: string; color?: string; timestamp: number } | null }
  | { type: 'error'; message: string }

// 大厅玩家信息
export interface LobbyPlayer {
  index: number
  id: string
  name: string
  isHost: boolean
  isHuman: boolean
  ready: boolean
}

// 游戏状态的客户端可见视图
export interface GameStateView {
  players: PlayerView[]
  discardPile: Card[]
  drawPileCount: number
  currentPlayerIndex: number
  direction: Direction
  currentColor: CardColor
  phase: GamePhase
  winner: PlayerView | null
  scores: number[]
  cardJustDrawn: Card | null
  pendingDrawCount: number
  lastActionEffect: { type: string; color?: string; timestamp: number } | null
  lastPlayedBy: { playerIndex: number; cardId: string } | null
  unoCalledPlayer: string | null
  dealAnimating: boolean
  drawAnimating: boolean
  logEntries: { event: string; playerName: string; cardInfo?: string; extra?: string; timestamp: number }[]
}

// 玩家可见视图（只包含自己的完整手牌，其他人只显示数量）
export interface PlayerView {
  id: string
  name: string
  hand: Card[]
  handCount: number
  isHuman: boolean
}
