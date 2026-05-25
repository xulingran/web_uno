import { useGameStore, type StoreState } from '@/store/gameStore'
import { useRemoteGameStore } from '@/store/remoteGameStore'
import { useLobbyStore } from '@/store/lobbyStore'
import type { Card, CardColor, Direction, GamePhase, DealAnimConfig, GameLogEntry } from '@/utils/types'
import type { GameConfig } from '@/config/types'
import type { PlayerView } from '@/network/protocol'

/**
 * 统一的游戏状态 selector。
 * 在 local/host 模式下从 gameStore 读取，在 client 模式下从 remoteGameStore 读取。
 */
export function useGameAdapter<T>(selector: (state: GameAdapterState) => T): T {
  const networkMode = useLobbyStore((s) => s.networkMode)

  const localState = useGameStore((s) => {
    if (networkMode === 'client') {
      return undefined as unknown as T
    }
    return selector(mapStoreStateToAdapter(s))
  })

  const remoteState = useRemoteGameStore((s) => {
    if (networkMode !== 'client') {
      return undefined as unknown as T
    }
    return selector(s as unknown as GameAdapterState)
  })

  return networkMode === 'client' ? remoteState : localState
}

/**
 * UI 组件使用的游戏状态接口。两边 store 都满足此 shape。
 */
export interface GameAdapterState {
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
  logEntries: GameLogEntry[]
  debugMode: boolean
  config: GameConfig
  dealAnimConfig: DealAnimConfig
  challengePlayerIndex: number | null
  colorBeforeWild: CardColor | null
  stackingWaiting: boolean
  drawPile: Card[]
}

function mapStoreStateToAdapter(s: StoreState): GameAdapterState {
  const players: PlayerView[] = s.players.map((p) => ({
    id: p.id,
    name: p.name,
    hand: p.hand,
    handCount: p.hand.length,
    isHuman: p.isHuman,
  }))

  return {
    players,
    discardPile: s.discardPile,
    drawPileCount: s.drawPile.length,
    currentPlayerIndex: s.currentPlayerIndex,
    direction: s.direction,
    currentColor: s.currentColor,
    phase: s.phase,
    winner: s.winner
      ? { ...s.winner, hand: s.winner.hand, handCount: s.winner.hand.length }
      : null,
    scores: s.scores,
    cardJustDrawn: s.cardJustDrawn,
    pendingDrawCount: s.pendingDrawCount,
    lastActionEffect: s.lastActionEffect,
    lastPlayedBy: s.lastPlayedBy,
    unoCalledPlayer: s.unoCalledPlayer,
    dealAnimating: s.phase === 'dealing',
    drawAnimating: s.drawAnimating,
    logEntries: s.logEntries,
    debugMode: s.debugMode,
    config: s.config,
    dealAnimConfig: s.dealAnimConfig,
    challengePlayerIndex: s.challengePlayerIndex,
    colorBeforeWild: s.colorBeforeWild,
    stackingWaiting: s.stackingWaiting,
    drawPile: s.drawPile,
  }
}
