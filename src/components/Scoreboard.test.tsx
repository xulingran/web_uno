import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import Scoreboard from './Scoreboard'
import type { Player } from '@/utils/types'

const players: Player[] = [
  { id: 'p1', name: 'Alice', hand: [{ id: 'red-5', color: 'red', type: 'number', value: 5 }], isHuman: true },
  { id: 'p2', name: 'Bob', hand: [{ id: 'blue-skip', color: 'blue', type: 'skip' }], isHuman: false },
]

describe('Scoreboard', () => {
  it('does not render when visible is false', () => {
    const { container } = render(
      <Scoreboard
        visible={false}
        players={players}
        scores={[10, 20]}
        winner={null}
        onNewGame={vi.fn()}
      />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders player names and scores when visible is true', () => {
    render(
      <Scoreboard
        visible={true}
        players={players}
        scores={[10, 20]}
        winner={null}
        onNewGame={vi.fn()}
      />
    )
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('10分')).toBeInTheDocument()
    expect(screen.getByText('20分')).toBeInTheDocument()
  })

  it('shows winner announcement', () => {
    const winner: Player = { id: 'p1', name: 'Alice', hand: [], isHuman: true }

    render(
      <Scoreboard
        visible={true}
        players={players}
        scores={[30, 20]}
        winner={winner}
        onNewGame={vi.fn()}
      />
    )
    expect(screen.getByText('Alice 获胜！')).toBeInTheDocument()
  })

  it('calls onNewGame when button is clicked', async () => {
    const user = userEvent.setup()
    const onNewGame = vi.fn()

    render(
      <Scoreboard
        visible={true}
        players={players}
        scores={[10, 20]}
        winner={null}
        onNewGame={onNewGame}
      />
    )

    await user.click(screen.getByText('新游戏'))
    expect(onNewGame).toHaveBeenCalledTimes(1)
  })
})