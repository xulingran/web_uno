import { describe, it, expect } from 'vitest'
import { createDeck, shuffleDeck, dealCards, drawCards, getCardScore } from './deck'
import type { Card } from './types'

describe('createDeck', () => {
  const deck = createDeck()

  it('should return 108 cards', () => {
    expect(deck).toHaveLength(108)
  })

  it('should contain 76 number cards', () => {
    const numberCards = deck.filter((c) => c.type === 'number')
    expect(numberCards).toHaveLength(76)
  })

  it('should contain 8 Skip cards', () => {
    const skipCards = deck.filter((c) => c.type === 'skip')
    expect(skipCards).toHaveLength(8)
  })

  it('should contain 8 Reverse cards', () => {
    const reverseCards = deck.filter((c) => c.type === 'reverse')
    expect(reverseCards).toHaveLength(8)
  })

  it('should contain 8 Draw2 cards', () => {
    const draw2Cards = deck.filter((c) => c.type === 'draw2')
    expect(draw2Cards).toHaveLength(8)
  })

  it('should contain 4 Wild cards', () => {
    const wildCards = deck.filter((c) => c.type === 'wild')
    expect(wildCards).toHaveLength(4)
  })

  it('should contain 4 Wild4 cards', () => {
    const wild4Cards = deck.filter((c) => c.type === 'wild4')
    expect(wild4Cards).toHaveLength(4)
  })

  it('should have exactly one zero per color', () => {
    for (const color of ['red', 'yellow', 'blue', 'green'] as const) {
      const zeros = deck.filter((c) => c.color === color && c.type === 'number' && c.value === 0)
      expect(zeros).toHaveLength(1)
    }
  })

  it('should have exactly two copies of numbers 1-9 per color', () => {
    for (const color of ['red', 'yellow', 'blue', 'green'] as const) {
      for (let value = 1; value <= 9; value++) {
        const cards = deck.filter((c) => c.color === color && c.type === 'number' && c.value === value)
        expect(cards).toHaveLength(2)
      }
    }
  })

  it('each color should have numbers 0 through 9', () => {
    for (const color of ['red', 'yellow', 'blue', 'green'] as const) {
      const numberValues = deck
        .filter((c) => c.color === color && c.type === 'number')
        .map((c) => c.value)
      for (let v = 0; v <= 9; v++) {
        expect(numberValues).toContain(v)
      }
    }
  })

  it('all cards should have unique ids', () => {
    const ids = deck.map((c) => c.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(108)
  })
})

describe('shuffleDeck', () => {
  const deck = createDeck()
  const shuffled = shuffleDeck(deck)

  it('should not change the total number of cards', () => {
    expect(shuffled).toHaveLength(deck.length)
  })

  it('should not change the set of card ids', () => {
    const originalIds = deck.map((c) => c.id).sort()
    const shuffledIds = shuffled.map((c) => c.id).sort()
    expect(shuffledIds).toEqual(originalIds)
  })

  it('should not mutate the original deck', () => {
    const originalLength = deck.length
    shuffleDeck(deck)
    expect(deck).toHaveLength(originalLength)
  })
})

describe('dealCards', () => {
  const deck = createDeck()
  const { players, remaining } = dealCards(deck, 3, 7)

  it('should return 3 groups of 7 cards each', () => {
    expect(players).toHaveLength(3)
    for (const hand of players) {
      expect(hand).toHaveLength(7)
    }
  })

  it('should have 87 remaining cards', () => {
    expect(remaining).toHaveLength(87)
  })

  it('should not mutate the original deck', () => {
    expect(deck).toHaveLength(108)
  })

  it('dealt cards and remaining cards should have no overlap', () => {
    const dealtIds = new Set(players.flat().map((c) => c.id))
    const remainingIds = new Set(remaining.map((c) => c.id))
    for (const id of dealtIds) {
      expect(remainingIds.has(id)).toBe(false)
    }
  })
})

describe('drawCards', () => {
  const deck = createDeck()
  const { drawn, remaining } = drawCards(deck, 3)

  it('should draw 3 cards', () => {
    expect(drawn).toHaveLength(3)
  })

  it('should reduce the remaining pile by 3', () => {
    expect(remaining).toHaveLength(deck.length - 3)
  })

  it('should not mutate the original pile', () => {
    expect(deck).toHaveLength(108)
  })

  it('drawn and remaining cards should have no overlap', () => {
    const drawnIds = new Set(drawn.map((c) => c.id))
    const remainingIds = new Set(remaining.map((c) => c.id))
    for (const id of drawnIds) {
      expect(remainingIds.has(id)).toBe(false)
    }
  })

  it('should draw the first N cards from the pile', () => {
    const { drawn: drawn2, remaining: rem2 } = drawCards(deck, 5)
    expect(drawn2).toHaveLength(5)
    expect(rem2).toHaveLength(deck.length - 5)
    expect(drawn2[0].id).toBe(deck[0].id)
    expect(drawn2[4].id).toBe(deck[4].id)
  })
})

describe('getCardScore', () => {
  it('should return the value for number cards', () => {
    const card: Card = { id: 'red-5-0', color: 'red', type: 'number', value: 5 }
    expect(getCardScore(card)).toBe(5)
  })

  it('should return 20 for Skip cards', () => {
    const card: Card = { id: 'red-skip-0', color: 'red', type: 'skip' }
    expect(getCardScore(card)).toBe(20)
  })

  it('should return 20 for Reverse cards', () => {
    const card: Card = { id: 'red-reverse-0', color: 'red', type: 'reverse' }
    expect(getCardScore(card)).toBe(20)
  })

  it('should return 20 for Draw2 cards', () => {
    const card: Card = { id: 'red-draw2-0', color: 'red', type: 'draw2' }
    expect(getCardScore(card)).toBe(20)
  })

  it('should return 50 for Wild cards', () => {
    const card: Card = { id: 'wild-0', color: null, type: 'wild' }
    expect(getCardScore(card)).toBe(50)
  })

  it('should return 50 for Wild4 cards', () => {
    const card: Card = { id: 'wild4-0', color: null, type: 'wild4' }
    expect(getCardScore(card)).toBe(50)
  })
})