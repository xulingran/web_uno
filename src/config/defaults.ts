import type { GameConfig } from './types'

export const DEFAULT_CONFIG: GameConfig = {
  params: {
    initialHandSize: 7,
    aiPlayerCount: 2,
    targetScore: 0,
    turnTimeLimit: 0,
  },
  actionCards: {
    stackingDraw2: false,
    stackingDraw4: false,
    challengeWild4: false,
    reverseAsSkip: true,
    jumpIn: false,
    sevenORule: false,
  },
  draw: {
    drawToMatch: false,
    forcePlay: false,
    multiDrawCount: 1,
  },
  uno: {
    requireUNOCall: true,
    unoPenaltyDraw: 2,
    autoDetectUNO: true,
  },
  scoring: {
    numberCard: 0,
    actionCard: 20,
    wildCard: 50,
  },
}

const STORAGE_KEY = 'uno-game-config'

export function loadConfig(): GameConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_CONFIG }
    const parsed = JSON.parse(raw)
    return deepMerge({ ...DEFAULT_CONFIG }, parsed)
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function saveConfig(config: GameConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // localStorage quota exceeded — silently ignore
  }
}

function isObject(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === 'object' && !Array.isArray(item)
}

function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target }
  for (const key of Object.keys(source) as (keyof T)[]) {
    if (isObject(target[key]) && isObject(source[key])) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>
      ) as T[keyof T]
    } else {
      result[key] = source[key] as T[keyof T]
    }
  }
  return result
}