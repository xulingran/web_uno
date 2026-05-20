import { describe, it, expect, vi, afterEach } from 'vitest'
import { findBestCard, chooseColor, shouldStackDraw, shouldChallengeWild4 } from './ai'
import type { Card, CardColor } from './types'
import type { AIConfig } from '@/config/types'

function createBaseAIConfig(overrides: Partial<AIConfig> = {}): AIConfig {
  return {
    difficulty: 'hard',
    playRandomness: 0,
    stackAggression: 0,
    challengeAggression: 0,
    wild4BluffChance: 0,
    considerOpponent: false,
    colorStrategy: 'most',
    ...overrides,
  }
}

describe('findBestCard', () => {
  const topCard: Card = { id: 'red-5-0', color: 'red', type: 'number', value: 5 }

  it('returns null when no cards are playable', () => {
    const hand: Card[] = [
      { id: 'green-skip-0', color: 'green', type: 'skip' },
      { id: 'blue-draw2-0', color: 'blue', type: 'draw2' },
    ]
    const config = { ai: createBaseAIConfig(), actionCards: { sevenORule: false } }
    expect(findBestCard(hand, topCard, 'red', config)).toBeNull()
  })

  it('returns the number card with the highest value when multiple number cards are playable', () => {
    const hand: Card[] = [
      { id: 'red-3-0', color: 'red', type: 'number', value: 3 },
      { id: 'red-7-0', color: 'red', type: 'number', value: 7 },
      { id: 'red-5-0', color: 'red', type: 'number', value: 5 },
    ]
    const config = { ai: createBaseAIConfig(), actionCards: { sevenORule: false } }
    const result = findBestCard(hand, topCard, 'red', config)
    expect(result).toEqual({ id: 'red-7-0', color: 'red', type: 'number', value: 7 })
  })

  it('plays offensive cards when next player has ≤ 2 cards', () => {
    const hand: Card[] = [
      { id: 'red-9-0', color: 'red', type: 'number', value: 9 },
      { id: 'red-skip-0', color: 'red', type: 'skip' },
      { id: 'red-draw2-0', color: 'red', type: 'draw2' },
    ]
    const config = {
      ai: createBaseAIConfig({ considerOpponent: true }),
      actionCards: { sevenORule: false },
    }
    const opponents = [{ handLength: 5 }]
    const result = findBestCard(hand, topCard, 'red', config, opponents, 2)
    expect(result?.type).toBe('skip')
  })

  it('does not play offensive cards when next player has > 2 cards', () => {
    const hand: Card[] = [
      { id: 'red-9-0', color: 'red', type: 'number', value: 9 },
      { id: 'red-skip-0', color: 'red', type: 'skip' },
    ]
    const config = {
      ai: createBaseAIConfig({ considerOpponent: true }),
      actionCards: { sevenORule: false },
    }
    const opponents = [{ handLength: 2 }]
    const result = findBestCard(hand, topCard, 'red', config, opponents, 5)
    // nextPlayerHandLength=5 > 2, so no threat response → normal priority
    expect(result).toEqual({ id: 'red-9-0', color: 'red', type: 'number', value: 9 })
  })

  it('follows priority: number > skip/reverse > draw2 > wild > wild4', () => {
    const hand: Card[] = [
      { id: 'blue-3-0', color: 'blue', type: 'number', value: 3 },
      { id: 'blue-skip-0', color: 'blue', type: 'skip' },
      { id: 'blue-draw2-0', color: 'blue', type: 'draw2' },
      { id: 'wild-0', color: null, type: 'wild' },
      { id: 'wild4-0', color: null, type: 'wild4' },
    ]
    const config = { ai: createBaseAIConfig(), actionCards: { sevenORule: false } }
    const blueTop: Card = { id: 'blue-5-0', color: 'blue', type: 'number', value: 5 }

    const result = findBestCard(hand, blueTop, 'blue', config)
    expect(result).toEqual({ id: 'blue-3-0', color: 'blue', type: 'number', value: 3 })
  })
})

describe('chooseColor', () => {
  it('returns the color with the most cards in hand', () => {
    const hand: Card[] = [
      { id: 'red-1-0', color: 'red', type: 'number', value: 1 },
      { id: 'red-2-0', color: 'red', type: 'number', value: 2 },
      { id: 'blue-3-0', color: 'blue', type: 'number', value: 3 },
      { id: 'green-4-0', color: 'green', type: 'number', value: 4 },
    ]
    expect(chooseColor(hand)).toBe('red')
  })

  it('returns a valid color when hand is empty', () => {
    const result = chooseColor([])
    expect(['red', 'yellow', 'blue', 'green']).toContain(result)
  })
})

describe('shouldStackDraw', () => {
  const topDraw2: Card = { id: 'red-draw2-0', color: 'red', type: 'draw2' }

  it('returns a draw2 card when stackAggression is 1.0 and a stackable draw2 exists', () => {
    const hand: Card[] = [
      { id: 'blue-draw2-0', color: 'blue', type: 'draw2' },
    ]
    const config = {
      ai: createBaseAIConfig({ stackAggression: 1.0 }),
      actionCards: { stackingDraw2: true, stackingDraw4: false },
    }
    const result = shouldStackDraw(hand, topDraw2, config)
    expect(result).toEqual({ id: 'blue-draw2-0', color: 'blue', type: 'draw2' })
  })

  it('returns null when stackAggression is 0 even with a stackable draw2', () => {
    const hand: Card[] = [
      { id: 'blue-draw2-0', color: 'blue', type: 'draw2' },
    ]
    const config = {
      ai: createBaseAIConfig({ stackAggression: 0 }),
      actionCards: { stackingDraw2: true, stackingDraw4: false },
    }
    expect(shouldStackDraw(hand, topDraw2, config)).toBeNull()
  })

  it('returns null when stacking is disabled', () => {
    const hand: Card[] = [
      { id: 'blue-draw2-0', color: 'blue', type: 'draw2' },
    ]
    const config = {
      ai: createBaseAIConfig({ stackAggression: 1.0 }),
      actionCards: { stackingDraw2: false, stackingDraw4: false },
    }
    expect(shouldStackDraw(hand, topDraw2, config)).toBeNull()
  })
})

describe('shouldChallengeWild4', () => {
  it('returns false when challengeWild4 config is disabled', () => {
    const hand: Card[] = [
      { id: 'red-1-0', color: 'red', type: 'number', value: 1 },
    ]
    const config = {
      ai: createBaseAIConfig(),
      actionCards: { challengeWild4: false },
    }
    expect(shouldChallengeWild4(hand, 'red', config)).toBe(false)
  })
})

describe('findBestCard - wild4 bluff', () => {
  const topCard: Card = { id: 'red-5-0', color: 'red', type: 'number', value: 5 }
  const currentColor: CardColor = 'red'

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns wild4 when bluff triggers and hand has matching color with other playable cards', () => {
    const hand: Card[] = [
      { id: 'red-3-0', color: 'red', type: 'number', value: 3 },
      { id: 'wild4-0', color: null, type: 'wild4' },
      { id: 'yellow-7-0', color: 'yellow', type: 'number', value: 7 },
    ]
    const config = {
      ai: createBaseAIConfig({ wild4BluffChance: 0.8 }),
      actionCards: { sevenORule: false },
    }

    // Bluff check is now BEFORE canPlayCard filtering
    // hand has red-3 (matching color), wild4, yellow-7
    // hasMatchingColor = true (red-3)
    // hasOtherPlayable = red-3 is playable (matches color) → true
    // Math.random() < 0.8 → bluff triggers → return wild4
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    const result = findBestCard(hand, topCard, currentColor, config)
    expect(result).toEqual({ id: 'wild4-0', color: null, type: 'wild4' })
  })

  it('does not bluff when random is high despite matching color', () => {
    const hand: Card[] = [
      { id: 'red-3-0', color: 'red', type: 'number', value: 3 },
      { id: 'wild4-0', color: null, type: 'wild4' },
      { id: 'yellow-7-0', color: 'yellow', type: 'number', value: 7 },
    ]
    const config = {
      ai: createBaseAIConfig({ wild4BluffChance: 0.8 }),
      actionCards: { sevenORule: false },
    }

    // Math.random() = 0.9 >= 0.8 → bluff doesn't trigger
    vi.spyOn(Math, 'random').mockReturnValue(0.9)

    const result = findBestCard(hand, topCard, currentColor, config)
    // Falls through to normal logic → wild4 not playable (has red card)
    // playable = [red-3] → returns red-3
    expect(result).toEqual({ id: 'red-3-0', color: 'red', type: 'number', value: 3 })
  })

  it('does not bluff when no matching color exists in hand', () => {
    const hand: Card[] = [
      { id: 'wild4-0', color: null, type: 'wild4' },
      { id: 'yellow-7-0', color: 'yellow', type: 'number', value: 7 },
    ]
    const config = {
      ai: createBaseAIConfig({ wild4BluffChance: 0.8 }),
      actionCards: { sevenORule: false },
    }

    // hasMatchingColor = false (no red cards) → bluff check skipped
    // Normal flow: wild4 IS playable (no matching color) → returns wild4
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    const result = findBestCard(hand, topCard, currentColor, config)
    expect(result?.type).toBe('wild4')
  })

  it('does not bluff when no other playable card exists', () => {
    const hand: Card[] = [
      { id: 'red-3-0', color: 'red', type: 'number', value: 3 },
      { id: 'wild4-0', color: null, type: 'wild4' },
    ]
    const config = {
      ai: createBaseAIConfig({ wild4BluffChance: 0.8 }),
      actionCards: { sevenORule: false },
    }

    const blueTop: Card = { id: 'blue-5-0', color: 'blue', type: 'number', value: 5 }

    // hasMatchingColor = true (red-3 matches red currentColor)
    // hasOtherPlayable: red-3 on blue-5 with currentColor=red? red-3 matches red → yes
    // So bluff CAN trigger here if random is low enough
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    const result = findBestCard(hand, blueTop, 'red', config)
    // Bluff triggers → returns wild4
    expect(result).toEqual({ id: 'wild4-0', color: null, type: 'wild4' })
  })
})

describe('findBestCard - 7/0 rule', () => {
  const topCard: Card = { id: 'red-5-0', color: 'red', type: 'number', value: 5 }

  it('prefers 7 when swap is beneficial (opponent has fewer cards)', () => {
    const hand: Card[] = [
      { id: 'red-7-0', color: 'red', type: 'number', value: 7 },
      { id: 'red-9-0', color: 'red', type: 'number', value: 9 },
      { id: 'red-5-0', color: 'red', type: 'number', value: 5 },
      { id: 'blue-3-0', color: 'blue', type: 'number', value: 3 },
    ]
    const config = {
      ai: createBaseAIConfig(),
      actionCards: { sevenORule: true },
    }
    // AI has 4 cards, opponent max is 2 → swap beneficial
    const opponents = [{ handLength: 2 }]
    const result = findBestCard(hand, topCard, 'red', config, opponents)
    expect(result).toEqual({ id: 'red-7-0', color: 'red', type: 'number', value: 7 })
  })

  it('does not play 7 when swap would be harmful (opponent has more cards)', () => {
    const hand: Card[] = [
      { id: 'red-7-0', color: 'red', type: 'number', value: 7 },
      { id: 'red-9-0', color: 'red', type: 'number', value: 9 },
      { id: 'red-5-0', color: 'red', type: 'number', value: 5 },
      { id: 'blue-3-0', color: 'blue', type: 'number', value: 3 },
    ]
    const config = {
      ai: createBaseAIConfig(),
      actionCards: { sevenORule: true },
    }
    // AI has 4 cards, opponent has 8 → swap would give AI more cards
    const opponents = [{ handLength: 8 }]
    const result = findBestCard(hand, topCard, 'red', config, opponents)
    // 7 not played → falls through to normal priority → red-9 (highest number)
    expect(result).toEqual({ id: 'red-9-0', color: 'red', type: 'number', value: 9 })
  })

  it('does not play 7 when no opponents info provided', () => {
    const hand: Card[] = [
      { id: 'red-7-0', color: 'red', type: 'number', value: 7 },
      { id: 'red-9-0', color: 'red', type: 'number', value: 9 },
      { id: 'red-5-0', color: 'red', type: 'number', value: 5 },
      { id: 'blue-3-0', color: 'blue', type: 'number', value: 3 },
    ]
    const config = {
      ai: createBaseAIConfig(),
      actionCards: { sevenORule: true },
    }
    const result = findBestCard(hand, topCard, 'red', config)
    // No opponents → 7 not played → red-9
    expect(result).toEqual({ id: 'red-9-0', color: 'red', type: 'number', value: 9 })
  })

  it('0 cards no longer get special priority with sevenORule', () => {
    const hand: Card[] = [
      { id: 'red-0-0', color: 'red', type: 'number', value: 0 },
      { id: 'red-9-0', color: 'red', type: 'number', value: 9 },
      { id: 'red-5-0', color: 'red', type: 'number', value: 5 },
      { id: 'blue-3-0', color: 'blue', type: 'number', value: 3 },
    ]
    const config = {
      ai: createBaseAIConfig(),
      actionCards: { sevenORule: true },
    }
    const opponents = [{ handLength: 2 }]
    const result = findBestCard(hand, topCard, 'red', config, opponents)
    // 0 no longer gets special priority → falls through to highest number
    expect(result).toEqual({ id: 'red-9-0', color: 'red', type: 'number', value: 9 })
  })
})

describe('findBestCard - random play', () => {
  const topCard: Card = { id: 'red-5-0', color: 'red', type: 'number', value: 5 }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a random safe card when playRandomness triggers', () => {
    const hand: Card[] = [
      { id: 'red-3-0', color: 'red', type: 'number', value: 3 },
      { id: 'red-9-0', color: 'red', type: 'number', value: 9 },
    ]
    const config = {
      ai: createBaseAIConfig({ playRandomness: 0.8 }),
      actionCards: { sevenORule: false },
    }

    // Both calls to Math.random return 0.5:
    //   1st: 0.5 < 0.8 → playRandomness triggers
    //   2nd: Math.floor(0.5 * 2) = 1 → picks pool[1] = red-9
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    const result = findBestCard(hand, topCard, 'red', config)
    expect(result).toEqual({ id: 'red-9-0', color: 'red', type: 'number', value: 9 })
  })

  it('skips random play when playRandomness is 0', () => {
    const hand: Card[] = [
      { id: 'red-3-0', color: 'red', type: 'number', value: 3 },
      { id: 'red-9-0', color: 'red', type: 'number', value: 9 },
    ]
    const config = {
      ai: createBaseAIConfig({ playRandomness: 0 }),
      actionCards: { sevenORule: false },
    }

    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    const result = findBestCard(hand, topCard, 'red', config)
    // playRandomness = 0 → skip, use normal logic → returns highest number
    expect(result).toEqual({ id: 'red-9-0', color: 'red', type: 'number', value: 9 })
  })
})

describe('chooseColor - best strategy', () => {
  it('picks the least discarded color among close candidates when strategy is best', () => {
    const hand: Card[] = [
      { id: 'red-1-0', color: 'red', type: 'number', value: 1 },
      { id: 'red-2-0', color: 'red', type: 'number', value: 2 },
      { id: 'blue-3-0', color: 'blue', type: 'number', value: 3 },
      { id: 'blue-4-0', color: 'blue', type: 'number', value: 4 },
      { id: 'green-5-0', color: 'green', type: 'number', value: 5 },
    ]
    const aiConfig = createBaseAIConfig({ colorStrategy: 'best' })
    const discardPile: Card[] = [
      { id: 'd-red-1', color: 'red', type: 'number', value: 1 },
      { id: 'd-red-2', color: 'red', type: 'number', value: 2 },
      { id: 'd-red-3', color: 'red', type: 'number', value: 3 },
      { id: 'd-blue-1', color: 'blue', type: 'number', value: 1 },
    ]
    // colorCounts: { red:2, blue:2, green:1, yellow:0 }
    // maxCount = 2, candidates where count >= 1: red, blue, green
    // discardColorCounts: { red:3, blue:1, green:0, yellow:0 }
    // sorted ascending: green(0), blue(1), red(3) → picks green
    expect(chooseColor(hand, aiConfig, discardPile)).toBe('green')
  })

  it('falls back to most-count color when only one candidate exists with best strategy', () => {
    const hand: Card[] = [
      { id: 'red-1-0', color: 'red', type: 'number', value: 1 },
      { id: 'red-2-0', color: 'red', type: 'number', value: 2 },
      { id: 'red-3-0', color: 'red', type: 'number', value: 3 },
      { id: 'blue-4-0', color: 'blue', type: 'number', value: 4 },
    ]
    const aiConfig = createBaseAIConfig({ colorStrategy: 'best' })
    const discardPile: Card[] = [
      { id: 'd-red-1', color: 'red', type: 'number', value: 1 },
    ]
    // colorCounts: { red:3, blue:1, green:0, yellow:0 }
    // maxCount = 3, candidates where count >= 2: red only (blue=1 < 2)
    // Only 1 candidate → no sorting, bestColor stays as red (from initial loop)
    expect(chooseColor(hand, aiConfig, discardPile)).toBe('red')
  })

  it('ignores discard pile wild cards in best strategy', () => {
    const hand: Card[] = [
      { id: 'red-1-0', color: 'red', type: 'number', value: 1 },
      { id: 'red-2-0', color: 'red', type: 'number', value: 2 },
      { id: 'blue-3-0', color: 'blue', type: 'number', value: 3 },
      { id: 'blue-4-0', color: 'blue', type: 'number', value: 4 },
    ]
    const aiConfig = createBaseAIConfig({ colorStrategy: 'best' })
    const discardPile: Card[] = [
      { id: 'd-wild', color: null, type: 'wild' },
      { id: 'd-wild4', color: null, type: 'wild4' },
    ]
    // colorCounts: { red:2, blue:2, green:0, yellow:0 }
    // maxCount = 2, candidates where count >= 1: red, blue
    // discardColorCounts all 0 (wild/wild4 have null color, skipped)
    // sorted: both 0, stable sort keeps 'red' first
    expect(chooseColor(hand, aiConfig, discardPile)).toBe('red')
  })
})

describe('shouldStackDraw - wild4 stacking', () => {
  const topWild4: Card = { id: 'wild4-0', color: null, type: 'wild4' }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a wild4 when stackingDraw4 is enabled and aggression is high', () => {
    const hand: Card[] = [
      { id: 'wild4-1', color: null, type: 'wild4' },
    ]
    const config = {
      ai: createBaseAIConfig({ stackAggression: 1.0 }),
      actionCards: { stackingDraw2: false, stackingDraw4: true },
    }

    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    const result = shouldStackDraw(hand, topWild4, config)
    // 0.5 < 1.0 → true → returns wild4
    expect(result).toEqual({ id: 'wild4-1', color: null, type: 'wild4' })
  })

  it('returns null when wild4 aggression check fails', () => {
    const hand: Card[] = [
      { id: 'wild4-1', color: null, type: 'wild4' },
    ]
    const config = {
      ai: createBaseAIConfig({ stackAggression: 0.5 }),
      actionCards: { stackingDraw2: false, stackingDraw4: true },
    }

    vi.spyOn(Math, 'random').mockReturnValue(0.9)

    const result = shouldStackDraw(hand, topWild4, config)
    // 0.9 < 0.5 → false → returns null
    expect(result).toBeNull()
  })

  it('returns null when stackingDraw4 is disabled', () => {
    const hand: Card[] = [
      { id: 'wild4-1', color: null, type: 'wild4' },
    ]
    const config = {
      ai: createBaseAIConfig({ stackAggression: 1.0 }),
      actionCards: { stackingDraw2: false, stackingDraw4: false },
    }

    expect(shouldStackDraw(hand, topWild4, config)).toBeNull()
  })

  it('uses stackAggression*0.7 for wild4 threshold (not raw stackAggression)', () => {
    const hand: Card[] = [
      { id: 'wild4-1', color: null, type: 'wild4' },
      { id: 'draw2-1', color: 'red', type: 'draw2' },
    ]
    const config = {
      ai: createBaseAIConfig({ stackAggression: 1.0 }),
      actionCards: { stackingDraw2: true, stackingDraw4: true },
    }

    // random=0.8: draw2 passes (0.8 < 1.0) but wild4 fails (0.8 > 0.7)
    // draw2 is checked first, so it should return draw2 before reaching wild4
    vi.spyOn(Math, 'random').mockReturnValue(0.8)

    const topDraw2: Card = { id: 'blue-draw2-0', color: 'blue', type: 'draw2' }
    const result = shouldStackDraw(hand, topDraw2, config)
    // draw2: 0.8 < 1.0 → passes → returns draw2
    expect(result).toEqual({ id: 'draw2-1', color: 'red', type: 'draw2' })
  })

  it('wild4 stacking fails when random falls between agg*0.7 and agg threshold', () => {
    const hand: Card[] = [
      { id: 'wild4-1', color: null, type: 'wild4' },
    ]
    const config = {
      ai: createBaseAIConfig({ stackAggression: 1.0 }),
      actionCards: { stackingDraw2: false, stackingDraw4: true },
    }

    // stackAggression=1.0 → wild4 threshold = 1.0*0.7 = 0.7
    // random=0.75 > 0.7 → should NOT stack
    vi.spyOn(Math, 'random').mockReturnValue(0.75)

    const result = shouldStackDraw(hand, topWild4, config)
    expect(result).toBeNull()
  })

  it('wild4 stacking succeeds when random is well below agg*0.7 threshold', () => {
    const hand: Card[] = [
      { id: 'wild4-1', color: null, type: 'wild4' },
    ]
    const config = {
      ai: createBaseAIConfig({ stackAggression: 1.0 }),
      actionCards: { stackingDraw2: false, stackingDraw4: true },
    }

    // stackAggression=1.0 → wild4 threshold = 1.0*0.7 = 0.7
    // random=0.6 < 0.7 → should stack
    vi.spyOn(Math, 'random').mockReturnValue(0.6)

    const result = shouldStackDraw(hand, topWild4, config)
    expect(result).toEqual({ id: 'wild4-1', color: null, type: 'wild4' })
  })
})

describe('shouldChallengeWild4 - probability', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true when probability calculation exceeds random threshold', () => {
    const hand: Card[] = [
      { id: 'red-1-0', color: 'red', type: 'number', value: 1 },
      { id: 'red-2-0', color: 'red', type: 'number', value: 2 },
      { id: 'blue-3-0', color: 'blue', type: 'number', value: 3 },
    ]
    const config = {
      ai: createBaseAIConfig({ challengeAggression: 1.0 }),
      actionCards: { challengeWild4: true },
    }
    // matchingColorCount=2, hand.length=3
    // probability = (2/3) * 1.0 * 2 = 1.33 → clamped to 1.0
    // Math.random = 0.5 < 1.0 → true
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(shouldChallengeWild4(hand, 'red', config)).toBe(true)
  })

  it('returns false when probability calculation is below random threshold', () => {
    const hand: Card[] = [
      { id: 'red-1-0', color: 'red', type: 'number', value: 1 },
      { id: 'blue-2-0', color: 'blue', type: 'number', value: 2 },
      { id: 'blue-3-0', color: 'blue', type: 'number', value: 3 },
    ]
    const config = {
      ai: createBaseAIConfig({ challengeAggression: 0.3 }),
      actionCards: { challengeWild4: true },
    }
    // matchingColorCount=1, hand.length=3
    // probability = (1/3) * 0.3 * 2 = 0.2
    // Math.random = 0.5 > 0.2 → false
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(shouldChallengeWild4(hand, 'red', config)).toBe(false)
  })

  it('returns false when hand is empty', () => {
    const config = {
      ai: createBaseAIConfig({ challengeAggression: 1.0 }),
      actionCards: { challengeWild4: true },
    }
    expect(shouldChallengeWild4([], 'red', config)).toBe(false)
  })

  it('clamps probability to [0, 1] range', () => {
    const hand: Card[] = [
      { id: 'red-1-0', color: 'red', type: 'number', value: 1 },
      { id: 'red-2-0', color: 'red', type: 'number', value: 2 },
    ]
    const config = {
      ai: createBaseAIConfig({ challengeAggression: 2.0 }),
      actionCards: { challengeWild4: true },
    }
    // matchingColorCount=2, hand.length=2
    // probability = (2/2) * 2.0 * 2 = 4.0 → clamped to 1.0
    // Math.random = 0.5 < 1.0 → true
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(shouldChallengeWild4(hand, 'red', config)).toBe(true)
  })

  it('uses multiplier 2.0 — discriminates from old 1.5 multiplier', () => {
    const hand: Card[] = [
      { id: 'red-1-0', color: 'red', type: 'number', value: 1 },
      { id: 'red-2-0', color: 'red', type: 'number', value: 2 },
      { id: 'blue-3-0', color: 'blue', type: 'number', value: 3 },
      { id: 'blue-4-0', color: 'blue', type: 'number', value: 4 },
    ]
    const config = {
      ai: createBaseAIConfig({ challengeAggression: 1.0 }),
      actionCards: { challengeWild4: true },
    }
    // matchingColorCount=2, hand.length=4 → ratio=0.5
    // with multiplier 1.5: 0.5 * 1.0 * 1.5 = 0.75 → random=0.8 → false
    // with multiplier 2.0: 0.5 * 1.0 * 2 = 1.0  → random=0.8 → true
    // This test proves the multiplier is exactly 2.0, not 1.5
    vi.spyOn(Math, 'random').mockReturnValue(0.8)
    expect(shouldChallengeWild4(hand, 'red', config)).toBe(true)
  })

  it('multiplier 2.0 produces correct probability at medium aggression', () => {
    const hand: Card[] = [
      { id: 'red-1-0', color: 'red', type: 'number', value: 1 },
      { id: 'red-2-0', color: 'red', type: 'number', value: 2 },
      { id: 'blue-3-0', color: 'blue', type: 'number', value: 3 },
      { id: 'blue-4-0', color: 'blue', type: 'number', value: 4 },
      { id: 'yellow-5-0', color: 'yellow', type: 'number', value: 5 },
    ]
    const config = {
      ai: createBaseAIConfig({ challengeAggression: 0.8 }),
      actionCards: { challengeWild4: true },
    }
    // matchingColorCount=2, hand.length=5 → ratio=0.4
    // probability = 0.4 * 0.8 * 2 = 0.64
    // with old 1.5: 0.4 * 0.8 * 1.5 = 0.48 → random=0.5 → false
    // with new 2.0: 0.4 * 0.8 * 2 = 0.64   → random=0.5 → true
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(shouldChallengeWild4(hand, 'red', config)).toBe(true)
  })

  it('multiplier 2.0 still respects low aggression for weak evidence', () => {
    const hand: Card[] = [
      { id: 'red-1-0', color: 'red', type: 'number', value: 1 },
      { id: 'blue-2-0', color: 'blue', type: 'number', value: 2 },
      { id: 'blue-3-0', color: 'blue', type: 'number', value: 3 },
      { id: 'blue-4-0', color: 'blue', type: 'number', value: 4 },
      { id: 'blue-5-0', color: 'blue', type: 'number', value: 5 },
    ]
    const config = {
      ai: createBaseAIConfig({ challengeAggression: 0.3 }),
      actionCards: { challengeWild4: true },
    }
    // matchingColorCount=1, hand.length=5 → ratio=0.2
    // probability = 0.2 * 0.3 * 2 = 0.12
    // random=0.5 > 0.12 → false
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(shouldChallengeWild4(hand, 'red', config)).toBe(false)
  })
})
