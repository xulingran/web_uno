import type { PlayerView } from '@/network/protocol'
import CardBack from './CardBack'

interface AIHandProps {
  player: PlayerView
  isCurrentTurn: boolean
  position: 'top' | 'left' | 'right'
}

function FanCards({ count, size }: { count: number; size: 'top' | 'side' }) {
  if (count === 0) return null

  const maxAngle = 180
  const stepAngle = Math.min(15, maxAngle / Math.max(count, 1))

  return (
    <div className={`relative ${size === 'top' ? 'fan-cards-top' : 'fan-cards-side'}`}>
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
  // 优先使用 handCount（联机模式下其他玩家的 hand 为空数组，但 handCount 是真实牌数）
  const handCount = player.handCount ?? player.hand.length
  const displayCount = Math.min(handCount, maxDisplay)

  const label = (
    <div
      className={`px-3 py-1 rounded-lg font-game text-sm transition-all duration-300 whitespace-nowrap ${
        isCurrentTurn
          ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/50 scale-110'
          : 'bg-white/10 text-white/80'
      }`}
    >
      {player.name} · {handCount}张
    </div>
  )

  if (isSide) {
    return (
      <div className={`flex flex-col items-center gap-2 ${isCurrentTurn ? 'animate-pulse-glow rounded-xl p-1' : ''}`}>
        <div style={{ transform: `rotate(${rotation}deg)` }}>
          <FanCards count={displayCount} size={cardSize} />
        </div>
        <div className="relative z-10">
          {label}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${isCurrentTurn ? 'animate-pulse-glow rounded-xl p-1' : ''}`}>
      {label}
      <FanCards count={displayCount} size={cardSize} />
    </div>
  )
}
