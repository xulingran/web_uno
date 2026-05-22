# 多 AI 环绕式布局与游玩体验优化

## 背景

当前 GameBoard 中 AI 玩家显示是硬编码的，仅渲染 `players[1]`（左上）和 `players[2]`（右上）。设置中允许 1-5 个 AI，但超过 2 个时屏幕上无法显示。同时缺少出牌动画、特殊牌提示和回合过渡效果，游玩体验不够流畅。

## 方案：Zone Grid 布局 + 扇形手牌 + 中等视觉反馈

### 一、Zone Grid 布局

用 CSS Grid 将游戏棋盘分为 5 个区域：

```
┌─────────────────────────────────┐
│          顶部区域 (top)          │
│     (可放 1-3 个 AI，flex)       │
├────────┬────────────┬───────────┤
│        │            │           │
│ 左侧   │   中央区域  │  右侧     │
│ (left) │  (center)  │ (right)   │
│ 0-1 AI │ 牌堆+弃牌堆 │  0-1 AI   │
│        │            │           │
├────────┴────────────┴───────────┤
│        底部区域 (bottom)         │
│         人类玩家手牌             │
└─────────────────────────────────┘
```

AI 分配规则（人类固定在底部）：

| AI 数量 | 顶部 | 左侧 | 右侧 |
|---------|------|------|------|
| 1       | 1（居中） | 0    | 0    |
| 2       | 0     | 1    | 1    |
| 3       | 1（居中） | 1    | 1    |
| 4       | 2（均分） | 1    | 1    |
| 5       | 3（均分） | 1    | 1    |

顶部区域用 `flex justify-center gap-*` 均匀排列。左右侧区域的 AI 牌背整体旋转 90 度（左侧逆时针，右侧顺时针）。

### 二、AI 手牌扇形展开

替换当前固定 3 张叠放牌背的方式，改为扇形展开：

- 每张牌背沿底部中心为轴，按等角度展开
- 角度计算：每张牌的旋转角 = `(index - (count-1)/2) * stepAngle`
- `stepAngle` 根据手牌数动态调整：手牌少时步长大（15°），手牌多时步长小（5°），总展开角不超过 180°
- 左侧 AI 整体旋转 -90°，右侧整体旋转 90°
- 牌背尺寸按位置调整：顶部 70x105，侧面 60x90
- 当前回合 AI 的扇形区域包裹黄色发光边框

### 三、动画与视觉反馈

#### 3.1 AI 出牌飞行动画

- `gameStore` 新增 `lastPlayedBy: { playerIndex: number; cardId: string } | null`
- `GameBoard` 检测 `lastPlayedBy` 变化时，通过 `ref` 获取 AI 手牌 DOM 和弃牌堆 DOM 的 `getBoundingClientRect()`，计算起止坐标，创建临时飞行 DOM 元素（绝对定位，`fixed`）
- 从 AI 手牌区域位置飞向弃牌堆，持续 400ms，`ease-out` 曲线
- 动画结束后移除 DOM 元素

#### 3.2 特殊牌醒目提示

+2、+4、禁止、反转等特殊牌打出时：

- 弃牌堆区域短暂闪烁遮罩（对应颜色），持续 300ms 后淡出
- 中央区域文字提示（"+2！"、"禁止！"等），放大弹出后缩小消失，持续 600ms
- `gameStore` 新增 `lastActionEffect: { type: string; color?: string } | null`，1 秒后自动清除

#### 3.3 回合切换过渡

- 当前回合 AI 名字标签的发光/放大效果加 `transition-all duration-300`，实现平滑渐变
- 新回合开始时，对应区域 300ms 脉冲光晕动画（`@keyframes pulse-glow`）

#### 3.4 震动/弹跳效果

AI 出牌到达弃牌堆时：

- 弃牌堆 `translateY(-4px)` 弹跳 + 回落，持续 200ms
- CSS `@keyframes bounce-in` 实现

### 四、组件与数据流变更

#### 4.1 GameBoard 重构

- 移除硬编码 `ai1 = players[1]` / `ai2 = players[2]`
- 新增工具函数 `distributeAIPlayers(count: number)`，返回 `{ top: number[], left: number | null, right: number | null }`，数组内是玩家索引（1-based，对应 players 数组下标）。分配优先填满左右，剩余放顶部
- JSX 结构改为 Grid 布局，动态渲染各区域 AI

#### 4.2 AIHand 组件重构

- `position` prop 扩展为 `'top' | 'left' | 'right'`
- 新增 `fanSpread` 渲染逻辑：根据手牌数计算旋转角和偏移
- 左/右位置外层容器加 `rotate(-90deg)` / `rotate(90deg)`

#### 4.3 gameStore 状态扩展

- `lastPlayedBy: { playerIndex: number; cardId: string } | null`
- `lastActionEffect: { type: string; color?: string } | null`

#### 4.4 CardBack 组件调整

- 新增 `small?: boolean` prop 控制缩小尺寸（70x105 或 60x90）

## 涉及文件

- `src/components/GameBoard.tsx` — Grid 布局重构、AI 动态渲染、飞行动画逻辑
- `src/components/AIHand.tsx` — 扇形展开、位置旋转
- `src/components/CardBack.tsx` — 缩小尺寸支持
- `src/store/gameStore.ts` — 新增 `lastPlayedBy`、`lastActionEffect` 状态
- `src/index.css` — 新增动画 keyframes（pulse-glow、bounce-in 等）
