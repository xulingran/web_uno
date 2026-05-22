# 从牌堆抽取卡牌动画 - 实现计划

## 概述
为玩家从牌堆抽牌的动作添加飞行动画效果，让卡牌从牌堆(DrawPile)位置以动画方式飞入玩家手牌区域。

## 当前状态分析

### 现有代码结构
- **牌堆组件**: `src/components/DrawPile.tsx` - 渲染抽牌堆UI，点击触发 `onDraw` -> `drawCard()`
- **状态管理**: `src/store/gameStore.ts` - `drawCard()` 直接修改 state（从drawPile移除卡牌，添加到玩家手牌），UI 瞬间更新，无动画
- **AI引擎**: `src/hooks/useGameEngine.ts` - AI抽牌同样直接修改 state
- **已有动画参考**: `src/components/GameBoard.tsx` L176-218 的"飞牌出牌动画"（卡牌从AI位置飞到弃牌堆）可以作为模板

### 现有动画系统
- 使用 `requestAnimationFrame` + CSS `transition` 创建临时 DOM 元素实现飞行效果
- `src/index.css` 中已有 `@keyframes slideUp`、`bounce-in` 等动画
- `tailwind.config.js` 中已有 `animate-card-play`、`animate-fade-in` 等

## 实现步骤

### 步骤 1: 在 gameStore 中添加抽牌动画事件状态

**文件**: `src/store/gameStore.ts`

- 在 `StoreState` 接口中添加新字段:
  ```typescript
  lastDrawEvent: { playerIndex: number; cardCount: number; timestamp: number } | null
  ```
- 在初始状态中将 `lastDrawEvent` 初始化为 `null`
- 在 `startNewGame` 的重置逻辑中也重置为 `null`
- 在 `drawCard()` 方法中，给玩家手牌添加卡牌后，设置 `lastDrawEvent`:
  ```typescript
  lastDrawEvent: { 
    playerIndex: state.currentPlayerIndex, 
    cardCount: drawn.length, 
    timestamp: Date.now() 
  }
  ```
- 在 `acceptDraw()` 方法中，给玩家手牌添加卡牌后，同样设置 `lastDrawEvent`

### 步骤 2: 给 DrawPile 和 PlayerHand 添加 DOM ref 支持

**文件**: `src/components/DrawPile.tsx`

- 使用 `React.forwardRef` 包装 DrawPile 组件，将 ref 转发到最外层的 `<div>`
- 导出时将 `DrawPile` 改为 `forwardRef` 版本

**文件**: `src/components/PlayerHand.tsx`

- 使用 `React.forwardRef` 包装 PlayerHand 组件，将 ref 转发到卡牌容器 `<div>`
- 导出时将 `PlayerHand` 改为 `forwardRef` 版本

### 步骤 3: 在 GameBoard 中实现从牌堆到玩家手牌的飞行动画

**文件**: `src/components/GameBoard.tsx`

- 从 store 中读取 `lastDrawEvent`
- 添加 `drawPileRef` 和 `playerHandRef` 两个 ref
- 将 ref 传递给 `<DrawPile>` 和 `<PlayerHand>` 组件
- 新增一个 `useEffect`，监听 `lastDrawEvent`：
  - 当 `lastDrawEvent` 不为 null 且有变化时触发
  - 获取 DrawPile DOM 元素和玩家手牌区域 DOM 元素的位置
  - 对于每张被抽取的卡牌（根据 `cardCount`），创建一个临时 DOM 元素（模拟卡牌背面外观）
  - 临时元素样式与 CardBack 一致（红色渐变 + 金色边框）
  - 使用 `requestAnimationFrame` 将卡牌从 DrawPile 位置动画移动到 PlayerHand 位置
  - 动画参数：
    - 持续时间：约 500ms
    - 缓动函数：`ease-out` 或自定义贝塞尔曲线
    - 动画属性：`left`、`top`、`opacity`、`transform`
    - 可以添加轻微的旋转或缩放效果让动画更生动
  - 动画结束后清除临时 DOM 元素

### 步骤 4: 为 AI 玩家的抽牌动画添加参考点

**文件**: `src/components/GameBoard.tsx`

- 复用现有的 `aiRefs` 来获取 AI 玩家的位置
- 当 `lastDrawEvent.playerIndex !== 0`（即 AI 玩家抽牌）时:
  - 从 `aiRefs` 获取对应 AI 玩家的 DOM 元素位置
  - 从 DrawPile 位置创建飞行动画到 AI 玩家位置
  - AI 玩家的飞行动画可以稍微简单一些（更快的持续时间，约 350ms）

### 步骤 5: 优化动画细节

**文件**: `src/index.css`

- 可选：添加新的 `@keyframes` 动画定义用于抽牌飞入效果
  - `card-draw-fly`: 模拟卡牌从牌堆飞出的曲线轨迹
  - `card-draw-land`: 卡牌到达手牌后的轻微弹跳

**文件**: `src/components/GameBoard.tsx`

- 优化点：
  1. 多张卡牌时分批延迟飞出（每张间隔约 80-120ms），避免全部同时飞出
  2. 飞出的卡牌可以带有轻微的旋转（例如 ±5deg 随机）以模拟真实感
  3. 在飞行过程中卡牌从不透明度 1 开始，到达时略微闪烁
  4. 目标位置加入轻微随机偏移，模拟手牌中卡牌的自然排列

## 技术实现要点

### 飞行动画 DOM 元素创建（参考现有出牌动画）
```typescript
const flyEl = document.createElement('div')
flyEl.style.position = 'fixed'
flyEl.style.width = '90px'
flyEl.style.height = '135px'
flyEl.style.borderRadius = '10px'
flyEl.style.background = 'linear-gradient(135deg, #c62828 0%, #d32f2f 50%, #b71c1c 100%)'
flyEl.style.border = '3px solid #ffcc00'
flyEl.style.zIndex = '9999'
flyEl.style.pointerEvents = 'none'
flyEl.style.transition = 'all 500ms ease-out'
flyEl.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5)'
// ...设置初始位置为 DrawPile 位置
document.body.appendChild(flyEl)
// ...在 requestAnimationFrame 中设置目标位置
```

### 动画时序
1. 从 DrawPile 飞出: 500ms (ease-out)
2. 多张卡牌时每张延迟: 100ms
3. 动画总时长（最多5张牌）: 500 + 100*4 = 900ms

## 影响范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/store/gameStore.ts` | 新增字段 | 添加 `lastDrawEvent` 状态 |
| `src/components/DrawPile.tsx` | 修改 | 改用 `forwardRef` 暴露 DOM ref |
| `src/components/PlayerHand.tsx` | 修改 | 改用 `forwardRef` 暴露 DOM ref |
| `src/components/GameBoard.tsx` | 新增逻辑 | 添加抽牌飞行动画 useEffect |
| `src/index.css` | 可选新增 | 可选的抽牌动画 keyframes |