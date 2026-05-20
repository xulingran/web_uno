# 浏览器端 UNO 卡牌游戏 Spec

## Why

提供一个无需安装、无需联网、打开即玩的完整 UNO 卡牌游戏，玩家与 2 个 AI 对手对战，遵循标准 UNO 官方规则。

## What Changes

- 新建完整的浏览器端 UNO 卡牌游戏应用
- 108 张标准 UNO 卡牌（数字牌 76 张、功能牌 24 张、万能牌 8 张）
- 1 玩家 + 2 AI 对手对战模式
- 完整 UNO 规则实现（Skip、Reverse、+2、Wild、Wild+4）
- CSS 纯渲染卡牌设计，无需外部图片资源
- AI 自动决策系统
- 计分与胜负判定
- GitHub Pages 静态站点部署支持

## Impact

- Affected specs: 无（全新项目）
- Affected code: 全新 `src/` 目录下的所有文件

## ADDED Requirements

### Requirement: 卡牌系统

系统 SHALL 创建标准 108 张 UNO 卡牌牌组，包括红黄蓝绿四色数字牌 0-9、每种颜色各 2 张 Skip/Reverse/Draw Two、4 张 Wild 和 4 张 Wild Draw Four。

#### Scenario: 洗牌与发牌

- **WHEN** 游戏开始时
- **THEN** 牌组被随机洗牌，每位玩家获得 7 张手牌，剩余牌放入牌库，翻开首张牌到弃牌堆

#### Scenario: 首张牌为万能牌

- **WHEN** 翻开的首张牌为 Wild 或 Wild Draw Four
- **THEN** 将该牌洗回牌库，重新翻牌直到首张非万能牌

### Requirement: 出牌匹配规则

系统 SHALL 允许玩家打出与弃牌堆顶部卡牌颜色、数字或符号相匹配的卡牌。

#### Scenario: 颜色匹配出牌

- **WHEN** 弃牌堆顶部为红色 5，玩家手中有红色 3
- **THEN** 红色 3 被视为可出牌并高亮显示

#### Scenario: 数字匹配出牌

- **WHEN** 弃牌堆顶部为红色 5，玩家手中有蓝色 5
- **THEN** 蓝色 5 被视为可出牌并高亮显示

#### Scenario: 符号匹配出牌

- **WHEN** 弃牌堆顶部为红色 Skip，玩家手中有蓝色 Skip
- **THEN** 蓝色 Skip 被视为可出牌并高亮显示

#### Scenario: Wild 任意匹配

- **WHEN** 玩家手中有 Wild 卡牌
- **THEN** Wild 始终可出（除非有 Wild+4 限制）

### Requirement: 抽牌机制

系统 SHALL 在玩家无牌可出时提供抽牌功能，抽到可出的牌允许立即打出。

#### Scenario: 无牌可出时抽牌

- **WHEN** 玩家手中无任何匹配弃牌堆的卡牌
- **THEN** 玩家必须从牌库抽 1 张牌，若该牌可匹配则允许立即打出，否则回合结束

#### Scenario: 牌库耗尽

- **WHEN** 牌库抽完
- **THEN** 将弃牌堆（保留顶部 1 张）重新洗牌组成新牌库

### Requirement: 功能牌效果

系统 SHALL 正确实现所有功能牌的特殊效果。

#### Scenario: Skip 跳过

- **WHEN** 玩家打出 Skip 牌
- **THEN** 下一家被跳过，轮到再下一家出牌

#### Scenario: Reverse 反转

- **WHEN** 玩家打出 Reverse 牌
- **THEN** 出牌方向反转（顺/逆时针切换）

#### Scenario: Draw Two +2

- **WHEN** 玩家打出 Draw Two 牌
- **THEN** 下一家必须抽 2 张牌并跳过本轮

#### Scenario: Wild 变色

- **WHEN** 玩家打出 Wild 牌
- **THEN** 弹出四色选择器，玩家选择颜色后继续游戏

#### Scenario: Wild Draw Four 变色+罚抽

- **WHEN** 玩家打出 Wild Draw Four 牌且手中无当前颜色卡牌
- **THEN** 弹出四色选择器，下一家抽 4 张牌并跳过，且仅当手中无当前颜色时可打出

### Requirement: UNO 呼叫

系统 SHALL 在玩家剩余 1 张手牌时自动触发 UNO 提示。

#### Scenario: UNO 自动提示

- **WHEN** 玩家出牌后手中剩余恰好 1 张牌
- **THEN** 界面显示 "UNO！" 提示动画

#### Scenario: 漏叫 UNO 惩罚

- **WHEN** 玩家漏叫 UNO 且被检测到（系统自动检测）
- **THEN** 玩家罚抽 2 张牌

### Requirement: AI 对手

系统 SHALL 提供 2 个 AI 对手，具备合理的出牌决策能力。

#### Scenario: AI 自动出牌

- **WHEN** 轮到 AI 出牌
- **THEN** AI 在 0.5-1.5 秒思考延迟后自动打出匹配的卡牌或抽牌

#### Scenario: AI Wild 颜色选择

- **WHEN** AI 打出 Wild 或 Wild Draw Four
- **THEN** AI 自动选择手中最多的颜色

### Requirement: 回合结束与计分

系统 SHALL 在任意玩家出完手牌后结束本轮并计算得分。

#### Scenario: 获胜判定

- **WHEN** 某位玩家手牌数为 0
- **THEN** 该玩家获胜，显示计分结果

#### Scenario: 计分规则

- **WHEN** 本轮结束
- **THEN** 获胜者得分 = 其余玩家剩余手牌点数之和（数字牌按面值、功能牌 20 分、万能牌 50 分）

### Requirement: 新游戏

系统 SHALL 支持重新开始游戏。

#### Scenario: 开始新游戏

- **WHEN** 本轮结束后用户点击"新游戏"按钮
- **THEN** 重置所有状态，重新洗牌发牌，开始新一轮

### Requirement: 静态站点部署

系统 SHALL 支持构建为纯静态文件部署到 GitHub Pages。

#### Scenario: 构建输出

- **WHEN** 执行 `npm run build`
- **THEN** 在 `dist/` 目录生成完整的静态 HTML/CSS/JS 文件，可直接托管于任意静态服务器

#### Scenario: Hash 路由兼容

- **WHEN** 用户通过 GitHub Pages URL 访问或刷新任意路径
- **THEN** 页面正常加载，不会出现 404 错误（使用 HashRouter）