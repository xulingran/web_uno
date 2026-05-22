import { forwardRef } from 'react'
import CardBack from './CardBack'

interface DrawPileProps {
  count: number
  onDraw: () => void
  canDraw: boolean
}

const DrawPile = forwardRef<HTMLDivElement, DrawPileProps>(function DrawPile({ count, onDraw, canDraw }, ref) {
  return (
    <div ref={ref} className="flex flex-col items-center gap-2">
      <div
        className={`relative transition-all duration-200 ${canDraw ? 'cursor-pointer hover:scale-105' : ''}`}
        onClick={canDraw ? onDraw : undefined}
      >
        <div style={{ zIndex: 2 }}>
          <CardBack count={count} />
        </div>
        <div className="draw-pile-offset-1 absolute" style={{ zIndex: 1 }}>
          <CardBack />
        </div>
        <div className="draw-pile-offset-2 absolute" style={{ zIndex: 0 }}>
          <CardBack />
        </div>
      </div>
      <div className={`text-sm font-game px-3 py-1 rounded-full transition-all duration-200 ${
        canDraw
          ? 'bg-white/20 text-white cursor-pointer hover:bg-white/30'
          : 'text-white/40'
      }`}
        onClick={canDraw ? (e: React.MouseEvent) => { e.stopPropagation(); onDraw() } : undefined}
      >
        {canDraw ? '点击抽牌' : '等待中...'}
      </div>
    </div>
  )
})

export default DrawPile