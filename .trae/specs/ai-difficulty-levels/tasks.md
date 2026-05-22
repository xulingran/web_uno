# Tasks

- [x] Task 1: 新增 AI 配置类型和默认值
  - [x] 1.1 在 `src/config/types.ts` 中新增 `Difficulty` 类型和 `AIConfig` 接口
  - [x] 1.2 在 `GameConfig` 中增加 `ai` 字段
  - [x] 1.3 在 `src/config/defaults.ts` 中增加 `ai` 默认配置（默认 `medium`）
  - [x] 1.4 在 `src/store/gameStore.ts` 初始 state 中增加 `ai` 默认值

- [x] Task 2: 更新预设配置
  - [x] 2.1 在 `src/config/presets.ts` 三个预设中分别增加 `ai` 配置（经典→medium，休闲→easy，硬核→hard）

- [x] Task 3: 重构 AI 函数支持难度参数
  - [x] 3.1 `findBestCard` 接受 `AIConfig`，基于 `playRandomness` 随机化选牌
  - [x] 3.2 `chooseColor` 接受 `AIConfig` + 对手信息，`considerOpponent` 时选择最不利下家的颜色
  - [x] 3.3 `shouldStackDraw` 接受 `AIConfig`，用 `stackAggression` 替换固定概率
  - [x] 3.4 `shouldChallengeWild4` 接受 `AIConfig`，用 `challengeAggression` 调整公式
  - [x] 3.5 新增 `shouldBluffWild4` 函数，基于 `wild4BluffChance` 决定是否诈唬
  - [x] 3.6 导出 `DIFFICULTY_CONFIGS` 常量，方便各调用方获取难度参数

- [x] Task 4: 更新 AI 调用方传入难度
  - [x] 4.1 修改 `src/hooks/useGameEngine.ts`，AI 出牌/叠牌/质疑/选色时传入 `config.ai`
  - [x] 4.2 修改 `src/store/gameStore.ts` 中 AI 相关逻辑，传入 `config.ai`（无需额外修改，GameConfig 已包含 ai 字段）

- [x] Task 5: 设置面板增加难度选择 UI
  - [x] 5.1 在 `src/components/SettingsPanel.tsx` 基础参数区增加难度选择器（三个按钮）
  - [x] 5.2 切换难度时更新 `config.ai`，预设标记变为 `custom`

# Task Dependencies
- [Task 2] depends on [Task 1.1, 1.2]
- [Task 3] depends on [Task 1.1, 1.2]
- [Task 4] depends on [Task 3]
- [Task 5] depends on [Task 1.1, 1.2]