import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import SettingsPanel from './SettingsPanel'

export default function SettingsPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-uno-dark flex flex-col">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-white/10">
        <button
          onClick={() => navigate('/')}
          className="text-white/60 hover:text-white/90 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-game text-2xl text-white">游戏设置</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <SettingsPanel />
      </div>
    </div>
  )
}