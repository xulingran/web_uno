import type { StoreState } from '@/store/gameStore'
import type { GameStateView, PlayerView } from './protocol'

/**
 * 将完整游戏状态转换为特定玩家可见的视图。
 * 当前玩家看到自己完整手牌，其他人只看到数量。
 */
export function filterStateForPlayer(
  state: StoreState,
  playerIndex: number
): GameStateView {
  const players: PlayerView[] = state.players.map((p, i) => ({
    id: p.id,
    name: p.name,
    hand: i === playerIndex ? [...p.hand] : [],
    handCount: p.hand.length,
    isHuman: p.isHuman,
  }))

  return {
    players,
    discardPile: [...state.discardPile],
    drawPileCount: state.drawPile.length,
    currentPlayerIndex: state.currentPlayerIndex,
    direction: state.direction,
    currentColor: state.currentColor,
    phase: state.phase,
    winner: state.winner
      ? { ...state.winner, hand: [], handCount: 0 }
      : null,
    scores: [...state.scores],
    cardJustDrawn: state.cardJustDrawn ? { ...state.cardJustDrawn } : null,
    pendingDrawCount: state.pendingDrawCount,
    lastActionEffect: state.lastActionEffect ? { ...state.lastActionEffect } : null,
    lastPlayedBy: state.lastPlayedBy ? { ...state.lastPlayedBy } : null,
    unoCalledPlayer: state.unoCalledPlayer,
    dealAnimating: state.phase === 'dealing',
    drawAnimating: state.drawAnimating,
    logEntries: state.logEntries.slice(-50).map((e) => ({ ...e })),
  }
}
