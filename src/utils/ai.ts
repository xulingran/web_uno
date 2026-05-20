import type { Card, CardColor } from './types'
import type { AIConfig } from '@/config/types'
import { canPlayCard, canStack } from './rules'

export function findBestCard(
  hand: Card[],
  topCard: Card,
  currentColor: CardColor,
  config: { ai: AIConfig; actionCards: { sevenORule: boolean } },
  opponents?: { handLength: number }[]
): Card | null {
  const playable = hand.filter((c) => canPlayCard(c, topCard, currentColor, hand))
  if (playable.length === 0) return null

  const ai = config.ai

  if (ai.wild4BluffChance > 0) {
    const wild4InPlayable = playable.find((c) => c.type === 'wild4')
    if (wild4InPlayable) {
      const nonWild4Playable = playable.filter((c) => c.type !== 'wild4')
      if (nonWild4Playable.length > 0) {
        const hasMatchingColor = hand.some(
          (c) => c.color === currentColor && c.type !== 'wild' && c.type !== 'wild4'
        )
        if (hasMatchingColor) {
          if (Math.random() < ai.wild4BluffChance) {
            return wild4InPlayable
          }
        }
      }
    }
  }

  if (ai.playRandomness > 0 && Math.random() < ai.playRandomness) {
    const safeChoices = playable.filter((c) => c.type !== 'wild4')
    const pool = safeChoices.length > 0 ? safeChoices : playable
    return pool[Math.floor(Math.random() * pool.length)]
  }

  if (ai.considerOpponent && opponents) {
    const threatExists = opponents.some((o) => o.handLength <= 2)
    if (threatExists) {
      const offensiveAction = playable.find(
        (c) => c.type === 'draw2' || c.type === 'skip' || c.type === 'reverse'
      )
      if (offensiveAction) return offensiveAction
    }
  }

  const numbers = playable.filter((c) => c.type === 'number')

  if (config.actionCards.sevenORule) {
    const sevenOrZero = numbers.filter((c) => c.value === 7 || c.value === 0)
    if (sevenOrZero.length > 0 && hand.length > 3) {
      return sevenOrZero[0]
    }
  }

  if (numbers.length > 0) {
    numbers.sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    return numbers[0]
  }

  const skipsAndReverses = playable.filter((c) => c.type === 'skip' || c.type === 'reverse')
  if (skipsAndReverses.length > 0) return skipsAndReverses[0]

  const draw2s = playable.filter((c) => c.type === 'draw2')
  if (draw2s.length > 0) return draw2s[0]

  const wilds = playable.filter((c) => c.type === 'wild')
  if (wilds.length > 0) {
    return wilds[0]
  }

  const wild4s = playable.filter((c) => c.type === 'wild4')
  if (wild4s.length > 0) {
    return wild4s[0]
  }

  return playable[0]
}

export function chooseColor(
  hand: Card[],
  aiConfig?: AIConfig,
  discardPile?: Card[]
): CardColor {
  const colorCounts: Record<CardColor, number> = { red: 0, yellow: 0, blue: 0, green: 0 }

  for (const card of hand) {
    if (card.color && card.type !== 'wild' && card.type !== 'wild4') {
      colorCounts[card.color]++
    }
  }

  let bestColor: CardColor = 'red'
  let maxCount = 0

  for (const color of ['red', 'yellow', 'blue', 'green'] as CardColor[]) {
    if (colorCounts[color] > maxCount) {
      maxCount = colorCounts[color]
      bestColor = color
    }
  }

  if (aiConfig?.colorStrategy === 'best' && discardPile) {
    const discardColorCounts: Record<CardColor, number> = { red: 0, yellow: 0, blue: 0, green: 0 }
    for (const card of discardPile) {
      if (card.color && card.color in discardColorCounts) {
        discardColorCounts[card.color]++
      }
    }

    const candidates: CardColor[] = []
    for (const color of ['red', 'yellow', 'blue', 'green'] as CardColor[]) {
      if (colorCounts[color] >= maxCount - 1) {
        candidates.push(color)
      }
    }

    if (candidates.length > 1) {
      candidates.sort((a, b) => discardColorCounts[a] - discardColorCounts[b])
      bestColor = candidates[0]
    }
  }

  return bestColor
}

export function shouldStackDraw(
  hand: Card[],
  topCard: Card,
  config: { ai: AIConfig; actionCards: { stackingDraw2: boolean; stackingDraw4: boolean } }
): Card | null {
  if (!config.actionCards.stackingDraw2 && !config.actionCards.stackingDraw4) return null

  const stackable = hand.filter((c) => canStack(c, topCard, config.actionCards))
  if (stackable.length === 0) return null

  const agg = config.ai.stackAggression
  const draw2s = stackable.filter((c) => c.type === 'draw2')
  const wild4s = stackable.filter((c) => c.type === 'wild4')

  if (draw2s.length > 0) {
    if (Math.random() < agg) return draw2s[0]
  }
  if (wild4s.length > 0) {
    if (Math.random() < agg * 0.7) return wild4s[0]
  }

  return null
}

export function shouldChallengeWild4(
  hand: Card[],
  currentColor: CardColor,
  config: { ai: AIConfig; actionCards: { challengeWild4: boolean } }
): boolean {
  if (!config.actionCards.challengeWild4) return false

  const matchingColorCount = hand.filter(
    (c) => c.color === currentColor && c.type !== 'wild' && c.type !== 'wild4'
  ).length

  if (hand.length === 0) return false

  const probability = (matchingColorCount / hand.length) * 2 * config.ai.challengeAggression - 0.5
  return Math.random() < Math.max(0, Math.min(1, probability))
}

export function shouldBluffWild4(
  hand: Card[],
  currentColor: CardColor,
  aiConfig: AIConfig
): boolean {
  if (aiConfig.wild4BluffChance <= 0) return false

  return Math.random() < aiConfig.wild4BluffChance
}