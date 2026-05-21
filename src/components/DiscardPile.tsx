import type { Card as CardType, CardColor } from '@/utils/types'
import Card from './Card'

interface DiscardPileProps {
  topCard: CardType | null
  currentColor: CardColor
}

const colorMap: Record<CardColor, string> = {
  red: '#E53935',
  yellow: '#FDD835',
  blue: '#1E88E5',
  green: '#43A047',
}

const colorNameMap: Record<CardColor, string> = {
  red: '红',
  yellow: '黄',
  blue: '蓝',
  green: '绿',
}

export default function DiscardPile({ topCard, currentColor }: DiscardPileProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="discard-pile-slot">
        {topCard ? (
          <Card card={topCard} playable={false} />
        ) : (
          <div className="discard-pile-empty">
            <span className="text-white/40 text-sm">空</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 bg-black/30 rounded-full">
        <div
          className="w-4 h-4 rounded-full border border-white/30"
          style={{ backgroundColor: colorMap[currentColor] }}
        />
        <span className="text-xs text-white/80 font-game">
          {colorNameMap[currentColor]}
        </span>
      </div>
    </div>
  )
}