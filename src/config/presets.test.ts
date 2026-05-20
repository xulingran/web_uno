import { describe, it, expect } from 'vitest'
import { PRESETS, getPresetConfig } from './presets'

describe('PRESETS', () => {
  it('包含三个预设', () => {
    expect(PRESETS).toHaveLength(3)
  })

  it('每个预设包含 name, label, description, config 字段', () => {
    for (const preset of PRESETS) {
      expect(preset).toHaveProperty('name')
      expect(preset).toHaveProperty('label')
      expect(preset).toHaveProperty('description')
      expect(preset).toHaveProperty('config')
    }
  })

  describe('classic', () => {
    const preset = PRESETS[0]

    it('name 为 classic', () => {
      expect(preset.name).toBe('classic')
    })

    it('label 为 经典规则', () => {
      expect(preset.label).toBe('经典规则')
    })

    it('description 不为空', () => {
      expect(preset.description.length).toBeGreaterThan(0)
    })

    it('config 包含 params, actionCards, draw, uno, scoring, ai', () => {
      expect(preset.config).toHaveProperty('params')
      expect(preset.config).toHaveProperty('actionCards')
      expect(preset.config).toHaveProperty('draw')
      expect(preset.config).toHaveProperty('uno')
      expect(preset.config).toHaveProperty('scoring')
      expect(preset.config).toHaveProperty('ai')
    })
  })

  describe('casual', () => {
    const preset = PRESETS[1]

    it('name 为 casual', () => {
      expect(preset.name).toBe('casual')
    })

    it('label 为 休闲娱乐', () => {
      expect(preset.label).toBe('休闲娱乐')
    })
  })

  describe('hardcore', () => {
    const preset = PRESETS[2]

    it('name 为 hardcore', () => {
      expect(preset.name).toBe('hardcore')
    })

    it('label 为 硬核竞技', () => {
      expect(preset.label).toBe('硬核竞技')
    })
  })
})

describe('getPresetConfig', () => {
  it('传入 classic 返回对应预设', () => {
    const result = getPresetConfig('classic')
    expect(result).toBeDefined()
    expect(result!.name).toBe('classic')
    expect(result!.label).toBe('经典规则')
  })

  it('传入 casual 返回对应预设', () => {
    const result = getPresetConfig('casual')
    expect(result).toBeDefined()
    expect(result!.name).toBe('casual')
    expect(result!.label).toBe('休闲娱乐')
  })

  it('传入 hardcore 返回对应预设', () => {
    const result = getPresetConfig('hardcore')
    expect(result).toBeDefined()
    expect(result!.name).toBe('hardcore')
    expect(result!.label).toBe('硬核竞技')
  })

  it('传入 nonexistent 返回 undefined', () => {
    const result = getPresetConfig('nonexistent')
    expect(result).toBeUndefined()
  })
})