import type { Card, CardColor, Direction } from './types'

export function canPlayCard(card: Card, topCard: Card | null, currentColor: CardColor, _hand?: Card[]): boolean {
  if (!topCard) return true
  if (card.type === 'wild') return true
  if (card.type === 'wild4') {
    if (!_hand || _hand.length === 0) return true
    const hasMatchingColor = _hand.some((c) => c.color === currentColor)
    return !hasMatchingColor
  }
  if (card.color === currentColor) return true
  if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true
  if (card.type !== 'number' && card.type === topCard.type) return true
  return false
}

export function getNextPlayerIndex(
  currentIndex: number,
  direction: Direction,
  numPlayers: number,
  skipCount: number
): number {
  if (numPlayers === 2) {
    return (currentIndex + (skipCount + 1)) % numPlayers
  }
  const step = direction === 'clockwise' ? 1 : numPlayers - 1
  return (currentIndex + step * (skipCount + 1)) % numPlayers
}

export interface ActionEffect {
  needsColorPick: boolean
  reverse: boolean
  skipNext: boolean
  drawCount: number
}

export function canStack(
  card: Card,
  topCard: Card | null,
  config: { stackingDraw2: boolean; stackingDraw4: boolean }
): boolean {
  if (!topCard) return false
  if (card.type === 'draw2' && topCard.type === 'draw2' && config.stackingDraw2) return true
  if (card.type === 'wild4' && topCard.type === 'wild4' && config.stackingDraw4) return true
  if (card.type === 'draw2' && topCard.type === 'wild4' && config.stackingDraw2) return true
  if (card.type === 'wild4' && topCard.type === 'draw2' && config.stackingDraw4) return true
  return false
}

export function canJumpIn(card: Card, topCard: Card | null, currentColor: CardColor): boolean {
  if (!topCard) return false
  const effectiveColor = topCard.color ?? currentColor
  if (card.color !== null && card.color === effectiveColor) {
    if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true
    if (card.type !== 'number' && card.type === topCard.type) return true
  }
  return false
}

export function getCardActionEffectType(card: { type: string; color?: string | null }): { type: string; color?: string } | null {
  switch (card.type) {
    case 'draw2': return { type: 'draw2', color: card.color ?? undefined }
    case 'wild4': return { type: 'wild4' }
    case 'skip': return { type: 'skip', color: card.color ?? undefined }
    case 'reverse': return { type: 'reverse', color: card.color ?? undefined }
    default: return null
  }
}

export function getActionEffect(card: Card, numPlayers: number, reverseAsSkip: boolean): ActionEffect {
  switch (card.type) {
    case 'skip':
      return { needsColorPick: false, reverse: false, skipNext: true, drawCount: 0 }
    case 'reverse':
      if (numPlayers === 2 && reverseAsSkip) {
        return { needsColorPick: false, reverse: false, skipNext: true, drawCount: 0 }
      }
      return { needsColorPick: false, reverse: true, skipNext: false, drawCount: 0 }
    case 'draw2':
      return { needsColorPick: false, reverse: false, skipNext: true, drawCount: 2 }
    case 'wild':
      return { needsColorPick: true, reverse: false, skipNext: false, drawCount: 0 }
    case 'wild4':
      return { needsColorPick: true, reverse: false, skipNext: true, drawCount: 4 }
    default:
      return { needsColorPick: false, reverse: false, skipNext: false, drawCount: 0 }
  }
}
