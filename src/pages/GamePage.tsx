import GameBoard from '@/components/GameBoard'
import { useGameEngine } from '@/hooks/useGameEngine'
import { useLobbyStore } from '@/store/lobbyStore'

export default function GamePage() {
  const networkMode = useLobbyStore((s) => s.networkMode)

  useGameEngine()

  if (networkMode === 'client') {
    return <GameBoard />
  }

  return <GameBoard />
}