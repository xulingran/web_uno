import type { Card, CardColor } from './types'
import type { GameConfig } from '@/config/types'

const COLORS: CardColor[] = ['red', 'yellow', 'blue', 'green'];

export function createDeck(): Card[] {
  const cards: Card[] = [];

  for (const color of COLORS) {
    cards.push({ id: `${color}-0`, color, type: 'number', value: 0 });

    for (let i = 1; i <= 9; i++) {
      cards.push({ id: `${color}-${i}-0`, color, type: 'number', value: i });
      cards.push({ id: `${color}-${i}-1`, color, type: 'number', value: i });
    }

    for (let i = 0; i < 2; i++) {
      cards.push({ id: `${color}-skip-${i}`, color, type: 'skip' });
      cards.push({ id: `${color}-reverse-${i}`, color, type: 'reverse' });
      cards.push({ id: `${color}-draw2-${i}`, color, type: 'draw2' });
    }
  }

  for (let i = 0; i < 4; i++) {
    cards.push({ id: `wild-${i}`, color: null, type: 'wild' });
  }

  for (let i = 0; i < 4; i++) {
    cards.push({ id: `wild4-${i}`, color: null, type: 'wild4' });
  }

  return cards;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function dealCards(
  deck: Card[],
  numPlayers: number,
  cardsPerPlayer: number
): { players: Card[][]; remaining: Card[] } {
  const remaining = [...deck];
  const playersCards: Card[][] = [];

  for (let i = 0; i < numPlayers; i++) {
    playersCards.push(remaining.splice(0, cardsPerPlayer));
  }

  return { players: playersCards, remaining };
}

export function drawCards(
  pile: Card[],
  count: number
): { drawn: Card[]; remaining: Card[] } {
  const remaining = [...pile];
  const drawn = remaining.splice(0, count);
  return { drawn, remaining };
}

export function getCardScore(card: Card, config?: GameConfig): number {
  if (card.type === 'number') {
    if (config && config.scoring.numberCard > 0) {
      return config.scoring.numberCard
    }
    return card.value ?? 0
  }
  if (card.type === 'wild' || card.type === 'wild4') {
    return config?.scoring.wildCard ?? 50
  }
  return config?.scoring.actionCard ?? 20
}