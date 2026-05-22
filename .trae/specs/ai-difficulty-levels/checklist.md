# Checklist

- [x] `Difficulty` 类型定义在 `src/config/types.ts`，值为 `'easy' | 'medium' | 'hard'`
- [x] `AIConfig` 接口包含全部 6 个参数：`playRandomness`、`stackAggression`、`challengeAggression`、`wild4BluffChance`、`considerOpponent`、`colorStrategy`
- [x] `GameConfig` 包含 `ai: AIConfig` 字段
- [x] `DEFAULT_CONFIG` 中 `ai` 默认为 medium 参数
- [x] `gameStore.ts` 初始 state 中 `config.ai` 为 medium 参数
- [x] 三个预设（classic/casual/hardcore）分别对应 medium/easy/hard 的 `ai` 配置
- [x] `findBestCard` 基于 `playRandomness` 实现随机化（Easy 40%、Medium 10%、Hard 0%）
- [x] `chooseColor` 在 `considerOpponent` 时分析对手并选最不利颜色（best 策略分析弃牌堆颜色分布）
- [x] `shouldStackDraw` 用 `stackAggression` 替换固定概率（Easy 0.3、Medium 0.6、Hard 0.85）
- [x] `shouldChallengeWild4` 用 `challengeAggression` 调整质疑公式
- [x] `shouldBluffWild4` 函数基于 `wild4BluffChance` 实现诈唬
- [x] `DIFFICULTY_CONFIGS` 常量可导出并包含三档难度的完整参数
- [x] `useGameEngine.ts` 中所有 AI 调用传入 `config.ai`
- [x] `gameStore.ts` 中所有 AI 调用传入 `config.ai`（无需修改，GameConfig 结构满足）
- [x] 设置面板「基础参数」区显示三个难度按钮（简单/中等/困难），点击切换生效
- [x] 切换难度后预设标记变为 `custom`（通过 updateParam 自动实现）
- [x] TypeScript 编译无误（`npx tsc --noEmit` 通过）