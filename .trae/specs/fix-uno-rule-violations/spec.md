# 修复 UNO 规则冲突错误 Spec

## Why

当前游戏存在多处与 UNO 官方规则冲突的逻辑错误，包括初始翻牌罚错玩家、摸牌后无法出牌、普通 Wild 被拒绝为初始牌、AI 无法质疑 Wild+4 等，严重影响游戏正确性。

## What Changes

- 修复初始 Draw Two 牌罚错玩家的问题（先手玩家应被罚摸并跳过）
- 修复摸牌后无法打出摸到的牌的问题（应允许玩家选择出或跳过）
- 修复普通 Wild 被错误拒绝为初始翻出牌的问题
- 修复 AI 无法质疑人类 Wild Draw Four 的问题
- 修复 Jump-In 对万能牌不生效的问题（GameBoard 未使用 canJumpIn）
- 修复叠牌时允许打出非叠牌普通牌的问题
- 修复 Store 层 drawCard 未校验是否有可出牌的问题

## Impact

- Affected specs: browser-uno-game
- Affected code: `src/store/gameStore.ts`, `src/components/GameBoard.tsx`

## MODIFIED Requirements

### Requirement: 首张牌为万能牌

系统 SHALL 在初始翻牌时仅拒绝 Wild Draw Four，普通 Wild 应作为合法初始牌，由先手玩家选择颜色。

#### Scenario: 首张牌为普通 Wild

- **WHEN** 翻开的首张牌为普通 Wild
- **THEN** 该牌作为合法初始牌，先手玩家选择颜色后开始游戏

#### Scenario: 首张牌为 Wild Draw Four

- **WHEN** 翻开的首张牌为 Wild Draw Four
- **THEN** 将该牌洗回牌库，重新翻牌

### Requirement: 初始 Draw Two 罚牌

系统 SHALL 在初始翻出 Draw Two 时正确罚摸先手玩家。

#### Scenario: 首张牌为 Draw Two

- **WHEN** 翻开的首张牌为 Draw Two
- **THEN** 先手玩家（玩家 0）被罚摸 2 张牌并被跳过，从下一位玩家开始

### Requirement: 抽牌后可选择出牌

系统 SHALL 在玩家摸牌后，若摸到的牌可以出，允许玩家选择立即打出或跳过。

#### Scenario: 摸到可出的牌

- **WHEN** 玩家摸牌且摸到的牌可以匹配弃牌堆
- **THEN** 玩家可以选择打出该牌或选择跳过（不出牌），回合结束

#### Scenario: 摸到不可出的牌

- **WHEN** 玩家摸牌且摸到的牌无法匹配弃牌堆
- **THEN** 回合自动结束，轮到下一位玩家

### Requirement: Wild Draw Four 质疑

系统 SHALL 允许所有受影响的玩家（包括 AI）质疑 Wild Draw Four。

#### Scenario: AI 质疑人类玩家的 Wild Draw Four

- **WHEN** 人类打出 Wild Draw Four 且下一玩家为 AI
- **THEN** AI 根据手中卡牌情况决定是否质疑，质疑结果按规则处理

### Requirement: Jump-In 万能牌兼容

系统 SHALL 在弃牌堆顶部为万能牌时正确计算可 Jump-In 的卡牌。

#### Scenario: 万能牌后 Jump-In

- **WHEN** 弃牌堆顶部为 Wild 或 Wild+4 且 currentColor 已设定
- **THEN** 使用 currentColor 而非 topCard.color 判断 Jump-In 匹配

### Requirement: 叠牌限制

系统 SHALL 在面临罚摸时仅允许打出叠牌卡牌或接受罚摸，不允许打出其他普通牌。

#### Scenario: 面临 Draw Two 时出普通牌

- **WHEN** 玩家面临 Draw Two 罚摸且叠牌功能开启
- **THEN** 玩家只能选择叠牌（打出 Draw Two 或 Wild+4）或接受罚摸

### Requirement: Store 层摸牌校验

系统 SHALL 在 Store 的 drawCard 函数中校验玩家是否确实无牌可出。

#### Scenario: 有牌可出时调用 drawCard

- **WHEN** 玩家有可出的牌但仍调用 drawCard
- **THEN** drawCard 应拒绝执行
