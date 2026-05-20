import { create } from 'zustand'
import type { Card, CardColor, Direction, GamePhase, Player } from '@/utils/types'
import type { GameConfig } from '@/config/types'
import { useConfigStore } from './configStore'
import { createDeck, shuffleDeck, dealCards, drawCards, getCardScore } from '@/utils/deck'
import { canPlayCard, canStack, canJumpIn, getNextPlayerIndex, getActionEffect } from '@/utils/rules'
import { shouldChallengeWild4 } from '@/utils/ai'

interface GameActions {
  initGame: () => void
  playCard: (cardId: string) => void
  drawCard: () => void
  pickColor: (color: CardColor) => void
  advanceTurn: (skipCount?: number) => void
  startNewGame: () => void
  acceptDraw: () => void
  resolveUno: (confirmed: boolean) => void
  resolveChallenge: (challenge: boolean) => void
}

function getCardActionEffectType(card: Card): { type: string; color?: string } | null {
  switch (card.type) {
    case 'draw2': return { type: 'draw2', color: card.color ?? undefined }
    case 'wild4': return { type: 'wild4' }
    case 'skip': return { type: 'skip', color: card.color ?? undefined }
    case 'reverse': return { type: 'reverse', color: card.color ?? undefined }
    default: return null
  }
}

interface StoreState {
  players: Player[]
  drawPile: Card[]
  discardPile: Card[]
  currentPlayerIndex: number
  direction: Direction
  currentColor: CardColor
  phase: GamePhase
  winner: Player | null
  scores: number[]
  cardJustDrawn: Card | null
  pendingDrawCount: number
  config: GameConfig
  unoCalledPlayer: string | null
  pendingUnoAdvance: number
  stackingWaiting: boolean
  challengePlayerIndex: number | null
  turnStartTime: number | null
  lastPlayedBy: { playerIndex: number; cardId: string } | null
  lastActionEffect: { type: string; color?: string; timestamp: number } | null
  colorBeforeWild: CardColor | null
}

function ensureNotEmpty(pile: Card[], discardPile: Card[]): { drawPile: Card[]; discardPile: Card[] } {
  if (pile.length > 0) {
    return { drawPile: pile, discardPile }
  }
  if (discardPile.length <= 1) {
    return { drawPile: pile, discardPile }
  }
  const topCard = discardPile[discardPile.length - 1]
  const rest = discardPile.slice(0, -1)
  const shuffled = shuffleDeck(rest)
  return { drawPile: shuffled, discardPile: [topCard] }
}

function getFirstValidTopCard(
  drawPile: Card[],
  discardPile: Card[]
): { drawPile: Card[]; discardPile: Card[]; topCard: Card } {
  const pile = [...drawPile]
  const disc = [...discardPile]
  let card = pile.shift()!
  const maxIterations = pile.length + disc.length + drawPile.length + 10
  let iterations = 0

  while (card.type === 'wild4' && iterations < maxIterations) {
    iterations++
    disc.push(card)
    if (pile.length === 0) {
      if (disc.length <= 1) {
        break
      }
      const topCardSaved = disc[disc.length - 1]
      const rest = disc.slice(0, -1)
      const shuffled = shuffleDeck(rest)
      pile.push(...shuffled)
      disc.length = 0
      disc.push(topCardSaved)
    }
    if (pile.length === 0) break
    card = pile.shift()!
  }

  disc.push(card)
  return { drawPile: pile, discardPile: disc, topCard: card }
}

function applyDrawToPlayer(
  drawPile: Card[],
  discardPile: Card[],
  drawCount: number
): { drawn: Card[]; drawPile: Card[]; discardPile: Card[] } {
  let curDrawPile = [...drawPile]
  let curDiscardPile = [...discardPile]
  const allDrawn: Card[] = []

  const reshuffled = ensureNotEmpty(curDrawPile, curDiscardPile)
  curDrawPile = reshuffled.drawPile
  curDiscardPile = reshuffled.discardPile

  let remaining = drawCount
  while (remaining > 0 && curDrawPile.length > 0) {
    const actual = Math.min(remaining, curDrawPile.length)
    const { drawn, remaining: newPile } = drawCards(curDrawPile, actual)
    allDrawn.push(...drawn)
    curDrawPile = newPile
    remaining -= actual
    if (remaining > 0) {
      const reshuffled2 = ensureNotEmpty(curDrawPile, curDiscardPile)
      curDrawPile = reshuffled2.drawPile
      curDiscardPile = reshuffled2.discardPile
    }
  }

  return { drawn: allDrawn, drawPile: curDrawPile, discardPile: curDiscardPile }
}

export const useGameStore = create<StoreState & GameActions>()((set, get) => ({
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
  config: {
    params: { initialHandSize: 7, aiPlayerCount: 2, targetScore: 0, turnTimeLimit: 0 },
    actionCards: {
      stackingDraw2: false, stackingDraw4: false, challengeWild4: false,
      reverseAsSkip: true, jumpIn: false, sevenORule: false,
    },
    draw: { drawToMatch: false, forcePlay: false, multiDrawCount: 1 },
    uno: { requireUNOCall: true, unoPenaltyDraw: 2, autoDetectUNO: true },
    scoring: { numberCard: 0, actionCard: 20, wildCard: 50 },
  },
  unoCalledPlayer: null,
  pendingUnoAdvance: 0,
  stackingWaiting: false,
  challengePlayerIndex: null,
  turnStartTime: null,
  lastPlayedBy: null,
  lastActionEffect: null,
  colorBeforeWild: null,

  initGame: () => {
    const config = useConfigStore.getState().config
    const deck = createDeck()
    const shuffled = shuffleDeck(deck)
    const totalPlayers = 1 + config.params.aiPlayerCount
    const { players: dealt, remaining } = dealCards(shuffled, totalPlayers, config.params.initialHandSize)

    const names = ['你', '电脑A', '电脑B', '电脑C', '电脑D', '电脑E']
    const players: Player[] = [
      { id: 'p0', name: names[0], hand: dealt[0], isHuman: true },
    ]
    for (let i = 1; i < totalPlayers; i++) {
      players.push({ id: `p${i}`, name: names[i] || `电脑${i}`, hand: dealt[i], isHuman: false })
    }

    const { drawPile, discardPile, topCard } = getFirstValidTopCard(remaining, [])

    let initialDirection: Direction = 'clockwise'
    let initialPlayerIndex = 0
    let initialSkipCount = 0

    if (topCard.type === 'skip') {
      initialSkipCount = 1
      initialPlayerIndex = 0
    } else if (topCard.type === 'reverse') {
      initialDirection = 'counterclockwise'
      if (totalPlayers === 2 && config.actionCards.reverseAsSkip) {
        initialSkipCount = 1
        initialPlayerIndex = 0
      } else {
        initialPlayerIndex = 0
      }
    }

    let currentDrawPile = drawPile
    let currentDiscardPile = discardPile
    let currentPlayers = players

    if (topCard.type === 'draw2') {
      const { drawn, drawPile: newDrawPile, discardPile: newDiscardPile } =
        applyDrawToPlayer(currentDrawPile, currentDiscardPile, 2)
      currentDrawPile = newDrawPile
      currentDiscardPile = newDiscardPile
      currentPlayers = currentPlayers.map((p, i) =>
        i === 0 ? { ...p, hand: [...p.hand, ...drawn] } : p
      )
    }

    set({
      players: currentPlayers,
      drawPile: currentDrawPile,
      discardPile: currentDiscardPile,
      currentPlayerIndex: topCard.type === 'draw2'
        ? getNextPlayerIndex(0, initialDirection, totalPlayers, 0)
        : initialPlayerIndex,
      direction: initialDirection,
      currentColor: topCard.color ?? 'red',
      phase: topCard.type === 'wild' ? 'color-picking' : 'playing',
      winner: null,
      scores: Array(totalPlayers).fill(0),
      cardJustDrawn: null,
      pendingDrawCount: 0,
      config,
      unoCalledPlayer: null,
      stackingWaiting: false,
      challengePlayerIndex: null,
      turnStartTime: config.params.turnTimeLimit > 0 ? Date.now() : null,
      lastPlayedBy: null,
      lastActionEffect: null,
      colorBeforeWild: null,
    })

    if (initialSkipCount > 0) {
      get().advanceTurn(initialSkipCount)
    }
  },

  playCard: (cardId: string) => {
    const state = get()
    if (state.phase !== 'playing') return

    const player = state.players[state.currentPlayerIndex]
    let isJumpIn = false
    let playingPlayerIndex = state.currentPlayerIndex

    if (!player.isHuman) {
      if (state.config.actionCards.jumpIn) {
        const humanPlayer = state.players[0]
        if (humanPlayer && humanPlayer.isHuman) {
          const topCard = state.discardPile[state.discardPile.length - 1]
          const cardIdx = humanPlayer.hand.findIndex((c) => c.id === cardId)
          if (cardIdx !== -1) {
            const jumpCard = humanPlayer.hand[cardIdx]
            if (canJumpIn(jumpCard, topCard, state.currentColor)) {
              isJumpIn = true
              playingPlayerIndex = 0
            }
          }
        }
      }
      if (!isJumpIn) return
    } else if (state.config.actionCards.jumpIn && player.isHuman && state.currentPlayerIndex !== 0) {
      const topCard = state.discardPile[state.discardPile.length - 1]
      const humanPlayer = state.players[0]
      if (humanPlayer && humanPlayer.isHuman) {
        const cardIdx = humanPlayer.hand.findIndex((c) => c.id === cardId)
        if (cardIdx !== -1) {
          const jumpCard = humanPlayer.hand[cardIdx]
          if (canJumpIn(jumpCard, topCard, state.currentColor)) {
            isJumpIn = true
            playingPlayerIndex = 0
          }
        }
      }
    }

    const actualPlayer = state.players[playingPlayerIndex]
    if (!actualPlayer.isHuman) return

    const cardIndex = actualPlayer.hand.findIndex((c) => c.id === cardId)
    if (cardIndex === -1) return

    const card = actualPlayer.hand[cardIndex]
    const topCard = state.discardPile[state.discardPile.length - 1]

    if (state.pendingDrawCount > 0) {
      const stackingEnabled = state.config.actionCards.stackingDraw2 || state.config.actionCards.stackingDraw4
      if (!(stackingEnabled && canStack(card, topCard, state.config.actionCards))) {
        return
      }
    } else if (!isJumpIn && !canPlayCard(card, topCard, state.currentColor, actualPlayer.hand)) {
      return
    }

    const newHand = [...actualPlayer.hand]
    newHand.splice(cardIndex, 1)
    const newDiscardPile = [...state.discardPile, card]

    const newPlayers = state.players.map((p, i) =>
      i === playingPlayerIndex ? { ...p, hand: newHand } : p
    )

    if (state.config.actionCards.sevenORule && card.type === 'number') {
      if (card.value === 7) {
        let maxCards = 0
        let swapTarget = -1
        for (let i = 0; i < newPlayers.length; i++) {
          if (i !== playingPlayerIndex && newPlayers[i].hand.length > maxCards) {
            maxCards = newPlayers[i].hand.length
            swapTarget = i
          }
        }
        if (swapTarget >= 0) {
          const temp = newPlayers[playingPlayerIndex].hand
          newPlayers[playingPlayerIndex] = { ...newPlayers[playingPlayerIndex], hand: newPlayers[swapTarget].hand }
          newPlayers[swapTarget] = { ...newPlayers[swapTarget], hand: temp }
        }
      } else if (card.value === 0) {
        const hands = newPlayers.map((p) => [...p.hand])
        const dir = state.direction === 'clockwise' ? 1 : newPlayers.length - 1
        for (let i = 0; i < newPlayers.length; i++) {
          newPlayers[i] = { ...newPlayers[i], hand: hands[(i - dir + newPlayers.length) % newPlayers.length] }
        }
      }
    }

    const baseUpdate: Partial<StoreState> = {
      players: newPlayers,
      discardPile: newDiscardPile,
      cardJustDrawn: null,
    }

    if (newHand.length === 1) {
      if (state.config.uno.requireUNOCall) {
        if (actualPlayer.isHuman && !state.config.uno.autoDetectUNO) {
          baseUpdate.unoCalledPlayer = null
        } else {
          baseUpdate.unoCalledPlayer = actualPlayer.id
        }
      }
    }

    if (newHand.length === 0) {
      const newScores = [...state.scores]
      const winnerIdx = playingPlayerIndex
      let totalPoints = 0
      for (let i = 0; i < newPlayers.length; i++) {
        if (i !== winnerIdx) {
          const points = newPlayers[i].hand.reduce((sum, c) => sum + getCardScore(c, state.config), 0)
          totalPoints += points
        }
      }
      newScores[winnerIdx] += totalPoints

      set({
        ...baseUpdate,
        winner: { ...newPlayers[playingPlayerIndex], hand: newHand },
        phase: 'round-over',
        scores: newScores,
      })
      return
    }

    const effect = getActionEffect(card, newPlayers.length, state.config.actionCards.reverseAsSkip)

    const actionEffectType = getCardActionEffectType(card)
    if (actionEffectType) {
      baseUpdate.lastActionEffect = { ...actionEffectType, timestamp: Date.now() }
    }
    baseUpdate.lastPlayedBy = { playerIndex: playingPlayerIndex, cardId: card.id }

    const needsUnoConfirm = newHand.length === 1 && actualPlayer.isHuman && state.config.uno.requireUNOCall && !state.config.uno.autoDetectUNO

    if (effect.needsColorPick) {
      set({
        ...baseUpdate,
        phase: 'color-picking',
        currentPlayerIndex: playingPlayerIndex,
        colorBeforeWild: state.currentColor,
        ...(needsUnoConfirm ? { pendingUnoAdvance: 1 } : {}),
      })
      return
    }

    if (card.color != null) {
      baseUpdate.currentColor = card.color
    }

    if (isJumpIn) {
      baseUpdate.currentPlayerIndex = playingPlayerIndex
    }

    if (effect.reverse) {
      const newDirection: Direction =
        state.direction === 'clockwise' ? 'counterclockwise' : 'clockwise'
      baseUpdate.direction = newDirection
    }

    set(baseUpdate)

    if (effect.reverse && state.players.length === 2 && state.config.actionCards.reverseAsSkip) {
      if (needsUnoConfirm) {
        set({ pendingUnoAdvance: 2 })
        return
      }
      get().advanceTurn(2)
      return
    }

    if (effect.drawCount > 0) {
      set({ pendingDrawCount: get().pendingDrawCount + effect.drawCount })
      if (needsUnoConfirm) {
        set({ pendingUnoAdvance: 1 })
        return
      }
      get().advanceTurn(1)
      return
    }

    if (effect.skipNext) {
      if (needsUnoConfirm) {
        set({ pendingUnoAdvance: 2 })
        return
      }
      get().advanceTurn(2)
      return
    }

    if (effect.reverse) {
      if (needsUnoConfirm) {
        set({ pendingUnoAdvance: 1 })
        return
      }
      get().advanceTurn(1)
      return
    }

    if (needsUnoConfirm) {
      set({ pendingUnoAdvance: 1 })
      return
    }

    get().advanceTurn(1)
  },

  drawCard: () => {
    const state = get()
    if (state.phase !== 'playing') return
    const player = state.players[state.currentPlayerIndex]
    if (!player.isHuman) return

    if (state.pendingDrawCount <= 0) {
      const discardTop = state.discardPile[state.discardPile.length - 1]
      const hasPlayable = player.hand.some((c) => canPlayCard(c, discardTop, state.currentColor, player.hand))
      if (hasPlayable) return
    }

    let currentDrawPile = state.drawPile
    let currentDiscardPile = state.discardPile

    const reshuffled = ensureNotEmpty(currentDrawPile, currentDiscardPile)
    currentDrawPile = reshuffled.drawPile
    currentDiscardPile = reshuffled.discardPile

    if (currentDrawPile.length === 0) {
      get().advanceTurn(1)
      return
    }

    const config = state.config
    const newHand = [...player.hand]
    const topCard = currentDiscardPile[currentDiscardPile.length - 1]

    if (config.draw.drawToMatch) {
      let foundPlayable = false
      let drawnCard: Card | null = null

      while (currentDrawPile.length > 0 && !foundPlayable) {
        drawnCard = currentDrawPile.shift()!
        newHand.push(drawnCard)
        if (canPlayCard(drawnCard, topCard, state.currentColor, newHand)) {
          foundPlayable = true
        }
        if (currentDrawPile.length === 0 && currentDiscardPile.length > 1) {
          const reshuffled2 = ensureNotEmpty(currentDrawPile, currentDiscardPile)
          currentDrawPile = reshuffled2.drawPile
          currentDiscardPile = reshuffled2.discardPile
        }
      }

      const newPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
      )

      set({
        players: newPlayers,
        drawPile: currentDrawPile,
        discardPile: currentDiscardPile,
        cardJustDrawn: drawnCard,
      })

      if (foundPlayable && drawnCard && canPlayCard(drawnCard, topCard, state.currentColor, newHand)) {
        return
      }
    } else {
      const drawCount = config.draw.multiDrawCount
      const actual = Math.min(drawCount, currentDrawPile.length)
      if (actual === 0) {
        get().advanceTurn(1)
        return
      }
      const drawn = currentDrawPile.splice(0, actual)
      newHand.push(...drawn)
      const lastDrawn = drawn[drawn.length - 1]

      const newPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
      )

      set({
        players: newPlayers,
        drawPile: currentDrawPile,
        discardPile: currentDiscardPile,
        cardJustDrawn: lastDrawn,
      })

      if (canPlayCard(lastDrawn, topCard, state.currentColor, newHand)) {
        return
      }
    }

    get().advanceTurn(1)
  },

  pickColor: (color: CardColor) => {
    const state = get()
    if (state.phase !== 'color-picking') return

    const topCard = state.discardPile[state.discardPile.length - 1]

    set({
      currentColor: color,
      phase: 'playing',
    })

    if (topCard.type === 'wild4' && state.config.actionCards.challengeWild4) {
      const lastPlayedBy = state.lastPlayedBy
      const direction = get().direction
      const numPlayers = state.players.length
      if (lastPlayedBy) {
        const nextIdx = getNextPlayerIndex(lastPlayedBy.playerIndex, direction, numPlayers, 0)
        const nextPlayer = state.players[nextIdx]
        if (nextPlayer) {
          if (nextPlayer.isHuman) {
            set({
              pendingDrawCount: get().pendingDrawCount + 4,
              challengePlayerIndex: nextIdx,
              phase: 'challenge',
            })
            return
          } else {
            const willChallenge = shouldChallengeWild4(nextPlayer.hand, state.colorBeforeWild ?? state.currentColor, state.config)
            if (willChallenge) {
              const playerWhoPlayedWild4 = state.players[lastPlayedBy.playerIndex]
              const hadMatching = playerWhoPlayedWild4.hand.some(
                (c) => c.color === (state.colorBeforeWild ?? state.currentColor) && c.type !== 'wild' && c.type !== 'wild4'
              )
              if (hadMatching) {
                const newDiscardPile = [...state.discardPile]
                const returnCard = newDiscardPile.pop()!
                const { drawn, drawPile: newDrawPile, discardPile: newDiscardPile2 } = applyDrawToPlayer(state.drawPile, newDiscardPile, 4)
                const returnHand = [...playerWhoPlayedWild4.hand, returnCard, ...drawn]
                const newPlayers = state.players.map((p, i) => i === lastPlayedBy.playerIndex ? { ...p, hand: returnHand } : p)
                set({ players: newPlayers, discardPile: newDiscardPile2, drawPile: newDrawPile, phase: 'playing', challengePlayerIndex: null, currentPlayerIndex: nextIdx, pendingDrawCount: 0 })
                return
              } else {
                const { drawn, drawPile: newDrawPile, discardPile: newDiscardPile } = applyDrawToPlayer(state.drawPile, state.discardPile, 6)
                const newChallengerHand = [...nextPlayer.hand, ...drawn]
                const newPlayers = state.players.map((p, i) => i === nextIdx ? { ...p, hand: newChallengerHand } : p)
                set({ players: newPlayers, drawPile: newDrawPile, discardPile: newDiscardPile, phase: 'playing', pendingDrawCount: 0, challengePlayerIndex: null })
                const afterSkip = getNextPlayerIndex(nextIdx, state.direction, state.players.length, 1)
                set({ currentPlayerIndex: afterSkip })
                return
              }
            }
          }
        }
      }
    }

    if (topCard.type === 'wild4') {
      set({ pendingDrawCount: get().pendingDrawCount + 4 })
    }

    if (state.pendingUnoAdvance > 0) {
      set({ phase: 'uno-call' })
      return
    }

    get().advanceTurn(1)
  },

  advanceTurn: (skipCount: number = 1) => {
    const state = get()
    const numPlayers = state.players.length
    const config = state.config

    set({ unoCalledPlayer: null, turnStartTime: config.params.turnTimeLimit > 0 ? Date.now() : null })

    if (state.pendingDrawCount > 0) {
      const stackingEnabled =
        (config.actionCards.stackingDraw2 || config.actionCards.stackingDraw4)
      if (stackingEnabled && state.discardPile.length > 0) {
        const topCard = state.discardPile[state.discardPile.length - 1]
        const nextIdx = getNextPlayerIndex(state.currentPlayerIndex, state.direction, numPlayers, 0)
        const nextPlayer = state.players[nextIdx]

        let hasStackable = false
        if (topCard.type === 'draw2' || topCard.type === 'wild4') {
          hasStackable = nextPlayer.hand.some((c) => canStack(c, topCard, config.actionCards))
        }

        if (hasStackable) {
          set({
            currentPlayerIndex: nextIdx,
            cardJustDrawn: null,
            unoCalledPlayer: null,
            turnStartTime: config.params.turnTimeLimit > 0 ? Date.now() : null,
            stackingWaiting: true,
          })
          return
        }
      }

      const drawCount = state.pendingDrawCount
      const nextIdx = getNextPlayerIndex(state.currentPlayerIndex, state.direction, numPlayers, 0)
      const player = state.players[nextIdx]

      const { drawn, drawPile: newDrawPile, discardPile: newDiscardPile } =
        applyDrawToPlayer(state.drawPile, state.discardPile, drawCount)

      const newHand = [...player.hand, ...drawn]
      const newPlayers = state.players.map((p, i) =>
        i === nextIdx ? { ...p, hand: newHand } : p
      )

      const afterSkip = getNextPlayerIndex(nextIdx, state.direction, numPlayers, skipCount - 1)

      set({
        players: newPlayers,
        pendingDrawCount: 0,
        currentPlayerIndex: afterSkip,
        drawPile: newDrawPile,
        discardPile: newDiscardPile,
        cardJustDrawn: null,
        stackingWaiting: false,
      })
      return
    }

    const nextIdx = getNextPlayerIndex(state.currentPlayerIndex, state.direction, numPlayers, skipCount - 1)
    set({
      currentPlayerIndex: nextIdx,
      cardJustDrawn: null,
      stackingWaiting: false,
    })
  },

  startNewGame: () => {
    set({
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
      unoCalledPlayer: null,
      pendingUnoAdvance: 0,
      stackingWaiting: false,
      challengePlayerIndex: null,
      turnStartTime: null,
      lastPlayedBy: null,
      lastActionEffect: null,
      colorBeforeWild: null,
    })
    get().initGame()
  },

  acceptDraw: () => {
    const state = get()
    if (state.phase !== 'playing' || state.pendingDrawCount <= 0) return

    const player = state.players[state.currentPlayerIndex]
    if (!player) return

    const { drawn, drawPile: newDrawPile, discardPile: newDiscardPile } =
      applyDrawToPlayer(state.drawPile, state.discardPile, state.pendingDrawCount)

    if (drawn.length > 0) {
      const newHand = [...player.hand, ...drawn]
      const newPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
      )
      set({
        players: newPlayers,
        drawPile: newDrawPile,
        discardPile: newDiscardPile,
        pendingDrawCount: 0,
      })
    } else {
      set({ pendingDrawCount: 0 })
    }

    get().advanceTurn(1)
  },

  resolveUno: (confirmed: boolean) => {
    const state = get()
    if (state.phase !== 'uno-call') return
    const advances = state.pendingUnoAdvance
    if (advances <= 0) {
      set({ phase: 'playing' })
      return
    }

    if (!confirmed) {
      const player = state.players[state.currentPlayerIndex]
      if (player && player.isHuman && player.hand.length === 1) {
        const penaltyDraw = state.config.uno.unoPenaltyDraw
        if (penaltyDraw > 0) {
          const { drawn, drawPile: newDrawPile, discardPile: newDiscardPile } =
            applyDrawToPlayer(state.drawPile, state.discardPile, penaltyDraw)
          if (drawn.length > 0) {
            const newHand = [...player.hand, ...drawn]
            const newPlayers = state.players.map((p, i) =>
              i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
            )
            set({
              players: newPlayers,
              drawPile: newDrawPile,
              discardPile: newDiscardPile,
            })
          }
        }
      }
    } else {
      const player = state.players[state.currentPlayerIndex]
      if (player) {
        set({ unoCalledPlayer: player.id })
      }
    }

    set({ pendingUnoAdvance: 0, phase: 'playing' })
    get().advanceTurn(advances)
  },

  resolveChallenge: (challenge: boolean) => {
    const state = get()
    if (state.phase !== 'challenge') return

    const topCard = state.discardPile[state.discardPile.length - 1]
    if (!topCard || topCard.type !== 'wild4') {
      set({ phase: 'playing' })
      return
    }

    const lastPlayedBy = state.lastPlayedBy
    if (!lastPlayedBy) {
      set({ phase: 'playing', pendingDrawCount: state.pendingDrawCount + 4 })
      get().advanceTurn(1)
      return
    }

    const challengerIdx = state.challengePlayerIndex ?? getNextPlayerIndex(lastPlayedBy.playerIndex, state.direction, state.players.length, 0)

    if (challenge) {
      const playerIdx = lastPlayedBy.playerIndex
      const player = state.players[playerIdx]
      const hadMatching = player.hand.some(
        (c) => c.color === (state.colorBeforeWild ?? state.currentColor) && c.type !== 'wild' && c.type !== 'wild4'
      )

      if (hadMatching) {
        const newDiscardPile = [...state.discardPile]
        const returnCard = newDiscardPile.pop()!

        const { drawn, drawPile: newDrawPile, discardPile: newDiscardPile2 } =
          applyDrawToPlayer(state.drawPile, newDiscardPile, 4)

        const returnHand = [...player.hand, returnCard, ...drawn]
        const newPlayers = state.players.map((p, i) =>
          i === playerIdx ? { ...p, hand: returnHand } : p
        )

        set({
          players: newPlayers,
          discardPile: newDiscardPile2,
          drawPile: newDrawPile,
          phase: 'playing',
          pendingDrawCount: 0,
          challengePlayerIndex: null,
          currentPlayerIndex: challengerIdx,
        })
        return
      } else {
        const { drawn, drawPile: newDrawPile, discardPile: newDiscardPile } =
          applyDrawToPlayer(state.drawPile, state.discardPile, 6)

        const challenger = state.players[challengerIdx]
        const newChallengerHand = [...challenger.hand, ...drawn]
        const newPlayers = state.players.map((p, i) =>
          i === challengerIdx ? { ...p, hand: newChallengerHand } : p
        )

        set({
          players: newPlayers,
          drawPile: newDrawPile,
          discardPile: newDiscardPile,
          phase: 'playing',
          pendingDrawCount: 0,
          challengePlayerIndex: null,
        })
        const afterSkip = getNextPlayerIndex(challengerIdx, state.direction, state.players.length, 1)
        set({ currentPlayerIndex: afterSkip })
        return
      }
    }

    set({
      phase: 'playing',
      challengePlayerIndex: null,
    })
    get().advanceTurn(1)
  },
}))
