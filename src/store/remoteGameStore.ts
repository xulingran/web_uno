import { create } from 'zustand'
import type { GameStateView } from '@/network/protocol'
import type { Card } from '@/utils/types'

interface RemoteGameState extends GameStateView {
  getPlayerHand: (playerIndex: number) => Card[]
}

interface RemoteGameActions {
  receiveState: (state: GameStateView) => void
  reset: () => void
}

const emptyState: GameStateView = {
  players: [],
  discardPile: [],
  drawPileCount: 0,
  currentPlayerIndex: 0,
  direction: 'clockwise',
  currentColor: 'red',
  phase: 'idle',
  winner: null,
  scores: [],
  cardJustDrawn: null,
  pendingDrawCount: 0,
  lastActionEffect: null,
  lastPlayedBy: null,
  unoCalledPlayer: null,
  dealAnimating: false,
  drawAnimating: false,
  logEntries: [],
}

export const useRemoteGameStore = create<RemoteGameState & RemoteGameActions>()(
  (set, get) => ({
    ...emptyState,

    getPlayerHand: (playerIndex: number): Card[] => {
      const state = get()
      return state.players[playerIndex]?.hand ?? []
    },

    receiveState: (newState) => set({ ...newState }),

    reset: () => set({ ...emptyState }),
  })
)
