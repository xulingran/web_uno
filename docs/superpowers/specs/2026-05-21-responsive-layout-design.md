# UNO 前端响应式布局体系设计

## 背景

当前 UNO 卡牌游戏前端存在 12 个排版问题，根因集中在：
- 缺乏响应式体系，卡牌尺寸和布局参数全部硬编码
- 全局 `overflow: hidden` 阻止设置页面滚动
- GameBoard 使用嵌套 Flexbox，空间分配不合理
- 弹窗缺少响应式适配

本方案采用系统化重构策略，建立基于 Tailwind 断点的响应式规范，统一解决所有问题。

---

## Part 1：基础架构

### 1.1 页面级滚动策略分离

**当前问题：** `index.css` 中 `html, body, #root { overflow: hidden }` 全局禁止滚动，设置页内容超出屏幕无法下拉。

**改造方案：**

1. 移除 `index.css` 中 `html, body, #root` 上的 `overflow: hidden`
2. 保留 `height: 100%`，仅保留 `#root { height: 100% }`
3. 在 `GameBoard` 组件根元素上保留 `overflow-hidden`（游戏页不需要滚动）
4. `SettingsPage` 根元素使用 `h-screen overflow-y-auto`，确保内容超出时可滚动

**文件：** `src/index.css`, `src/pages/GamePage.tsx`（无变化）, `src/components/SettingsPage.tsx`

### 1.2 卡牌尺寸自适应体系

**当前问题：** 卡牌尺寸硬编码为 90×135px，不随屏幕缩放。

**改造方案：**

在 `index.css` 中定义 CSS 变量，通过 `clamp()` 实现自适应：

```css
:root {
  --card-w: clamp(60px, 8vw, 90px);
  --card-h: clamp(90px, 12vw, 135px);
  --card-radius: clamp(6px, 0.8vw, 10px);
  --card-font-sm: clamp(10px, 1.2vw, 14px);
  --card-font-lg: clamp(24px, 3vw, 36px);
  --card-font-symbol: clamp(20px, 2.4vw, 28px);
}
```

缩放效果：
- 小屏：约 60×90
- 中屏：约 75×112
- 大屏：90×135

**组件改造：**

- `Card.tsx` — 移除硬编码 90×135，改用 CSS 变量 `width: var(--card-w); height: var(--card-h)`
- `CardBack.tsx` — 三种尺寸（normal/top/side）改为基于主卡牌变量的缩放比例
  - normal: `var(--card-w)` × `var(--card-h)`
  - top: `calc(var(--card-w) * 0.78)` × `calc(var(--card-h) * 0.78)`
  - side: `calc(var(--card-w) * 0.67)` × `calc(var(--card-h) * 0.67)`
- `AIHand.tsx` — FanCards 容器尺寸跟随 CSS 变量动态计算
- `DrawPile.tsx` — 容器尺寸跟随卡牌变量
- `DiscardPile.tsx` — 容器尺寸跟随卡牌变量

**文件：** `src/index.css`, `src/components/Card.tsx`, `src/components/CardBack.tsx`, `src/components/AIHand.tsx`, `src/components/DrawPile.tsx`, `src/components/DiscardPile.tsx`

---

## Part 2：GameBoard 布局重构

### 2.1 CSS Grid 布局

**当前问题：** 嵌套 Flexbox + 固定宽度容器，空间分配不均，中央区域过大。

**改造方案：**

GameBoard 根元素从 `flex flex-col` 改为 CSS Grid：

```css
.game-board {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto auto 1fr auto;
  width: 100%;
  height: 100%;
}
```

区域分配：
- Row 1: GameInfo — `grid-column: 1 / -1`
- Row 2: 顶部 AI 行 — `grid-column: 1 / -1`，内部 flex 居中
- Row 3: 左 AI | 中央牌堆 | 右 AI — 各占一列
- Row 4: 玩家手牌 — `grid-column: 1 / -1`

左/右 AI 列用 `auto` 宽度按内容撑开，中央列用 `1fr` 自动占剩余空间。无左/右 AI 时对应列为 `0`。

**文件：** `src/components/GameBoard.tsx`

### 2.2 AI 手牌区域优化

**改造方案：**

- 顶部 AI 行：gap 从固定 `gap-6` 改为响应式 `gap-3 sm:gap-6`
- AI 卡牌背面 top/side 尺寸跟随 CSS 变量
- 容器加 `overflow-x-auto` 兜底防止溢出
- 左右 AI：旋转后的内容通过 padding 确保不溢出 Grid cell
- 无左/右 AI 时 Grid 列宽折叠

**文件：** `src/components/AIHand.tsx`

### 2.3 玩家手牌叠放策略

**当前问题：** 固定 gap-1 间距，牌多时需水平滚动。

**改造方案：**

卡牌间距改为动态计算，使用负 margin 叠放：

```typescript
// 计算叠放量
const containerWidth = containerRef.current?.clientWidth ?? window.innerWidth * 0.95
const cardWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-w'))
const totalWidth = cards.length * cardWidth
const overlap = Math.max(0, (totalWidth - containerWidth) / (cards.length - 1))
// 每张卡 margin-left: -overlap px（第一张除外）
```

- 保留 `overflow-x-auto` 作为极端情况兜底
- hover 时通过 `z-index` 提升并稍微上移（translateY）
- 容器宽度用 `max-w-[95vw]` 限制

**文件：** `src/components/PlayerHand.tsx`

### 2.4 GameInfo 信息栏适配

**改造方案：**

- 加 `flex-wrap`，允许窄屏时信息项自动换行
- 分隔符 `<div class="w-px h-5">` 加 `hidden sm:flex`，小屏隐藏
- 整体内边距 `px-3 sm:px-6`

**文件：** `src/components/GameInfo.tsx`

---

## Part 3：设置页面 + 弹窗响应式改造

### 3.1 设置页面改造

**当前问题：** 内容溢出屏幕无法滚动，面板宽度固定过窄。

**改造方案：**

- `SettingsPage` 根元素：`h-screen` 替代 `min-h-screen`
- 内容区保留 `overflow-y-auto`，配合 Part 1 全局 overflow 修复
- `SettingsPanel` 宽度响应式：`max-w-lg sm:max-w-xl lg:max-w-2xl`
- 分组间距：`gap-4` → `gap-5 sm:gap-6`
- 行内间距：`py-2` → `py-2.5`
- 分组边框：`border-white/10` → `border-white/15`
- 折叠按钮：`py-3` → `py-3.5`

**文件：** `src/components/SettingsPage.tsx`, `src/components/SettingsPanel.tsx`

### 3.2 弹窗统一响应式规范

**统一规范：**
- 遮罩：`fixed inset-0 z-50`，`bg-black/50 sm:bg-black/60`
- 内容容器：`max-w-[90vw] sm:max-w-none`
- 内边距：`p-5 sm:p-8`
- 圆角：`rounded-xl sm:rounded-2xl`
- 有长列表的弹窗加 `max-h-[85vh]`

**各弹窗改造：**

| 弹窗 | 改造内容 |
|------|---------|
| NewGameModal | 预设按钮 `flex-wrap`，难度按钮 `gap-2`，规则标签区加 `py-1`，整体加 `max-h-[85vh] overflow-y-auto` |
| ColorPicker | 按钮尺寸 `w-16 h-16 sm:w-[72px] sm:h-[72px]`，间距 `gap-4 sm:gap-5`，内边距 `p-6 sm:p-8` |
| Scoreboard | `min-w-[280px] sm:min-w-[340px]`，玩家列表加 `max-h-[40vh] overflow-y-auto`，内边距 `p-6 sm:p-8` |
| ChallengeModal | 按钮间距 `gap-4`，内边距跟随统一规范 |

**文件：** `src/components/NewGameModal.tsx`, `src/components/ColorPicker.tsx`, `src/components/Scoreboard.tsx`, `src/components/ChallengeModal.tsx`

---

## 文件变更汇总

| 文件 | 改动内容 |
|------|---------|
| `src/index.css` | 移除全局 overflow:hidden，添加卡牌 CSS 变量 |
| `src/components/GameBoard.tsx` | Flex → Grid 布局，移除硬编码宽度 |
| `src/components/PlayerHand.tsx` | 叠放策略，动态 margin |
| `src/components/AIHand.tsx` | 动态尺寸适配，响应式 gap |
| `src/components/Card.tsx` | CSS 变量替代硬编码尺寸 |
| `src/components/CardBack.tsx` | CSS 变量 + 缩放比例 |
| `src/components/DrawPile.tsx` | 容器跟随卡牌变量 |
| `src/components/DiscardPile.tsx` | 容器跟随卡牌变量 |
| `src/components/GameInfo.tsx` | flex-wrap + 响应式间距 |
| `src/components/SettingsPage.tsx` | 滚动修复 + 布局调整 |
| `src/components/SettingsPanel.tsx` | 宽度响应式 + 间距优化 |
| `src/components/NewGameModal.tsx` | flex-wrap + max-h |
| `src/components/ColorPicker.tsx` | 按钮尺寸响应式 |
| `src/components/Scoreboard.tsx` | 宽度适配 + 长列表滚动 |
| `src/components/ChallengeModal.tsx` | 间距调整 |

共 15 个文件，改动集中在 CSS/Tailwind 层面和 JSX 结构，不涉及游戏业务逻辑。
