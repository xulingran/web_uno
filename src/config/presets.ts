import type { PresetConfig } from './types'
import { DIFFICULTY_CONFIGS } from './defaults'

export const PRESETS: PresetConfig[] = [
  {
    name: 'classic',
    label: '经典规则',
    description: '标准 UNO 官方规则',
    config: {
      params: { initialHandSize: 7, aiPlayerCount: 2, targetScore: 0, turnTimeLimit: 0 },
      actionCards: {
        stackingDraw2: false, stackingDraw4: false, challengeWild4: false,
        reverseAsSkip: true, jumpIn: false, sevenORule: false,
      },
      draw: { drawToMatch: false, forcePlay: false, multiDrawCount: 1 },
      uno: { requireUNOCall: true, unoPenaltyDraw: 2, autoDetectUNO: true },
      scoring: { numberCard: 0, actionCard: 20, wildCard: 50 },
      ai: DIFFICULTY_CONFIGS.medium,
    },
  },
  {
    name: 'casual',
    label: '休闲娱乐',
    description: '宽松规则，适合轻松游戏',
    config: {
      params: { initialHandSize: 7, aiPlayerCount: 2, targetScore: 0, turnTimeLimit: 0 },
      actionCards: {
        stackingDraw2: false, stackingDraw4: false, challengeWild4: false,
        reverseAsSkip: true, jumpIn: false, sevenORule: false,
      },
      draw: { drawToMatch: true, forcePlay: true, multiDrawCount: 1 },
      uno: { requireUNOCall: false, unoPenaltyDraw: 0, autoDetectUNO: false },
      scoring: { numberCard: 0, actionCard: 20, wildCard: 50 },
      ai: DIFFICULTY_CONFIGS.easy,
    },
  },
  {
    name: 'hardcore',
    label: '硬核竞技',
    description: '全开变体规则，高分竞技',
    config: {
      params: { initialHandSize: 7, aiPlayerCount: 2, targetScore: 500, turnTimeLimit: 0 },
      actionCards: {
        stackingDraw2: true, stackingDraw4: true, challengeWild4: true,
        reverseAsSkip: true, jumpIn: true, sevenORule: true,
      },
      draw: { drawToMatch: false, forcePlay: true, multiDrawCount: 1 },
      uno: { requireUNOCall: true, unoPenaltyDraw: 4, autoDetectUNO: true },
      scoring: { numberCard: 0, actionCard: 20, wildCard: 50 },
      ai: DIFFICULTY_CONFIGS.hard,
    },
  },
]

export function getPresetConfig(name: string): PresetConfig | undefined {
  return PRESETS.find((p) => p.name === name)
}