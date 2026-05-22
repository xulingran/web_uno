import { describe, it, expect, beforeEach } from 'vitest'
import { useConfigStore } from './configStore'
import { DEFAULT_CONFIG } from '@/config/defaults'

describe('configStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useConfigStore.setState({
      config: { ...DEFAULT_CONFIG },
      activePreset: 'custom',
    })
  })

  it('初始状态 — config 不为 null，包含六个分组，activePreset 为 custom', () => {
    const state = useConfigStore.getState()
    expect(state.config).not.toBeNull()
    expect(state.config).toHaveProperty('params')
    expect(state.config).toHaveProperty('actionCards')
    expect(state.config).toHaveProperty('draw')
    expect(state.config).toHaveProperty('uno')
    expect(state.config).toHaveProperty('scoring')
    expect(state.config).toHaveProperty('ai')
    expect(state.activePreset).toBe('custom')
  })

  it("updateParam('params', { aiPlayerCount: 3 }) — config.params.aiPlayerCount 变为 3，其他字段不变", () => {
    const originalConfig = useConfigStore.getState().config
    const originalParams = { ...originalConfig.params }

    useConfigStore.getState().updateParam('params', { aiPlayerCount: 3 })

    const updatedConfig = useConfigStore.getState().config
    expect(updatedConfig.params.aiPlayerCount).toBe(3)
    expect(updatedConfig.params.initialHandSize).toBe(originalParams.initialHandSize)
    expect(updatedConfig.params.targetScore).toBe(originalParams.targetScore)
    expect(updatedConfig.params.turnTimeLimit).toBe(originalParams.turnTimeLimit)
  })

  it("updateParam('actionCards', { stackingDraw2: true }) — config.actionCards.stackingDraw2 变为 true", () => {
    useConfigStore.getState().updateParam('actionCards', { stackingDraw2: true })

    const config = useConfigStore.getState().config
    expect(config.actionCards.stackingDraw2).toBe(true)
    expect(config.actionCards.stackingDraw4).toBe(false)
    expect(config.actionCards.challengeWild4).toBe(true)
  })

  it("applyPreset('casual') — config.draw.drawToMatch 变为 true（休闲娱乐预设的特点）", () => {
    useConfigStore.getState().applyPreset('casual')

    const config = useConfigStore.getState().config
    expect(config.draw.drawToMatch).toBe(true)
  })

  it('applyPreset 保留当前 AI 难度设置', () => {
    useConfigStore.getState().updateParam('ai', { difficulty: 'hard' })
    expect(useConfigStore.getState().config.ai.difficulty).toBe('hard')

    useConfigStore.getState().applyPreset('casual')

    const config = useConfigStore.getState().config
    expect(config.ai.difficulty).toBe('hard')
    expect(config.draw.drawToMatch).toBe(true)
  })

  it("applyPreset('custom') — 应不变（custom 预设会直接 return）", () => {
    useConfigStore.getState().updateParam('params', { aiPlayerCount: 5 })
    expect(useConfigStore.getState().config.params.aiPlayerCount).toBe(5)

    useConfigStore.getState().applyPreset('custom')

    const config = useConfigStore.getState().config
    expect(config.params.aiPlayerCount).toBe(5)
    expect(useConfigStore.getState().activePreset).toBe('custom')
  })

  it('resetToDefaults() — config 恢复为 DEFAULT_CONFIG，activePreset 变为 classic', () => {
    useConfigStore.getState().updateParam('params', { aiPlayerCount: 10 })
    useConfigStore.getState().updateParam('actionCards', { stackingDraw2: true })

    useConfigStore.getState().resetToDefaults()

    const config = useConfigStore.getState().config
    expect(config.params.aiPlayerCount).toBe(DEFAULT_CONFIG.params.aiPlayerCount)
    expect(config.params.aiPlayerCount).toBe(2)
    expect(config.actionCards.stackingDraw2).toBe(DEFAULT_CONFIG.actionCards.stackingDraw2)
    expect(config.actionCards.stackingDraw2).toBe(false)
    expect(useConfigStore.getState().activePreset).toBe('classic')
  })
})