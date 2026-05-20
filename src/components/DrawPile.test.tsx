import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import DrawPile from './DrawPile'

describe('DrawPile', () => {
  it('displays the card count', () => {
    render(
      <DrawPile count={42} onDraw={vi.fn()} canDraw={true} />
    )
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('shows draw prompt when canDraw is true', () => {
    render(
      <DrawPile count={10} onDraw={vi.fn()} canDraw={true} />
    )
    expect(screen.getByText('点击抽牌')).toBeInTheDocument()
  })

  it('shows waiting prompt when canDraw is false', () => {
    render(
      <DrawPile count={10} onDraw={vi.fn()} canDraw={false} />
    )
    expect(screen.getByText('等待中...')).toBeInTheDocument()
  })

  it('calls onDraw when clicked if canDraw is true', async () => {
    const user = userEvent.setup()
    const onDraw = vi.fn()

    render(
      <DrawPile count={10} onDraw={onDraw} canDraw={true} />
    )

    await user.click(screen.getByText('点击抽牌'))
    expect(onDraw).toHaveBeenCalledTimes(1)
  })

  it('does not call onDraw when clicked if canDraw is false', async () => {
    const user = userEvent.setup()
    const onDraw = vi.fn()

    render(
      <DrawPile count={10} onDraw={onDraw} canDraw={false} />
    )

    await user.click(screen.getByText('等待中...'))
    expect(onDraw).not.toHaveBeenCalled()
  })
})