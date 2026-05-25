# 摸牌动画复用 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 复用 DealAnimator 飞牌组件实现所有摸牌场景的动画，包括 AI 摸牌，动画完成后才推进游戏逻辑。

**Architecture:** 新建 `useDrawAnimation` hook 与 `useDealAnimation` 平行运作，共享 DealAnimator 组件。通过 `drawAnimating` 状态阻塞游戏逻辑，通过 `pendingDrawResolution` 延迟执行回合推进。

**Tech Stack:** React, TypeScript, Zustand, Vitest

**Design spec:** `docs/superpowers/specs/2026-05-21-draw-card-animation-reuse-design.md`

---

## File Structure

- `src/utils/types.ts`
  责任：补充 `DrawResolution`，作为 store 与动画 hook 之间的延迟回合推进协议。
- `src/store/gameStore.ts`
  责任：统一管理摸牌后的阻塞状态、动画完成回调、以及所有人类摸牌/罚抽路径的延迟推进。
- `src/store/gameStore.test.ts`
  责任：验证 store 在主动摸牌、接受罚抽、罚抽结算、动画完成后的状态流转。
- `src/hooks/useDrawAnimation.ts`
  责任：监听 `lastDrawEvent`，把摸牌事件转换成逐张播放的 `DealItem` 队列，并在全部完成后调用 `completeDrawAnimation()`。
- `src/components/GameBoard.tsx`
  责任：移除内联 DOM 动画，实现与 `DealAnimator` 的复用，阻塞人类在摸牌动画期间的交互。
- `src/components/GameBoard.test.tsx`
  责任：更新 store mock，确保新增状态字段和 action 不会让组件测试失效。
- `src/hooks/useGameEngine.ts`
  责任：让 AI 的主动摸牌、罚抽也走统一动画链路，并在动画期间暂停 AI effect。

---

### Task 1: 新增 DrawResolution 类型

**Files:**
- Modify: `src/utils/types.ts`

- [ ] **Step 1: 在 types.ts 末尾添加 DrawResolution 类型**

在 `src/utils/types.ts` 文件末尾添加：

```ts
export type DrawResolution =
  | { type: 'advanceTurn'; skipCount: number }
  | { type: 'setPlayer'; playerIndex: number }
  | null
```

- [ ] **Step 2: 验证类型无语法错误**

Run: `cd E:/Developing/uno && npx tsc --noEmit src/utils/types.ts`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/utils/types.ts
git commit -m "feat: add DrawResolution type for draw animation"
```

---

### Task 2: 扩展 gameStore 状态和 completeDrawAnimation action

**Files:**
- Modify: `src/store/gameStore.ts`

- [ ] **Step 1: 导入 DrawResolution**

在 `src/store/gameStore.ts` 顶部的 import 中添加 `DrawResolution`：

```ts
import type { Card, CardColor, Direction, GamePhase, Player, DealItem, DealAnimConfig, GameLogEntry, DrawResolution } from '@/utils/types'
```

- [ ] **Step 2: 在 StoreState 接口中添加新状态字段**

在 `StoreState` 接口的 `logEntries` 字段后添加：

```ts
  drawAnimating: boolean
  pendingDrawResolution: DrawResolution
```

- [ ] **Step 3: 在 GameActions 接口中添加 completeDrawAnimation**

在 `GameActions` 接口的 `clearLogs` 后添加：

```ts
  completeDrawAnimation: () => void
```

- [ ] **Step 4: 在 store 初始状态中添加新字段**

在 `create` 回调中，`logEntries: []` 之后添加：

```ts
  drawAnimating: false,
  pendingDrawResolution: null,
```

- [ ] **Step 5: 实现 completeDrawAnimation action**

在 `clearLogs` action 实现之后添加：

```ts
  completeDrawAnimation: () => {
    const state = get()
    const resolution = state.pendingDrawResolution
    set({ drawAnimating: false, pendingDrawResolution: null })
    if (resolution?.type === 'advanceTurn') {
      get().advanceTurn(resolution.skipCount)
    } else if (resolution?.type === 'setPlayer') {
      set({ currentPlayerIndex: resolution.playerIndex })
    }
  },
```

- [ ] **Step 6: 在 initGame 的 set 调用中初始化新字段**

在 `initGame` 的 `set({...})` 调用中，`logEntries: get().logEntries` 之后添加：

```ts
  drawAnimating: false,
  pendingDrawResolution: null,
```

- [ ] **Step 7: 在 startNewGame 的 set 调用中初始化新字段**

在 `startNewGame` 的 `set({...})` 调用中，`pendingInitialTopCard: null` 之后添加：

```ts
  drawAnimating: false,
  pendingDrawResolution: null,
```

- [ ] **Step 8: 验证编译通过**

Run: `cd E:/Developing/uno && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 9: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat: add drawAnimating state and completeDrawAnimation action"
```

---

### Task 3: 修改 gameStore 的 drawCard action

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `src/store/gameStore.test.ts`

`drawCard` 有多条路径需要添加 `drawAnimating: true` 和 `lastDrawEvent`，并用 `pendingDrawResolution` 延迟 `advanceTurn` 调用。

- [ ] **Step 1: 修改 drawCard 中 drawToMatch 路径**

在 `drawCard` 内部 `config.draw.drawToMatch` 分支中，找到最后的 `set({...})` 调用（约 line 623-629），在 set 中添加：

```ts
  drawAnimating: true,
  lastDrawEvent: { playerIndex: state.currentPlayerIndex, cardCount: newHand.length - player.hand.length, timestamp: Date.now() },
```

同时，在该分支末尾找到：

```ts
        if (foundPlayable && drawnCard && canPlayCard(drawnCard, topCard, state.currentColor, newHand)) {
          isDrawing = false
          return
        }
```

在这之后、`isDrawing = false` 之前，将原来的：

```ts
        isDrawing = false
        get().advanceTurn(1)
```

替换为：

```ts
        isDrawing = false
        set({ pendingDrawResolution: { type: 'advanceTurn', skipCount: 1 } })
        return
```

同时在 `foundPlayable` 返回前也加上 `pendingDrawResolution: null`（不需要后续操作）：

```ts
        if (foundPlayable && drawnCard && canPlayCard(drawnCard, topCard, state.currentColor, newHand)) {
          isDrawing = false
          return
        }
```

这段保持不变（`pendingDrawResolution` 默认 `null`，不需要显式设置）。

- [ ] **Step 2: 修改 drawCard 中非 drawToMatch 路径**

在 `drawCard` 内部 else 分支中，找到最后的 `set({...})` 调用（约 line 649-658），在 set 中添加：

```ts
  drawAnimating: true,
  lastDrawEvent: { playerIndex: state.currentPlayerIndex, cardCount: drawn.length, timestamp: Date.now() },
```

然后在该分支末尾，将原来的：

```ts
      isDrawing = false
      get().advanceTurn(1)
```

替换为：

```ts
      isDrawing = false
      set({ pendingDrawResolution: { type: 'advanceTurn', skipCount: 1 } })
      return
```

同样，`canPlayCard` 分支保持原样直接返回（`pendingDrawResolution` 为 `null`）。

- [ ] **Step 3: 修改 drawCard 中 drawPile 为空时的路径**

找到 `actual === 0` 分支：

```ts
        if (actual === 0) {
          isDrawing = false
          get().advanceTurn(1)
          return
        }
```

这个分支没有实际摸牌，不需要动画，保持 `advanceTurn(1)` 不变。

- [ ] **Step 4: 修改 drawCard 最外层的牌堆为空路径**

找到 `currentDrawPile.length === 0` 分支：

```ts
      if (currentDrawPile.length === 0) {
        isDrawing = false
        get().advanceTurn(1)
        return
      }
```

同样没有实际摸牌，保持 `advanceTurn(1)` 不变。

- [ ] **Step 5: 更新 gameStore.test.ts 的 beforeEach**

在 `src/store/gameStore.test.ts` 的 `beforeEach` 中的 `useGameStore.setState({...})` 调用，`colorBeforeWild: null` 之后添加：

```ts
  lastDrawEvent: null,
  drawAnimating: false,
  pendingDrawResolution: null,
```

- [ ] **Step 6: 更新 drawCard 测试 — 无可出牌时抽牌**

找到 `drawCard — 无可出牌时抽牌，手牌增加` 测试。原断言：

```ts
    expect(handLenAfter).toBe(handLenBefore + 1)
```

在后面添加：

```ts
    expect(useGameStore.getState().drawAnimating).toBe(true)
    expect(useGameStore.getState().pendingDrawResolution).toEqual({ type: 'advanceTurn', skipCount: 1 })
```

- [ ] **Step 7: 运行测试验证**

Run: `cd E:/Developing/uno && npx vitest run src/store/gameStore.test.ts`
Expected: 全部 PASS

- [ ] **Step 8: Commit**

```bash
git add src/store/gameStore.ts src/store/gameStore.test.ts
git commit -m "feat: add draw animation blocking to drawCard action"
```

---

### Task 4: 修改 gameStore 的 acceptDraw action

**Files:**
- Modify: `src/store/gameStore.ts`

- [ ] **Step 1: 修改 acceptDraw 中的 set 调用**

在 `acceptDraw` action 中，`if (drawn.length > 0)` 分支的 `set({...})` 中添加 `drawAnimating: true`：

```ts
      set({
        players: newPlayers,
        drawPile: newDrawPile,
        discardPile: newDiscardPile,
        pendingDrawCount: 0,
        drawAnimating: true,
        lastDrawEvent: { playerIndex: state.currentPlayerIndex, cardCount: drawn.length, timestamp: Date.now() },
      })
```

- [ ] **Step 2: 延迟 advanceTurn 调用**

将原来的：

```ts
    get().advanceTurn(1)
```

替换为：

```ts
    set({ pendingDrawResolution: { type: 'advanceTurn', skipCount: 1 } })
```

- [ ] **Step 3: 验证 acceptDraw 测试仍然通过**

Run: `cd E:/Developing/uno && npx vitest run src/store/gameStore.test.ts`
Expected: 全部 PASS（注意：acceptDraw 测试断言 `pendingDrawCount` 为 0 仍然成立，因为 set 中已经设置为 0）

- [ ] **Step 4: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat: add draw animation blocking to acceptDraw action"
```

---

### Task 5: 修改 gameStore 的 advanceTurn — 罚抽路径

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `src/store/gameStore.test.ts`

- [ ] **Step 1: 在 advanceTurn 的罚抽路径中添加动画状态**

在 `advanceTurn` 中 `pendingDrawCount > 0` 分支，找到不能叠加时的 `set({...})` 调用（大约在 `hasStackable` 判断的 else 部分），修改为：

```ts
      set({
        players: newPlayers,
        pendingDrawCount: 0,
        drawPile: newDrawPile,
        discardPile: newDiscardPile,
        cardJustDrawn: null,
        stackingWaiting: false,
        drawAnimating: true,
        lastDrawEvent: { playerIndex: nextIdx, cardCount: drawn.length, timestamp: Date.now() },
        pendingDrawResolution: { type: 'setPlayer', playerIndex: afterSkip },
      })
      return
```

注意：原来的 `currentPlayerIndex: afterSkip` 被移除，改为在 `pendingDrawResolution` 中延迟设置。

- [ ] **Step 2: 更新 Draw2 罚抽测试**

找到 `playCard — 打出 Draw2 后下家摸2张且回合被跳过 (3人局)` 测试。该测试调用 `playCard('red-draw2-0')` 后断言 `currentPlayerIndex` 为 2。

由于 advanceTurn 现在设置了 `drawAnimating: true` 且通过 `pendingDrawResolution` 延迟设置 `currentPlayerIndex`，该测试中 `currentPlayerIndex` 在 playCard 后不会立即变为 2。

修改测试为验证动画状态正确：

```ts
    const state = useGameStore.getState()
    expect(state.players[1].hand.length).toBe(handLenBefore + 2)
    expect(state.pendingDrawCount).toBe(0)
    expect(state.drawAnimating).toBe(true)
    expect(state.pendingDrawResolution).toEqual({ type: 'setPlayer', playerIndex: 2 })
    expect(state.phase).toBe('playing')
```

- [ ] **Step 3: 更新 2 人局 Draw2 测试**

同样修改 `playCard — 打出 Draw2 后下家摸2张且回合被跳过 (2人局)` 测试：

```ts
    const state = useGameStore.getState()
    expect(state.players[1].hand.length).toBe(handLenBefore + 2)
    expect(state.pendingDrawCount).toBe(0)
    expect(state.drawAnimating).toBe(true)
    expect(state.pendingDrawResolution).toEqual({ type: 'setPlayer', playerIndex: 0 })
    expect(state.phase).toBe('playing')
```

- [ ] **Step 4: 更新 Wild4 罚抽测试**

找到 `playCard — 打出 Wild4 后下家摸4张且回合被跳过` 测试。该测试先 `playCard` 进入 `color-picking`，再 `pickColor` 触发 advanceTurn。

修改 `pickColor` 之后的断言：

```ts
    state = useGameStore.getState()
    expect(state.players[1].hand.length).toBe(handLenBefore + 4)
    expect(state.pendingDrawCount).toBe(0)
    expect(state.drawAnimating).toBe(true)
    expect(state.pendingDrawResolution).toEqual({ type: 'setPlayer', playerIndex: 2 })
    expect(state.phase).toBe('playing')
```

- [ ] **Step 5: 运行测试验证**

Run: `cd E:/Developing/uno && npx vitest run src/store/gameStore.test.ts`
Expected: 全部 PASS

- [ ] **Step 6: Commit**

```bash
git add src/store/gameStore.ts src/store/gameStore.test.ts
git commit -m "feat: add draw animation blocking to advanceTurn penalty path"
```

---

### Task 6: 为 completeDrawAnimation 编写测试

**Files:**
- Modify: `src/store/gameStore.test.ts`

- [ ] **Step 1: 编写 completeDrawAnimation — advanceTurn 类型测试**

在 `gameStore.test.ts` 末尾（最后一个 `it` 之后、`})` 之前）添加：

```ts
  it('completeDrawAnimation — advanceTurn 类型，推进回合并清除动画状态', () => {
    useGameStore.setState({
      phase: 'playing',
      drawAnimating: true,
      pendingDrawResolution: { type: 'advanceTurn', skipCount: 1 },
      players: [
        { id: 'p0', name: '你', hand: [{ id: 'red-1', color: 'red', type: 'number', value: 1 }], isHuman: true },
        { id: 'p1', name: '电脑A', hand: [], isHuman: false },
      ],
      currentPlayerIndex: 0,
      direction: 'clockwise',
      config: { ...DEFAULT_CONFIG },
      scores: [0, 0],
    })

    useGameStore.getState().completeDrawAnimation()

    const state = useGameStore.getState()
    expect(state.drawAnimating).toBe(false)
    expect(state.pendingDrawResolution).toBe(null)
    expect(state.currentPlayerIndex).toBe(1)
  })
```

- [ ] **Step 2: 编写 completeDrawAnimation — setPlayer 类型测试**

```ts
  it('completeDrawAnimation — setPlayer 类型，直接设置玩家索引并清除动画状态', () => {
    useGameStore.setState({
      phase: 'playing',
      drawAnimating: true,
      pendingDrawResolution: { type: 'setPlayer', playerIndex: 2 },
      players: [
        { id: 'p0', name: '你', hand: [], isHuman: true },
        { id: 'p1', name: '电脑A', hand: [], isHuman: false },
        { id: 'p2', name: '电脑B', hand: [], isHuman: false },
      ],
      currentPlayerIndex: 1,
      direction: 'clockwise',
      config: { ...DEFAULT_CONFIG },
      scores: [0, 0, 0],
    })

    useGameStore.getState().completeDrawAnimation()

    const state = useGameStore.getState()
    expect(state.drawAnimating).toBe(false)
    expect(state.pendingDrawResolution).toBe(null)
    expect(state.currentPlayerIndex).toBe(2)
  })
```

- [ ] **Step 3: 编写 completeDrawAnimation — null 类型测试**

```ts
  it('completeDrawAnimation — null 类型，仅清除动画状态', () => {
    useGameStore.setState({
      phase: 'playing',
      drawAnimating: true,
      pendingDrawResolution: null,
      players: [
        { id: 'p0', name: '你', hand: [], isHuman: true },
        { id: 'p1', name: '电脑A', hand: [], isHuman: false },
      ],
      currentPlayerIndex: 0,
      direction: 'clockwise',
      config: { ...DEFAULT_CONFIG },
      scores: [0, 0],
    })

    useGameStore.getState().completeDrawAnimation()

    const state = useGameStore.getState()
    expect(state.drawAnimating).toBe(false)
    expect(state.pendingDrawResolution).toBe(null)
    expect(state.currentPlayerIndex).toBe(0)
  })
```

- [ ] **Step 4: 运行测试验证**

Run: `cd E:/Developing/uno && npx vitest run src/store/gameStore.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/gameStore.test.ts
git commit -m "test: add tests for completeDrawAnimation action"
```

---

### Task 7: 创建 useDrawAnimation hook

**Files:**
- Create: `src/hooks/useDrawAnimation.ts`

- [ ] **Step 1: 实现 useDrawAnimation hook**

创建 `src/hooks/useDrawAnimation.ts`：

```ts
import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import type { DealItem } from '@/utils/types'

interface UseDrawAnimationReturn {
  currentDrawItem: DealItem | null
  onDrawAnimationComplete: () => void
}

export function useDrawAnimation(): UseDrawAnimationReturn {
  const lastDrawEvent = useGameStore((s) => s.lastDrawEvent)
  const dealAnimConfig = useGameStore((s) => s.dealAnimConfig)
  const completeDrawAnimation = useGameStore((s) => s.completeDrawAnimation)

  const [currentDrawItem, setCurrentDrawItem] = useState<DealItem | null>(null)
  const [animQueue, setAnimQueue] = useState<DealItem[]>([])
  const [animatingIndex, setAnimatingIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isPausedRef = useRef(false)

  const startNextDrawAnim = useCallback((queue: DealItem[], index: number) => {
    if (index >= queue.length) {
      setAnimQueue([])
      setAnimatingIndex(-1)
      setCurrentDrawItem(null)
      completeDrawAnimation()
      return
    }
    setAnimatingIndex(index)
    setCurrentDrawItem(queue[index])
  }, [completeDrawAnimation])

  const onDrawAnimationComplete = useCallback(() => {
    if (animatingIndex < 0) return

    const nextIndex = animatingIndex + 1
    if (nextIndex >= animQueue.length) {
      setAnimQueue([])
      setAnimatingIndex(-1)
      setCurrentDrawItem(null)
      completeDrawAnimation()
      return
    }

    if (isPausedRef.current) return

    intervalRef.current = setTimeout(() => {
      startNextDrawAnim(animQueue, nextIndex)
    }, dealAnimConfig.cardInterval)
  }, [animatingIndex, animQueue, dealAnimConfig.cardInterval, completeDrawAnimation, startNextDrawAnim])

  useEffect(() => {
    if (!lastDrawEvent) return

    const queue: DealItem[] = []
    for (let i = 0; i < lastDrawEvent.cardCount; i++) {
      queue.push({
        playerIndex: lastDrawEvent.playerIndex,
        card: { id: `draw-anim-${lastDrawEvent.timestamp}-${i}`, color: null, type: 'wild' },
      })
    }

    setAnimQueue(queue)
    startNextDrawAnim(queue, 0)

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastDrawEvent])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPausedRef.current = true
        if (intervalRef.current) clearTimeout(intervalRef.current)
      } else {
        isPausedRef.current = false
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  return {
    currentDrawItem,
    onDrawAnimationComplete,
  }
}
```

- [ ] **Step 2: 验证编译通过**

Run: `cd E:/Developing/uno && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useDrawAnimation.ts
git commit -m "feat: create useDrawAnimation hook"
```

---

### Task 8: 修改 GameBoard.tsx

**Files:**
- Modify: `src/components/GameBoard.tsx`
- Modify: `src/components/GameBoard.test.tsx`

- [ ] **Step 1: 导入 useDrawAnimation**

在 `GameBoard.tsx` 顶部的 import 中添加：

```ts
import { useDrawAnimation } from '@/hooks/useDrawAnimation'
```

- [ ] **Step 2: 解构 hook 和新增 store 字段**

在 `GameBoard` 函数组件中，在 `const { currentDealItem, isDealing, onDealAnimationComplete } = useDealAnimation()` 之后添加：

```ts
  const drawAnimating = useGameStore((s) => s.drawAnimating)
  const { currentDrawItem, onDrawAnimationComplete } = useDrawAnimation()
```

- [ ] **Step 3: 删除内联摸牌动画 useEffect**

删除 `GameBoard.tsx` 中从 `// Draw card animation` 注释开始到对应 `useEffect` 结束的整个块（原文件约 lines 242-310，约 70 行代码）。该 useEffect 以 `}, [lastDrawEvent])` 结尾。

同时删除不再使用的 `lastDrawEvent` store 读取（`const lastDrawEvent = useGameStore((s) => s.lastDrawEvent)` 这一行）。

- [ ] **Step 4: 在交互条件中加入 drawAnimating 守卫**

找到 `canDraw` 变量的定义（约 line 137）：

```ts
const canDraw = isHumanTurn && phase === 'playing' && !isDealing && !hasPlayableCards
```

改为：

```ts
const canDraw = isHumanTurn && phase === 'playing' && !isDealing && !drawAnimating && !hasPlayableCards
```

找到 `playableCards` useMemo 中的条件判断，在 `if (!humanPlayer || !topCard || !isHumanTurn)` 前添加：

```ts
    if (drawAnimating) return new Set<string>()
```

同样对 `stackableCards` 和 `jumpInCards` 的 useMemo 做相同处理，在现有 `if (isDealing)` 守卫旁添加 `if (drawAnimating)` 守卫：

```ts
    if (drawAnimating) return new Set<string>()
```

- [ ] **Step 5: 添加第二个 DealAnimator 实例**

找到文件末尾已有的 DealAnimator 实例，在其后添加第二个实例：

```tsx
      <DealAnimator
        dealItem={currentDrawItem}
        sourceRef={drawPileRef}
        targetRefs={(() => { const m = new Map(aiRefs.current); if (playerHandRef.current) m.set(0, playerHandRef.current); return m })()}
        duration={dealAnimConfig.singleCardDuration}
        easing={dealAnimConfig.easing}
        onComplete={onDrawAnimationComplete}
      />
```

- [ ] **Step 6: 更新 GameBoard.test.tsx 的 mock state**

在 `GameBoard.test.tsx` 的 `mockState` 对象中，`colorBeforeWild: null` 之后添加：

```ts
  lastDrawEvent: null,
  drawAnimating: false,
  pendingDrawResolution: null,
```

同时在 mockState 中添加 `completeDrawAnimation` 和 `pendingUnoAdvance`：

```ts
  pendingUnoAdvance: 0,
  completeDrawAnimation: vi.fn(),
```

- [ ] **Step 7: 运行所有测试验证**

Run: `cd E:/Developing/uno && npx vitest run`
Expected: 全部 PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/GameBoard.tsx src/components/GameBoard.test.tsx
git commit -m "feat: integrate useDrawAnimation into GameBoard, remove inline draw animation"
```

---

### Task 9: 修改 useGameEngine.ts — AI 摸牌加动画

**Files:**
- Modify: `src/hooks/useGameEngine.ts`

- [ ] **Step 1: 添加 drawAnimating 到 effect 依赖和守卫**

在 `useGameEngine` 中，找到 `useEffect` 的依赖数组：

```ts
  }, [currentPlayerIndex, phase, discardPileLength, pendingDrawCount, aiHandLengths, currentColor])
```

在依赖数组前添加新的 store 读取：

```ts
  const drawAnimating = useGameStore((s) => s.drawAnimating)
```

在 effect 内部开头、`if (phase !== 'playing') return` 之后添加：

```ts
    if (drawAnimating) return
```

更新依赖数组，添加 `drawAnimating`：

```ts
  }, [currentPlayerIndex, phase, discardPileLength, pendingDrawCount, aiHandLengths, currentColor, drawAnimating])
```

- [ ] **Step 2: 修改 AI 罚抽路径（pendingDrawCount > 0）**

在 AI 罚抽分支中（约 line 103-125），找到 `drawCards` 后的 `useGameStore.setState({...})`，修改为：

```ts
          useGameStore.setState({
            players: state.players.map((p, i) =>
              i === state.currentPlayerIndex ? { ...p, hand: [...p.hand, ...drawn] } : p
            ),
            drawPile: remaining,
            discardPile: discP,
            pendingDrawCount: 0,
            drawAnimating: true,
            lastDrawEvent: { playerIndex: state.currentPlayerIndex, cardCount: drawn.length, timestamp: Date.now() },
            pendingDrawResolution: { type: 'advanceTurn', skipCount: 1 },
          })
```

删除该分支最后的：

```ts
        useGameStore.getState().advanceTurn(1)
```

（`pendingDrawResolution` 会在动画完成后触发 advanceTurn）

- [ ] **Step 3: 修改 AI 自愿摸牌 — drawToMatch 路径**

在 AI 自愿摸牌的 `drawToMatch` 分支中（约 line 391-430），找到 `useGameStore.setState({...})`（约 line 416-423），添加动画状态：

```ts
        useGameStore.setState({
          players: state.players.map((p, i) =>
            i === state.currentPlayerIndex ? { ...p, hand: newH } : p
          ),
          drawPile: cDrawPile,
          discardPile: cDiscard,
          cardJustDrawn: newH.length > aiPlayer.hand.length ? newH[newH.length - 1] : null,
          drawAnimating: true,
          lastDrawEvent: { playerIndex: state.currentPlayerIndex, cardCount: newH.length - aiPlayer.hand.length, timestamp: Date.now() },
        })
```

在该分支末尾，`forcePlay` 为 true 时加 `pendingDrawResolution: null` 保持不变（直接返回）：

```ts
        if (foundPlayable && cfg.draw.forcePlay && lastPlayableCard) {
          processingRef.current = false
          return
        }
```

将之后的 `advanceTurn(1)` 替换：

```ts
        useGameStore.setState({ pendingDrawResolution: { type: 'advanceTurn', skipCount: 1 } })
```

- [ ] **Step 4: 修改 AI 自愿摸牌 — 非 drawToMatch 路径**

在 else 分支中（约 line 433-463），找到 `useGameStore.setState({...})`（约 line 445-452），添加动画状态：

```ts
          useGameStore.setState({
            players: state.players.map((p, i) =>
              i === state.currentPlayerIndex ? { ...p, hand: newH } : p
            ),
            drawPile: cDrawPile,
            discardPile: cDiscard,
            cardJustDrawn: drawn[drawn.length - 1],
            drawAnimating: true,
            lastDrawEvent: { playerIndex: state.currentPlayerIndex, cardCount: drawn.length, timestamp: Date.now() },
          })
```

同样，`forcePlay` 为 true 时直接返回保持不变。

将最后的 `advanceTurn(1)` 替换：

```ts
          useGameStore.setState({ pendingDrawResolution: { type: 'advanceTurn', skipCount: 1 } })
```

- [ ] **Step 5: 验证编译通过**

Run: `cd E:/Developing/uno && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useGameEngine.ts
git commit -m "feat: add draw animation to AI draw paths in useGameEngine"
```

---

### Task 10: 端到端验证

**Files:** 无修改

- [ ] **Step 1: 运行全部测试**

Run: `cd E:/Developing/uno && npx vitest run`
Expected: 全部 PASS

- [ ] **Step 2: 运行类型检查**

Run: `cd E:/Developing/uno && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 启动开发服务器手动验证**

Run: `cd E:/Developing/uno && npm run dev`

验证以下场景：
1. 开局发牌动画正常（不受影响）
2. 人类玩家摸牌有飞牌动画，动画期间不能操作
3. AI 摸牌有飞牌动画，动画完成后 AI 才继续操作
4. +2 罚抽有动画，动画完成后回合正确推进
5. 连续多张摸牌（如 multiDrawCount > 1）逐张飞出

- [ ] **Step 4: Commit**

```bash
git add src/utils/types.ts src/store/gameStore.ts src/store/gameStore.test.ts src/hooks/useDrawAnimation.ts src/components/GameBoard.tsx src/components/GameBoard.test.tsx src/hooks/useGameEngine.ts
git commit -m "feat: reuse deal animation for draw flows"
```

---

### Task 11: 计划自检与交接

**Files:** 无修改

- [ ] **Step 1: 对照设计文档逐项核对覆盖范围**

检查以下设计要求都已经被任务覆盖：

```text
1. 新建 useDrawAnimation hook，并与 useDealAnimation 平行运行
2. 人类主动摸牌、接受罚抽、advanceTurn 内罚抽都设置 lastDrawEvent
3. AI 主动摸牌、AI 罚抽都设置 lastDrawEvent
4. 动画期间通过 drawAnimating 阻塞交互与 AI effect
5. 动画完成后通过 pendingDrawResolution 才推进回合
6. GameBoard 删除内联动画并接入第二个 DealAnimator
7. 开局发牌动画保持不变
```

Expected: 以上 7 项都能在 Task 1-10 中找到对应实现与验证步骤。

- [ ] **Step 2: 搜索计划中的占位词**

Run: `cd E:/Developing/uno && rg "TODO|TBD|implement later|appropriate error handling|Write tests for the above|Similar to Task" docs/superpowers/plans/2026-05-21-draw-card-animation-reuse.md`
Expected: 无输出

- [ ] **Step 3: 执行前确认关键状态命名一致**

核对以下名字在所有任务中保持一致：

```text
drawAnimating
pendingDrawResolution
completeDrawAnimation
lastDrawEvent
currentDrawItem
onDrawAnimationComplete
```

Expected: 名称一致，没有 `pendingResolution`、`completeAnimation`、`currentAnimationItem` 之类的漂移命名。

- [ ] **Step 4: 实施方式选择**

执行本计划时二选一：

```text
1. Subagent-Driven（推荐）：使用 superpowers:subagent-driven-development，按 Task 逐个派发、逐个 review
2. Inline Execution：使用 superpowers:executing-plans，在当前会话按批次执行并在检查点停下
```
