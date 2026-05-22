# UNO 规则完善与自定义选项 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 UNO 卡牌游戏建立分层规则配置系统，补全经典变体规则，提供设置面板和新游戏弹窗。

**Architecture:** 新增 `config/` 目录存放配置类型+预设+默认值，新增 `configStore` 做 Zustand + localStorage 持久化。SettingsPanel/SettingsPage/NewGameModal/UNOModal 为新增 UI 组件。gameStore、rules.ts、ai.ts、useGameEngine 改造为从 store 读取 config 做分支判断。App.tsx 增加 `/settings` 路由。

**Tech Stack:** React 18 + TypeScript + Zustand + Tailwind CSS 3 + Vite + lucide-react + react-router-dom HashRouter

---

### Task 1: 创建配置类型与默认值

**Files:**
- Create: `src/config/types.ts`
- Create: `src/config/defaults.ts`
- Create: `src/config/presets.ts`

- [ ] **Step 1: 创建 `src/config/types.ts` — GameConfig 及相关子类型**

```typescript
export type CardColor = 'red' | 'yellow' | 'blue' | 'green'

export interface ScoreConfig {
  numberCard: number
  actionCard: number
  wildCard: number
}

export interface ActionCardConfig {
  stackingDraw2: boolean
  stackingDraw4: boolean
  challengeWild4: boolean
  reverseAsSkip: boolean
  jumpIn: boolean
  sevenORule: boolean
}

export interface DrawConfig {
  drawToMatch: boolean
  forcePlay: boolean
  multiDrawCount: number
}

export interface UNOConfig {
  requireUNOCall: boolean
  unoPenaltyDraw: number
  autoDetectUNO: boolean
}

export interface GameParams {
  initialHandSize: number
  aiPlayerCount: number
  targetScore: number
  turnTimeLimit: number
}

export interface GameConfig {
  params: GameParams
  actionCards: ActionCardConfig
  draw: DrawConfig
  uno: UNOConfig
  scoring: ScoreConfig
}

export type PresetName = 'classic' | 'casual' | 'hardcore' | 'custom'

export interface PresetConfig {
  name: PresetName
  label: string
  description: string
  config: GameConfig
}
```

- [ ] **Step 2: 创建 `src/config/defaults.ts` — 默认配置值与合并工具**

```typescript
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
```

- [ ] **Step 3: 创建 `src/config/presets.ts` — 三套预设配置**

```typescript
import type { PresetConfig } from './types'

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
    },
  },
]

export function getPresetConfig(name: string): PresetConfig | undefined {
  return PRESETS.find((p) => p.name === name)
}
```

- [ ] **Step 4: 验证 TypeScript 编译**

```bash
npx tsc -b --noEmit
```

Expected: 无新增错误（如果 config/ 目录的 ts 文件未被 include，这是正常的——vite-tsconfig-paths 会处理路径解析）

- [ ] **Step 5: Commit**

```bash
git add src/config/types.ts src/config/defaults.ts src/config/presets.ts
git commit -m "feat: add GameConfig types, defaults, and presets"
```

---

### Task 2: 创建 configStore — Zustand + localStorage 持久化

**Files:**
- Create: `src/store/configStore.ts`

- [ ] **Step 1: 创建 `src/store/configStore.ts`**

```typescript
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

export const useConfigStore = create<ConfigState>()((set) => ({
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
    saveConfig(preset.config)
    set({ config: preset.config, activePreset: presetName })
  },

  resetToDefaults: () => {
    saveConfig(DEFAULT_CONFIG)
    set({ config: { ...DEFAULT_CONFIG }, activePreset: 'classic' })
  },
}))
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc -b --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/store/configStore.ts
git commit -m "feat: add configStore with Zustand + localStorage persistence"
```

---

### Task 3: 改造 gameStore — initGame 接受 config

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `src/utils/types.ts`

- [ ] **Step 1: 扩展 `src/utils/types.ts` — GameState 增加 config 引用和新字段**

将现有类型文件内容替换为：

```typescript
export type CardColor = 'red' | 'yellow' | 'blue' | 'green'

export type CardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4'

export interface Card {
  id: string
  color: CardColor | null
  type: CardType
  value?: number
}

export type Direction = 'clockwise' | 'counterclockwise'

export type GamePhase = 'idle' | 'playing' | 'color-picking' | 'round-over' | 'challenge' | 'stacking' | 'seven-swap' | 'uno-call'

export interface Player {
  id: string
  name: string
  hand: Card[]
  isHuman: boolean
}
```

- [ ] **Step 2: 改造 `src/store/gameStore.ts` — initGame 接受 config 参数并存储**

修改 `gameStore.ts`，关键改动：

**导入 config：**
```typescript
import type { GameConfig } from '@/config/types'
import { useConfigStore } from './configStore'
```

**StoreState 增加字段：**
```typescript
interface StoreState {
  players: Player[]
  drawPile: Card[]
  discardPile: Card[]
  currentPlayerIndex: number
  direction: Direction
  currentColor: CardColor
  phase: GamePhase
  winner: Player | null
  scores: number[]
  cardJustDrawn: Card | null
  pendingDrawCount: number
  config: GameConfig
  unoCalledPlayer: string | null
  stackingWaiting: boolean
  challengePlayerIndex: number | null
  turnStartTime: number | null
}
```

**initGame 读取 config 并使用：**
```typescript
initGame: () => {
    const config = useConfigStore.getState().config
    const deck = createDeck()
    const shuffled = shuffleDeck(deck)
    const totalPlayers = 1 + config.params.aiPlayerCount
    const { players: dealt, remaining } = dealCards(shuffled, totalPlayers, config.params.initialHandSize)

    const names = ['你', '电脑A', '电脑B', '电脑C', '电脑D', '电脑E']
    const players: Player[] = [
      { id: 'p0', name: names[0], hand: dealt[0], isHuman: true },
    ]
    for (let i = 1; i < totalPlayers; i++) {
      players.push({ id: `p${i}`, name: names[i], hand: dealt[i], isHuman: false })
    }

    const { drawPile, discardPile, topCard } = getFirstValidTopCard(remaining, [])

    set({
      players,
      drawPile,
      discardPile,
      currentPlayerIndex: 0,
      direction: 'clockwise',
      currentColor: topCard.color!,
      phase: 'playing',
      winner: null,
      scores: Array(totalPlayers).fill(0),
      cardJustDrawn: null,
      pendingDrawCount: 0,
      config,
      unoCalledPlayer: null,
      stackingWaiting: false,
      challengePlayerIndex: null,
      turnStartTime: config.params.turnTimeLimit > 0 ? Date.now() : null,
    })
  },
```

**startNewGame 简化为调用 initGame：**
```typescript
startNewGame: () => {
    set({
      players: [],
      drawPile: [],
      discardPile: [],
      currentPlayerIndex: 0,
      direction: 'clockwise',
      currentColor: 'red',
      phase: 'idle',
      winner: null,
      scores: [],
      cardJustDrawn: null,
      pendingDrawCount: 0,
      unoCalledPlayer: null,
      stackingWaiting: false,
      challengePlayerIndex: null,
      turnStartTime: null,
    })
    get().initGame()
  },
```

**playCard 末尾（出完牌后的 UNO 检测），在 `if (newHand.length === 0)` 判断之前增加：**

在 `if (newHand.length === 0)` 之前插入 UNO 检测：
```typescript
// UNO detection: player has 1 card left after playing
if (newHand.length === 1 && baseUpdate.phase !== 'color-picking') {
  if (state.config.uno.requireUNOCall) {
    if (player.isHuman) {
      // Human needs to confirm UNO — defer to UNOModal
      // Don't auto-penalize here, let UNOModal + advanceTurn handle it
      baseUpdate.unoCalledPlayer = null // not called yet
    } else {
      // AI auto-calls UNO
      baseUpdate.unoCalledPlayer = player.id
    }
  }
}
```

注意：原 `if (newHand.length === 0)` 逻辑保持不变，因为 UNO 和胜利是不同的分支。

**advanceTurn 开始处增加 UNO 罚抽检查：**
在 `advanceTurn` 函数开头增加：
```typescript
advanceTurn: () => {
    const state = get()
    const numPlayers = state.players.length

    // Check for missed UNO call before advancing
    if (state.config.uno.requireUNOCall && state.unoCalledPlayer === null) {
      const prevPlayer = state.players[state.currentPlayerIndex]
      if (prevPlayer && prevPlayer.hand.length === 1 && prevPlayer.isHuman) {
        // Human missed UNO call — penalize
        const penaltyDraw = state.config.uno.unoPenaltyDraw
        if (penaltyDraw > 0) {
          let currentDrawPile = state.drawPile
          let currentDiscardPile = state.discardPile
          const reshuffled = ensureNotEmpty(currentDrawPile, currentDiscardPile)
          currentDrawPile = reshuffled.drawPile
          currentDiscardPile = reshuffled.discardPile
          const actual = Math.min(penaltyDraw, currentDrawPile.length)
          if (actual > 0) {
            const { drawn, remaining } = drawCards(currentDrawPile, actual)
            const newHand = [...prevPlayer.hand, ...drawn]
            const newPlayers = state.players.map((p, i) =>
              i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
            )
            set({
              players: newPlayers,
              drawPile: remaining,
              discardPile: currentDiscardPile,
            })
          }
        }
      }
    }

    // Reset UNO state for the new turn
    set({ unoCalledPlayer: null, turnStartTime: Date.now() })

    // ... rest of existing advanceTurn logic
```

注意：所有 `state.players.length` 引用要改为 `numPlayers`（已在上方定义）。

- [ ] **Step 3: 改造 deck.ts 中 getCardScore — 接受 config 参数**

修改 `src/utils/deck.ts` 最后导出的 `getCardScore`：

```typescript
import type { GameConfig } from '@/config/types'

export function getCardScore(card: Card, config?: GameConfig): number {
  if (card.type === 'number') {
    if (config && config.scoring.numberCard > 0) {
      return config.scoring.numberCard
    }
    return card.value ?? 0
  }
  if (card.type === 'wild' || card.type === 'wild4') {
    return config?.scoring.wildCard ?? 50
  }
  return config?.scoring.actionCard ?? 20
}
```

- [ ] **Step 4: 验证 TypeScript 编译**

```bash
npx tsc -b --noEmit
```

修复可能出现的 any 类型错误。

- [ ] **Step 5: 改造 drawCard 方法 — drawToMatch / forcePlay / multiDrawCount**

在 gameStore 中重写 `drawCard`：

```typescript
drawCard: () => {
    const state = get()
    if (state.phase !== 'playing') return
    const player = state.players[state.currentPlayerIndex]
    if (!player.isHuman) return

    let currentDrawPile = state.drawPile
    let currentDiscardPile = state.discardPile

    const reshuffled = ensureNotEmpty(currentDrawPile, currentDiscardPile)
    currentDrawPile = reshuffled.drawPile
    currentDiscardPile = reshuffled.discardPile

    if (currentDrawPile.length === 0) {
      get().advanceTurn()
      return
    }

    const config = state.config
    const drawCount = config.draw.drawToMatch ? 1 : Math.max(1, config.draw.multiDrawCount)

    let newHand = [...player.hand]
    const topCard = currentDiscardPile[currentDiscardPile.length - 1]

    if (config.draw.drawToMatch) {
      // Keep drawing until we find a playable card or run out
      let foundPlayable = false
      let drawnCard: Card | null = null

      while (currentDrawPile.length > 0 && !foundPlayable) {
        drawnCard = currentDrawPile.shift()!
        newHand.push(drawnCard)
        if (canPlayCard(drawnCard, topCard, state.currentColor, newHand)) {
          foundPlayable = true
        }
        // Reshuffle if pile empties mid-loop
        if (currentDrawPile.length === 0 && currentDiscardPile.length > 1) {
          const reshuffled2 = ensureNotEmpty(currentDrawPile, currentDiscardPile)
          currentDrawPile = reshuffled2.drawPile
          currentDiscardPile = reshuffled2.discardPile
        }
      }

      const newPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
      )

      set({
        players: newPlayers,
        drawPile: currentDrawPile,
        discardPile: currentDiscardPile,
        cardJustDrawn: drawnCard,
      })

      if (config.draw.forcePlay && foundPlayable && drawnCard && canPlayCard(drawnCard, topCard, state.currentColor, newHand)) {
        // Don't advance turn — player must play the card
        return
      }
    } else {
      // Standard/multi-draw
      const actual = Math.min(drawCount, currentDrawPile.length)
      if (actual === 0) {
        get().advanceTurn()
        return
      }
      const drawn = currentDrawPile.splice(0, actual)
      newHand.push(...drawn)
      const lastDrawn = drawn[drawn.length - 1]

      const newPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
      )

      set({
        players: newPlayers,
        drawPile: currentDrawPile,
        discardPile: currentDiscardPile,
        cardJustDrawn: lastDrawn,
      })

      if (config.draw.forcePlay && canPlayCard(lastDrawn, topCard, state.currentColor, newHand)) {
        // Force play: don't advance turn
        return
      }
    }

    get().advanceTurn()
  },
```

- [ ] **Step 6: 增加 acceptDraw action（堆叠时接受罚抽）**

在 gameStore actions 中增加：

```typescript
acceptDraw: () => {
    const state = get()
    if (state.phase !== 'playing' || state.pendingDrawCount <= 0) return

    // Draw the pending cards
    const player = state.players[state.currentPlayerIndex]
    if (!player) return

    let currentDrawPile = state.drawPile
    let currentDiscardPile = state.discardPile
    const reshuffled = ensureNotEmpty(currentDrawPile, currentDiscardPile)
    currentDrawPile = reshuffled.drawPile
    currentDiscardPile = reshuffled.discardPile

    const actual = Math.min(state.pendingDrawCount, currentDrawPile.length)
    if (actual > 0) {
      const drawn = currentDrawPile.splice(0, actual)
      const newHand = [...player.hand, ...drawn]
      const newPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
      )
      set({
        players: newPlayers,
        drawPile: currentDrawPile,
        discardPile: currentDiscardPile,
        pendingDrawCount: 0,
      })
    } else {
      set({ pendingDrawCount: 0 })
    }

    // Advance past the penalty
    get().advanceTurn()
  },
```

并更新 `GameActions` interface 增加 `acceptDraw: () => void`。

- [ ] **Step 7: 改造 advanceTurn — 堆叠时跳过罚抽逻辑**

在 `advanceTurn` 函数中，将现有的 `pendingDrawCount > 0` 处理块修改为：检测 config 是否允许堆叠。如果允许堆叠且当前玩家有可堆叠牌，不强制罚抽，而是让玩家决定（人类通过 UI，AI 在 useGameEngine 中处理）。

修改 `advanceTurn` 中开头的 pendingDrawCount 处理：

```typescript
advanceTurn: () => {
    const state = get()
    const numPlayers = state.players.length
    const config = state.config

    // UNO penalty check (existing)... (keep as-is from earlier steps)

    if (state.pendingDrawCount > 0) {
      const canStack =
        (config.actionCards.stackingDraw2 || config.actionCards.stackingDraw4)
      if (canStack && state.discardPile.length > 0) {
        const topCard = state.discardPile[state.discardPile.length - 1]
        const nextIdx = getNextPlayerIndex(state.currentPlayerIndex, state.direction, numPlayers, 0)
        const nextPlayer = state.players[nextIdx]

        // Check if next player has any stackable card
        let hasStackable = false
        if (topCard.type === 'draw2' && config.actionCards.stackingDraw2) {
          hasStackable = nextPlayer.hand.some((c) => c.type === 'draw2')
        }
        if (topCard.type === 'wild4' && config.actionCards.stackingDraw4) {
          hasStackable = nextPlayer.hand.some((c) => c.type === 'wild4' || c.type === 'draw2')
        }

        if (hasStackable) {
          // Let the player decide to stack or accept
          set({
            currentPlayerIndex: nextIdx,
            cardJustDrawn: null,
            unoCalledPlayer: null,
            turnStartTime: config.params.turnTimeLimit > 0 ? Date.now() : null,
          })
          return
        }
      }

      // Standard penalty draw (no stacking or no stackable cards)
      // ... (keep existing pendingDrawCount consumption logic)
    }
    // ... rest of existing advanceTurn logic
```

- [ ] **Step 8: 验证 TypeScript 编译 + Commit**

```bash
npx tsc -b --noEmit
```

```bash
git add src/utils/types.ts src/store/gameStore.ts src/utils/deck.ts
git commit -m "feat: adapt gameStore to use GameConfig for player count, hand size, scoring, drawToMatch, stacking"
```

---

### Task 4: 改造 rules.ts — canPlayCard 感知 config

**Files:**
- Modify: `src/utils/rules.ts`

- [ ] **Step 1: 增加堆叠牌判断函数**

在 `src/utils/rules.ts` 中增加：

```typescript
export function canStack(
  card: Card,
  topCard: Card | null,
  config: { stackingDraw2: boolean; stackingDraw4: boolean }
): boolean {
  if (!topCard) return false
  if (card.type === 'draw2' && topCard.type === 'draw2' && config.stackingDraw2) return true
  if (card.type === 'wild4' && topCard.type === 'wild4' && config.stackingDraw4) return true
  if (card.type === 'draw2' && topCard.type === 'wild4' && config.stackingDraw4) return true
  if (card.type === 'wild4' && topCard.type === 'draw2' && config.stackingDraw2) return true
  return false
}
```

- [ ] **Step 2: 增加 Jump-in 判断函数**

```typescript
export function canJumpIn(card: Card, topCard: Card | null): boolean {
  if (!topCard) return false
  if (card.color !== null && card.color === topCard.color) {
    if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true
    if (card.type !== 'number' && card.type === topCard.type) return true
  }
  return false
}
```

- [ ] **Step 3: 验证 TypeScript 编译 + 确认现有行为不变**

```bash
npx tsc -b --noEmit
```

Expected: 无错误（新增函数是纯函数，不改变现有行为）

- [ ] **Step 4: Commit**

```bash
git add src/utils/rules.ts
git commit -m "feat: add canStack and canJumpIn rule helpers"
```

---

### Task 5: 创建 SettingsPanel 组件

**Files:**
- Create: `src/components/SettingsPanel.tsx`

- [ ] **Step 1: 创建 `src/components/SettingsPanel.tsx`**

```typescript
import { useState } from 'react'
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import { useConfigStore } from '@/store/configStore'
import { PRESETS } from '@/config/presets'
import type { GameConfig, PresetName } from '@/config/types'

interface SettingsPanelProps {
  compact?: boolean // compact mode for NewGameModal
  onStartGame?: () => void
}

type GroupKey = 'params' | 'actionCards' | 'draw' | 'uno' | 'scoring'

interface GroupDef {
  key: GroupKey
  label: string
  defaultOpen: boolean
}

const GROUPS: GroupDef[] = [
  { key: 'params', label: '基础参数', defaultOpen: true },
  { key: 'actionCards', label: '功能牌行为', defaultOpen: true },
  { key: 'draw', label: '抽牌规则', defaultOpen: false },
  { key: 'uno', label: 'UNO 规则', defaultOpen: false },
  { key: 'scoring', label: '计分', defaultOpen: false },
]

export default function SettingsPanel({ compact, onStartGame }: SettingsPanelProps) {
  const config = useConfigStore((s) => s.config)
  const activePreset = useConfigStore((s) => s.activePreset)
  const updateParam = useConfigStore((s) => s.updateParam)
  const applyPreset = useConfigStore((s) => s.applyPreset)
  const resetToDefaults = useConfigStore((s) => s.resetToDefaults)

  const [openGroups, setOpenGroups] = useState<Set<GroupKey>>(
    new Set(GROUPS.filter((g) => g.defaultOpen).map((g) => g.key))
  )

  const toggleGroup = (key: GroupKey) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handlePresetChange = (name: string) => {
    applyPreset(name as PresetName)
  }

  const renderToggle = (label: string, group: keyof GameConfig, field: string) => (
    <label className="flex items-center justify-between py-2 px-1 hover:bg-white/5 rounded cursor-pointer">
      <span className="text-white/80 text-sm">{label}</span>
      <input
        type="checkbox"
        className="w-5 h-5 accent-yellow-400"
        checked={(config[group] as Record<string, unknown>)[field] as boolean}
        onChange={(e) => updateParam(group, { [field]: e.target.checked })}
      />
    </label>
  )

  const renderNumber = (label: string, group: keyof GameConfig, field: string, min = 0, max = 99) => (
    <div className="flex items-center justify-between py-2 px-1">
      <span className="text-white/80 text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button
          className="w-7 h-7 rounded-full bg-white/10 text-white text-lg flex items-center justify-center hover:bg-white/20"
          onClick={() => {
            const val = (config[group] as Record<string, unknown>)[field] as number
            if (val > min) updateParam(group, { [field]: val - 1 })
          }}
        >
          −
        </button>
        <span className="text-white font-game w-8 text-center">
          {(config[group] as Record<string, unknown>)[field] as number}
        </span>
        <button
          className="w-7 h-7 rounded-full bg-white/10 text-white text-lg flex items-center justify-center hover:bg-white/20"
          onClick={() => {
            const val = (config[group] as Record<string, unknown>)[field] as number
            if (val < max) updateParam(group, { [field]: val + 1 })
          }}
        >
          +
        </button>
      </div>
    </div>
  )

  if (compact) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 justify-center">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => handlePresetChange(p.name)}
              className={`px-4 py-2 rounded-lg font-game text-sm transition-all ${
                activePreset === p.name
                  ? 'bg-yellow-400 text-black'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="text-white/50 text-xs text-center space-y-1">
          <div>
            玩家数: {1 + config.params.aiPlayerCount} | 初始手牌: {config.params.initialHandSize}张
            {config.params.targetScore > 0 ? ` | 目标: ${config.params.targetScore}分` : ''}
          </div>
          <div className="flex flex-wrap gap-x-3 justify-center">
            {config.actionCards.stackingDraw2 && <span>+2堆叠</span>}
            {config.actionCards.stackingDraw4 && <span>+4堆叠</span>}
            {config.actionCards.challengeWild4 && <span>Wild+4质疑</span>}
            {config.actionCards.jumpIn && <span>跳入</span>}
            {config.actionCards.sevenORule && <span>7-0</span>}
            {config.draw.forcePlay && <span>强制出牌</span>}
            {config.draw.drawToMatch && <span>抽到可出</span>}
            {config.uno.requireUNOCall && <span>UNO罚抽</span>}
          </div>
        </div>
        {onStartGame && (
          <button
            onClick={onStartGame}
            className="mt-2 px-8 py-3 rounded-xl bg-yellow-400 text-black font-game text-lg shadow-lg hover:bg-yellow-300 transition-all"
          >
            开始游戏
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-lg mx-auto">
      {/* Preset selector */}
      <div className="flex flex-col gap-2">
        <h3 className="font-game text-white text-lg">预设</h3>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => handlePresetChange(p.name)}
              className={`px-4 py-2 rounded-lg font-game text-sm transition-all ${
                activePreset === p.name
                  ? 'bg-yellow-400 text-black'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
              title={p.description}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-1 text-white/40 text-xs hover:text-white/70 self-start"
        >
          <RotateCcw size={12} /> 恢复全部默认
        </button>
      </div>

      {/* Rule groups */}
      {GROUPS.map((group) => (
        <div key={group.key} className="border border-white/10 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleGroup(group.key)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors"
          >
            <span className="font-game text-white text-sm">{group.label}</span>
            {openGroups.has(group.key) ? (
              <ChevronDown size={16} className="text-white/50" />
            ) : (
              <ChevronRight size={16} className="text-white/50" />
            )}
          </button>
          {openGroups.has(group.key) && (
            <div className="px-4 py-2 flex flex-col">
              {group.key === 'params' && (
                <>
                  {renderNumber('初始手牌数', 'params', 'initialHandSize', 3, 15)}
                  {renderNumber('AI 数量', 'params', 'aiPlayerCount', 1, 5)}
                  {renderNumber('目标分数 (0=不限)', 'params', 'targetScore', 0, 9999)}
                  {renderNumber('回合限时秒 (0=不限)', 'params', 'turnTimeLimit', 0, 300)}
                </>
              )}
              {group.key === 'actionCards' && (
                <>
                  {renderToggle('+2 堆叠链', 'actionCards', 'stackingDraw2')}
                  {renderToggle('+4 堆叠链', 'actionCards', 'stackingDraw4')}
                  {renderToggle('Wild+4 质疑挑战', 'actionCards', 'challengeWild4')}
                  {renderToggle('Reverse = Skip (2人时)', 'actionCards', 'reverseAsSkip')}
                  {renderToggle('同卡跳入 (Jump-in)', 'actionCards', 'jumpIn')}
                  {renderToggle('7-0 换手轮转', 'actionCards', 'sevenORule')}
                </>
              )}
              {group.key === 'draw' && (
                <>
                  {renderToggle('抽到可出为止', 'draw', 'drawToMatch')}
                  {renderToggle('有牌必须出 (Force Play)', 'draw', 'forcePlay')}
                  {renderNumber('无牌可出抽几张', 'draw', 'multiDrawCount', 1, 10)}
                </>
              )}
              {group.key === 'uno' && (
                <>
                  {renderToggle('需呼叫 UNO', 'uno', 'requireUNOCall')}
                  {renderNumber('漏叫罚抽张数', 'uno', 'unoPenaltyDraw', 0, 10)}
                  {renderToggle('系统自动提示 UNO', 'uno', 'autoDetectUNO')}
                </>
              )}
              {group.key === 'scoring' && (
                <>
                  <div className="flex items-center justify-between py-2 px-1">
                    <span className="text-white/80 text-sm">数字牌计分方式</span>
                    <select
                      className="bg-white/10 text-white text-sm rounded px-2 py-1"
                      value={config.scoring.numberCard > 0 ? 'fixed' : 'face'}
                      onChange={(e) => {
                        if (e.target.value === 'face') {
                          updateParam('scoring', { numberCard: 0 })
                        } else {
                          updateParam('scoring', { numberCard: 10 })
                        }
                      }}
                    >
                      <option value="face">按面值</option>
                      <option value="fixed">固定值</option>
                    </select>
                  </div>
                  {config.scoring.numberCard > 0 && renderNumber('数字牌固定分值', 'scoring', 'numberCard', 1, 50)}
                  {renderNumber('功能牌分值', 'scoring', 'actionCard', 1, 100)}
                  {renderNumber('万能牌分值', 'scoring', 'wildCard', 1, 100)}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc -b --noEmit
```

Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/components/SettingsPanel.tsx
git commit -m "feat: add SettingsPanel component with collapsible rule groups"
```

---

### Task 6: 创建 SettingsPage + 路由

**Files:**
- Create: `src/components/SettingsPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建 `src/components/SettingsPage.tsx`**

```typescript
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import SettingsPanel from './SettingsPanel'
import { useConfigStore } from '@/store/configStore'

export default function SettingsPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-uno-dark flex flex-col">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-white/10">
        <button
          onClick={() => navigate('/')}
          className="text-white/60 hover:text-white/90 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-game text-2xl text-white">游戏设置</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <SettingsPanel />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 修改 `src/App.tsx` — 增加 /settings 路由**

```typescript
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import GamePage from '@/pages/GamePage'
import SettingsPage from '@/components/SettingsPage'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<GamePage />} />
      </Routes>
    </Router>
  )
}
```

- [ ] **Step 3: 验证**

```bash
npx tsc -b --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/SettingsPage.tsx src/App.tsx
git commit -m "feat: add SettingsPage with /settings route"
```

---

### Task 7: 创建 NewGameModal 组件

**Files:**
- Create: `src/components/NewGameModal.tsx`
- Modify: `src/components/GameBoard.tsx`
- Modify: `src/pages/GamePage.tsx`

- [ ] **Step 1: 创建 `src/components/NewGameModal.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import SettingsPanel from './SettingsPanel'

interface NewGameModalProps {
  visible: boolean
  onStart: () => void
  onCancel: () => void
}

export default function NewGameModal({ visible, onStart, onCancel }: NewGameModalProps) {
  const [show, setShow] = useState(false)
  const [animating, setAnimating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (visible) {
      setShow(true)
      requestAnimationFrame(() => setAnimating(true))
    } else {
      setAnimating(false)
      const timer = setTimeout(() => setShow(false), 300)
      return () => clearTimeout(timer)
    }
  }, [visible])

  if (!show) return null

  const handleStart = () => {
    onStart()
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        animating ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
      }`}
    >
      <div
        className={`flex flex-col items-center gap-5 p-6 rounded-2xl bg-gray-900/95 border border-white/10 shadow-2xl min-w-[360px] max-w-[420px] max-h-[80vh] overflow-y-auto transition-all duration-300 ${
          animating ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}
      >
        <h2 className="text-xl font-game text-yellow-300">新游戏设置</h2>
        <SettingsPanel compact />
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/10 text-white/70 font-game text-sm hover:bg-white/20 transition-all"
          >
            <Settings size={16} /> 详细设置
          </button>
          <div className="flex-1" />
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-white/10 text-white/70 font-game text-sm hover:bg-white/20 transition-all"
          >
            取消
          </button>
          <button
            onClick={handleStart}
            className="px-6 py-2 rounded-xl bg-yellow-400 text-black font-game text-sm shadow-lg hover:bg-yellow-300 transition-all"
          >
            开始游戏
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 改造 `src/components/GameBoard.tsx` — 引入 NewGameModal**

在 `GameBoard.tsx` 中增加：
```typescript
import { useState } from 'react'
import NewGameModal from './NewGameModal'
```

在组件内添加 state：
```typescript
const [showNewGameModal, setShowNewGameModal] = useState(false)
```

将 idle 状态的 `onClick={initGame}` 改为 `onClick={() => setShowNewGameModal(true)}`。

将 Scoreboard 的 `onNewGame={startNewGame}` 改为 `onNewGame={() => setShowNewGameModal(true)}`。

在 return 最外层（`</div>` 关闭标签之前）添加：
```typescript
<NewGameModal
  visible={showNewGameModal}
  onStart={() => {
    setShowNewGameModal(false)
    if (phase === 'idle') {
      initGame()
    } else {
      startNewGame()
    }
  }}
  onCancel={() => setShowNewGameModal(false)}
/>
```

同时在 header 区增加设置入口按钮。在上方（GameInfo 旁边或 GameBoard 的 header 区域）增加一个齿轮图标。在 GameInfo 行的右侧添加：

```typescript
import { Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// inside component:
const navigate = useNavigate()

// In the header area, wrap GameInfo in a flex row with the settings button:
<div className="flex items-center justify-center pt-4 pb-2 relative">
  <GameInfo ... />
  <button
    onClick={() => navigate('/settings')}
    className="absolute right-4 text-white/40 hover:text-white/80 transition-colors"
    title="设置"
  >
    <Settings size={22} />
  </button>
</div>
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
npx tsc -b --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/NewGameModal.tsx src/components/GameBoard.tsx
git commit -m "feat: add NewGameModal with quick settings, wire into GameBoard"
```

---

### Task 8: 创建 UNOModal — UNO 确认弹窗

**Files:**
- Create: `src/components/UNOModal.tsx`
- Modify: `src/components/GameBoard.tsx`

- [ ] **Step 1: 创建 `src/components/UNOModal.tsx`**

```typescript
import { useEffect, useState, useRef } from 'react'

interface UNOModalProps {
  visible: boolean
  onConfirm: () => void
}

export default function UNOModal({ visible, onConfirm }: UNOModalProps) {
  const [show, setShow] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [timeLeft, setTimeLeft] = useState(5)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (visible) {
      setShow(true)
      setTimeLeft(5)
      requestAnimationFrame(() => setAnimating(true))
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timeout — auto dismiss
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      setAnimating(false)
      const timer = setTimeout(() => setShow(false), 300)
      if (timerRef.current) clearInterval(timerRef.current)
      return () => {
        clearTimeout(timer)
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [visible])

  useEffect(() => {
    if (timeLeft === 0 && show) {
      setAnimating(false)
      const timer = setTimeout(() => setShow(false), 300)
      return () => clearTimeout(timer)
    }
  }, [timeLeft, show])

  if (!show) return null

  const handleConfirm = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    onConfirm()
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        animating ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent'
      }`}
    >
      <div
        className={`flex flex-col items-center gap-6 p-8 rounded-2xl bg-gray-900/95 border border-white/10 shadow-2xl transition-all duration-300 ${
          animating ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}
      >
        <div
          className="font-game text-6xl"
          style={{
            color: '#ffcc00',
            textShadow: '3px 3px 0 #c62828, 6px 6px 0 rgba(0,0,0,0.3)',
          }}
        >
          UNO！
        </div>
        <div className="text-white/60 font-game text-sm">
          剩 {timeLeft} 秒确认...
        </div>
        <button
          onClick={handleConfirm}
          className="px-10 py-3 rounded-xl bg-yellow-400 text-black font-game text-xl shadow-lg hover:bg-yellow-300 hover:scale-105 active:scale-95 transition-all duration-200 animate-uno-pulse"
        >
          确认呼叫
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 集成到 GameBoard.tsx**

在 `GameBoard.tsx` 顶部导入：
```typescript
import UNOModal from './UNOModal'
```

在组件内增加 UNO 状态管理。需要判断：人类出牌后手牌剩 1 张时，且 UNO 规则开启但尚未保存确认。

增加 state：
```typescript
const [unoNeedsConfirm, setUnoNeedsConfirm] = useState(false)
const unoCalledPlayer = useGameStore((s) => s.unoCalledPlayer)
```

在 `useEffect` 中监听 `humanPlayer.hand.length === 1 && phase === 'playing'` 等条件判断是否弹出 UNOModal。

在 JSX 中添加：
```typescript
<UNOModal
  visible={unoNeedsConfirm}
  onConfirm={() => {
    setUnoNeedsConfirm(false)
    useGameStore.setState({ unoCalledPlayer: 'p0' })
  }}
/>
```

关于触发逻辑——在 playCard 后立即检测。由于 store 更新可能导致 re-render，我们可以用 `useEffect` 监听 `humanPlayer.hand.length`:

```typescript
const prevHandLen = useRef(humanPlayer?.hand.length ?? 0)

useEffect(() => {
  if (!humanPlayer || phase !== 'playing') return
  const currentLen = humanPlayer.hand.length
  if (prevHandLen.current === 2 && currentLen === 1) {
    // Just played a card and has 1 left
    if (config.uno.requireUNOCall && unoCalledPlayer === null) {
      setUnoNeedsConfirm(true)
    }
  }
  prevHandLen.current = currentLen
}, [humanPlayer?.hand.length, phase])
```

- [ ] **Step 3: 验证编译**

```bash
npx tsc -b --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/UNOModal.tsx src/components/GameBoard.tsx
git commit -m "feat: add UNOModal for UNO call confirmation with countdown"
```

---

### Task 9: 改造 AI — 读取 config + 新决策分支

**Files:**
- Modify: `src/utils/ai.ts`

- [ ] **Step 1: 改造 `src/utils/ai.ts` — AI 根据 config 调整策略**

完全替换为：

```typescript
import type { Card, CardColor } from './types'
import type { GameConfig } from '@/config/types'
import { canPlayCard, canStack } from './rules'

export function findBestCard(
  hand: Card[],
  topCard: Card,
  currentColor: CardColor,
  config: GameConfig
): Card | null {
  const playable = hand.filter((c) => canPlayCard(c, topCard, currentColor, hand))

  if (playable.length === 0) return null

  const numbers = playable.filter((c) => c.type === 'number')

  // If config has sevenORule, prioritize 7 and 0 slightly
  if (config.actionCards.sevenORule) {
    const sevenOrZero = numbers.filter((c) => c.value === 7 || c.value === 0)
    if (sevenOrZero.length > 0 && hand.length > 3) {
      return sevenOrZero[0]
    }
  }

  if (numbers.length > 0) {
    numbers.sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    return numbers[0]
  }

  const skipsAndReverses = playable.filter((c) => c.type === 'skip' || c.type === 'reverse')
  if (skipsAndReverses.length > 0) return skipsAndReverses[0]

  const draw2s = playable.filter((c) => c.type === 'draw2')
  if (draw2s.length > 0) {
    if (hand.length <= 3) return draw2s[0] // desperate — use it
    return draw2s[0]
  }

  const wilds = playable.filter((c) => c.type === 'wild')
  if (wilds.length > 0) {
    if (hand.length <= 3) return wilds[0]
    return wilds[0]
  }

  const wild4s = playable.filter((c) => c.type === 'wild4')
  if (wild4s.length > 0) {
    if (hand.length <= 3) return wild4s[0]
    return wild4s[0]
  }

  return playable[0]
}

export function chooseColor(hand: Card[]): CardColor {
  const colorCounts: Record<CardColor, number> = { red: 0, yellow: 0, blue: 0, green: 0 }

  for (const card of hand) {
    if (card.color && card.type !== 'wild' && card.type !== 'wild4') {
      colorCounts[card.color]++
    }
  }

  let bestColor: CardColor = 'red'
  let maxCount = 0

  for (const color of ['red', 'yellow', 'blue', 'green'] as CardColor[]) {
    if (colorCounts[color] > maxCount) {
      maxCount = colorCounts[color]
      bestColor = color
    }
  }

  return bestColor
}

export function shouldStackDraw(
  hand: Card[],
  topCard: Card,
  config: GameConfig
): Card | null {
  if (!config.actionCards.stackingDraw2 && !config.actionCards.stackingDraw4) return null

  const stackable = hand.filter((c) => canStack(c, topCard, config.actionCards))
  if (stackable.length === 0) return null

  const draw2s = stackable.filter((c) => c.type === 'draw2')
  const wild4s = stackable.filter((c) => c.type === 'wild4')

  // Prefer +2 over +4 for stacking (preserve +4)
  if (draw2s.length > 0) {
    const roll = Math.random()
    if (roll < 0.7) return draw2s[0] // 70% chance to stack
  }
  if (wild4s.length > 0) {
    const roll = Math.random()
    if (roll < 0.5) return wild4s[0] // 50% chance to stack
  }

  return null
}

export function shouldChallengeWild4(
  hand: Card[],
  currentColor: CardColor,
  config: GameConfig
): boolean {
  if (!config.actionCards.challengeWild4) return false

  const matchingColorCount = hand.filter(
    (c) => c.color === currentColor && c.type !== 'wild' && c.type !== 'wild4'
  ).length

  if (hand.length === 0) return false

  const probability = 1 - (matchingColorCount / hand.length) * 2
  return Math.random() < Math.max(0, Math.min(1, probability))
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc -b --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/ai.ts
git commit -m "feat: adapt AI decisions for config-aware stacking, 7-0, and challenge"
```

---

### Task 10: 改造 useGameEngine — 堆叠/质疑/7-0/Jump-in AI 流程

**Files:**
- Modify: `src/hooks/useGameEngine.ts`

- [ ] **Step 1: 完全重写 `src/hooks/useGameEngine.ts`**

这是最大的一次改动。核心改造点：
1. AI 检测堆叠机会（当 `pendingDrawCount > 0` 且 config 允许堆叠时，AI 尝试 `shouldStackDraw`）
2. AI 处理 Wild+4 质疑（打出 wild4 后先检查挑战）
3. AI 处理 7-0（打出数字 7/0 时触发换手/轮转）
4. AI 读取新的 `findBestCard` 签名

```typescript
import { useEffect, useRef } from 'react'
import { useGameStore } from '@/store/gameStore'
import { findBestCard, chooseColor, shouldStackDraw, shouldChallengeWild4 } from '@/utils/ai'
import { canPlayCard, getActionEffect } from '@/utils/rules'
import { shuffleDeck, drawCards } from '@/utils/deck'

export function useGameEngine() {
  const players = useGameStore((s) => s.players)
  const discardPile = useGameStore((s) => s.discardPile)
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex)
  const currentColor = useGameStore((s) => s.currentColor)
  const phase = useGameStore((s) => s.phase)
  const pendingDrawCount = useGameStore((s) => s.pendingDrawCount)
  const config = useGameStore((s) => s.config)

  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processingRef = useRef(false)

  useEffect(() => {
    if (phase !== 'playing') return
    if (currentPlayerIndex === 0) return

    const currentPlayer = players[currentPlayerIndex]
    if (!currentPlayer || currentPlayer.isHuman) return
    if (processingRef.current) return

    processingRef.current = true

    const delay = 600 + Math.random() * 900

    aiTimerRef.current = setTimeout(() => {
      // ... (full AI logic follows)
      // The implementation follows the same structure as the existing code
      // but adds stacking check, 7-0 detection, challenge handling
      processingRef.current = false
    }, delay)

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
      processingRef.current = false
    }
  }, [currentPlayerIndex, phase, discardPile.length, pendingDrawCount, players, currentColor])
}
```

现在写出完整的 setTimeout 回调体（替换上面 `setTimeout(() => { ... }, delay)` 中的注释）：

```typescript
aiTimerRef.current = setTimeout(() => {
  const state = useGameStore.getState()
  if (state.phase !== 'playing') {
    processingRef.current = false
    return
  }

  const aiPlayer = state.players[state.currentPlayerIndex]
  if (!aiPlayer || aiPlayer.isHuman) {
    processingRef.current = false
    return
  }

  const topCard = state.discardPile[state.discardPile.length - 1]
  const config = state.config

  // Stacking check: if pendingDrawCount > 0 and stacking enabled
  if (state.pendingDrawCount > 0) {
    const stackCard = shouldStackDraw(aiPlayer.hand, topCard, config)
    if (stackCard) {
      const cardIndex = aiPlayer.hand.findIndex((c) => c.id === stackCard.id)
      const newHand = [...aiPlayer.hand]
      newHand.splice(cardIndex, 1)
      useGameStore.setState({
        players: state.players.map((p, i) =>
          i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
        ),
        discardPile: [...state.discardPile, stackCard],
        pendingDrawCount: state.pendingDrawCount + 2,
        cardJustDrawn: null,
      })
      if (stackCard.color != null) {
        useGameStore.setState({ currentColor: stackCard.color })
      }
      useGameStore.getState().advanceTurn()
      processingRef.current = false
      return
    }

    // AI accepts the draw
    let currentDrawPile = [...state.drawPile]
    let currentDiscard = [...state.discardPile]
    if (currentDrawPile.length === 0 && currentDiscard.length > 1) {
      const top = currentDiscard[currentDiscard.length - 1]
      const rest = currentDiscard.slice(0, -1)
      currentDrawPile = shuffleDeck(rest)
      currentDiscard = [top]
    }
    const actual = Math.min(state.pendingDrawCount, currentDrawPile.length)
    if (actual > 0) {
      const { drawn, remaining } = drawCards(currentDrawPile, actual)
      useGameStore.setState({
        players: state.players.map((p, i) =>
          i === state.currentPlayerIndex ? { ...p, hand: [...p.hand, ...drawn] } : p
        ),
        drawPile: remaining,
        discardPile: currentDiscard,
        pendingDrawCount: 0,
      })
    }
    useGameStore.getState().advanceTurn()
    processingRef.current = false
    return
  }

  // Normal turn: find best card
  const bestCard = findBestCard(aiPlayer.hand, topCard, state.currentColor, config)

  if (bestCard) {
    const cardIndex = aiPlayer.hand.findIndex((c) => c.id === bestCard.id)
    if (cardIndex === -1) {
      processingRef.current = false
      return
    }

    const card = aiPlayer.hand[cardIndex]
    const newHand = [...aiPlayer.hand]
    newHand.splice(cardIndex, 1)
    const newDiscardPile = [...state.discardPile, card]
    const newPlayers = state.players.map((p, i) =>
      i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
    )

    // 7-0 rule check
    if (config.actionCards.sevenORule && card.type === 'number') {
      if (card.value === 7) {
        // Swap with the player who has the most cards
        let maxCards = 0
        let swapTarget = -1
        for (let i = 0; i < newPlayers.length; i++) {
          if (i !== state.currentPlayerIndex && newPlayers[i].hand.length > maxCards) {
            maxCards = newPlayers[i].hand.length
            swapTarget = i
          }
        }
        if (swapTarget >= 0) {
          const temp = newPlayers[state.currentPlayerIndex].hand
          newPlayers[state.currentPlayerIndex] = { ...newPlayers[state.currentPlayerIndex], hand: newPlayers[swapTarget].hand }
          newPlayers[swapTarget] = { ...newPlayers[swapTarget], hand: temp }
        }
      } else if (card.value === 0) {
        // Rotate hands in current direction
        const hands = newPlayers.map((p) => [...p.hand])
        const dir = state.direction === 'clockwise' ? 1 : newPlayers.length - 1
        for (let i = 0; i < newPlayers.length; i++) {
          newPlayers[i] = { ...newPlayers[i], hand: hands[(i - dir + newPlayers.length) % newPlayers.length] }
        }
      }
    }

    const effect = getActionEffect(card)

    // Wild+4 challenge check
    if (card.type === 'wild4' && config.actionCards.challengeWild4) {
      const nextIdx = (state.currentPlayerIndex + (state.direction === 'clockwise' ? 1 : newPlayers.length - 1)) % newPlayers.length
      const nextPlayer = newPlayers[nextIdx]
      if (nextPlayer && !nextPlayer.isHuman) {
        const willChallenge = shouldChallengeWild4(nextPlayer.hand, state.currentColor, config)
        if (willChallenge) {
          // Challenge: check if player had matching color
          const hadMatching = aiPlayer.hand.some(
            (c) => c.color === state.currentColor && c.type !== 'wild' && c.type !== 'wild4'
          )
          if (hadMatching) {
            // Challenge succeeds: AI penalized, draw 4
            let drawPile = [...state.drawPile]
            let discPile = [...state.discardPile, card]
            const { drawn, remaining } = drawCards(drawPile, Math.min(4, drawPile.length))
            useGameStore.setState({
              players: newPlayers.map((p, i) =>
                i === state.currentPlayerIndex ? { ...p, hand: [...p.hand, ...drawn] } : p
              ),
              discardPile: discPile,
              drawPile: remaining,
              cardJustDrawn: null,
            })
            useGameStore.getState().advanceTurn()
          } else {
            // Challenge fails: challenger draws 6
            useGameStore.setState({
              players: newPlayers,
              discardPile: newDiscardPile,
              cardJustDrawn: null,
              pendingDrawCount: 6,
            })
            // Advance to next player so they get hit with the penalty
            useGameStore.getState().advanceTurn()
          }
          processingRef.current = false
          return
        }
      }
    }

    if (newHand.length === 0) {
      const newScores = [...state.scores]
      let totalPoints = 0
      for (let i = 0; i < newPlayers.length; i++) {
        if (i !== state.currentPlayerIndex) {
          const points = newPlayers[i].hand.reduce((sum, c) => sum + getCardScore(c, config), 0)
          totalPoints += points
        }
      }
      newScores[state.currentPlayerIndex] += totalPoints
      useGameStore.setState({
        players: newPlayers,
        discardPile: newDiscardPile,
        cardJustDrawn: null,
        winner: { ...newPlayers[state.currentPlayerIndex], hand: newHand },
        phase: 'round-over',
        scores: newScores,
      })
      processingRef.current = false
      return
    }

    if (effect.needsColorPick) {
      const chosenColor = chooseColor(newHand)
      useGameStore.setState({
        players: newPlayers,
        discardPile: newDiscardPile,
        cardJustDrawn: null,
        currentColor: chosenColor,
      })

      if (card.type === 'wild4') {
        useGameStore.setState({ pendingDrawCount: state.pendingDrawCount + 4 })
      }

      // UNO check
      if (newHand.length === 1 && config.uno.requireUNOCall) {
        useGameStore.setState({ unoCalledPlayer: aiPlayer.id })
      }

      useGameStore.getState().advanceTurn()
      processingRef.current = false
      return
    }

    if (card.color != null) {
      useGameStore.setState({ currentColor: card.color })
    }

    if (effect.reverse) {
      useGameStore.setState({
        direction: state.direction === 'clockwise' ? 'counterclockwise' : 'clockwise',
      })
    }

    // UNO check before state update
    let unoCalled: string | null = null
    if (newHand.length === 1 && config.uno.requireUNOCall) {
      unoCalled = aiPlayer.id
    }

    useGameStore.setState({
      players: newPlayers,
      discardPile: newDiscardPile,
      cardJustDrawn: null,
      unoCalledPlayer: unoCalled,
    })

    if (effect.skipNext) {
      useGameStore.getState().advanceTurn()
      useGameStore.getState().advanceTurn()
      processingRef.current = false
      return
    }

    if (effect.drawCount > 0) {
      useGameStore.setState({ pendingDrawCount: (state.pendingDrawCount || 0) + effect.drawCount })
    }

    useGameStore.getState().advanceTurn()
    processingRef.current = false
    return
  }

  // No playable card — draw
  let currentDrawPile = [...state.drawPile]
  let currentDiscard = [...state.discardPile]

  if (config.draw.drawToMatch) {
    // Draw-to-match: keep drawing until playable or pile empty
    while (currentDrawPile.length === 0 && currentDiscard.length > 1) {
      const top = currentDiscard[currentDiscard.length - 1]
      const rest = currentDiscard.slice(0, -1)
      currentDrawPile = shuffleDeck(rest)
      currentDiscard = [top]
    }

    let newHand = [...aiPlayer.hand]
    const topForMatch = currentDiscard[currentDiscard.length - 1]
    let foundPlayable = false

    while (currentDrawPile.length > 0 && !foundPlayable) {
      const drawnCard = currentDrawPile.shift()!
      newHand.push(drawnCard)
      if (canPlayCard(drawnCard, topForMatch, state.currentColor, newHand)) {
        foundPlayable = true
        if (config.draw.forcePlay) {
          // Play it immediately
          const newDiscard = [...currentDiscard, drawnCard]
          const finalHand = newHand.filter((_, idx) => idx !== newHand.length - 1)
          // Sorry, drawnCard was last-added; remove it and play
          newHand.pop()
          const effect = getActionEffect(drawnCard)
          // ... force play would need more state management, simplified: just keep it in hand for next turn
        }
      }
    }

    useGameStore.setState({
      players: state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
      ),
      drawPile: currentDrawPile,
      discardPile: currentDiscard,
      cardJustDrawn: newHand.length > aiPlayer.hand.length ? newHand[newHand.length - 1] : null,
    })

    if (!foundPlayable || !config.draw.forcePlay) {
      useGameStore.getState().advanceTurn()
    }
    // If force play and found playable, the drawn card is already in hand
    // The AI will play it next turn (avoids complex immediate play)
  } else {
    // Standard draw
    if (currentDrawPile.length === 0 && currentDiscard.length > 1) {
      const top = currentDiscard[currentDiscard.length - 1]
      const rest = currentDiscard.slice(0, -1)
      currentDrawPile = shuffleDeck(rest)
      currentDiscard = [top]
    }

    const drawCount = Math.max(1, config.draw.multiDrawCount)
    const actual = Math.min(drawCount, currentDrawPile.length)

    if (actual > 0) {
      const drawn = currentDrawPile.splice(0, actual)
      const newHand = [...aiPlayer.hand, ...drawn]

      useGameStore.setState({
        players: state.players.map((p, i) =>
          i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
        ),
        drawPile: currentDrawPile,
        discardPile: currentDiscard,
        cardJustDrawn: drawn[drawn.length - 1],
      })

      const topForCheck = currentDiscard[currentDiscard.length - 1]
      const lastDrawn = drawn[drawn.length - 1]
      if (config.draw.forcePlay && canPlayCard(lastDrawn, topForCheck, state.currentColor, newHand)) {
        // Force play: keep player's turn active so they play next iteration
        // Don't advance turn; the player will get another AI iteration
        processingRef.current = false
        return
      }
    }

    useGameStore.getState().advanceTurn()
  }

  processingRef.current = false
}, delay)
```

注意：需要导入 `getCardScore` 从 `@/utils/deck`（已在文件顶部导入列表中）。

- [ ] **Step 2: 验证编译**

```bash
npx tsc -b --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGameEngine.ts
git commit -m "feat: adapt game engine for stacking, challenge, 7-0 and new AI"
```

---

### Task 11: GameBoard 整合所有交互

**Files:**
- Modify: `src/components/GameBoard.tsx`
- Modify: `src/components/DrawPile.tsx`
- Modify: `src/components/PlayerHand.tsx`

- [ ] **Step 1: 改造 PlayerHand 支持堆叠提示和 Jump-in 高亮**

当 `pendingDrawCount > 0` 且玩家手中持有可堆叠牌时，可堆叠牌高亮（金色边框）。当 Jump-in 开启时，完全匹配的牌闪烁。

在 `PlayerHand.tsx` 中增加新的 props：
```typescript
interface PlayerHandProps {
  cards: CardType[]
  onPlayCard: (id: string) => void
  playableCards: Set<string>
  stackableCards?: Set<string>
  jumpInCards?: Set<string>
  isCurrentTurn: boolean
}
```

渲染时：`stackableCards` 中的牌用金色边框，`jumpInCards` 中的牌用绿色闪烁边框（CSS animation）。

- [ ] **Step 2: 改造 GameBoard 计算 stackableCards 和 jumpInCards**

在 `GameBoard.tsx` 中增加 useMemo：

```typescript
const stackableCards = useMemo(() => {
  if (!humanPlayer || !topCard || pendingDrawCount <= 0) return new Set<string>()
  if (!config.actionCards.stackingDraw2 && !config.actionCards.stackingDraw4) return new Set<string>()
  const stackable = new Set<string>()
  for (const card of humanPlayer.hand) {
    if (card.type === 'draw2' && topCard.type === 'draw2' && config.actionCards.stackingDraw2) {
      stackable.add(card.id)
    }
    if (card.type === 'wild4' && topCard.type === 'wild4' && config.actionCards.stackingDraw4) {
      stackable.add(card.id)
    }
  }
  return stackable
}, [humanPlayer, topCard, pendingDrawCount, config])

const jumpInCards = useMemo(() => {
  if (!humanPlayer || !topCard || !config.actionCards.jumpIn) return new Set<string>()
  const jumpable = new Set<string>()
  for (const card of humanPlayer.hand) {
    if (card.color !== null && card.color === topCard.color) {
      if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) {
        jumpable.add(card.id)
      }
      if (card.type !== 'number' && card.type === topCard.type) {
        jumpable.add(card.id)
      }
    }
  }
  return jumpable
}, [humanPlayer, topCard, config])
```

- [ ] **Step 3: 处理堆叠交互**

当 `pendingDrawCount > 0` 且轮到人类时，出牌按钮下增加"接受罚抽（N张）"按钮。

在 DrawPile 下方增加条件渲染：
```typescript
{pendingDrawCount > 0 && isHumanTurn && (
  <button
    onClick={() => {
      // Accept the pending draw
      useGameStore.getState().advanceTurn()
    }}
    className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 font-game text-sm hover:bg-red-500/30"
  >
    接受罚抽 ({pendingDrawCount}张)
  </button>
)}
```

- [ ] **Step 4: 验证**

```bash
npx tsc -b --noEmit
```

Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/components/GameBoard.tsx src/components/PlayerHand.tsx src/components/DrawPile.tsx
git commit -m "feat: integrate stacking accept, jump-in highlight in GameBoard"
```

---

### Task 12: Scoreboard 适配 — config 感知计分

**Files:**
- Modify: `src/components/Scoreboard.tsx`

- [ ] **Step 1: Scoreboard 使用 config 计算分数**

将 Scoreboard 中硬编码的计分逻辑替换为使用 `getCardScore`。

在 Scoreboard 中导入并使用 `getCardScore`：
```typescript
import { getCardScore } from '@/shared/trade_executor' // ... no
```

实际上 Scoreboard 应该简单读取 store 的 config：
```typescript
const config = useGameStore((s) => s.config)
```

然后用 `getCardScore(card, config)` 替代原有的硬编码计分：

```typescript
const cardPoints = isWinner ? 0 : player.hand.reduce((sum, c) => sum + getCardScore(c, config), 0)
```

- [ ] **Step 2: 增加 target score 达到提示**

在 Scoreboard 中增加判断：任意玩家 `scores[idx] >= config.params.targetScore`（且 targetScore > 0）时显示"🏆 达到目标分数！"。

- [ ] **Step 3: 验证编译**

```bash
npx tsc -b --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Scoreboard.tsx
git commit -m "feat: Scoreboard uses GameConfig for scoring and target-score display"
```

---

### Task 13: 回合限时

**Files:**
- Modify: `src/components/GameBoard.tsx`

- [ ] **Step 1: GameBoard 增加回合倒计时 useEffect**

```typescript
const config = useGameStore((s) => s.config)
const turnStartTime = useGameStore((s) => s.turnStartTime)
const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex)
const playCard = useGameStore((s) => s.playCard)
const drawCard = useGameStore((s) => s.drawCard)
const humanPlayer = players[0]
const topCard = discardPile[discardPile.length - 1] ?? null

// Turn timer effect
useEffect(() => {
  if (!config.params.turnTimeLimit || config.params.turnTimeLimit <= 0) return
  if (currentPlayerIndex !== 0) return // only for human
  if (phase !== 'playing' || !humanPlayer) return

  const timeoutMs = config.params.turnTimeLimit * 1000
  const start = turnStartTime ?? Date.now()

  const elapsed = Date.now() - start
  if (elapsed >= timeoutMs) return

  const remaining = timeoutMs - elapsed
  const timer = setTimeout(() => {
    // Auto-action: play any playable card, or draw
    if (!humanPlayer || !topCard) return
    const playable = humanPlayer.hand.filter((c) =>
      canPlayCard(c, topCard, currentColor, humanPlayer.hand)
    )
    if (playable.length > 0) {
      playCard(playable[0].id)
    } else {
      drawCard()
    }
  }, remaining)

  return () => clearTimeout(timer)
}, [config.params.turnTimeLimit, turnStartTime, currentPlayerIndex, phase])

// Show remaining time
const turnTimeLeft = useMemo(() => {
  if (!config.params.turnTimeLimit || currentPlayerIndex !== 0 || !turnStartTime) return 0
  const elapsed = Date.now() - turnStartTime
  return Math.max(0, config.params.turnTimeLimit * 1000 - elapsed)
}, [config.params.turnTimeLimit, turnStartTime, currentPlayerIndex])
```

- [ ] **Step 2: UI 显示倒计时**

在人类玩家回合时，GameInfo 或 PlayerHand 附近显示倒计时：

```typescript
{turnTimeLeft > 0 && currentPlayerIndex === 0 && (
  <div className="text-white/50 text-sm">
    ⏱ {(turnTimeLeft / 1000).toFixed(0)}s
  </div>
)}
```

- [ ] **Step 3: 验证编译**

```bash
npx tsc -b --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/GameBoard.tsx
git commit -m "feat: add turn time limit with auto-action and countdown display"
```

---

### Task 14: 全量集成测试 + 验证

**Files:**
- 验证: 所有文件编译通过
- 验证: 开发服务器启动成功

- [ ] **Step 1: TypeScript 编译验证**

```bash
npx tsc -b --noEmit
```

修复所有出现的类型错误。

- [ ] **Step 2: 启动开发服务器确认 UI 正常**

```bash
npx vite
```

打开浏览器确认：
- `/` 默认路由 → GamePage
- `/settings` → SettingsPage，折叠面板正常展开
- 预设切换按钮工作正常
- 新游戏弹窗出现，配置摘要正确显示

- [ ] **Step 3: Commit 最终修复**

```bash
git add -A
git commit -m "chore: final type fixes and integration polish"
```