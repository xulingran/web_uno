# 游戏计时与万能牌取消 Spec

## Why
玩家希望在游戏过程中能直观看到本局游戏已进行的时长，增强时间感知。同时，当玩家误触 +4 或换色牌并进入颜色选择界面后，应该允许取消操作而非强制打出，提升操作灵活性和用户体验。此外，结算界面也应可访问调试日志面板。

## What Changes
- 在顶部状态栏 GameInfo 组件中新增本局游戏计时显示
- 在 ColorPicker 颜色选择弹窗中增加取消按钮
- 新增 store action `cancelColorPick` 用于撤销万能牌/换色牌的打出操作
- 在结算界面（Scoreboard）显示 debug 按钮，可查看调试日志
- **BREAKING**: 无

## Impact
- Affected specs: 无
- Affected code:
  - `src/store/gameStore.ts` - 新增 `gameStartTime` 状态字段和 `cancelColorPick` action
  - `src/components/GameInfo.tsx` - 新增计时显示
  - `src/components/GameBoard.tsx` - 结算阶段 debug 按钮可见性调整
  - `src/components/ColorPicker.tsx` - 新增取消按钮
  - `src/components/Scoreboard.tsx` - 新增 debug 按钮入口

## ADDED Requirements

### Requirement: 本局游戏计时
系统 SHALL 在顶部状态栏中显示本局游戏自开始以来经过的时间。

计时格式为 `MM:SS`（分钟:秒），当超过 1 小时时格式为 `HH:MM:SS`。

#### Scenario: 游戏开始后计时
- **GIVEN** 玩家开始一局新游戏
- **WHEN** 游戏进入 playing 阶段
- **THEN** 状态栏显示计时，从 `00:00` 开始递增

#### Scenario: 新游戏重置计时
- **GIVEN** 当前有一局正在进行
- **WHEN** 玩家开始新游戏
- **THEN** 计时重置并重新开始

### Requirement: 取消万能牌/换色牌打出
系统 SHALL 允许玩家在颜色选择阶段取消操作，将已打出的万能牌或换色牌退回手牌。

#### Scenario: 取消 +4 牌打出
- **GIVEN** 玩家打出一张 wild4 牌，游戏进入 color-picking 阶段
- **WHEN** 玩家在 ColorPicker 中点击"取消"按钮
- **THEN** wild4 牌从弃牌堆移除并退回玩家手牌
- **AND** 游戏阶段恢复为 playing
- **AND** 当前回合仍为该玩家

#### Scenario: 取消换色牌打出
- **GIVEN** 玩家打出一张 wild 牌，游戏进入 color-picking 阶段
- **WHEN** 玩家在 ColorPicker 中点击"取消"按钮
- **THEN** wild 牌从弃牌堆移除并退回玩家手牌
- **AND** 游戏阶段恢复为 playing
- **AND** 当前回合仍为该玩家

### Requirement: 结算界面可访问调试面板
系统 SHALL 在结算界面（round-over 阶段）显示调试按钮，允许玩家查看游戏日志。

#### Scenario: 结算界面打开调试面板
- **GIVEN** 游戏进入 round-over 结算阶段
- **WHEN** 玩家点击调试（Bug）按钮
- **THEN** 调试面板弹出并显示游戏日志