import { render } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { useGameEngine } from './useGameEngine'
import { useGameStore } from '@/store/gameStore'
import { useConfigStore } from '@/store/configStore'
import { DEFAULT_CONFIG } from '@/config/defaults'

function TestHarness() {
  useGameEngine()
  return null
}

describe('useGameEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)

    useConfigStore.setState({
      config: { ...DEFAULT_CONFIG },
      activePreset: 'custom',
    })

    useGameStore.setState({
      players: [],
      drawPile: [],
      discardPile: [],
      currentPlayerIndex: 0,
      direction: 'clockwise',
      currentColor: 'red',
      phase: 'idle',
      winner: null,
      scores: [],
      cardJustDrawn: null,
      pendingDrawCount: 0,
      config: { ...DEFAULT_CONFIG },
      unoCalledPlayer: null,
      pendingUnoAdvance: 0,
      stackingWaiting: false,
      challengePlayerIndex: null,
      turnStartTime: null,
      lastPlayedBy: null,
      lastActionEffect: null,
      colorBeforeWild: null,
      lastDrawEvent: null,
      dealSequence: [],
      dealtIndex: 0,
      dealAnimConfig: {
        singleCardDuration: 200,
        cardInterval: 100,
        timeout: 5000,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      pendingInitialTopCard: null,
      debugMode: false,
      logEntries: [],
      drawAnimating: false,
      pendingDrawResolution: null,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('AI 无牌可出时，摸牌后进入 drawAnimating 并延迟推进回合', () => {
    useGameStore.setState({
      phase: 'playing',
      currentPlayerIndex: 1,
      players: [
        { id: 'p0', name: '你', hand: [{ id: 'red-4', color: 'red', type: 'number', value: 4 }], isHuman: true },
        { id: 'p1', name: '电脑A', hand: [{ id: 'blue-5', color: 'blue', type: 'number', value: 5 }], isHuman: false },
      ],
      discardPile: [{ id: 'red-1', color: 'red', type: 'number', value: 1 }],
      drawPile: [{ id: 'yellow-2', color: 'yellow', type: 'number', value: 2 }],
      currentColor: 'red',
      config: {
        ...DEFAULT_CONFIG,
        draw: { ...DEFAULT_CONFIG.draw, drawToMatch: false, forcePlay: false, multiDrawCount: 1 },
      },
      scores: [0, 0],
    })

    render(<TestHarness />)

    vi.advanceTimersByTime(700)

    const state = useGameStore.getState()
    expect(state.players[1].hand).toHaveLength(2)
    expect(state.drawAnimating).toBe(true)
    expect(state.lastDrawEvent).toMatchObject({ playerIndex: 1, cardCount: 1 })
    expect(state.pendingDrawResolution).toEqual({ type: 'advanceTurn', skipCount: 1 })
    expect(state.currentPlayerIndex).toBe(1)
  })
})
