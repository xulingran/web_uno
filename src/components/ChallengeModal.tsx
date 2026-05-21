import { useState } from 'react'

interface ChallengeModalProps {
  visible: boolean
  onChallenge: () => void
  onAccept: () => void
}

export default function ChallengeModal({ visible, onChallenge, onAccept }: ChallengeModalProps) {
  const [animating, setAnimating] = useState(false)

  if (!visible) return null

  const handleOpen = () => {
    setAnimating(true)
  }

  if (!animating) {
    requestAnimationFrame(() => handleOpen())
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        animating ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent'
      }`}
    >
      <div
        className={`flex flex-col items-center gap-6 p-5 sm:p-8 rounded-xl sm:rounded-2xl bg-gray-900/95 border border-white/10 shadow-2xl transition-all duration-300 ${
          animating ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}
      >
        <div
          className="font-game text-4xl"
          style={{
            color: '#ffcc00',
            textShadow: '3px 3px 0 #c62828, 6px 6px 0 rgba(0,0,0,0.3)',
          }}
        >
          Wild +4!
        </div>
        <div className="text-white/80 font-game text-lg">
          是否质疑出牌者持有匹配颜色的牌？
        </div>
        <div className="text-white/50 text-sm">
          质疑成功：出牌者收回+4牌 | 质疑失败：你抽6张
        </div>
        <div className="flex gap-4">
          <button
            onClick={onChallenge}
            className="px-6 py-3 rounded-xl bg-red-500 text-white font-game text-lg shadow-lg hover:bg-red-400 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            质疑！
          </button>
          <button
            onClick={onAccept}
            className="px-6 py-3 rounded-xl bg-yellow-400 text-black font-game text-lg shadow-lg hover:bg-yellow-300 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            接受罚抽
          </button>
        </div>
      </div>
    </div>
  )
}
