import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import DiscardPile from './DiscardPile'

describe('DiscardPile', () => {
  it('renders top card when topCard is provided', () => {
    render(
      <DiscardPile
        topCard={{ id: 'red-5', color: 'red', type: 'number', value: 5 }}
        currentColor="red"
      />
    )
    const elements = screen.getAllByText('5')
    expect(elements.length).toBeGreaterThan(0)
  })

  it('shows empty placeholder when topCard is null', () => {
    render(
      <DiscardPile
        topCard={null}
        currentColor="blue"
      />
    )
    expect(screen.getByText('空')).toBeInTheDocument()
  })

  it('displays the current color indicator', () => {
    render(
      <DiscardPile
        topCard={null}
        currentColor="green"
      />
    )
    expect(screen.getByText('绿')).toBeInTheDocument()
  })

  it('displays different current colors', () => {
    const { rerender } = render(
      <DiscardPile topCard={null} currentColor="red" />
    )
    expect(screen.getByText('红')).toBeInTheDocument()

    rerender(<DiscardPile topCard={null} currentColor="yellow" />)
    expect(screen.getByText('黄')).toBeInTheDocument()

    rerender(<DiscardPile topCard={null} currentColor="blue" />)
    expect(screen.getByText('蓝')).toBeInTheDocument()
  })
})