import { useState, useEffect } from 'react'
import type { CardColor, Direction } from '@/utils/types'

interface GameInfoProps {
  direction: Direction
  currentColor: CardColor
  currentPlayerName: string
  gameStartTime: number | null
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

export default function GameInfo({ direction, currentColor, currentPlayerName, gameStartTime }: GameInfoProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!gameStartTime) {
      setElapsed(0)
      return
    }
    setElapsed(Math.floor((Date.now() - gameStartTime) / 1000))
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - gameStartTime) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [gameStartTime])

  const hours = Math.floor(elapsed / 3600)
  const mins = Math.floor((elapsed % 3600) / 60)
  const secs = elapsed % 60
  const timeStr = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-1 px-3 sm:px-6 py-2.5 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 font-game text-sm">
      {gameStartTime != null && (
        <>
          <div className="flex items-center gap-1.5 text-white/80 whitespace-nowrap">
            <span className="text-base">⏱</span>
            <span className="tabular-nums">{timeStr}</span>
          </div>
          <div className="w-px h-5 bg-white/20 hidden sm:block" />
        </>
      )}

      <div className="flex items-center gap-1.5 text-white/80 whitespace-nowrap">
        <span className="text-base">
          {direction === 'clockwise' ? '↻' : '↺'}
        </span>
        <span>
          {direction === 'clockwise' ? '顺时针' : '逆时针'}
        </span>
      </div>

      <div className="w-px h-5 bg-white/20 hidden sm:block" />

      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <div
          className="w-3.5 h-3.5 rounded-full border border-white/30"
          style={{ backgroundColor: colorMap[currentColor] }}
        />
        <span className="text-white/80">
          当前色: {colorNameMap[currentColor]}
        </span>
      </div>

      <div className="w-px h-5 bg-white/20 hidden sm:block" />

      <div className="text-white/80 whitespace-nowrap">
        当前回合: <span className="text-yellow-300">{currentPlayerName}</span>
      </div>
    </div>
  )
}