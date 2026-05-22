import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import UNOCall from './UNOCall'

describe('UNOCall', () => {
  it('does not render when visible is false', () => {
    const { container } = render(
      <UNOCall visible={false} playerName="Alice" />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders UNO text and player name when visible is true', () => {
    render(
      <UNOCall visible={true} playerName="Bob" />
    )
    expect(screen.getByText('UNO！')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('displays different player names', () => {
    const { rerender } = render(
      <UNOCall visible={true} playerName="Charlie" />
    )
    expect(screen.getByText('Charlie')).toBeInTheDocument()

    rerender(<UNOCall visible={true} playerName="Diana" />)
    expect(screen.getByText('Diana')).toBeInTheDocument()
  })
})