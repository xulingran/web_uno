import GameBoard from '@/components/GameBoard'
import { useGameEngine } from '@/hooks/useGameEngine'

export default function GamePage() {
  useGameEngine()

  return <GameBoard />
}