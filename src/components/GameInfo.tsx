import type { CardColor, Direction } from '@/utils/types'

interface GameInfoProps {
  direction: Direction
  currentColor: CardColor
  currentPlayerName: string
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

export default function GameInfo({ direction, currentColor, currentPlayerName }: GameInfoProps) {
  return (
    <div className="flex items-center gap-6 px-6 py-2.5 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 font-game text-sm">
      <div className="flex items-center gap-1.5 text-white/80">
        <span className="text-base">
          {direction === 'clockwise' ? '↻' : '↺'}
        </span>
        <span>
          {direction === 'clockwise' ? '顺时针' : '逆时针'}
        </span>
      </div>

      <div className="w-px h-5 bg-white/20" />

      <div className="flex items-center gap-1.5">
        <div
          className="w-3.5 h-3.5 rounded-full border border-white/30"
          style={{ backgroundColor: colorMap[currentColor] }}
        />
        <span className="text-white/80">
          当前色: {colorNameMap[currentColor]}
        </span>
      </div>

      <div className="w-px h-5 bg-white/20" />

      <div className="text-white/80">
        当前回合: <span className="text-yellow-300">{currentPlayerName}</span>
      </div>
    </div>
  )
}