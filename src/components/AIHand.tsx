import type { Player } from '@/utils/types'
import CardBack from './CardBack'

interface AIHandProps {
  player: Player
  isCurrentTurn: boolean
  position: 'top' | 'left' | 'right'
}

function FanCards({ count, size }: { count: number; size: 'top' | 'side' }) {
  if (count === 0) return null

  const maxAngle = 180
  const stepAngle = Math.min(15, maxAngle / Math.max(count, 1))

  return (
    <div className="relative" style={{ width: size === 'top' ? 70 : 60, height: size === 'top' ? 105 : 90 }}>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i - (count - 1) / 2) * stepAngle
        const isEnd = i === count - 1
        return (
          <div
            key={i}
            className="absolute left-1/2"
            style={{
              bottom: 0,
              transformOrigin: 'bottom center',
              transform: `translateX(-50%) rotate(${angle}deg)`,
              zIndex: isEnd ? count : i,
            }}
          >
            <CardBack size={size} />
          </div>
        )
      })}
    </div>
  )
}

export default function AIHand({ player, isCurrentTurn, position }: AIHandProps) {
  const isSide = position === 'left' || position === 'right'
  const rotation = position === 'left' ? -90 : position === 'right' ? 90 : 0
  const cardSize = isSide ? 'side' : 'top'
  const maxDisplay = isSide ? 7 : 10
  const displayCount = Math.min(player.hand.length, maxDisplay)

  const content = (
    <div className={`flex flex-col items-center gap-2 ${isCurrentTurn ? 'animate-pulse-glow rounded-xl p-1' : ''}`}>
      <div
        className={`px-3 py-1 rounded-lg font-game text-sm transition-all duration-300 ${
          isCurrentTurn
            ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/50 scale-110'
            : 'bg-white/10 text-white/80'
        }`}
      >
        {player.name} · {player.hand.length}张
      </div>
      <FanCards count={displayCount} size={cardSize} />
    </div>
  )

  if (isSide) {
    return (
      <div style={{ transform: `rotate(${rotation}deg)` }}>
        {content}
      </div>
    )
  }

  return content
}
