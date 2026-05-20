import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import GameBoard from './GameBoard'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/store/gameStore', () => {
  const mockState = {
    players: [
      { id: 'p0', name: '你', hand: [{ id: 'red-5-0', color: 'red', type: 'number', value: 5 }], isHuman: true },
      { id: 'p1', name: '电脑A', hand: [{ id: 'blue-3-0', color: 'blue', type: 'number', value: 3 }], isHuman: false },
      { id: 'p2', name: '电脑B', hand: [{ id: 'green-7-0', color: 'green', type: 'number', value: 7 }], isHuman: false },
    ],
    drawPile: [{ id: 'yellow-2-0', color: 'yellow', type: 'number', value: 2 }],
    discardPile: [{ id: 'red-1-0', color: 'red', type: 'number', value: 1 }],
    currentPlayerIndex: 0,
    direction: 'clockwise',
    currentColor: 'red',
    phase: 'playing',
    winner: null,
    scores: [0, 0, 0],
    cardJustDrawn: null,
    pendingDrawCount: 0,
    config: {
      params: { initialHandSize: 7, aiPlayerCount: 2, targetScore: 0, turnTimeLimit: 0 },
      actionCards: { stackingDraw2: false, stackingDraw4: false, challengeWild4: false, reverseAsSkip: true, jumpIn: false, sevenORule: false },
      draw: { drawToMatch: false, forcePlay: false, multiDrawCount: 1 },
      uno: { requireUNOCall: true, unoPenaltyDraw: 2, autoDetectUNO: true },
      scoring: { numberCard: 0, actionCard: 20, wildCard: 50 },
      ai: { difficulty: 'medium', playRandomness: 0.1, stackAggression: 0.6, challengeAggression: 0.7, wild4BluffChance: 0.15, considerOpponent: true, colorStrategy: 'most' },
    },
    unoCalledPlayer: null,
    pendingUnoAdvance: 0,
    stackingWaiting: false,
    challengePlayerIndex: null,
    turnStartTime: null,
    lastPlayedBy: null,
    lastActionEffect: null,
    colorBeforeWild: null,
    playCard: vi.fn(),
    drawCard: vi.fn(),
    pickColor: vi.fn(),
    startNewGame: vi.fn(),
    initGame: vi.fn(),
    acceptDraw: vi.fn(),
    resolveUno: vi.fn(),
    resolveChallenge: vi.fn(),
    advanceTurn: vi.fn(),
  }

  const useGameStore = ((selector: ((state: typeof mockState) => unknown) | undefined) => {
    if (typeof selector === 'function') {
      return selector(mockState)
    }
    return mockState
  }) as unknown as ReturnType<typeof import('@/store/gameStore')['useGameStore']>

  useGameStore.getState = () => mockState

  return { useGameStore }
})

describe('GameBoard', () => {
  it('renders without crashing', () => {
    const { container } = render(<GameBoard />)
    expect(container).toBeTruthy()
  })

  it('shows game info when playing', () => {
    render(<GameBoard />)
    expect(screen.getByText(/当前回合/)).toBeTruthy()
  })
})