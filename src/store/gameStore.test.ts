import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGameStore } from './gameStore'
import { useConfigStore } from './configStore'
import { DEFAULT_CONFIG } from '@/config/defaults'
import type { Card } from '@/utils/types'
import * as deckModule from '@/utils/deck'

describe('gameStore', () => {
  beforeEach(() => {
    localStorage.clear()
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
    })
  })

  it('initGame — 初始化 3 名玩家（1 玩家 + 2 AI），每人 7 张牌，phase 为 playing（或 color-picking），总牌数为 108', () => {
    useGameStore.getState().initGame()

    const state = useGameStore.getState()

    expect(state.players).toHaveLength(3)
    expect(state.players[0].isHuman).toBe(true)
    expect(state.players[1].isHuman).toBe(false)
    expect(state.players[2].isHuman).toBe(false)

    for (const player of state.players) {
      expect(player.hand).toHaveLength(7)
    }

    expect(['playing', 'color-picking']).toContain(state.phase)
    expect(state.scores).toHaveLength(3)

    const totalCardsInPlay =
      state.drawPile.length +
      state.players[0].hand.length +
      state.players[1].hand.length +
      state.players[2].hand.length +
      state.discardPile.length

    expect(totalCardsInPlay).toBe(108)
  })

  it('playCard with nonexistent cardId — 状态不变', () => {
    useGameStore.getState().initGame()

    const stateBefore = useGameStore.getState()

    useGameStore.getState().playCard('nonexistent')

    const stateAfter = useGameStore.getState()

    expect(stateAfter.players).toEqual(stateBefore.players)
    expect(stateAfter.discardPile).toEqual(stateBefore.discardPile)
    expect(stateAfter.drawPile).toEqual(stateBefore.drawPile)
    expect(stateAfter.phase).toEqual(stateBefore.phase)
    expect(stateAfter.currentPlayerIndex).toEqual(stateBefore.currentPlayerIndex)
  })

  it('playCard when phase is not playing — 状态不变', () => {
    useGameStore.getState().initGame()

    useGameStore.setState({ phase: 'idle' })
    const stateBefore = useGameStore.getState()
    const someCardId = stateBefore.players[0]?.hand[0]?.id ?? 'nonexistent'

    useGameStore.getState().playCard(someCardId)

    const stateAfter = useGameStore.getState()
    expect(stateAfter.phase).toBe('idle')
    expect(stateAfter.players).toEqual(stateBefore.players)
    expect(stateAfter.discardPile).toEqual(stateBefore.discardPile)
  })

  it('pickColor — phase 为 color-picking 时调用 pickColor("blue")，currentColor 变为 blue，phase 变为 playing', () => {
    useGameStore.setState({
      phase: 'color-picking',
      discardPile: [{ id: 'wild-0', color: null, type: 'wild' }],
      players: [
        { id: 'p0', name: '你', hand: [], isHuman: true },
        { id: 'p1', name: '电脑A', hand: [], isHuman: false },
        { id: 'p2', name: '电脑B', hand: [], isHuman: false },
      ],
      currentPlayerIndex: 0,
      direction: 'clockwise',
      config: { ...DEFAULT_CONFIG },
      scores: [0, 0, 0],
    })

    useGameStore.getState().pickColor('blue')

    const state = useGameStore.getState()
    expect(state.currentColor).toBe('blue')
    expect(state.phase).toBe('playing')
  })

  it('startNewGame — 重新初始化状态', () => {
    useGameStore.getState().initGame()

    useGameStore.getState().startNewGame()

    const state = useGameStore.getState()
    expect(state.players).toHaveLength(3)
    expect(state.players[0].isHuman).toBe(true)
    expect(state.players[1].isHuman).toBe(false)
    expect(state.players[2].isHuman).toBe(false)

    for (const player of state.players) {
      expect(player.hand).toHaveLength(7)
    }

    expect(['playing', 'color-picking']).toContain(state.phase)
    expect(state.scores).toHaveLength(3)

    const totalCardsInPlay =
      state.drawPile.length +
      state.players[0].hand.length +
      state.players[1].hand.length +
      state.players[2].hand.length +
      state.discardPile.length

    expect(totalCardsInPlay).toBe(108)
  })

  it('drawCard when hasPlayable — 手牌不变', () => {
    useGameStore.getState().initGame()

    const state = useGameStore.getState()
    const playerIdx = state.currentPlayerIndex

    const guaranteedPlayable: Card = {
      id: 'test-match',
      color: state.currentColor,
      type: 'number',
      value: 0,
    }
    const newPlayers = state.players.map((p, i) =>
      i === playerIdx ? { ...p, hand: [...p.hand, guaranteedPlayable] } : p
    )
    useGameStore.setState({ players: newPlayers })

    const handLenBefore = useGameStore.getState().players[playerIdx].hand.length
    useGameStore.getState().drawCard()
    const handLenAfter = useGameStore.getState().players[playerIdx].hand.length

    expect(handLenAfter).toBe(handLenBefore)
  })

  it('acceptDraw — pendingDrawCount 从 2 变为 0', () => {
    useGameStore.setState({
      phase: 'playing',
      pendingDrawCount: 2,
      players: [
        { id: 'p0', name: '你', hand: [{ id: 'red-1', color: 'red', type: 'number', value: 1 }], isHuman: true },
        { id: 'p1', name: '电脑A', hand: [], isHuman: false },
      ],
      currentPlayerIndex: 0,
      direction: 'clockwise',
      drawPile: [
        { id: 'blue-2', color: 'blue', type: 'number', value: 2 },
        { id: 'green-3', color: 'green', type: 'number', value: 3 },
      ],
      discardPile: [{ id: 'red-5', color: 'red', type: 'number', value: 5 }],
      currentColor: 'red',
      config: { ...DEFAULT_CONFIG },
      scores: [0, 0],
    })

    useGameStore.getState().acceptDraw()

    expect(useGameStore.getState().pendingDrawCount).toBe(0)
  })

  it('initGame — 首张翻开牌为 skip 时跳过第一个玩家 (currentPlayerIndex 变为 1)', () => {
    const mockDeck: Card[] = []
    for (let i = 0; i < 21; i++) {
      mockDeck.push({ id: `pcard-${i}`, color: 'red', type: 'number', value: i % 10 })
    }
    mockDeck.push({ id: 'top-skip', color: 'red', type: 'skip' })
    for (let i = mockDeck.length; i < 108; i++) {
      mockDeck.push({ id: `fill-${i}`, color: 'blue', type: 'number', value: i % 10 })
    }

    vi.spyOn(deckModule, 'shuffleDeck').mockReturnValue(mockDeck)

    useGameStore.getState().initGame()

    const state = useGameStore.getState()
    expect(state.discardPile[state.discardPile.length - 1].type).toBe('skip')
    expect(state.currentPlayerIndex).toBe(1)
    expect(state.phase).toBe('playing')

    vi.restoreAllMocks()
  })

  it('drawCard — 无可出牌时抽牌，手牌增加', () => {
    useGameStore.setState({
      phase: 'playing',
      players: [
        {
          id: 'p0', name: '你', isHuman: true,
          hand: [
            { id: 'blue-3', color: 'blue', type: 'number', value: 3 },
            { id: 'green-skip-0', color: 'green', type: 'skip' },
          ],
        },
        { id: 'p1', name: '电脑A', hand: [{ id: 'red-1', color: 'red', type: 'number', value: 1 }], isHuman: false },
      ],
      currentPlayerIndex: 0,
      direction: 'clockwise',
      currentColor: 'red',
      discardPile: [{ id: 'red-5', color: 'red', type: 'number', value: 5 }],
      drawPile: [{ id: 'yellow-1', color: 'yellow', type: 'number', value: 1 }],
      config: { ...DEFAULT_CONFIG },
      scores: [0, 0],
    })

    const handLenBefore = useGameStore.getState().players[0].hand.length
    useGameStore.getState().drawCard()
    const handLenAfter = useGameStore.getState().players[0].hand.length

    expect(handLenAfter).toBe(handLenBefore + 1)
  })

  it('playCard — 打出 Wild 牌时 phase 变为 color-picking', () => {
    useGameStore.setState({
      phase: 'playing',
      players: [
        {
          id: 'p0', name: '你', isHuman: true,
          hand: [
            { id: 'wild-0', color: null, type: 'wild' },
            { id: 'blue-3', color: 'blue', type: 'number', value: 3 },
          ],
        },
        { id: 'p1', name: '电脑A', hand: [{ id: 'red-1', color: 'red', type: 'number', value: 1 }], isHuman: false },
      ],
      currentPlayerIndex: 0,
      direction: 'clockwise',
      currentColor: 'red',
      discardPile: [{ id: 'red-5', color: 'red', type: 'number', value: 5 }],
      drawPile: [],
      config: { ...DEFAULT_CONFIG },
      scores: [0, 0],
    })

    useGameStore.getState().playCard('wild-0')

    expect(useGameStore.getState().phase).toBe('color-picking')
  })

  it('playCard — 打出最后一张牌获胜，phase 变为 round-over', () => {
    useGameStore.setState({
      phase: 'playing',
      players: [
        { id: 'p0', name: '你', hand: [{ id: 'red-5', color: 'red', type: 'number', value: 5 }], isHuman: true },
        { id: 'p1', name: '电脑A', hand: [{ id: 'blue-2', color: 'blue', type: 'number', value: 2 }], isHuman: false },
        { id: 'p2', name: '电脑B', hand: [{ id: 'green-3', color: 'green', type: 'number', value: 3 }], isHuman: false },
      ],
      currentPlayerIndex: 0,
      direction: 'clockwise',
      currentColor: 'red',
      discardPile: [{ id: 'red-3', color: 'red', type: 'number', value: 3 }],
      drawPile: [],
      config: { ...DEFAULT_CONFIG },
      scores: [0, 0, 0],
    })

    useGameStore.getState().playCard('red-5')

    const state = useGameStore.getState()
    expect(state.phase).toBe('round-over')
    expect(state.winner).not.toBeNull()
    expect(state.winner!.id).toBe('p0')
  })

  it('playCard — 打出 Skip 牌跳过下一个玩家 (currentPlayerIndex 从 0 变为 2)', () => {
    useGameStore.setState({
      phase: 'playing',
      players: [
        {
          id: 'p0', name: '你', isHuman: true,
          hand: [
            { id: 'red-skip-0', color: 'red', type: 'skip' },
            { id: 'blue-3', color: 'blue', type: 'number', value: 3 },
          ],
        },
        { id: 'p1', name: '电脑A', hand: [{ id: 'blue-2', color: 'blue', type: 'number', value: 2 }], isHuman: false },
        { id: 'p2', name: '电脑B', hand: [{ id: 'green-3', color: 'green', type: 'number', value: 3 }], isHuman: false },
      ],
      currentPlayerIndex: 0,
      direction: 'clockwise',
      currentColor: 'red',
      discardPile: [{ id: 'red-3', color: 'red', type: 'number', value: 3 }],
      drawPile: [],
      config: { ...DEFAULT_CONFIG },
      scores: [0, 0, 0],
    })

    useGameStore.getState().playCard('red-skip-0')

    expect(useGameStore.getState().currentPlayerIndex).toBe(2)
  })
})