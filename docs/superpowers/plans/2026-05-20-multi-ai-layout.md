# 多 AI 环绕式布局与游玩体验优化 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 支持动态数量的 AI 玩家（1-5 个）环绕式布局显示，并增加出牌飞行动画、特殊牌提示、回合过渡等视觉反馈。

**Architecture:** 用 Zone Grid 布局替代硬编码的左右 AI 显示，根据 AI 数量动态分配到顶部/左/右区域。AI 手牌改为扇形展开的牌背。通过 gameStore 新增 `lastPlayedBy` 和 `lastActionEffect` 状态驱动飞行动画和特殊牌提示。

**Tech Stack:** React 18 + TypeScript + Zustand + Tailwind CSS + Vite

---

## 文件变更清单

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/index.css` | 修改 | 新增动画 keyframes |
| `src/utils/layout.ts` | 创建 | AI 玩家区域分配算法 |
| `src/components/CardBack.tsx` | 修改 | 新增 `small` 和 `size` prop |
| `src/store/gameStore.ts` | 修改 | 新增 `lastPlayedBy`、`lastActionEffect` 状态 |
| `src/hooks/useGameEngine.ts` | 修改 | AI 出牌时设置 `lastPlayedBy` 和 `lastActionEffect` |
| `src/components/AIHand.tsx` | 重写 | 扇形展开、三方向位置支持 |
| `src/components/GameBoard.tsx` | 重写 | Grid 布局、动态 AI 渲染、飞行动画、效果提示 |

---

### Task 1: CSS 动画 Keyframes

**Files:**
- Modify: `src/index.css` (追加到文件末尾)

- [ ] **Step 1: 在 `src/index.css` 末尾追加动画 keyframes**

在文件末尾追加以下内容：

```css
@keyframes pulse-glow {
  0% { box-shadow: 0 0 8px rgba(255, 204, 0, 0.6); }
  50% { box-shadow: 0 0 24px rgba(255, 204, 0, 0.9); }
  100% { box-shadow: 0 0 8px rgba(255, 204, 0, 0.6); }
}

.animate-pulse-glow {
  animation: pulse-glow 0.3s ease-in-out;
}

@keyframes bounce-in {
  0% { transform: translateY(0); }
  40% { transform: translateY(-4px); }
  100% { transform: translateY(0); }
}

.animate-bounce-in {
  animation: bounce-in 0.2s ease-out;
}

@keyframes action-flash {
  0% { opacity: 0.6; }
  100% { opacity: 0; }
}

.animate-action-flash {
  animation: action-flash 0.3s ease-out forwards;
}

@keyframes action-text-pop {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 0; }
}

.animate-action-text {
  animation: action-text-pop 0.6s ease-out forwards;
}

@keyframes turn-indicator {
  0% { box-shadow: 0 0 0 0 rgba(255, 204, 0, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(255, 204, 0, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 204, 0, 0); }
}

.animate-turn-indicator {
  animation: turn-indicator 0.3s ease-out;
}
```

- [ ] **Step 2: 验证构建通过**

Run: `cd /e/Developing/uno && npx vite build 2>&1 | tail -5`
Expected: 构建成功，无错误

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add animation keyframes for game feedback"
```

---

### Task 2: 布局工具函数 `distributeAIPlayers`

**Files:**
- Create: `src/utils/layout.ts`

- [ ] **Step 1: 创建 `src/utils/layout.ts`**

```typescript
export interface AIPlayerDistribution {
  top: number[]
  left: number | null
  right: number | null
}

export function distributeAIPlayers(count: number): AIPlayerDistribution {
  if (count <= 0) return { top: [], left: null, right: null }
  if (count === 1) return { top: [1], left: null, right: null }

  const top: number[] = []
  for (let i = 2; i < count; i++) {
    top.push(i)
  }

  return {
    top,
    left: 1,
    right: count,
  }
}
```

分配规则验证：
- count=1: `{ top: [1], left: null, right: null }`
- count=2: `{ top: [], left: 1, right: 2 }`
- count=3: `{ top: [2], left: 1, right: 3 }`
- count=4: `{ top: [2, 3], left: 1, right: 4 }`
- count=5: `{ top: [2, 3, 4], left: 1, right: 5 }`

- [ ] **Step 2: 验证 TypeScript 编译通过**

Run: `cd /e/Developing/uno && npx tsc --noEmit 2>&1 | head -10`
Expected: 无错误（或仅有与本次改动无关的已有错误）

- [ ] **Step 3: Commit**

```bash
git add src/utils/layout.ts
git commit -m "feat: add distributeAIPlayers layout utility"
```

---

### Task 3: CardBack 组件增加尺寸支持

**Files:**
- Modify: `src/components/CardBack.tsx`

当前 `CardBack` 只有默认尺寸 (90x135)。需要新增 `size` prop 支持不同区域使用不同尺寸。

- [ ] **Step 1: 修改 `src/components/CardBack.tsx`**

替换整个文件内容为：

```tsx
interface CardBackProps {
  count?: number
  size?: 'normal' | 'top' | 'side'
}

const sizeStyles: Record<string, { width: number; height: number; innerScale: number; fontSize: string }> = {
  normal: { width: 90, height: 135, innerScale: 1, fontSize: '28px' },
  top: { width: 70, height: 105, innerScale: 0.78, fontSize: '22px' },
  side: { width: 60, height: 90, innerScale: 0.67, fontSize: '18px' },
}

export default function CardBack({ count, size = 'normal' }: CardBackProps) {
  const s = sizeStyles[size]

  return (
    <div
      className="relative flex-shrink-0"
      style={{
        width: `${s.width}px`,
        height: `${s.height}px`,
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #c62828 0%, #d32f2f 50%, #b71c1c 100%)',
        border: '3px solid #ffcc00',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div
        style={{
          width: `${75 * s.innerScale}%`,
          height: `${80 * s.innerScale}%`,
          borderRadius: '50%',
          border: '3px solid #ffcc00',
          background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          className="font-game"
          style={{ color: '#ffcc00', fontSize: s.fontSize, textShadow: '2px 2px 0 #000' }}
        >
          UNO
        </span>
      </div>
      {count !== undefined && (
        <div
          className="absolute bg-white text-black rounded-full flex items-center justify-center font-bold border-2 border-[#ffcc00] shadow-md"
          style={{ width: '24px', height: '24px', fontSize: '11px', bottom: '-4px', right: '-4px' }}
        >
          {count}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

Run: `cd /e/Developing/uno && npx tsc --noEmit 2>&1 | head -10`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/components/CardBack.tsx
git commit -m "feat: add size prop to CardBack component"
```

---

### Task 4: gameStore 状态扩展

**Files:**
- Modify: `src/store/gameStore.ts`

在 store 中新增 `lastPlayedBy` 和 `lastActionEffect` 状态，用于驱动飞行动画和特殊牌提示。

- [ ] **Step 1: 在 `StoreState` 接口中新增字段（约第 18 行附近）**

在 `turnStartTime: number | null` 之后追加：

```typescript
  lastPlayedBy: { playerIndex: number; cardId: string } | null
  lastActionEffect: { type: string; color?: string; timestamp: number } | null
```

- [ ] **Step 2: 在初始 state 中添加默认值（约第 113 行 `turnStartTime: null` 之后）**

追加：

```typescript
  lastPlayedBy: null,
  lastActionEffect: null,
```

- [ ] **Step 3: 在 `initGame` 的 `set({...})` 调用中（约第 133 行）追加重置字段**

在 `turnStartTime: config.params.turnTimeLimit > 0 ? Date.now() : null,` 之后追加：

```typescript
      lastPlayedBy: null,
      lastActionEffect: null,
```

- [ ] **Step 4: 在 `startNewGame` 的 `set({...})` 调用中（约第 489 行）追加重置字段**

在 `turnStartTime: null,` 之后追加：

```typescript
      lastPlayedBy: null,
      lastActionEffect: null,
```

- [ ] **Step 5: 在 `playCard` action 中，找到 `const effect = getActionEffect(card)` 这一行（约第 214 行），在其后追加效果状态设置**

在 `const effect = getActionEffect(card)` 之后追加：

```typescript
    const actionEffectType = getCardActionEffectType(card)
    if (actionEffectType) {
      baseUpdate.lastActionEffect = { ...actionEffectType, timestamp: Date.now() }
    }
    baseUpdate.lastPlayedBy = { playerIndex: state.currentPlayerIndex, cardId: card.id }
```

- [ ] **Step 6: 在文件顶部 import 区域之后、`StoreState` 之前，添加辅助函数**

在 `interface StoreState {` 之前追加：

```typescript
function getCardActionEffectType(card: Card): { type: string; color?: string } | null {
  switch (card.type) {
    case 'draw2': return { type: 'draw2', color: card.color ?? undefined }
    case 'wild4': return { type: 'wild4' }
    case 'skip': return { type: 'skip', color: card.color ?? undefined }
    case 'reverse': return { type: 'reverse', color: card.color ?? undefined }
    default: return null
  }
}
```

- [ ] **Step 7: 验证 TypeScript 编译通过**

Run: `cd /e/Developing/uno && npx tsc --noEmit 2>&1 | head -10`
Expected: 无错误

- [ ] **Step 8: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat: add lastPlayedBy and lastActionEffect to game store"
```

---

### Task 5: useGameEngine 设置动画状态

**Files:**
- Modify: `src/hooks/useGameEngine.ts`

AI 出牌时需要设置 `lastPlayedBy` 和 `lastActionEffect`。useGameEngine 中有多个出牌路径需要逐一添加。

- [ ] **Step 1: 在文件顶部 import 之后，`useGameEngine` 函数之前，添加辅助函数**

```typescript
function getCardActionEffectType(card: { type: string; color?: string | null }): { type: string; color?: string } | null {
  switch (card.type) {
    case 'draw2': return { type: 'draw2', color: card.color ?? undefined }
    case 'wild4': return { type: 'wild4' }
    case 'skip': return { type: 'skip', color: card.color ?? undefined }
    case 'reverse': return { type: 'reverse', color: card.color ?? undefined }
    default: return null
  }
}
```

- [ ] **Step 2: 在 stacking 出牌路径（约第 54-61 行的 `useGameStore.setState` 调用）中添加状态**

将第 54 行的 `useGameStore.setState({` 改为包含新字段：

```typescript
          useGameStore.setState({
            players: state.players.map((p, i) =>
              i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
            ),
            discardPile: [...state.discardPile, stackCard],
            pendingDrawCount: state.pendingDrawCount + 2,
            cardJustDrawn: null,
            lastPlayedBy: { playerIndex: state.currentPlayerIndex, cardId: stackCard.id },
            ...(getCardActionEffectType(stackCard) ? {
              lastActionEffect: { ...getCardActionEffectType(stackCard)!, timestamp: Date.now() }
            } : {}),
          })
```

- [ ] **Step 3: 在正常出牌路径中，找到 `useGameStore.setState({` 设置 `unoCalledPlayer` 的那个调用（约第 238 行），添加新字段**

在 `unoCalledPlayer: unoCalled,` 之后追加：

```typescript
            lastPlayedBy: { playerIndex: state.currentPlayerIndex, cardId: card.id },
            ...(actionEffectType ? {
              lastActionEffect: { ...actionEffectType, timestamp: Date.now() }
            } : {}),
```

并在该 `useGameStore.setState` 调用之前（`let unoCalled` 那一行之前），添加：

```typescript
        const actionEffectType = getCardActionEffectType(card)
```

- [ ] **Step 4: 在 color-pick 路径（约第 201-218 行）的 `useGameStore.setState` 调用中添加字段**

在该 `setState` 的 `currentColor: chosenColor,` 之后追加：

```typescript
            lastPlayedBy: { playerIndex: state.currentPlayerIndex, cardId: card.id },
            ...(getCardActionEffectType(card) ? {
              lastActionEffect: { ...getCardActionEffectType(card)!, timestamp: Date.now() }
            } : {}),
```

- [ ] **Step 5: 在 wild4 challenge 失败路径（约第 155 行）和成功路径（约第 165 行）中也添加 `lastPlayedBy`**

在第 155 行的 `useGameStore.setState({` 中，在 `cardJustDrawn: null,` 后追加：

```typescript
                  lastPlayedBy: { playerIndex: state.currentPlayerIndex, cardId: card.id },
```

在第 165 行的 `useGameStore.setState({` 中，在 `pendingDrawCount: 6,` 后追加：

```typescript
                  lastPlayedBy: { playerIndex: state.currentPlayerIndex, cardId: card.id },
                  lastActionEffect: { type: 'wild4', timestamp: Date.now() },
```

- [ ] **Step 6: 验证 TypeScript 编译通过**

Run: `cd /e/Developing/uno && npx tsc --noEmit 2>&1 | head -10`
Expected: 无错误

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useGameEngine.ts
git commit -m "feat: set lastPlayedBy and lastActionEffect in AI play paths"
```

---

### Task 6: AIHand 组件重写（扇形展开）

**Files:**
- Rewrite: `src/components/AIHand.tsx`

将固定的 3 张叠放牌背改为扇形展开，支持三个位置方向。

- [ ] **Step 1: 重写 `src/components/AIHand.tsx`**

替换整个文件：

```tsx
import type { Player } from '@/utils/types'
import CardBack from './CardBack'

interface AIHandProps {
  player: Player
  isCurrentTurn: boolean
  position: 'top' | 'left' | 'right'
}

function FanCards({ count, size }: { count: number; size: 'top' | 'side' }) {
  if (count === 0) return null

  const maxAngle = 180
  const stepAngle = Math.min(15, maxAngle / Math.max(count, 1))

  return (
    <div className="relative" style={{ width: size === 'top' ? 70 : 60, height: size === 'top' ? 105 : 90 }}>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i - (count - 1) / 2) * stepAngle
        const isEnd = i === count - 1
        return (
          <div
            key={i}
            className="absolute left-1/2"
            style={{
              bottom: 0,
              transformOrigin: 'bottom center',
              transform: `translateX(-50%) rotate(${angle}deg)`,
              zIndex: isEnd ? count : i,
            }}
          >
            <CardBack size={size} />
          </div>
        )
      })}
    </div>
  )
}

export default function AIHand({ player, isCurrentTurn, position }: AIHandProps) {
  const isSide = position === 'left' || position === 'right'
  const rotation = position === 'left' ? -90 : position === 'right' ? 90 : 0
  const cardSize = isSide ? 'side' : 'top'
  const maxDisplay = isSide ? 7 : 10
  const displayCount = Math.min(player.hand.length, maxDisplay)

  const content = (
    <div className={`flex flex-col items-center gap-2 ${isCurrentTurn ? 'animate-pulse-glow rounded-xl p-1' : ''}`}>
      <div
        className={`px-3 py-1 rounded-lg font-game text-sm transition-all duration-300 ${
          isCurrentTurn
            ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/50 scale-110'
            : 'bg-white/10 text-white/80'
        }`}
      >
        {player.name} · {player.hand.length}张
      </div>
      <FanCards count={displayCount} size={cardSize} />
    </div>
  )

  if (isSide) {
    return (
      <div style={{ transform: `rotate(${rotation}deg)` }}>
        {content}
      </div>
    )
  }

  return content
}
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

Run: `cd /e/Developing/uno && npx tsc --noEmit 2>&1 | head -10`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/components/AIHand.tsx
git commit -m "feat: rewrite AIHand with fan spread and position support"
```

---

### Task 7: GameBoard 重构（Grid 布局 + 动画效果）

**Files:**
- Rewrite: `src/components/GameBoard.tsx`

这是最大的改动。将硬编码的两 AI 布局改为动态 Zone Grid，并集成飞行动画和特殊牌提示。

- [ ] **Step 1: 重写 `src/components/GameBoard.tsx`**

替换整个文件：

```tsx
import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { canPlayCard } from '@/utils/rules'
import { distributeAIPlayers } from '@/utils/layout'
import PlayerHand from './PlayerHand'
import AIHand from './AIHand'
import DiscardPile from './DiscardPile'
import DrawPile from './DrawPile'
import ColorPicker from './ColorPicker'
import GameInfo from './GameInfo'
import UNOCall from './UNOCall'
import Scoreboard from './Scoreboard'
import NewGameModal from './NewGameModal'
import UNOModal from './UNOModal'
import Card from './Card'

const actionLabels: Record<string, string> = {
  draw2: '+2!',
  wild4: '+4!',
  skip: '禁止!',
  reverse: '反转!',
}

const actionColors: Record<string, string> = {
  draw2: '#E53935',
  wild4: '#333',
  skip: '#FF9800',
  reverse: '#9C27B0',
}

export default function GameBoard() {
  const navigate = useNavigate()
  const players = useGameStore((s) => s.players)
  const discardPile = useGameStore((s) => s.discardPile)
  const drawPile = useGameStore((s) => s.drawPile)
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex)
  const direction = useGameStore((s) => s.direction)
  const currentColor = useGameStore((s) => s.currentColor)
  const phase = useGameStore((s) => s.phase)
  const winner = useGameStore((s) => s.winner)
  const scores = useGameStore((s) => s.scores)
  const cardJustDrawn = useGameStore((s) => s.cardJustDrawn)
  const pendingDrawCount = useGameStore((s) => s.pendingDrawCount)
  const config = useGameStore((s) => s.config)
  const unoCalledPlayer = useGameStore((s) => s.unoCalledPlayer)
  const turnStartTime = useGameStore((s) => s.turnStartTime)
  const lastPlayedBy = useGameStore((s) => s.lastPlayedBy)
  const lastActionEffect = useGameStore((s) => s.lastActionEffect)

  const playCard = useGameStore((s) => s.playCard)
  const drawCard = useGameStore((s) => s.drawCard)
  const pickColor = useGameStore((s) => s.pickColor)
  const startNewGame = useGameStore((s) => s.startNewGame)
  const initGame = useGameStore((s) => s.initGame)
  const acceptDraw = useGameStore((s) => s.acceptDraw)

  const [showNewGameModal, setShowNewGameModal] = useState(false)
  const [unoNeedsConfirm, setUnoNeedsConfirm] = useState(false)
  const [actionOverlay, setActionOverlay] = useState<{ type: string; color?: string } | null>(null)
  const [discardBounce, setDiscardBounce] = useState(false)

  const aiRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const discardPileRef = useRef<HTMLDivElement>(null)

  const humanPlayer = players[0]
  const aiCount = players.length - 1
  const distribution = useMemo(() => distributeAIPlayers(aiCount), [aiCount])
  const isHumanTurn = currentPlayerIndex === 0
  const currentPlayer = players[currentPlayerIndex]
  const topCard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null

  const playableCards = useMemo(() => {
    if (!humanPlayer || !topCard || !isHumanTurn) return new Set<string>()

    const playable = new Set<string>()
    for (const card of humanPlayer.hand) {
      if (canPlayCard(card, topCard, currentColor, humanPlayer.hand)) {
        playable.add(card.id)
      }
    }

    if (cardJustDrawn && canPlayCard(cardJustDrawn, topCard, currentColor, humanPlayer.hand)) {
      playable.add(cardJustDrawn.id)
    }

    return playable
  }, [humanPlayer, topCard, currentColor, isHumanTurn, cardJustDrawn])

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

  const hasPlayableCards = playableCards.size > 0
  const canDraw = isHumanTurn && phase === 'playing' && !hasPlayableCards
  const showUNO = humanPlayer ? humanPlayer.hand.length === 1 : false

  const prevHandLen = useRef(humanPlayer?.hand.length ?? 0)

  useEffect(() => {
    if (!humanPlayer || phase !== 'playing') return
    const currentLen = humanPlayer.hand.length
    if (prevHandLen.current === 2 && currentLen === 1) {
      if (config.uno.requireUNOCall && unoCalledPlayer === null) {
        setUnoNeedsConfirm(true)
      }
    }
    prevHandLen.current = currentLen
  }, [humanPlayer?.hand.length, phase, config.uno.requireUNOCall, unoCalledPlayer])

  const turnTimeLeft = useMemo(() => {
    if (!config.params.turnTimeLimit || currentPlayerIndex !== 0 || !turnStartTime) return 0
    return Math.max(0, config.params.turnTimeLimit * 1000 - (Date.now() - turnStartTime))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.params.turnTimeLimit, turnStartTime, currentPlayerIndex, phase])

  useEffect(() => {
    if (!config.params.turnTimeLimit || config.params.turnTimeLimit <= 0) return
    if (currentPlayerIndex !== 0) return
    if (phase !== 'playing' || !humanPlayer) return

    const timeoutMs = config.params.turnTimeLimit * 1000
    const start = turnStartTime ?? Date.now()
    const elapsed = Date.now() - start
    if (elapsed >= timeoutMs) return

    const remaining = timeoutMs - elapsed
    const timer = setTimeout(() => {
      const state = useGameStore.getState()
      if (state.currentPlayerIndex !== 0 || state.phase !== 'playing') return
      const hp = state.players[0]
      if (!hp) return
      const tCard = state.discardPile[state.discardPile.length - 1]
      if (!tCard) return
      const playable = hp.hand.filter((c) => canPlayCard(c, tCard, state.currentColor, hp.hand))
      if (playable.length > 0) {
        useGameStore.getState().playCard(playable[0].id)
      } else {
        useGameStore.getState().drawCard()
      }
    }, remaining)

    return () => clearTimeout(timer)
  }, [config.params.turnTimeLimit, turnStartTime, currentPlayerIndex, phase, humanPlayer])

  // Flying card animation
  useEffect(() => {
    if (!lastPlayedBy) return

    const sourceEl = aiRefs.current.get(lastPlayedBy.playerIndex)
    const targetEl = discardPileRef.current
    if (!sourceEl || !targetEl) return

    const sourceRect = sourceEl.getBoundingClientRect()
    const targetRect = targetEl.getBoundingClientRect()

    const flyEl = document.createElement('div')
    flyEl.style.position = 'fixed'
    flyEl.style.left = `${sourceRect.left + sourceRect.width / 2 - 35}px`
    flyEl.style.top = `${sourceRect.top + sourceRect.height / 2 - 52}px`
    flyEl.style.width = '70px'
    flyEl.style.height = '105px'
    flyEl.style.borderRadius = '10px'
    flyEl.style.background = 'linear-gradient(135deg, #c62828 0%, #d32f2f 50%, #b71c1c 100%)'
    flyEl.style.border = '3px solid #ffcc00'
    flyEl.style.zIndex = '9999'
    flyEl.style.pointerEvents = 'none'
    flyEl.style.transition = 'all 400ms ease-out'
    flyEl.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5)'
    document.body.appendChild(flyEl)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        flyEl.style.left = `${targetRect.left + targetRect.width / 2 - 35}px`
        flyEl.style.top = `${targetRect.top + targetRect.height / 2 - 52}px`
        flyEl.style.opacity = '0.7'
        flyEl.style.transform = 'scale(0.8)'
      })
    })

    const removeTimer = setTimeout(() => flyEl.remove(), 450)
    const bounceTimer = setTimeout(() => setDiscardBounce(true), 400)

    return () => {
      clearTimeout(removeTimer)
      clearTimeout(bounceTimer)
    }
  }, [lastPlayedBy])

  useEffect(() => {
    if (discardBounce) {
      const t = setTimeout(() => setDiscardBounce(false), 200)
      return () => clearTimeout(t)
    }
  }, [discardBounce])

  // Action effect overlay
  useEffect(() => {
    if (!lastActionEffect) return
    setActionOverlay({ type: lastActionEffect.type, color: lastActionEffect.color })
    const timer = setTimeout(() => setActionOverlay(null), 600)
    return () => clearTimeout(timer)
  }, [lastActionEffect])

  // Previous player index for turn transition animation
  const prevPlayerIndex = useRef(currentPlayerIndex)
  const [turnTransition, setTurnTransition] = useState<number | null>(null)

  useEffect(() => {
    if (prevPlayerIndex.current !== currentPlayerIndex) {
      setTurnTransition(currentPlayerIndex)
      const t = setTimeout(() => setTurnTransition(null), 300)
      prevPlayerIndex.current = currentPlayerIndex
      return () => clearTimeout(t)
    }
  }, [currentPlayerIndex])

  const setAIRef = useCallback((playerIndex: number, el: HTMLDivElement | null) => {
    if (el) aiRefs.current.set(playerIndex, el)
    else aiRefs.current.delete(playerIndex)
  }, [])

  if (phase === 'idle') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-uno-dark">
        <div
          className="font-game text-7xl"
          style={{
            color: '#ffcc00',
            textShadow: '4px 4px 0 #c62828, 8px 8px 0 rgba(0,0,0,0.3)',
          }}
        >
          UNO
        </div>
        <button
          onClick={() => setShowNewGameModal(true)}
          className="px-10 py-4 rounded-2xl bg-yellow-400 text-black font-game text-2xl shadow-xl hover:bg-yellow-300 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          开始游戏
        </button>
        <NewGameModal
          visible={showNewGameModal}
          onStart={() => {
            setShowNewGameModal(false)
            initGame()
          }}
          onCancel={() => setShowNewGameModal(false)}
        />
      </div>
    )
  }

  const leftPlayer = distribution.left !== null ? players[distribution.left] : null
  const rightPlayer = distribution.right !== null ? players[distribution.right] : null
  const topPlayers = distribution.top.map((idx) => players[idx]).filter(Boolean)

  return (
    <div className="w-full h-full flex flex-col bg-uno-dark relative overflow-hidden">
      {/* Top: GameInfo */}
      <div className="flex justify-center pt-3 pb-1 relative">
        <GameInfo
          direction={direction}
          currentColor={currentColor}
          currentPlayerName={currentPlayer?.name ?? ''}
        />
        <button
          onClick={() => navigate('/settings')}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
          title="设置"
        >
          <Settings size={22} />
        </button>
      </div>

      {/* Turn timer */}
      {turnTimeLeft > 0 && currentPlayerIndex === 0 && (
        <div className="text-center text-white/50 text-sm">
          ⏱ {Math.ceil(turnTimeLeft / 1000)}s
        </div>
      )}

      {/* Top AI row */}
      {topPlayers.length > 0 && (
        <div className="flex justify-center gap-6 py-2 px-4">
          {topPlayers.map((p) => {
            const idx = players.indexOf(p)
            return (
              <div
                key={p.id}
                ref={(el) => setAIRef(idx, el)}
                className={turnTransition === idx ? 'animate-turn-indicator' : ''}
              >
                <AIHand
                  player={p}
                  isCurrentTurn={currentPlayerIndex === idx}
                  position="top"
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Middle row: Left AI | Center piles | Right AI */}
      <div className="flex-1 flex items-stretch min-h-0">
        {/* Left AI */}
        <div className={`flex items-center justify-center ${leftPlayer ? 'w-28' : 'w-4'} flex-shrink-0`}>
          {leftPlayer && (() => {
            const idx = distribution.left!
            return (
              <div
                ref={(el) => setAIRef(idx, el)}
                className={turnTransition === idx ? 'animate-turn-indicator' : ''}
              >
                <AIHand
                  player={leftPlayer}
                  isCurrentTurn={currentPlayerIndex === idx}
                  position="left"
                />
              </div>
            )
          })()}
        </div>

        {/* Center: Draw pile + Discard pile */}
        <div className="flex-1 flex items-center justify-center relative">
          <div className="flex items-center gap-12">
            <DrawPile
              count={drawPile.length}
              onDraw={drawCard}
              canDraw={canDraw && pendingDrawCount <= 0}
            />
            <div ref={discardPileRef} className={discardBounce ? 'animate-bounce-in' : ''}>
              <DiscardPile
                topCard={topCard}
                currentColor={currentColor}
              />
            </div>
          </div>

          {/* Action effect flash overlay */}
          {actionOverlay && (
            <div
              className="absolute inset-0 pointer-events-none flex items-center justify-center"
              style={{ zIndex: 50 }}
            >
              <div
                className="absolute inset-0 animate-action-flash"
                style={{ backgroundColor: actionOverlay.color ?? actionColors[actionOverlay.type] ?? '#E53935', opacity: 0.3 }}
              />
              <div
                className="relative font-game text-5xl text-white animate-action-text"
                style={{
                  textShadow: '3px 3px 0 #000, 6px 6px 0 rgba(0,0,0,0.3)',
                  zIndex: 51,
                }}
              >
                {actionLabels[actionOverlay.type] ?? ''}
              </div>
            </div>
          )}
        </div>

        {/* Right AI */}
        <div className={`flex items-center justify-center ${rightPlayer ? 'w-28' : 'w-4'} flex-shrink-0`}>
          {rightPlayer && (() => {
            const idx = distribution.right!
            return (
              <div
                ref={(el) => setAIRef(idx, el)}
                className={turnTransition === idx ? 'animate-turn-indicator' : ''}
              >
                <AIHand
                  player={rightPlayer}
                  isCurrentTurn={currentPlayerIndex === idx}
                  position="right"
                />
              </div>
            )
          })()}
        </div>
      </div>

      {/* Pending draw button */}
      {pendingDrawCount > 0 && isHumanTurn && (
        <div className="flex justify-center pb-2">
          <button
            onClick={() => acceptDraw()}
            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 font-game text-sm hover:bg-red-500/30 transition-all"
          >
            接受罚抽 ({pendingDrawCount}张)
          </button>
        </div>
      )}

      {/* Bottom: Human hand */}
      <div className="flex justify-center pb-6 px-4">
        {humanPlayer && (
          <PlayerHand
            cards={humanPlayer.hand}
            onPlayCard={(id) => playCard(id)}
            playableCards={playableCards}
            stackableCards={stackableCards}
            jumpInCards={jumpInCards}
            isCurrentTurn={isHumanTurn}
          />
        )}
      </div>

      <ColorPicker
        visible={phase === 'color-picking'}
        onPickColor={pickColor}
      />

      <UNOCall
        visible={showUNO && phase === 'playing' && !unoNeedsConfirm}
        playerName={humanPlayer?.name ?? ''}
      />

      <UNOModal
        visible={unoNeedsConfirm}
        onConfirm={() => {
          setUnoNeedsConfirm(false)
          useGameStore.setState({ unoCalledPlayer: 'p0' })
        }}
      />

      <Scoreboard
        visible={phase === 'round-over'}
        players={players}
        scores={scores}
        winner={winner}
        onNewGame={() => setShowNewGameModal(true)}
      />

      <NewGameModal
        visible={showNewGameModal}
        onStart={() => {
          setShowNewGameModal(false)
          startNewGame()
        }}
        onCancel={() => setShowNewGameModal(false)}
      />
    </div>
  )
}
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

Run: `cd /e/Developing/uno && npx tsc --noEmit 2>&1 | head -10`
Expected: 无错误

- [ ] **Step 3: 验证 Vite 开发服务器启动正常**

Run: `cd /e/Developing/uno && timeout 10 npx vite --host 2>&1 || true`
Expected: 看到 `Local: http://localhost:5173/` 之类的输出

- [ ] **Step 4: 手动测试各 AI 数量**

在浏览器中打开游戏，分别设置 AI 数量为 1、2、3、4、5，确认：
- 1 AI: 显示在顶部居中
- 2 AI: 左右各一个
- 3 AI: 顶部 1 + 左右各 1
- 4 AI: 顶部 2 + 左右各 1
- 5 AI: 顶部 3 + 左右各 1
- AI 出牌时有飞行动画
- 特殊牌（+2、+4、禁止、反转）有闪烁提示和文字
- 回合切换有平滑过渡
- 弃牌堆有弹跳效果

- [ ] **Step 5: Commit**

```bash
git add src/components/GameBoard.tsx
git commit -m "feat: dynamic zone grid layout with flying animation and action effects"
```

---

### Task 8: 最终验证与清理

- [ ] **Step 1: 运行 TypeScript 类型检查**

Run: `cd /e/Developing/uno && npx tsc --noEmit 2>&1`
Expected: 无错误

- [ ] **Step 2: 运行 ESLint**

Run: `cd /e/Developing/uno && npx eslint src/ 2>&1 | head -20`
Expected: 无新增 lint 错误

- [ ] **Step 3: 运行 Vite 构建确认生产构建通过**

Run: `cd /e/Developing/uno && npx vite build 2>&1 | tail -10`
Expected: 构建成功

- [ ] **Step 4: 最终 Commit**

```bash
git add -A
git commit -m "feat: complete multi-AI layout with visual feedback"
```
