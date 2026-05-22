import type { Card, CardColor, Direction, Player } from './types'

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

export function applySevenORule(
  players: Player[],
  card: Card,
  playingPlayerIndex: number,
  direction: Direction
): Player[] {
  if (card.type !== 'number') return players

  const newPlayers = [...players]

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
    const dir = direction === 'clockwise' ? 1 : newPlayers.length - 1
    for (let i = 0; i < newPlayers.length; i++) {
      newPlayers[i] = { ...newPlayers[i], hand: hands[(i - dir + newPlayers.length) % newPlayers.length] }
    }
  }

  return newPlayers
}

export function checkWild4Violation(
  wild4PlayerHand: Card[],
  colorBeforeWild: CardColor
): boolean {
  return wild4PlayerHand.some(
    (c) => c.color === colorBeforeWild && c.type !== 'wild' && c.type !== 'wild4'
  )
}
