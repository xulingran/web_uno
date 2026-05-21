import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import SettingsPanel from './SettingsPanel'

export default function SettingsPage() {
  const navigate = useNavigate()

  return (
    <div className="h-screen bg-uno-dark flex flex-col overflow-y-auto">
      <header className="flex-shrink-0 flex items-center gap-4 px-4 sm:px-6 py-4 border-b border-white/10">
        <button
          onClick={() => navigate('/')}
          className="text-white/60 hover:text-white/90 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-game text-xl sm:text-2xl text-white">游戏设置</h1>
      </header>

      <div className="flex-1 px-4 sm:px-6 py-6">
        <SettingsPanel />
      </div>
    </div>
  )
}