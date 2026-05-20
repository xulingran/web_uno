# AI 难度等级 Spec

## Why
当前所有 AI 使用同一套固定策略逻辑，没有难度区分。新手玩家觉得 AI 太强（全知全能地选择最优牌），老手玩家觉得 AI 太弱（策略单一可预测）。需要引入 Easy/Medium/Hard 三档难度，用不同行为参数影响 AI 决策，让不同水平的玩家都有合适的挑战。

## What Changes
- 新增 `Difficulty` 类型定义（`easy` | `medium` | `hard`）
- 新增 `AIConfig` 配置分组，包含 6 个策略参数
- 修改 `ai.ts` 中的 AI 决策函数，接受难度参数并差异化行为
- 预设配置中植入推荐难度（经典/休闲→Medium，硬核→Hard）
- 设置面板新增难度选择器 UI

## Impact
- Affected specs: 无（新增特性，不影响现有 spec）
- Affected code:
  - `src/config/types.ts` — 新增 `Difficulty` 类型 + `AIConfig` 接口
  - `src/config/defaults.ts` — 默认配置增加 `ai` 分组
  - `src/config/presets.ts` — 三个预设增加 `ai` 配置
  - `src/utils/ai.ts` — 所有函数接受难度参数，行为差异化
  - `src/components/SettingsPanel.tsx` — 新增难度选择 UI
  - `src/hooks/useGameEngine.ts` — AI 调用时传入难度
  - `src/store/gameStore.ts` — 初始配置包含 `ai` 分组
  - `src/store/configStore.ts` — 可能无需变化（updateParam 已是泛型）

## ADDED Requirements

### Requirement: AI Difficulty Type
系统 SHALL 支持三种 AI 难度：`easy`、`medium`、`hard`。

#### Scenario: 难度类型定义
- **WHEN** 开发者引用 `Difficulty` 类型
- **THEN** 可选值为 `'easy' | 'medium' | 'hard'`

### Requirement: AI Config Parameters
系统 SHALL 通过 `AIConfig` 接口暴露以下策略参数，每种难度有不同的默认值：

| 参数 | 类型 | 说明 | Easy | Medium | Hard |
|------|------|------|------|--------|------|
| `playRandomness` | number (0~1) | 随机选牌概率（非最优） | 0.4 | 0.1 | 0 |
| `stackAggression` | number (0~1) | 叠加 +2/+4 概率 | 0.3 | 0.6 | 0.85 |
| `challengeAggression` | number (0~1) | 质疑 +4 倾向倍数 | 0.3 | 0.7 | 1.0 |
| `wild4BluffChance` | number (0~1) | 诈唬出 +4 概率 | 0 | 0.15 | 0.35 |
| `considerOpponent` | boolean | 是否针对手牌少/多者 | false | true | true |
| `colorStrategy` | string | 颜色选择策略 | `most` | `most` | `best` |

#### Scenario: Easy 难度参数
- **WHEN** 难度设为 `easy`
- **THEN** `playRandomness` = 0.4，AI 有 40% 概率随机选牌而非最优牌
- **THEN** `stackAggression` = 0.3，AI 较少叠加
- **THEN** `wild4BluffChance` = 0，AI 不诈唬
- **THEN** `considerOpponent` = false，不针对其他玩家

#### Scenario: Medium 难度参数
- **WHEN** 难度设为 `medium`
- **THEN** `playRandomness` = 0.1，AI 偶尔随机选牌
- **THEN** `stackAggression` = 0.6，AI 有一定叠加倾向
- **THEN** `considerOpponent` = true，会针对手牌少的玩家

#### Scenario: Hard 难度参数
- **WHEN** 难度设为 `hard`
- **THEN** `playRandomness` = 0，AI 始终选择最优牌
- **THEN** `stackAggression` = 0.85，AI 高度倾向于叠加
- **THEN** `wild4BluffChance` = 0.35，AI 有一定概率诈唬
- **THEN** `colorStrategy` = `best`，AI 会分析局势选择最优颜色

### Requirement: AI 出牌决策差异化
系统 SHALL 基于 `playRandomness` 参数影响 `findBestCard` 的选牌行为：

#### Scenario: Easy 难度随机出牌
- **WHEN** 难度为 `easy` 且 `playRandomness` = 0.4
- **THEN** AI 有 40% 概率从可出牌中随机选一张，60% 按最优策略选
- **THEN** 随机选牌时，AI 不会选 +4 牌（保留万能牌）

#### Scenario: Medium 难度偶尔随机
- **WHEN** 难度为 `medium` 且 `playRandomness` = 0.1
- **THEN** AI 有 10% 概率随机选牌，90% 按最优策略选

#### Scenario: Hard 难度始终最优
- **WHEN** 难度为 `hard` 且 `playRandomness` = 0
- **THEN** AI 始终按最优策略选牌

### Requirement: AI 叠加行为差异化
系统 SHALL 基于 `stackAggression` 参数影响 `shouldStackDraw` 的叠加概率：

#### Scenario: 难度影响叠加概率
- **WHEN** `shouldStackDraw` 被调用
- **THEN** Draw2 叠加概率 = `stackAggression`（替换当前固定 0.7）
- **THEN** Wild4 叠加概率 = `stackAggression * 0.7`（替换当前固定 0.5）

### Requirement: AI 质疑行为差异化
系统 SHALL 基于 `challengeAggression` 参数影响 `shouldChallengeWild4` 的判断阈值：

#### Scenario: 难度影响质疑倾向
- **WHEN** `shouldChallengeWild4` 被调用
- **THEN** 质疑概率公式中的倍率因子从固定 `2` 改为 `2 * challengeAggression`

### Requirement: AI 诈唬行为
系统 SHALL 基于 `wild4BluffChance` 参数，让 AI 在明知有匹配颜色时仍可能出 +4：

#### Scenario: Hard 难度诈唬
- **WHEN** 难度为 `hard`、规则允许 +4 质疑、AI 有匹配颜色但也有 +4
- **THEN** AI 有 `wild4BluffChance`（35%）概率选择诈唬（出 +4）
- **THEN** 若诈唬失败被质疑，AI 正常接受惩罚

#### Scenario: Easy 难度不诈唬
- **WHEN** 难度为 `easy` 且 `wild4BluffChance` = 0
- **THEN** AI 绝不诈唬

### Requirement: AI 针对对手策略
系统 SHALL 基于 `considerOpponent` 参数，让 Hard/Medium AI 优先对手牌最少或最多的玩家使用功能牌：

#### Scenario: Hard 难度针对快赢玩家
- **WHEN** 难度为 `hard` 且 `considerOpponent` = true
- **THEN** AI 选择 `skip`/`reverse`/`draw2` 目标时，优先针对手牌 ≤ 2 的玩家
- **THEN** `chooseColor` 时分析下家手中可能缺的颜色，选择最不利的颜色

#### Scenario: Easy 难度无视对手
- **WHEN** 难度为 `easy` 且 `considerOpponent` = false
- **THEN** AI 不进行对手手牌分析，只基于自身手牌决策

### Requirement: 预设难度对应
系统 SHALL 在三个预设中设定推荐难度：

#### Scenario: 预设-难度对应
- **WHEN** 选择「经典规则」预设
- **THEN** AI 难度默认为 `medium`
- **WHEN** 选择「休闲娱乐」预设
- **THEN** AI 难度默认为 `easy`
- **WHEN** 选择「硬核竞技」预设
- **THEN** AI 难度默认为 `hard`

### Requirement: 难度选择 UI
系统 SHALL 在设置面板的「基础参数」分组中提供难度选择器：

#### Scenario: 难度选择器
- **WHEN** 用户在设置面板查看基础参数
- **THEN** 看到三个难度按钮：「简单」「中等」「困难」，高亮当前选中项
- **WHEN** 用户点击某个难度
- **THEN** 难度立即切换，预设标记变为「custom」