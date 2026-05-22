import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import ColorPicker from './ColorPicker'

beforeAll(() => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0)
    return 0
  })
})

describe('ColorPicker', () => {
  it('visible=false 时返回 null', () => {
    const { container } = render(<ColorPicker visible={false} onPickColor={() => {}} />)
    expect(container.innerHTML).toBe('')
    expect(screen.queryByText('选择颜色')).toBeNull()
  })

  it('visible=true 时渲染四种颜色按钮', () => {
    render(<ColorPicker visible={true} onPickColor={vi.fn()} />)
    expect(screen.getByText('选择颜色')).toBeTruthy()
    expect(screen.getByText('红')).toBeTruthy()
    expect(screen.getByText('黄')).toBeTruthy()
    expect(screen.getByText('蓝')).toBeTruthy()
    expect(screen.getByText('绿')).toBeTruthy()
  })

  it('点击红色按钮触发 onPickColor 回调', async () => {
    const onPickColor = vi.fn()
    render(<ColorPicker visible={true} onPickColor={onPickColor} />)
    const user = userEvent.setup()
    await user.click(screen.getByText('红'))
    expect(onPickColor).toHaveBeenCalledWith('red')
  })

  it('点击黄色按钮触发 onPickColor 回调', async () => {
    const onPickColor = vi.fn()
    render(<ColorPicker visible={true} onPickColor={onPickColor} />)
    const user = userEvent.setup()
    await user.click(screen.getByText('黄'))
    expect(onPickColor).toHaveBeenCalledWith('yellow')
  })

  it('点击蓝色按钮触发 onPickColor 回调', async () => {
    const onPickColor = vi.fn()
    render(<ColorPicker visible={true} onPickColor={onPickColor} />)
    const user = userEvent.setup()
    await user.click(screen.getByText('蓝'))
    expect(onPickColor).toHaveBeenCalledWith('blue')
  })

  it('点击绿色按钮触发 onPickColor 回调', async () => {
    const onPickColor = vi.fn()
    render(<ColorPicker visible={true} onPickColor={onPickColor} />)
    const user = userEvent.setup()
    await user.click(screen.getByText('绿'))
    expect(onPickColor).toHaveBeenCalledWith('green')
  })
})