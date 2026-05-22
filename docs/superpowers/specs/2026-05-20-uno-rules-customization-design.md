# UNO 规则完善与自定义选项 — 设计文档

> 日期：2026-05-20
> 状态：已确认

## 1. 概述

在当前标准 UNO 游戏基础上，补全经典民间变体规则，并建立分层配置系统，允许玩家通过预设模板或自由组合来定制游戏规则。

### 1.1 当前项目状态

- **技术栈**：React 18 + TypeScript + Vite + Zustand + Tailwind CSS 3
- **游戏模式**：1 人类玩家 + 2 AI 对手，纯前端
- **卡牌**：标准 108 张 UNO 牌组
- **已实现规则**：标准匹配出牌、Skip/Reverse/+2/Wild/Wild+4、UNO 自动提示（PRD 定义但代码中未完全实现）

### 1.2 目标

- 补全经典民间变体规则（堆叠链、跳入、7-0、Wild+4 质疑等）
- 建立 `GameConfig` 配置系统，所有规则参数可调节
- 提供预设模板（Classic / Casual / Hardcore / Custom）
- 全局设置页 + 对局前快速调整弹窗
- 配置持久化到 localStorage
- AI 决策适配所有新规则

---

## 2. 数据模型

### 2.1 GameConfig 类型

```typescript
interface ScoreConfig {
  numberCard: number          // 数字牌分值，0 = 按面值计分
  actionCard: number          // 功能牌分值，默认 20
  wildCard: number            // 万能牌分值，默认 50
}

interface ActionCardConfig {
  stackingDraw2: boolean      // +2 堆叠链
  stackingDraw4: boolean      // +4 堆叠链
  challengeWild4: boolean     // Wild+4 质疑挑战
  reverseAsSkip: boolean      // 2 人时 Reverse = Skip（固定 true）
  jumpIn: boolean             // 同卡跳入
  sevenORule: boolean         // 7 换手 + 0 轮转
}

interface DrawConfig {
  drawToMatch: boolean        // 抽到可出为止
  forcePlay: boolean          // 有牌必须出
  multiDrawCount: number      // 无牌可出时抽 N 张，默认 1
}

interface UNOConfig {
  requireUNOCall: boolean     // 剩 1 张牌是否需要呼叫 UNO
  unoPenaltyDraw: number      // 漏叫 UNO 罚抽张数，默认 2
  autoDetectUNO: boolean      // 系统自动检测并提示 UNO
}

interface GameParams {
  initialHandSize: number     // 初始手牌数，默认 7
  aiPlayerCount: number       // AI 玩家数，默认 2，上限 5
  targetScore: number         // 目标分数，0 = 不限
  turnTimeLimit: number       // 回合时限秒数，0 = 不限
}

interface GameConfig {
  params: GameParams
  actionCards: ActionCardConfig
  draw: DrawConfig
  uno: UNOConfig
  scoring: ScoreConfig
}
```

### 2.2 预设定义

| 预设 | stackingDraw2 | stackingDraw4 | challengeWild4 | jumpIn | sevenORule | forcePlay | drawToMatch | requireUNOCall | unoPenalty | targetScore |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Classic | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | 2 | 0 |
| Casual | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | 0 | 0 |
| Hardcore | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | 4 | 500 |

- Classic：标准 UNO 官方规则
- Casual：宽松休闲（不怕抽牌、不罚 UNO）
- Hardcore：竞技变体（堆叠、质疑、换手全开）
- Custom：用户自由组合，自动持久化

### 2.3 配置持久化策略

- `configStore`（Zustand）与 localStorage 双向同步
- 读取时：localStorage 中取出的值 → merge 到默认值模板（用 lodash merge 或手写浅合并）→ 确保新增字段有默认值
- 写入时：每次 `configStore.setState` 自动同步到 localStorage

---

## 3. 规则逻辑设计

### 3.1 堆叠链 (Stacking +2/+4)

**触发条件**：`actionCards.stackingDraw2` 或 `actionCards.stackingDraw4` 开启，且 `pendingDrawCount > 0`

**流程**：
1. 玩家 A 打出 +2 → `pendingDrawCount = 2`
2. 轮到玩家 B，检测到 `pendingDrawCount > 0`
3. 玩家 B 手中若有 +2（+4 同理），可选择打出堆叠
4. 打出后 `pendingDrawCount += 2`，继续传给玩家 C
5. 若 B 不堆叠，B 需抽 `pendingDrawCount` 张牌并跳过回合

**状态扩展**：在 GameState 中新增 `stackingPlayerIndex: number | null` 和 `waitingForStack: boolean`，用于标识当前在等待堆叠响应的玩家。

**人类 UI**：当轮到人类且可堆叠时，手牌中 +2/+4 高亮，"抽牌"按钮旁增加"接受罚抽"按钮。
**AI 行为**：手中持有 +2 时，70% 概率堆叠；持有 +4 时，50% 概率堆叠（保留 +4 作为最后手段）。

### 3.2 同卡跳入 (Jump-in)

**触发条件**：`actionCards.jumpIn` 开启

**规则**：任何时点，若某个玩家手中有与弃牌堆顶部完全相同的牌（颜色 + 数字/类型完全一致），可以抢出。抢出后从该玩家位置继续游戏。

**实现简化**：
- AI 之间不抢出（避免视觉混乱）
- 人类始终有 1.5s 的抢出窗口（通过高亮完全匹配的牌 + 闪烁提示）
- AI 回合时人类也能抢出；人类回合时 AI 有概率抢出
- 抢出后当前回合重定向到抢出者

**UI 设计**：完全匹配的卡牌边框闪烁金色，旁显"抢出！"悬浮标签。

### 3.3 7-0 换手轮转

**触发条件**：`actionCards.sevenORule` 开启，且打出的数字牌值为 7 或 0

- **7（换手）**：
  - 人类打出：弹出玩家选择面板，选择与谁交换手牌
  - AI 打出：选择手牌最多的对手交换
- **0（轮转）**：所有玩家手牌按当前方向传给下家

**注意**：`value === 0` 的数字牌原本就一直存在，只是通常没有特殊效果。这个规则需要将它升级为功能型触发。确保不会和普通 0 混淆——仅在 `sevenORule` 开启时触发。

### 3.4 Wild+4 质疑

**触发条件**：`actionCards.challengeWild4` 开启，上家打出 Wild+4

**流程**：
1. 玩家 A 打出 Wild+4
2. 玩家 B 获得质疑窗口（约 2s）
3. 若 B 质疑：
   - B 可查看 A 是否手中有当前颜色 → 若 A 有 → 质疑成功，**A 抽 4 张**，B 正常回合
   - 若 A 没有当前颜色 → 质疑失败，**B 抽 6 张**，B 跳过
4. 若 B 不质疑：正常执行 Wild+4 效果（选色 + 下家抽 4 并跳过）

**实现**：打出 Wild+4 后不立即执行选色，先进入 `phase: 'challenge'` 状态。下家选择质疑/不质疑后继续。

**AI 行为**：AI 质疑概率 = 1 - (AI 手牌中当前颜色的数量 / AI 手牌总数) * 2。即手中有当前颜色的牌越少，越倾向质疑对手。

### 3.5 Force Play & Draw-to-Match

**Force Play**（`draw.forcePlay`）：当前代码中 `drawCard` 后若抽到可出牌，会保持玩家回合不自动推进——这就是 force play 的基础。开启后，这个行为强制化（抽到可出牌 **不允许** 跳过，必须打出）。

**Draw-to-Match**（`draw.drawToMatch`）：`drawCard` 逻辑改为循环：
```
while (手中有可出牌? false) {
  抽 1 张;
  if (牌库空) break;
}
if (forcePlay && 抽到的牌可出) {
  自动打出;
}
```

### 3.6 UNO 漏叫罚抽

**触发条件**：`uno.requireUNOCall` 开启

**流程**：
1. 任一玩家出牌后手牌剩 1 张 → 触发 UNO 检测
2. 人类：弹出 UNO 确认弹窗，玩家点击"UNO!"确认（视为已呼叫）
3. 若人类在 N 秒内（默认 3s）未确认 → 视为漏叫 → 罚抽 `unoPenaltyDraw` 张，延迟触发（下家出牌前/回合开始前才罚，允许人类补救）
4. AI：自动呼叫 UNO，不罚

**简化**：不在漏叫后立即罚抽，而是在下一个玩家回合**开始之前**罚抽（给人类一点反应时间）。AI 不举报人类漏叫（避免 UI 复杂度）。

### 3.7 回合限时

**触发条件**：`params.turnTimeLimit > 0`

人类回合启动倒计时，在 UI 上显示。超时自动从手牌中随机选择一张可出牌打出，若无牌可出则自动抽牌。AI 回合不受限时影响。

---

## 4. UI 设计

### 4.1 全局设置页面 (`/settings`)

- 路由：`/settings`（在 App.tsx 中添加 HashRouter 路由）
- 主页面右上角齿轮图标 ⚙ 入口
- 布局：居中容器，分组折叠面板
- 各组默认折叠，以"▶ 标题"展示，点击展开
- 底部固定：`[恢复全部默认]` `[取消]` `[保存设置]`

### 4.2 设置面板分组

| 分组 | 包含字段 | 默认折叠 |
|------|----------|:---:|
| 预设选择 | 预设下拉框 + 恢复预设默认按钮 | ❌ |
| 基础参数 | initialHandSize, aiPlayerCount, targetScore, turnTimeLimit | ❌ |
| 功能牌行为 | stackingDraw2, stackingDraw4, challengeWild4, reverseAsSkip, jumpIn, sevenORule | ❌ |
| 抽牌规则 | drawToMatch, forcePlay, multiDrawCount | ✅ |
| UNO 规则 | requireUNOCall, unoPenaltyDraw, autoDetectUNO | ✅ |
| 计分 | numberCard(面值/固定值), actionCard, wildCard | ✅ |

### 4.3 新游戏弹窗 (`NewGameModal`)

- 触发：点击"新游戏"按钮
- 内容：
  - 顶部预设快速切换（横排按钮组）
  - 当前配置摘要（分类显示关键开关项，只读）
  - 底部："⚙ 详细设置" → 跳转 `/settings`，"开始游戏"按钮
- 关闭弹窗 = 取消新游戏（保持当前局）

### 4.4 游戏内 UNO 弹窗 (`UNOModal`)

- 触发：人类玩家出牌后手牌剩 1 张，且 `uno.requireUNOCall` 开启
- 内容：大字"UNO！"提示 + 确认按钮 + 倒计时（`autoDetectUNO` 开启时显示倒计时条）
- 超时未确认 → 罚抽 `unoPenaltyDraw` 张

### 4.5 堆叠/质疑交互

- **堆叠**：当轮到人类且 `pendingDrawCount > 0`，可堆叠的 +2/+4 高亮，"接受罚抽（抽 N 张）"按钮替代普通"抽牌"按钮
- **质疑**：Wild+4 打出后，下家是人类时，弹出 2s "质疑？" 按钮，"不质疑"按钮

---

## 5. 文件结构变更

```
src/
├── config/
│   ├── types.ts              ← 新增：GameConfig 类型 + 预设类型
│   ├── presets.ts            ← 新增：三套预设数据
│   └── defaults.ts           ← 新增：默认值 + merge 工具函数
├── components/
│   ├── SettingsPage.tsx       ← 新增：全局设置页面
│   ├── SettingsPanel.tsx      ← 新增：设置面板（分组折叠表单）
│   ├── NewGameModal.tsx       ← 新增：新游戏前快速配置弹窗
│   ├── UNOModal.tsx           ← 新增：UNO 呼叫确认弹窗
│   ├── (其他现有组件不变)
├── hooks/
│   └── useGameEngine.ts       ← 改造：读取 config，适配所有新规则
├── store/
│   ├── gameStore.ts           ← 改造：initGame 接受 config，各 action 读取 config
│   └── configStore.ts         ← 新增：Zustand + localStorage 配置持久化
├── utils/
│   ├── rules.ts               ← 改造：canPlayCard 等函数感知 config
│   ├── ai.ts                  ← 改造：AI 决策适配 config
│   └── types.ts               ← 改造：GameState 扩展
├── pages/
│   └── GamePage.tsx           ← 改造：新游戏弹窗，设置入口
└── App.tsx                    ← 改造：路由增加 /settings
```

---

## 6. 数据流

```
用户调整设置
      │
      ▼
configStore.setState()  ←──→  localStorage（自动同步）
      │
      ▼
用户点击"新游戏" → NewGameModal（快速确认/跳转详细设置）
      │
      ▼
读取 configStore.getState() → 注入 gameStore.initGame(config)
      │
      ▼
游戏运行中
  rules.ts / ai.ts / useGameEngine.ts  全部从 gameStore 读取 config 做分支判断
```

---

## 7. 不做

- ❌ 在线多人对战（纯前端限制）
- ❌ 新增卡牌类型（Blank Wild、Shuffle Hands 等自制牌）
- ❌ 动画/音效（当前项目已无）
- ❌ 移动端独立适配（桌面优先策略沿用）
- ❌ AI 举报人类漏叫 UNO（避免 UI 复杂性）