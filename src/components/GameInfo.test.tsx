import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import GameInfo from './GameInfo'

describe('GameInfo', () => {
  it('displays clockwise direction', () => {
    render(
      <GameInfo
        direction="clockwise"
        currentColor="red"
        currentPlayerName="Alice"
      />
    )
    expect(screen.getByText('顺时针')).toBeInTheDocument()
  })

  it('displays counterclockwise direction', () => {
    render(
      <GameInfo
        direction="counterclockwise"
        currentColor="red"
        currentPlayerName="Alice"
      />
    )
    expect(screen.getByText('逆时针')).toBeInTheDocument()
  })

  it('displays the current color', () => {
    render(
      <GameInfo
        direction="clockwise"
        currentColor="blue"
        currentPlayerName="Alice"
      />
    )
    expect(screen.getByText('当前色: 蓝')).toBeInTheDocument()
  })

  it('displays the current player name', () => {
    render(
      <GameInfo
        direction="clockwise"
        currentColor="green"
        currentPlayerName="Bob"
      />
    )
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('displays all information together', () => {
    render(
      <GameInfo
        direction="counterclockwise"
        currentColor="yellow"
        currentPlayerName="Charlie"
      />
    )
    expect(screen.getByText('逆时针')).toBeInTheDocument()
    expect(screen.getByText('当前色: 黄')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })
})