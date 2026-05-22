# UNO 卡牌游戏

基于 **React + TypeScript + Vite** 构建的浏览器端 UNO 卡牌游戏，支持人机对战、多玩家对战以及丰富的规则自定义配置。

## ✨ 功能特性

### 🎮 核心游戏
- **人机对战** — 支持 1 名人类玩家与 1~5 名 AI 玩家同台竞技
- **智能 AI** — 内置简单 (Easy)、中等 (Medium)、困难 (Hard) 三种难度，AI 具备策略性出牌、堆叠响应、+4 虚晃等行为
- **完整规则** — 支持跳过 (Skip)、反转 (Reverse)、+2 罚牌、万能牌 (Wild)、万能+4 牌 (Wild+4) 等全部功能牌
- **UNO 检测** — 剩余 1 张手牌时自动/手动喊 UNO，漏喊可触发罚牌机制
- **抽牌挑战** — 可选启用万能+4 牌的合法性挑战，惩罚违规出牌

### ⚙️ 规则可配置
提供 **经典规则**、**休闲娱乐**、**硬核竞技** 三种预设方案，同时支持全自定义：

| 配置分类 | 可配置项 |
|---------|---------|
| **游戏参数** | 初始手牌数、AI 数量、目标分数、回合限时 |
| **功能牌** | +2/+4 堆叠、+4 挑战、反转跳人、七换手规则 |
| **抽牌规则** | 抽到能出、抽强制出、多张抽牌数 |
| **UNO 规则** | 强制喊 UNO、惩罚抽牌数、自动检测 |
| **计分规则** | 数字牌分值、功能牌分值、万能牌分值 |
| **AI 难度** | 随机性、堆叠倾向性、挑战倾向性、虚晃概率、对手感知、颜色策略 |

### 🎨 UI/UX
- **美观设计** — 深色主题 + UNO 经典配色，使用 Fredoka One 游戏风格字体
- **响应式布局** — AI 玩家在不同数量下自适应排列（上方/左右侧布局）
- **动画效果** — 发牌动画、抽牌动画、弃牌弹跳、功能牌特效气泡
- **卡牌识别** — 可出牌高亮、可堆叠牌区分、抽到即出提示
- **游戏日志** — 实时记录所有游戏事件（出牌、抽牌、UNO 喊出等）
- **调试面板** — 开发者模式，可查看所有 AI 手牌和游戏状态

### 🚀 工程化
- **CI/CD** — GitHub Actions 自动构建部署到 GitHub Pages
- **测试覆盖** — Vitest + Testing Library 组件及单元测试，覆盖率阈值 60%
- **状态管理** — Zustand 管理全局游戏状态与配置状态
- **持久化** — 游戏配置自动保存到 localStorage

## 🛠 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 |
| 语言 | TypeScript 5.8 |
| 构建 | Vite 6 |
| 状态管理 | Zustand 5 |
| 样式 | Tailwind CSS 3 |
| 路由 | React Router DOM 7 |
| 图标 | Lucide React |
| 测试 | Vitest 4 + Testing Library |
| 代码检查 | ESLint 9 |
| 部署 | GitHub Pages + GitHub Actions |

## 📁 项目结构

```
uno/
├── .github/
│   └── workflows/deploy.yml      # GitHub Actions 自动部署
├── public/
│   └── favicon.svg               # 网站图标
├── src/
│   ├── components/               # UI 组件
│   │   ├── GameBoard.tsx         # 游戏主界面
│   │   ├── PlayerHand.tsx        # 人类玩家手牌区
│   │   ├── AIHand.tsx            # AI 玩家手牌区
│   │   ├── Card.tsx              # 卡牌组件
│   │   ├── CardBack.tsx          # 卡牌背面
│   │   ├── DiscardPile.tsx       # 弃牌堆
│   │   ├── DrawPile.tsx          # 抽牌堆
│   │   ├── ColorPicker.tsx       # 万能牌变色选择器
│   │   ├── GameInfo.tsx          # 游戏信息面板
│   │   ├── UNOCall.tsx           # UNO 呼喊按钮
│   │   ├── UNOModal.tsx          # UNO 漏喊提示弹窗
│   │   ├── ChallengeModal.tsx    # +4 挑战弹窗
│   │   ├── Scoreboard.tsx        # 计分板
│   │   ├── NewGameModal.tsx      # 新游戏确认弹窗
│   │   ├── DealAnimator.tsx      # 发牌动画器
│   │   ├── SettingsPage.tsx      # 设置页面
│   │   ├── SettingsPanel.tsx     # 设置面板
│   │   └── DebugPanel.tsx        # 调试面板
│   ├── config/                   # 配置模块
│   │   ├── types.ts              # 配置类型定义
│   │   ├── defaults.ts           # 默认配置 & 本地存储加载/保存
│   │   └── presets.ts            # 预设规则方案
│   ├── hooks/                    # 自定义 Hooks
│   │   ├── useGameEngine.ts      # AI 游戏引擎
│   │   ├── useDealAnimation.ts   # 发牌动画控制
│   │   └── useDrawAnimation.ts   # 抽牌动画控制
│   ├── pages/
│   │   └── GamePage.tsx          # 游戏主页面
│   ├── store/                    # 状态管理
│   │   ├── gameStore.ts          # 游戏核心状态（出牌、抽牌、回合、计分等）
│   │   └── configStore.ts        # 配置状态（参数、规则、预设）
│   ├── utils/                    # 工具模块
│   │   ├── types.ts              # 核心类型定义（卡牌、玩家、游戏事件等）
│   │   ├── deck.ts               # 牌组创建、洗牌、发牌、抽牌
│   │   ├── rules.ts              # 规则验证（可出牌、堆叠、跳入等）
│   │   ├── ai.ts                 # AI 决策算法（选牌、变色、堆叠策略）
│   │   └── layout.ts             # AI 玩家位置分布计算
│   ├── App.tsx                   # 应用入口 + 路由
│   ├── main.tsx                  # React 挂载入口
│   ├── index.css                 # 全局样式 & Tailwind 导入
│   └── test-setup.ts             # 测试环境配置
├── index.html                    # HTML 入口
├── vite.config.ts                # Vite 构建配置
├── tailwind.config.js            # Tailwind 主题配置
├── tsconfig.json                 # TypeScript 配置
├── eslint.config.js              # ESLint 配置
└── package.json                  # 依赖 & 脚本
```

## 🎯 游戏流程

```
初始化游戏
    │
    ▼
 发牌阶段（动画）
    │
    ▼
 出牌循环 ──────────────────────────┐
    │                                │
    ├── 人类回合：选牌 / 抽牌 / UNO   │
    │                                │
    ├── AI 回合：自动决策             │
    │                                │
    ├── 功能牌处理：                  │
    │   ├── Skip → 跳过下家           │
    │   ├── Reverse → 转向           │
    │   ├── +2 → 罚牌 + 堆叠判定     │
    │   ├── Wild → 变色选择          │
    │   └── +4 → 罚牌 + 挑战判定     │
    │                                │
    ├── UNO 检测 & 罚牌              │
    │                                │
    ├── 判定胜者 → 进入计分          │
    │                                │
    └── 继续下一回 ──────────────────┘
```

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18
- **npm** >= 9

### 安装与运行

```bash
# 克隆项目
git clone <repo-url>
cd uno

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:5173/uno/
```

### 构建与预览

```bash
# 类型检查 + 构建
npm run build

# 预览构建产物
npm run preview
```

### 运行测试

```bash
# 交互式测试
npm test

# 单次运行测试
npm run test:run

# 运行测试 + 生成覆盖率报告
npm run test:coverage
```

### 代码检查

```bash
npm run lint
npm run check      # TypeScript 类型检查（不输出文件）
```

## 🎮 操作指南

1. 启动游戏后进入主界面，游戏会自动开局（发射牌动画）
2. **选择卡牌**：点击手牌中高亮的卡牌即可出牌
3. **抽牌**：无可出牌时，点击抽牌堆摸一张
4. **UNO 呼喊**：剩余最后 1 张牌前，点击 **"UNO!"** 按钮（配置开启时）
5. **变色**：出万能牌 (Wild) 或万能+4 (Wild+4) 后选择颜色
6. **堆叠**：启用堆叠规则时，可叠加 +2 或 +4 牌传递给下家
7. **挑战**：对手出 +4 时，可质疑其合法性

### 设置入口

点击游戏界面右上角的 ⚙️ 设置图标进入设置页面，可调整：
- AI 玩家数量（1~5 名）
- 初始手牌张数
- 预设规则方案（经典 / 休闲 / 硬核）
- 功能牌行为（堆叠、挑战、跳入、七换手等）
- 抽牌规则（抽到能出、强制出牌等）
- UNO 规则（强制喊出、惩罚抽牌数等）
- 计分方式
- AI 难度等级

配置会自动保存到浏览器本地存储，下次打开无需重新设置。

## 🧠 AI 难度说明

| 难度 | 随机出牌 | 堆叠倾向 | 挑战倾向 | +4 虚晃 | 对手感知 | 颜色策略 |
|------|---------|---------|---------|---------|---------|---------|
| **简单** | 40% | 30% | 30% | 0% | ❌ | 最多牌颜色 |
| **中等** | 10% | 60% | 70% | 15% | ✅ | 最多牌颜色 |
| **困难** | 0% | 85% | 100% | 35% | ✅ | 最优颜色 |

AI 会在以下场景做出智能决策：
- **对手即将胜利时**：优先使用跳过、反转、+2 等功能牌干扰
- **需罚牌时**：判断是否使用堆叠牌反击
- **通用+4 虚晃**：手中有同色牌时仍可能违规出+4（困难模式下）
- **七换手规则**：仅在对手手牌数较少时执行换手

## 📐 架构设计

```
┌─────────────────────────────────────────┐
│                 UI 层                    │
│  GameBoard / Card / PlayerHand / AIHand │
│  ColorPicker / Modals / Animator        │
└──────────────┬──────────────────────────┘
               │ 状态订阅 & 操作分发
┌──────────────▼──────────────────────────┐
│            状态管理层                     │
│  gameStore (Zustand) — 游戏核心状态      │
│  configStore (Zustand) — 配置状态        │
└──────────────┬──────────────────────────┘
               │ 纯函数工具
┌──────────────▼──────────────────────────┐
│            规则 & 算法层                  │
│  rules.ts — 出牌规则校验                 │
│  deck.ts  — 牌组操作                     │
│  ai.ts    — AI 决策算法                  │
│  layout.ts — 布局计算                    │
└─────────────────────────────────────────┘
```

- **gameStore** 是单一数据源，包含所有游戏运行时状态
- **useGameEngine** Hook 在 `playing` 阶段自动侦测当前玩家是否为 AI，并自动调度 AI 决策
- 所有规则校验（`canPlayCard`、`canStack` 等）均为纯函数，无副作用
- 组件通过 Zustand selector 按需订阅状态片段，避免不必要的重渲染

## 🐞 调试模式

点击游戏界面右上角的 🐛 调试按钮可开启调试面板：
- 查看所有 AI 玩家的手牌
- 查看当前游戏阶段、方向、当前颜色等状态
- 查看完整游戏事件日志
- 手动记录调试日志

## 📊 测试覆盖

项目使用 Vitest + Testing Library 进行测试：

- **组件测试** — Card、CardBack、DiscardPile、DrawPile、GameBoard、GameInfo、UNOCall、Scoreboard、ColorPicker 等核心组件
- **单元测试** — 规则校验、牌组操作、AI 算法、布局计算、配置管理
- **Hook 测试** — useGameEngine 游戏引擎
- **覆盖率阈值** — 行覆盖率 ≥ 60%，分支覆盖率 ≥ 50%

## 📜 License

MIT