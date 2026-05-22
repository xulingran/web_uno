import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import CardBack from './CardBack'

describe('CardBack', () => {
  it('renders the UNO text', () => {
    render(<CardBack />)
    expect(screen.getByText('UNO')).toBeInTheDocument()
  })

  it('displays the count badge when count is provided', () => {
    render(<CardBack count={5} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})