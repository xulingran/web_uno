import CardBack from './CardBack'

interface DrawPileProps {
  count: number
  onDraw: () => void
  canDraw: boolean
}

export default function DrawPile({ count, onDraw, canDraw }: DrawPileProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative transition-all duration-200 ${canDraw ? 'cursor-pointer hover:scale-105' : ''}`}
        onClick={canDraw ? onDraw : undefined}
      >
        <div style={{ zIndex: 2 }}>
          <CardBack count={count} />
        </div>
        <div className="absolute top-[3px] left-[3px]" style={{ zIndex: 1 }}>
          <CardBack />
        </div>
        <div className="absolute top-[6px] left-[6px]" style={{ zIndex: 0 }}>
          <CardBack />
        </div>
      </div>
      <div className={`text-sm font-game px-3 py-1 rounded-full transition-all duration-200 ${
        canDraw
          ? 'bg-white/20 text-white cursor-pointer hover:bg-white/30'
          : 'text-white/40'
      }`}
        onClick={canDraw ? onDraw : undefined}
      >
        {canDraw ? '点击抽牌' : '等待中...'}
      </div>
    </div>
  )
}