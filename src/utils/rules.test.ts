import { describe, it, expect } from 'vitest'
import { canPlayCard, getNextPlayerIndex, getActionEffect, canStack, canJumpIn } from './rules'
import type { Card, CardColor, Direction } from './types'

function card(overrides: Partial<Card>): Card {
  return { id: 'test', color: 'red', type: 'number', value: 5, ...overrides }
}

describe('canPlayCard', () => {
  it('returns true when discard pile is empty (topCard is null)', () => {
    expect(canPlayCard(card({}), null, 'red')).toBe(true)
  })

  it('returns true when card color matches current color', () => {
    const topCard = card({ color: 'blue', type: 'number', value: 3 })
    expect(canPlayCard(card({ color: 'blue', type: 'number', value: 7 }), topCard, 'blue')).toBe(true)
  })

  it('returns true when both are number cards with the same value', () => {
    const topCard = card({ color: 'red', type: 'number', value: 5 })
    expect(canPlayCard(card({ color: 'blue', type: 'number', value: 5 }), topCard, 'red')).toBe(true)
  })

  it('returns true when both are skip cards', () => {
    const topCard = card({ color: 'green', type: 'skip' })
    expect(canPlayCard(card({ color: 'yellow', type: 'skip' }), topCard, 'green')).toBe(true)
  })

  it('returns true when both are reverse cards', () => {
    const topCard = card({ color: 'blue', type: 'reverse' })
    expect(canPlayCard(card({ color: 'red', type: 'reverse' }), topCard, 'blue')).toBe(true)
  })

  it('returns true when both are draw2 cards', () => {
    const topCard = card({ color: 'red', type: 'draw2' })
    expect(canPlayCard(card({ color: 'green', type: 'draw2' }), topCard, 'red')).toBe(true)
  })

  it('returns true for Wild card regardless of top card', () => {
    const topCard = card({ color: 'blue', type: 'number', value: 3 })
    expect(canPlayCard(card({ color: null, type: 'wild' }), topCard, 'blue')).toBe(true)
  })

  it('returns false for Wild4 when hand has a card matching current color', () => {
    const topCard = card({ color: 'blue', type: 'number', value: 3 })
    const hand = [card({ color: 'blue', type: 'number', value: 1 })]
    expect(canPlayCard(card({ color: null, type: 'wild4' }), topCard, 'blue', hand)).toBe(false)
  })

  it('returns true for Wild4 when hand has no card matching current color', () => {
    const topCard = card({ color: 'blue', type: 'number', value: 3 })
    const hand = [card({ color: 'red', type: 'number', value: 1 })]
    expect(canPlayCard(card({ color: null, type: 'wild4' }), topCard, 'blue', hand)).toBe(true)
  })

  it('returns true for Wild4 when no hand is provided', () => {
    const topCard = card({ color: 'blue', type: 'number', value: 3 })
    expect(canPlayCard(card({ color: null, type: 'wild4' }), topCard, 'blue')).toBe(true)
  })

  it('returns true for Wild4 when hand is empty', () => {
    const topCard = card({ color: 'blue', type: 'number', value: 3 })
    expect(canPlayCard(card({ color: null, type: 'wild4' }), topCard, 'blue', [])).toBe(true)
  })
})

describe('getNextPlayerIndex', () => {
  it('3 players clockwise from 0 with skip=0 returns 1', () => {
    expect(getNextPlayerIndex(0, 'clockwise', 3, 0)).toBe(1)
  })

  it('3 players counterclockwise from 0 with skip=0 returns 2', () => {
    expect(getNextPlayerIndex(0, 'counterclockwise', 3, 0)).toBe(2)
  })

  it('2 players any direction with skip=1 returns self (0)', () => {
    expect(getNextPlayerIndex(0, 'clockwise', 2, 1)).toBe(0)
    expect(getNextPlayerIndex(0, 'counterclockwise', 2, 1)).toBe(0)
  })

  it('3 players clockwise from 0 with skip=1 returns 2', () => {
    expect(getNextPlayerIndex(0, 'clockwise', 3, 1)).toBe(2)
  })
})

describe('getActionEffect', () => {
  it('Skip card returns skipNext=true, needsColorPick=false', () => {
    expect(getActionEffect(card({ type: 'skip' }), 4, false)).toEqual({
      needsColorPick: false,
      reverse: false,
      skipNext: true,
      drawCount: 0,
    })
  })

  it('Draw2 card returns drawCount=2, skipNext=true', () => {
    expect(getActionEffect(card({ type: 'draw2' }), 4, false)).toEqual({
      needsColorPick: false,
      reverse: false,
      skipNext: true,
      drawCount: 2,
    })
  })

  it('Wild card returns needsColorPick=true', () => {
    expect(getActionEffect(card({ color: null, type: 'wild' }), 4, false)).toEqual({
      needsColorPick: true,
      reverse: false,
      skipNext: false,
      drawCount: 0,
    })
  })

  it('Wild4 card returns needsColorPick=true, drawCount=4, skipNext=true', () => {
    expect(getActionEffect(card({ color: null, type: 'wild4' }), 4, false)).toEqual({
      needsColorPick: true,
      reverse: false,
      skipNext: true,
      drawCount: 4,
    })
  })

  it('2-player Reverse with reverseAsSkip=true returns skipNext=true, reverse=false', () => {
    expect(getActionEffect(card({ type: 'reverse' }), 2, true)).toEqual({
      needsColorPick: false,
      reverse: false,
      skipNext: true,
      drawCount: 0,
    })
  })

  it('2-player Reverse with reverseAsSkip=false returns reverse=true', () => {
    expect(getActionEffect(card({ type: 'reverse' }), 2, false)).toEqual({
      needsColorPick: false,
      reverse: true,
      skipNext: false,
      drawCount: 0,
    })
  })

  it('number card returns all effects as false/0', () => {
    expect(getActionEffect(card({ type: 'number', value: 3 }), 4, false)).toEqual({
      needsColorPick: false,
      reverse: false,
      skipNext: false,
      drawCount: 0,
    })
  })
})

describe('canStack', () => {
  it('returns true for draw2 on draw2 when stackingDraw2 is enabled', () => {
    const topCard = card({ color: 'red', type: 'draw2' })
    expect(canStack(card({ color: 'blue', type: 'draw2' }), topCard, { stackingDraw2: true, stackingDraw4: false })).toBe(true)
  })

  it('returns true for wild4 on wild4 when stackingDraw4 is enabled', () => {
    const topCard = card({ color: null, type: 'wild4' })
    expect(canStack(card({ color: null, type: 'wild4' }), topCard, { stackingDraw2: false, stackingDraw4: true })).toBe(true)
  })

  it('returns true for draw2 on wild4 when stackingDraw2 is enabled', () => {
    const topCard = card({ color: null, type: 'wild4' })
    expect(canStack(card({ color: 'blue', type: 'draw2' }), topCard, { stackingDraw2: true, stackingDraw4: false })).toBe(true)
  })

  it('returns false when stacking is disabled in config', () => {
    const topCard = card({ color: 'red', type: 'draw2' })
    expect(canStack(card({ color: 'blue', type: 'draw2' }), topCard, { stackingDraw2: false, stackingDraw4: false })).toBe(false)
  })

  it('returns false when topCard is null', () => {
    expect(canStack(card({ type: 'draw2' }), null, { stackingDraw2: true, stackingDraw4: true })).toBe(false)
  })
})

describe('canJumpIn', () => {
  it('returns true for same color and same number value', () => {
    const topCard = card({ color: 'red', type: 'number', value: 5 })
    expect(canJumpIn(card({ color: 'red', type: 'number', value: 5 }), topCard, 'red')).toBe(true)
  })

  it('returns true for same color and same type (skip)', () => {
    const topCard = card({ color: 'green', type: 'skip' })
    expect(canJumpIn(card({ color: 'green', type: 'skip' }), topCard, 'green')).toBe(true)
  })

  it('returns false when color does not match', () => {
    const topCard = card({ color: 'red', type: 'number', value: 5 })
    expect(canJumpIn(card({ color: 'blue', type: 'number', value: 5 }), topCard, 'red')).toBe(false)
  })

  it('returns false when topCard is null', () => {
    expect(canJumpIn(card({ color: 'red', type: 'number', value: 5 }), null, 'red')).toBe(false)
  })
})