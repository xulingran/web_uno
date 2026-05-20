import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import Card from './Card'

describe('Card', () => {
  it('renders number card with correct value', () => {
    render(
      <Card
        card={{ id: 'red-5', color: 'red', type: 'number', value: 5 }}
        playable={true}
      />
    )
    const elements = screen.getAllByText('5')
    expect(elements.length).toBeGreaterThan(0)
  })

  it('renders skip card with "S"', () => {
    render(
      <Card
        card={{ id: 'blue-skip', color: 'blue', type: 'skip' }}
        playable={false}
      />
    )
    const elements = screen.getAllByText('S')
    expect(elements.length).toBeGreaterThan(0)
  })

  it('renders wild card with "W"', () => {
    render(
      <Card
        card={{ id: 'wild-0', color: null, type: 'wild' }}
        playable={true}
      />
    )
    const elements = screen.getAllByText('W')
    expect(elements.length).toBeGreaterThan(0)
  })

  it('renders wild4 card with "W4"', () => {
    render(
      <Card
        card={{ id: 'wild4-0', color: null, type: 'wild4' }}
        playable={true}
      />
    )
    const elements = screen.getAllByText('W4')
    expect(elements.length).toBeGreaterThan(0)
  })

  it('calls onClick when card is clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(
      <Card
        card={{ id: 'red-5', color: 'red', type: 'number', value: 5 }}
        playable={true}
        onClick={onClick}
      />
    )

    const card = screen.getAllByText('5')[0]
    await user.click(card)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})