import { create } from 'zustand'
import type { GameConfig, PresetName } from '@/config/types'
import { DEFAULT_CONFIG, loadConfig, saveConfig } from '@/config/defaults'
import { getPresetConfig } from '@/config/presets'

interface ConfigState {
  config: GameConfig
  activePreset: PresetName

  setConfig: (config: GameConfig) => void
  updateParam: <K extends keyof GameConfig>(group: K, updates: Partial<GameConfig[K]>) => void
  applyPreset: (presetName: PresetName) => void
  resetToDefaults: () => void
}

export const useConfigStore = create<ConfigState>()((set, get) => ({
  config: loadConfig(),
  activePreset: 'custom',

  setConfig: (config) => {
    saveConfig(config)
    set({ config, activePreset: 'custom' })
  },

  updateParam: (group, updates) => {
    set((state) => {
      const newConfig = {
        ...state.config,
        [group]: { ...state.config[group], ...updates },
      }
      saveConfig(newConfig)
      return { config: newConfig, activePreset: 'custom' }
    })
  },

  applyPreset: (presetName) => {
    if (presetName === 'custom') return
    const preset = getPresetConfig(presetName)
    if (!preset) return
    const newConfig = { ...preset.config, ai: { ...get().config.ai } } as GameConfig
    saveConfig(newConfig)
    set({ config: newConfig, activePreset: presetName })
  },

  resetToDefaults: () => {
    saveConfig(DEFAULT_CONFIG)
    set({ config: { ...DEFAULT_CONFIG }, activePreset: 'classic' })
  },
}))