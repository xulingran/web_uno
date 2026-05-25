# 摸牌动画复用设计

## 目标

将开局发牌时的飞牌动画（DealAnimator）复用到游戏过程中的摸牌场景，包括人类玩家和 AI 玩家的摸牌、罚抽等所有摸牌行为。动画播放完成后才继续后续游戏逻辑。

## 当前状态

- **DealAnimator** 是可复用的飞牌组件，仅在发牌阶段（`phase === 'dealing'`）使用
- **GameBoard.tsx** 中有约 70 行内联摸牌动画代码，风格与 DealAnimator 相似但参数不同
- **AI 摸牌**（useGameEngine.ts）不设置 `lastDrawEvent`，无任何动画
- 人类摸牌有动画但不阻塞游戏逻辑

## 方案

新建 `useDrawAnimation` hook，与 `useDealAnimation` 平行运作，复用 DealAnimator 组件。通过 `drawAnimating` 状态标志阻塞游戏逻辑，通过 `pendingDrawResolution` 延迟执行回合推进。

### 数据流

```
摸牌触发 (gameStore / useGameEngine)
  → 设置 lastDrawEvent + drawAnimating = true
  → useDrawAnimation 检测到 lastDrawEvent 变化
  → 生成动画队列，逐张传给 DealAnimator
  → 全部完成后调 completeDrawAnimation()
  → completeDrawAnimation 设置 drawAnimating = false
  → 根据 pendingDrawResolution 执行延迟操作
```

## 涉及文件

| 文件 | 改动类型 |
|------|---------|
| `src/hooks/useDrawAnimation.ts` | 新建 |
| `src/utils/types.ts` | 修改（新增 DrawResolution 类型） |
| `src/store/gameStore.ts` | 修改（新增状态 + 修改 drawCard/acceptDraw/advanceTurn + 新增 completeDrawAnimation） |
| `src/components/GameBoard.tsx` | 修改（删内联动画、接入新 hook、加第二个 DealAnimator） |
| `src/hooks/useGameEngine.ts` | 修改（AI 摸牌加动画 + 阻塞逻辑） |

DealAnimator.tsx **不需要改动**。

## 详细设计

### 1. 类型定义（types.ts）

新增 `DrawResolution` 类型，描述动画完成后要执行的操作：

```ts
export type DrawResolution =
  | { type: 'advanceTurn'; skipCount: number }
  | { type: 'setPlayer'; playerIndex: number }
  | null
```

- `advanceTurn`：人类主动摸牌、AI 摸牌后调用 `advanceTurn(skipCount)` 推进回合
- `setPlayer`：`advanceTurn` 内部处理罚抽时已计算好最终玩家索引，动画完成后直接设置

### 2. Store 状态（gameStore.ts）

新增状态：

```ts
drawAnimating: boolean                    // 摸牌动画进行中
pendingDrawResolution: DrawResolution     // 动画完成后要执行的操作
```

初始化值：`drawAnimating: false`，`pendingDrawResolution: null`。

新增 action：`completeDrawAnimation`

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
}
```

### 3. 各摸牌场景的 pendingDrawResolution

| 场景 | 原来的后续操作 | 新的 pendingDrawResolution |
|------|--------------|--------------------------|
| 人类主动摸牌（牌可出） | 无（等玩家操作） | `null` |
| 人类主动摸牌（牌不可出） | `advanceTurn(1)` | `{ type: 'advanceTurn', skipCount: 1 }` |
| 人类接受罚抽 | `advanceTurn(1)` | `{ type: 'advanceTurn', skipCount: 1 }` |
| `advanceTurn` 内罚抽 | 直接设 `currentPlayerIndex` | `{ type: 'setPlayer', playerIndex: afterSkip }` |
| AI 自愿摸牌（牌可出） | 无（等下一轮 AI 出牌） | `null` |
| AI 自愿摸牌（牌不可出） | `advanceTurn(1)` | `{ type: 'advanceTurn', skipCount: 1 }` |
| AI 罚抽 | `advanceTurn(1)` | `{ type: 'advanceTurn', skipCount: 1 }` |

所有场景都需同步设置 `lastDrawEvent` + `drawAnimating: true`。

### 4. useDrawAnimation hook（新建）

接口：

```ts
interface UseDrawAnimationReturn {
  currentDrawItem: DealItem | null
  onDrawAnimationComplete: () => void
}
```

工作流程：

1. 监听 `lastDrawEvent` 变化
2. 检测到新事件时，根据 `cardCount` 生成动画队列（每项为 `DealItem`，card 字段用占位数据——DealAnimator 只用 `playerIndex` 定位目标，不渲染牌面内容）
3. 逐张出队传给 DealAnimator，每张间隔 `dealAnimConfig.cardInterval`
4. 全部完成后调用 `completeDrawAnimation()`

与 `useDealAnimation` 对比：

| | useDealAnimation | useDrawAnimation |
|---|---|---|
| 触发条件 | `phase === 'dealing'` | `lastDrawEvent` 变化 |
| 动画队列来源 | `dealSequence`（预设序列） | `lastDrawEvent.cardCount`（动态生成） |
| 完成后动作 | `addDealtCard` + `completeDealing` | `completeDrawAnimation` |
| 暂停/恢复 | 有（页面隐藏时） | 同样需要 |

### 5. GameBoard.tsx 改动

1. **删除**内联摸牌动画的 `useEffect`（约 70 行）
2. **引入** `useDrawAnimation` hook，解构 `currentDrawItem` 和 `onDrawAnimationComplete`
3. **增加**第二个 DealAnimator 实例（摸牌用），与发牌实例共享 `drawPileRef` 和 `targetRefs`

```tsx
{/* 发牌动画 */}
<DealAnimator
  dealItem={currentDealItem}
  sourceRef={drawPileRef}
  targetRefs={allTargetRefs}
  duration={dealAnimConfig.singleCardDuration}
  easing={dealAnimConfig.easing}
  onComplete={onDealAnimationComplete}
/>

{/* 摸牌动画 */}
<DealAnimator
  dealItem={currentDrawItem}
  sourceRef={drawPileRef}
  targetRefs={allTargetRefs}
  duration={dealAnimConfig.singleCardDuration}
  easing={dealAnimConfig.easing}
  onComplete={onDrawAnimationComplete}
/>
```

4. **交互阻塞**：在 `canDraw` 和 `playableCards` 计算中加入 `!drawAnimating` 条件

### 6. useGameEngine.ts 改动

1. 将 `drawAnimating` 加入 `useEffect` 依赖数组
2. effect 开头增加守卫：`if (drawAnimating) return`
3. AI 自愿摸牌路径：设置 `lastDrawEvent` + `drawAnimating: true`，用 `pendingDrawResolution` 替代直接调 `advanceTurn`
4. AI 罚抽路径：同样加 `lastDrawEvent` + `drawAnimating: true` + `pendingDrawResolution`
5. AI 出牌逻辑不变

## 改动量估算

| 文件 | 改动量 |
|------|--------|
| `types.ts` | +5 行 |
| `useDrawAnimation.ts` | 新建约 80 行 |
| `gameStore.ts` | 修改约 30 行 |
| `GameBoard.tsx` | 净减少约 50 行 |
| `useGameEngine.ts` | 修改约 20 行 |
