# UNO 前端响应式布局体系重构 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 UNO 卡牌游戏的响应式布局体系，解决 12 个排版问题（含设置页溢出无法滚动）。

**Architecture:** 通过 CSS 变量 + clamp() 实现卡牌尺寸自适应，GameBoard 改用 CSS Grid 布局，各页面独立控制滚动策略，弹窗统一响应式规范。所有改动集中在 CSS/Tailwind 层面和 JSX 结构，不涉及游戏业务逻辑。

**Tech Stack:** React 18 + TypeScript + Tailwind CSS 3 + Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-05-21-responsive-layout-design.md`

---

## Task 1: 修复全局 overflow + 添加卡牌 CSS 变量

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: 修改 index.css — 移除全局 overflow:hidden，添加卡牌 CSS 变量**

将 `src/index.css` 中 `html, body, #root` 规则从 `overflow: hidden` 改为只在 `html, body` 上保留 `overflow: hidden`，`#root` 只保留 `height/width`。然后在 `:root` 中添加卡牌 CSS 变量。同时将 `.uno-card` 和 `.uno-card-back` 的硬编码尺寸改为 CSS 变量。

完整替换 `src/index.css`：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

#root {
  height: 100%;
  width: 100%;
}

:root {
  --card-w: clamp(60px, 8vw, 90px);
  --card-h: clamp(90px, 12vw, 135px);
  --card-radius: clamp(6px, 0.8vw, 10px);
  --card-font-sm: clamp(10px, 1.2vw, 14px);
  --card-font-lg: clamp(24px, 3vw, 36px);
  --card-font-symbol: clamp(20px, 2.4vw, 28px);
  --card-border: clamp(2px, 0.3vw, 4px);
}

body {
  font-family: 'Fredoka One', cursive, sans-serif;
  background: radial-gradient(ellipse at center, #2d5a2d 0%, #1a3a1a 40%, #0d1f0d 100%);
  color: #ffffff;
}

.uno-card {
  width: var(--card-w);
  height: var(--card-h);
  border-radius: var(--card-radius);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  user-select: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.uno-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
}

.uno-card.playable {
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
}

.uno-card.not-playable {
  opacity: 0.5;
  cursor: not-allowed;
}

.uno-card.not-playable:hover {
  transform: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.uno-card-back {
  width: var(--card-w);
  height: var(--card-h);
  border-radius: var(--card-radius);
  background: linear-gradient(135deg, #c62828 0%, #d32f2f 50%, #b71c1c 100%);
  border: 3px solid #ffcc00;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.uno-card-back::after {
  content: 'UNO';
  font-family: 'Fredoka One', cursive;
  font-size: var(--card-font-symbol);
  color: #ffcc00;
  text-shadow: 2px 2px 0 #000;
  transform: rotate(-15deg);
}

.uno-card-back-inner {
  width: 75%;
  height: 80%;
  border-radius: 50%;
  border: 3px solid #ffcc00;
  background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
}

.card-corner {
  position: absolute;
  font-weight: bold;
  font-size: var(--card-font-sm);
}

.card-corner.top-left {
  top: 4px;
  left: 6px;
}

.card-corner.bottom-right {
  bottom: 4px;
  right: 6px;
  transform: rotate(180deg);
}

.card-center {
  font-weight: bold;
  font-size: var(--card-font-lg);
}

.card-center-symbol {
  font-size: var(--card-font-symbol);
  text-align: center;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slideUp 0.4s ease-out;
}

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

- [ ] **Step 2: 运行现有测试确认没有破坏**

Run: `cd /e/Developing/uno && npx vitest run`
Expected: 所有测试通过（CSS 变量是渐进式替换，组件 inline style 覆盖 CSS class 的宽度/高度暂时不受影响）

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "refactor(css): remove global overflow:hidden, add card CSS variables with clamp()"
```

---

## Task 2: Card 组件使用 CSS 变量

**Files:**
- Modify: `src/components/Card.tsx`

- [ ] **Step 1: 修改 Card.tsx — 移除硬编码尺寸，使用 CSS 变量**

将 `Card` 组件的 `small` prop 的 inline style 尺寸替换为基于 CSS 变量的计算。移除 `w-[60px] h-[90px]` 硬编码的 small 模式，改为通过 CSS 变量缩放。

修改 `src/components/Card.tsx` 的 `CornerContent` 函数——移除硬编码的 size class：

```tsx
function CornerContent({ card, small }: { card: CardType; small?: boolean }) {
  const sizeClass = small ? 'card-corner-sm' : ''
```

修改 `CenterContent` 函数——移除硬编码的 size class：

```tsx
function CenterContent({ card, small }: { card: CardType; small?: boolean }) {
```

将 number card 的 `numberSize` 和 `symbolSize` 改为使用 CSS class 而非 inline class：

```tsx
function CenterContent({ card, small }: { card: CardType; small?: boolean }) {
  switch (card.type) {
    case 'number':
      return (
        <div className={`card-center ${small ? 'card-center-sm' : ''}`} style={{ color: colorMap[card.color!] }}>
          {card.value}
        </div>
      )
    case 'skip':
      return (
        <div className={`card-center-symbol ${small ? 'card-center-symbol-sm' : ''}`} style={{ color: colorMap[card.color!] }}>
          &#8856;
        </div>
      )
    case 'reverse':
      return (
        <div className={`card-center-symbol ${small ? 'card-center-symbol-sm' : ''}`} style={{ color: colorMap[card.color!] }}>
          &#10226;
        </div>
      )
    case 'draw2':
      return (
        <div className={`card-center ${small ? 'card-center-sm' : ''}`} style={{ color: colorMap[card.color!] }}>
          +2
        </div>
      )
    case 'wild':
      return (
        <div className={`relative ${small ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-10 h-10 sm:w-14 sm:h-14'}`}>
          <svg viewBox="0 0 56 56" className="w-full h-full">
            <defs>
              <clipPath id={`wild-clip-${card.id}`}>
                <circle cx="28" cy="28" r="26" />
              </clipPath>
            </defs>
            <g clipPath={`url(#wild-clip-${card.id})`}>
              <rect x="0" y="0" width="28" height="28" fill={colorMap.red} />
              <rect x="28" y="0" width="28" height="28" fill={colorMap.blue} />
              <rect x="0" y="28" width="28" height="28" fill={colorMap.yellow} />
              <rect x="28" y="28" width="28" height="28" fill={colorMap.green} />
            </g>
            <circle cx="28" cy="28" r="26" fill="none" stroke="#fff" strokeWidth="3" />
          </svg>
        </div>
      )
    case 'wild4':
      return (
        <div className={`relative ${small ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-10 h-10 sm:w-14 sm:h-14'}`}>
          <svg viewBox="0 0 56 56" className="w-full h-full">
            <defs>
              <clipPath id={`wild4-clip-${card.id}`}>
                <circle cx="28" cy="28" r="26" />
              </clipPath>
            </defs>
            <g clipPath={`url(#wild4-clip-${card.id})`}>
              <rect x="0" y="0" width="28" height="28" fill={colorMap.red} />
              <rect x="28" y="0" width="28" height="28" fill={colorMap.blue} />
              <rect x="0" y="28" width="28" height="28" fill={colorMap.yellow} />
              <rect x="28" y="28" width="28" height="28" fill={colorMap.green} />
            </g>
            <circle cx="28" cy="28" r="26" fill="none" stroke="#fff" strokeWidth="3" />
          </svg>
          <div
            className="absolute inset-0 flex items-center justify-center font-bold text-white"
            style={{ fontSize: small ? 'clamp(8px, 1vw, 12px)' : 'clamp(10px, 1.3vw, 16px)', textShadow: '1px 1px 2px #000' }}
          >
            +4
          </div>
        </div>
      )
    default:
      return null
  }
}
```

修改主 `Card` 组件——移除 `w-[60px] h-[90px]` 硬编码 small size，让 `.uno-card` CSS class 的 CSS 变量控制尺寸：

```tsx
export default function Card({ card, playable, onClick, small }: CardProps) {
  const isWild = card.type === 'wild' || card.type === 'wild4'
  const borderColor = isWild ? '#333' : colorMap[card.color!]
  const bgColor = isWild ? '#333' : '#fff'
  const textColor = isWild ? 'text-white' : ''

  const sizeClass = small ? 'uno-card-small' : ''
  const playableClass = playable ? 'playable' : 'not-playable'

  return (
    <div
      className={`uno-card ${playableClass} ${sizeClass} ${textColor} bg-white flex-shrink-0`}
      style={{
        border: `${small ? 2 : 4}px solid ${borderColor}`,
        backgroundColor: bgColor,
      }}
      onClick={onClick}
    >
      <CornerContent card={card} small={small} />
      <CenterContent card={card} small={small} />
    </div>
  )
}
```

然后在 `src/index.css` 中添加 small card 的样式（在 `.uno-card` 规则之后）：

```css
.uno-card-small {
  width: calc(var(--card-w) * 0.67);
  height: calc(var(--card-h) * 0.67);
  border-radius: calc(var(--card-radius) * 0.8);
}

.card-corner-sm {
  font-size: clamp(8px, 0.9vw, 10px) !important;
}

.card-center-sm {
  font-size: clamp(18px, 2.2vw, 24px) !important;
}

.card-center-symbol-sm {
  font-size: clamp(14px, 1.7vw, 20px) !important;
}
```

- [ ] **Step 2: 运行测试**

Run: `cd /e/Developing/uno && npx vitest run src/components/Card.test.tsx`
Expected: PASS — Card 组件的 DOM 结构和文字内容不变

- [ ] **Step 3: Commit**

```bash
git add src/components/Card.tsx src/index.css
git commit -m "refactor(Card): use CSS variables for card sizes, add small card styles"
```

---

## Task 3: CardBack 组件使用 CSS 变量

**Files:**
- Modify: `src/components/CardBack.tsx`

- [ ] **Step 1: 修改 CardBack.tsx — 使用 CSS 变量替代硬编码尺寸**

替换 `CardBack.tsx` 的全部内容：

```tsx
interface CardBackProps {
  count?: number
  size?: 'normal' | 'top' | 'side'
}

export default function CardBack({ count, size = 'normal' }: CardBackProps) {
  const sizeClass = size === 'normal' ? '' : size === 'top' ? 'uno-card-back-top' : 'uno-card-back-side'

  return (
    <div
      className={`uno-card-back ${sizeClass} relative flex-shrink-0`}
    >
      <div className="uno-card-back-inner">
        <span className="font-game uno-card-back-label">
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

然后在 `src/index.css` 中添加 CardBack 尺寸变体样式（在 `.uno-card-back-inner` 之后）：

```css
.uno-card-back-top {
  width: calc(var(--card-w) * 0.78);
  height: calc(var(--card-h) * 0.78);
  border-width: 2px;
}

.uno-card-back-top .uno-card-back-inner {
  font-size: clamp(16px, 2vw, 22px);
}

.uno-card-back-top .uno-card-back-label {
  font-size: clamp(14px, 1.7vw, 22px);
}

.uno-card-back-side {
  width: calc(var(--card-w) * 0.67);
  height: calc(var(--card-h) * 0.67);
  border-width: 2px;
}

.uno-card-back-side .uno-card-back-label {
  font-size: clamp(12px, 1.4vw, 18px);
}
```

同时移除 `.uno-card-back::after` 规则（不再使用伪元素显示 UNO 文字，改为组件内的 span）。

- [ ] **Step 2: 运行测试**

Run: `cd /e/Developing/uno && npx vitest run src/components/CardBack.test.tsx`
Expected: PASS — CardBack 渲染逻辑不变

- [ ] **Step 3: Commit**

```bash
git add src/components/CardBack.tsx src/index.css
git commit -m "refactor(CardBack): use CSS variables for card back sizes"
```

---

## Task 4: DiscardPile + DrawPile 适配 CSS 变量

**Files:**
- Modify: `src/components/DiscardPile.tsx`
- Modify: `src/components/DrawPile.tsx`

- [ ] **Step 1: 修改 DiscardPile.tsx — 容器尺寸跟随卡牌变量**

将 `DiscardPile.tsx` 中硬编码的 `w-[98px] h-[143px]` 和 `w-[90px] h-[135px]` 替换：

```tsx
export default function DiscardPile({ topCard, currentColor }: DiscardPileProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="discard-pile-slot">
        {topCard ? (
          <Card card={topCard} playable={false} />
        ) : (
          <div className="discard-pile-empty">
            <span className="text-white/40 text-sm">空</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 bg-black/30 rounded-full">
        <div
          className="w-4 h-4 rounded-full border border-white/30"
          style={{ backgroundColor: colorMap[currentColor] }}
        />
        <span className="text-xs text-white/80 font-game">
          {colorNameMap[currentColor]}
        </span>
      </div>
    </div>
  )
}
```

在 `src/index.css` 中添加：

```css
.discard-pile-slot {
  width: calc(var(--card-w) + 8px);
  height: calc(var(--card-h) + 8px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.discard-pile-empty {
  width: var(--card-w);
  height: var(--card-h);
  border-radius: var(--card-radius);
  border: 2px dashed rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 2: 修改 DrawPile.tsx — 堆叠偏移跟随卡牌变量**

`DrawPile.tsx` 的 `top-[3px] left-[3px]` 和 `top-[6px] left-[6px]` 是堆叠效果偏移，改为 CSS class。其余逻辑不变。修改后：

```tsx
const DrawPile = forwardRef<HTMLDivElement, DrawPileProps>(function DrawPile({ count, onDraw, canDraw }, ref) {
  return (
    <div ref={ref} className="flex flex-col items-center gap-2">
      <div
        className={`draw-pile-stack relative transition-all duration-200 ${canDraw ? 'cursor-pointer hover:scale-105' : ''}`}
        onClick={canDraw ? onDraw : undefined}
      >
        <div style={{ zIndex: 2 }}>
          <CardBack count={count} />
        </div>
        <div className="draw-pile-offset-1 absolute" style={{ zIndex: 1 }}>
          <CardBack />
        </div>
        <div className="draw-pile-offset-2 absolute" style={{ zIndex: 0 }}>
          <CardBack />
        </div>
      </div>
      <div className={`text-sm font-game px-3 py-1 rounded-full transition-all duration-200 ${
        canDraw
          ? 'bg-white/20 text-white cursor-pointer hover:bg-white/30'
          : 'text-white/40'
      }`}
        onClick={canDraw ? onDraw : undefined}
      >
        {canDraw ? '点击抽牌' : '等待中...'}
      </div>
    </div>
  )
})
```

在 `src/index.css` 中添加：

```css
.draw-pile-offset-1 {
  top: 3px;
  left: 3px;
}

.draw-pile-offset-2 {
  top: 6px;
  left: 6px;
}
```

- [ ] **Step 3: 运行测试**

Run: `cd /e/Developing/uno && npx vitest run src/components/DiscardPile.test.tsx src/components/DrawPile.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/DiscardPile.tsx src/components/DrawPile.tsx src/index.css
git commit -m "refactor(DiscardPile, DrawPile): use CSS variable-based sizing"
```

---

## Task 5: AIHand 组件适配

**Files:**
- Modify: `src/components/AIHand.tsx`

- [ ] **Step 1: 修改 AIHand.tsx — FanCards 容器跟随 CSS 变量**

将 `FanCards` 中硬编码的容器尺寸（`width: size === 'top' ? 70 : 60, height: size === 'top' ? 105 : 90`）改为 CSS class 控制。修改后：

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

  const containerClass = size === 'top' ? 'fan-cards-top' : 'fan-cards-side'

  return (
    <div className={`relative ${containerClass}`}>
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

在 `src/index.css` 中添加：

```css
.fan-cards-top {
  width: calc(var(--card-w) * 0.78);
  height: calc(var(--card-h) * 0.78);
}

.fan-cards-side {
  width: calc(var(--card-w) * 0.67);
  height: calc(var(--card-h) * 0.67);
}
```

- [ ] **Step 2: 运行测试**

Run: `cd /e/Developing/uno && npx vitest run`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/AIHand.tsx src/index.css
git commit -m "refactor(AIHand): use CSS variables for fan card container sizes"
```

---

## Task 6: GameBoard 改用 CSS Grid 布局

**Files:**
- Modify: `src/components/GameBoard.tsx`

- [ ] **Step 1: 修改 GameBoard.tsx 的 JSX 返回部分 — Flex 改 Grid**

这是最大的改动。将游戏状态下（非 idle）的 JSX 结构从嵌套 Flexbox 改为 CSS Grid。

修改 idle 状态的返回不变。修改游戏状态的返回部分，将根 div 的 className 从 `w-full h-full flex flex-col bg-uno-dark relative overflow-hidden` 改为 Grid 布局。

只修改 `return (` 之后、`<ColorPicker` 之前的那个大 JSX 块。关键改动点：

1. 根 div：`className="game-board w-full h-full bg-uno-dark relative overflow-hidden"`
2. GameInfo 行：加 `style={{ gridColumn: '1 / -1' }}`
3. Turn timer 行：加 `style={{ gridColumn: '1 / -1' }}`
4. 顶部 AI 行：加 `style={{ gridColumn: '1 / -1' }}`
5. 中间行（左AI/中央/右AI）：去掉外层 flex wrapper，三个区域各自成为 Grid cell
6. 左 AI div：去掉 `w-28` 固定宽度，改为 `className="flex items-center justify-center p-2"`
7. 中央牌堆 div：保留 `flex-1` 的效果通过 Grid 的 `1fr` 实现
8. 右 AI div：同左 AI
9. 玩家手牌行：加 `style={{ gridColumn: '1 / -1' }}`

在 `src/index.css` 中添加：

```css
.game-board {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto auto 1fr auto;
  row-gap: 0;
  column-gap: 0;
}
```

GameBoard.tsx 游戏状态的 return 部分改为：

```tsx
  return (
    <div className="game-board w-full h-full bg-uno-dark relative overflow-hidden">
      {/* Row 1: GameInfo */}
      <div className="flex justify-center pt-3 pb-1 relative" style={{ gridColumn: '1 / -1' }}>
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

      {/* Row 2: Turn timer (conditional) */}
      {turnTimeLeft > 0 && currentPlayerIndex === 0 && (
        <div className="text-center text-white/50 text-sm" style={{ gridColumn: '1 / -1' }}>
          ⏱ {Math.ceil(turnTimeLeft / 1000)}s
        </div>
      )}

      {/* Row 2/3: Top AI row */}
      {topPlayers.length > 0 && (
        <div className="flex justify-center gap-3 sm:gap-6 py-2 px-4" style={{ gridColumn: '1 / -1' }}>
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

      {/* Row 3: Left AI */}
      <div className={`flex items-center justify-center ${leftPlayer ? 'p-2' : ''}`}>
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

      {/* Row 3: Center piles */}
      <div className="flex items-center justify-center relative">
        <div className="flex items-center gap-6 sm:gap-12">
          <DrawPile
            ref={drawPileRef}
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

      {/* Row 3: Right AI */}
      <div className={`flex items-center justify-center ${rightPlayer ? 'p-2' : ''}`}>
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

      {/* Row 4: Pending draw button (conditional) */}
      {pendingDrawCount > 0 && isHumanTurn && (
        <div className="flex justify-center pb-2" style={{ gridColumn: '1 / -1' }}>
          <button
            onClick={() => acceptDraw()}
            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 font-game text-sm hover:bg-red-500/30 transition-all"
          >
            接受罚抽 ({pendingDrawCount}张)
          </button>
        </div>
      )}

      {/* Row 4: Skip after draw button (conditional) */}
      {cardJustDrawn && !config.draw.forcePlay && isHumanTurn && (
        <div className="flex justify-center pb-2" style={{ gridColumn: '1 / -1' }}>
          <button
            onClick={() => advanceTurn(1)}
            className="px-4 py-2 rounded-lg bg-white/10 text-white/60 font-game text-sm hover:bg-white/20 hover:text-white/90 transition-all"
          >
            跳过
          </button>
        </div>
      )}

      {/* Row 4: Bottom: Human hand */}
      <div className="flex justify-center pb-4 sm:pb-6 px-2 sm:px-4" style={{ gridColumn: '1 / -1' }}>
        {humanPlayer && (
          <PlayerHand
            ref={playerHandRef}
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
        visible={unoNeedsConfirm || phase === 'uno-call'}
        onConfirm={() => {
          setUnoNeedsConfirm(false)
          resolveUno(true)
        }}
        onTimeout={() => {
          setUnoNeedsConfirm(false)
          resolveUno(false)
        }}
      />

      <ChallengeModal
        visible={phase === 'challenge'}
        onChallenge={() => resolveChallenge(true)}
        onAccept={() => resolveChallenge(false)}
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
```

- [ ] **Step 2: 运行测试**

Run: `cd /e/Developing/uno && npx vitest run src/components/GameBoard.test.tsx`
Expected: PASS — GameBoard 的渲染测试不检查具体布局 class

- [ ] **Step 3: Commit**

```bash
git add src/components/GameBoard.tsx src/index.css
git commit -m "refactor(GameBoard): replace nested Flexbox with CSS Grid layout"
```

---

## Task 7: PlayerHand 叠放策略

**Files:**
- Modify: `src/components/PlayerHand.tsx`

- [ ] **Step 1: 修改 PlayerHand.tsx — 添加动态负 margin 叠放**

替换 `PlayerHand.tsx` 的全部内容：

```tsx
import { forwardRef, useMemo } from 'react'
import type { Card as CardType } from '@/utils/types'
import Card from './Card'

interface PlayerHandProps {
  cards: CardType[]
  onPlayCard: (id: string) => void
  playableCards: Set<string>
  stackableCards?: Set<string>
  jumpInCards?: Set<string>
  isCurrentTurn: boolean
}

const CARD_WIDTH_PX = 90 // max card width from CSS variable upper bound
const MIN_OVERLAP_PX = 4

const PlayerHand = forwardRef<HTMLDivElement, PlayerHandProps>(function PlayerHand({ cards, onPlayCard, playableCards, stackableCards, jumpInCards, isCurrentTurn }, ref) {
  const overlap = useMemo(() => {
    if (typeof window === 'undefined' || cards.length <= 1) return 0
    const containerWidth = window.innerWidth * 0.92
    const totalWidth = cards.length * CARD_WIDTH_PX
    if (totalWidth <= containerWidth) return 0
    return Math.min(
      CARD_WIDTH_PX - MIN_OVERLAP_PX,
      Math.max(0, (totalWidth - containerWidth) / (cards.length - 1))
    )
  }, [cards.length])

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-[95vw]">
      {isCurrentTurn && (
        <div className="text-yellow-300 font-game text-base sm:text-lg animate-pulse">
          轮到你了！
        </div>
      )}
      <div ref={ref} className="w-full overflow-x-auto flex items-end justify-center px-2 sm:px-4 py-1">
        {cards.map((card, index) => {
          const isPlayable = playableCards.has(card.id)
          const isStackable = stackableCards?.has(card.id) ?? false
          const isJumpIn = jumpInCards?.has(card.id) ?? false
          const playable = (isCurrentTurn || isJumpIn) && (isPlayable || isStackable || isJumpIn)

          let extraClass = ''
          if (isStackable) {
            extraClass = 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-transparent'
          } else if (isJumpIn) {
            extraClass = 'ring-2 ring-green-400 ring-offset-2 ring-offset-transparent animate-uno-pulse'
          }

          return (
            <div
              key={card.id}
              className={`flex-shrink-0 hover:z-50 hover:-translate-y-2 ${playable ? 'animate-slide-up' : ''} ${extraClass}`}
              style={{
                zIndex: index,
                marginLeft: index === 0 ? 0 : -overlap,
                transition: 'margin-left 0.2s ease, transform 0.2s ease',
              }}
            >
              <Card
                card={card}
                playable={playable}
                onClick={playable ? () => onPlayCard(card.id) : undefined}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default PlayerHand
```

- [ ] **Step 2: 运行测试**

Run: `cd /e/Developing/uno && npx vitest run`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/PlayerHand.tsx
git commit -m "feat(PlayerHand): add dynamic card overlap for responsive hand layout"
```

---

## Task 8: GameInfo 信息栏适配

**Files:**
- Modify: `src/components/GameInfo.tsx`

- [ ] **Step 1: 修改 GameInfo.tsx — 添加 flex-wrap 和响应式间距**

替换 `GameInfo.tsx` 的 return 部分：

```tsx
export default function GameInfo({ direction, currentColor, currentPlayerName }: GameInfoProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-1 px-3 sm:px-6 py-2.5 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 font-game text-sm">
      <div className="flex items-center gap-1.5 text-white/80">
        <span className="text-base">
          {direction === 'clockwise' ? '↻' : '↺'}
        </span>
        <span>
          {direction === 'clockwise' ? '顺时针' : '逆时针'}
        </span>
      </div>

      <div className="w-px h-5 bg-white/20 hidden sm:block" />

      <div className="flex items-center gap-1.5">
        <div
          className="w-3.5 h-3.5 rounded-full border border-white/30"
          style={{ backgroundColor: colorMap[currentColor] }}
        />
        <span className="text-white/80">
          当前色: {colorNameMap[currentColor]}
        </span>
      </div>

      <div className="w-px h-5 bg-white/20 hidden sm:block" />

      <div className="text-white/80">
        当前回合: <span className="text-yellow-300">{currentPlayerName}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 运行测试**

Run: `cd /e/Developing/uno && npx vitest run src/components/GameInfo.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/GameInfo.tsx
git commit -m "refactor(GameInfo): add flex-wrap and responsive spacing"
```

---

## Task 9: SettingsPage 滚动修复 + SettingsPanel 响应式

**Files:**
- Modify: `src/components/SettingsPage.tsx`
- Modify: `src/components/SettingsPanel.tsx`

- [ ] **Step 1: 修改 SettingsPage.tsx — 修复滚动**

替换 `SettingsPage.tsx` 全部内容：

```tsx
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import SettingsPanel from './SettingsPanel'

export default function SettingsPage() {
  const navigate = useNavigate()

  return (
    <div className="h-screen bg-uno-dark flex flex-col overflow-y-auto">
      <header className="flex-shrink-0 flex items-center gap-4 px-4 sm:px-6 py-4 border-b border-white/10">
        <button
          onClick={() => navigate('/')}
          className="text-white/60 hover:text-white/90 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-game text-xl sm:text-2xl text-white">游戏设置</h1>
      </header>

      <div className="flex-1 px-4 sm:px-6 py-6">
        <SettingsPanel />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 修改 SettingsPanel.tsx — 宽度响应式 + 间距优化**

在 SettingsPanel.tsx 中，只修改非 compact 模式的 return 部分的根 div className：

将 `className="flex flex-col gap-4 max-w-lg mx-auto"` 改为 `className="flex flex-col gap-5 sm:gap-6 max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto"`

将分组 div 的 `border border-white/10` 改为 `border border-white/15`。

将折叠按钮的 `py-3` 改为 `py-3.5`。

将 `renderToggle` 和 `renderNumber` 中的 `py-2` 改为 `py-2.5`。

这些是局部替换，不改变任何逻辑。

- [ ] **Step 3: 运行测试**

Run: `cd /e/Developing/uno && npx vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/SettingsPage.tsx src/components/SettingsPanel.tsx
git commit -m "fix(SettingsPage): enable scrolling, responsive panel width and spacing"
```

---

## Task 10: NewGameModal 响应式改造

**Files:**
- Modify: `src/components/NewGameModal.tsx`

- [ ] **Step 1: 修改 NewGameModal.tsx — 添加 flex-wrap 和 max-h**

将内容容器的 className 从 `min-w-[360px] max-w-[420px] max-h-[80vh] overflow-y-auto` 改为 `min-w-[280px] sm:min-w-[360px] max-w-[90vw] sm:max-w-[420px] max-h-[85vh] overflow-y-auto`。

将底部按钮区域的 `gap-3` 改为 `gap-3 sm:gap-4`。

这些是 className 局部替换。

- [ ] **Step 2: 运行测试**

Run: `cd /e/Developing/uno && npx vitest run`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/NewGameModal.tsx
git commit -m "refactor(NewGameModal): add responsive sizing and overflow handling"
```

---

## Task 11: ColorPicker 响应式改造

**Files:**
- Modify: `src/components/ColorPicker.tsx`

- [ ] **Step 1: 修改 ColorPicker.tsx — 按钮尺寸和间距响应式**

将颜色按钮的 `w-[72px] h-[72px]` 改为 `w-16 h-16 sm:w-[72px] sm:h-[72px]`。

将 `gap-5` 改为 `gap-4 sm:gap-5`。

将内容容器 `p-8` 改为 `p-5 sm:p-8`。

这些是 className 局部替换。

- [ ] **Step 2: 运行测试**

Run: `cd /e/Developing/uno && npx vitest run src/components/ColorPicker.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/ColorPicker.tsx
git commit -m "refactor(ColorPicker): responsive button sizes and spacing"
```

---

## Task 12: Scoreboard 响应式改造

**Files:**
- Modify: `src/components/Scoreboard.tsx`

- [ ] **Step 1: 修改 Scoreboard.tsx — 宽度适配和长列表滚动**

将 `min-w-[340px]` 改为 `min-w-[280px] sm:min-w-[340px]`。

将内容容器的 `p-8` 改为 `p-5 sm:p-8`。

在玩家列表的 `<div className="w-full flex flex-col gap-3">` 后加 `max-h-[40vh] overflow-y-auto`，改为 `className="w-full flex flex-col gap-3 max-h-[40vh] overflow-y-auto"`。

这些是 className 局部替换。

- [ ] **Step 2: 运行测试**

Run: `cd /e/Developing/uno && npx vitest run src/components/Scoreboard.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/Scoreboard.tsx
git commit -m "refactor(Scoreboard): responsive width and scrollable player list"
```

---

## Task 13: ChallengeModal 间距调整

**Files:**
- Modify: `src/components/ChallengeModal.tsx`

- [ ] **Step 1: 修改 ChallengeModal.tsx — 统一弹窗规范**

将内容容器的 `p-8` 改为 `p-5 sm:p-8`。

将 `rounded-2xl` 改为 `rounded-xl sm:rounded-2xl`。

这些是 className 局部替换。

- [ ] **Step 2: 运行测试**

Run: `cd /e/Developing/uno && npx vitest run`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/ChallengeModal.tsx
git commit -m "refactor(ChallengeModal): responsive padding and border radius"
```

---

## Task 14: 最终验证

- [ ] **Step 1: 运行全部测试**

Run: `cd /e/Developing/uno && npx vitest run`
Expected: 全部 PASS

- [ ] **Step 2: TypeScript 类型检查**

Run: `cd /e/Developing/uno && npx tsc -b --noEmit`
Expected: 无错误

- [ ] **Step 3: ESLint 检查**

Run: `cd /e/Developing/uno && npx eslint src/`
Expected: 无错误

- [ ] **Step 4: 构建验证**

Run: `cd /e/Developing/uno && npm run build`
Expected: 构建成功

- [ ] **Step 5: 手动验证关键场景**

启动 dev server (`npm run dev`)，逐一验证：
1. 设置页面展开所有分组，确认可以滚动
2. 开始游戏，确认 GameBoard 布局正常
3. 查看各弹窗（新游戏、颜色选择器、记分板、质疑弹窗）
4. 缩小浏览器窗口到 ~768px 宽度，确认响应式效果

- [ ] **Step 6: Commit 最终状态**

```bash
git add -A
git commit -m "chore: verify responsive layout changes"
```
