import { useEffect, useState } from 'react'
import type { Player } from '@/utils/types'
import { useGameStore } from '@/store/gameStore'
import { getCardScore } from '@/utils/deck'

interface ScoreboardProps {
  visible: boolean
  players: Player[]
  scores: number[]
  winner: Player | null
  onNewGame: () => void
}

export default function Scoreboard({ visible, players, scores, winner, onNewGame }: ScoreboardProps) {
  const [show, setShow] = useState(false)
  const [animating, setAnimating] = useState(false)
  const config = useGameStore((s) => s.config)

  useEffect(() => {
    if (visible) {
      setShow(true)
      requestAnimationFrame(() => setAnimating(true))
    } else {
      setAnimating(false)
      const timer = setTimeout(() => setShow(false), 300)
      return () => clearTimeout(timer)
    }
  }, [visible])

  if (!show) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        animating ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
      }`}
    >
      <div
        className={`flex flex-col items-center gap-6 p-5 sm:p-8 rounded-2xl bg-gray-900/95 border border-white/10 shadow-2xl min-w-[280px] sm:min-w-[340px] transition-all duration-300 ${
          animating ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}
      >
        <div className="flex flex-col items-center gap-1">
          <div className="text-4xl">🎉</div>
          <h2 className="text-2xl font-game text-yellow-300">
            {winner ? `${winner.name} 获胜！` : '回合结束'}
          </h2>
        </div>

        <div className="w-full flex flex-col gap-3 max-h-[40vh] overflow-y-auto">
          {players.map((player, idx) => {
            const isWinner = winner && player.id === winner.id
            const cardPoints = isWinner ? 0 : player.hand.reduce((sum, c) => sum + getCardScore(c, config), 0)

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  isWinner
                    ? 'bg-yellow-400/10 border-yellow-400/30'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-game text-base ${isWinner ? 'text-yellow-300' : 'text-white/70'}`}>
                    {player.name}
                  </span>
                  {isWinner && (
                    <span className="text-sm">🏆</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-white/50">
                    {player.hand.length}张 · {cardPoints}分
                  </span>
                  <span className={`font-game text-lg ${isWinner ? 'text-yellow-300' : 'text-white'}`}>
                    {scores[idx] || 0}分
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={onNewGame}
          className="px-8 py-3 rounded-xl bg-yellow-400 text-black font-game text-lg shadow-lg hover:bg-yellow-300 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          新游戏
        </button>
      </div>
    </div>
  )
}