import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import SettingsPanel from './SettingsPanel'

interface NewGameModalProps {
  visible: boolean
  onStart: () => void
  onCancel: () => void
}

export default function NewGameModal({ visible, onStart, onCancel }: NewGameModalProps) {
  const [show, setShow] = useState(false)
  const [animating, setAnimating] = useState(false)
  const navigate = useNavigate()

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
        className={`flex flex-col items-center gap-5 p-6 rounded-2xl bg-gray-900/95 border border-white/10 shadow-2xl min-w-[360px] max-w-[420px] max-h-[80vh] overflow-y-auto transition-all duration-300 ${
          animating ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}
      >
        <h2 className="text-xl font-game text-yellow-300">新游戏设置</h2>
        <SettingsPanel compact />
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/10 text-white/70 font-game text-sm hover:bg-white/20 transition-all"
          >
            <Settings size={16} /> 详细设置
          </button>
          <div className="flex-1" />
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-white/10 text-white/70 font-game text-sm hover:bg-white/20 transition-all"
          >
            取消
          </button>
          <button
            onClick={onStart}
            className="px-6 py-2 rounded-xl bg-yellow-400 text-black font-game text-sm shadow-lg hover:bg-yellow-300 transition-all"
          >
            开始游戏
          </button>
        </div>
      </div>
    </div>
  )
}