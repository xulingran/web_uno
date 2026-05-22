# Tasks

- [x] Task 1: 安装测试依赖并配置 Vitest
  - 安装 vitest、@testing-library/react、@testing-library/jest-dom、@testing-library/user-event、jsdom、@vitest/coverage-v8
  - 在 `vite.config.ts` 中添加 `test` 配置（environment: 'jsdom', globals: true, include 路径, coverage 阈值, 路径别名）
  - 在 `package.json` 中添加 `test`、`test:coverage`、`test:run` 脚本

- [x] Task 2: 编写 `src/utils/deck.test.ts` — deck.ts 的单元测试
  - createDeck: 108 张牌、牌型分布正确
  - shuffleDeck: 不丢失牌、不改变牌 ID 集合
  - dealCards: 正确分发玩家手牌和剩余牌堆
  - drawCards: 正确抽取指定数量
  - getCardScore: 数字牌/功能牌/Wild 计分规则

- [x] Task 3: 编写 `src/utils/rules.test.ts` — rules.ts 的单元测试
  - canPlayCard: 空弃牌堆、颜色匹配、数字匹配、类型匹配、Wild 万能、Wild4 限制
  - getNextPlayerIndex: 顺时针/逆时针、多人和 2 人局
  - getActionEffect: Skip/Draw2/Wild4/Reverse/普通牌效果，2 人局 reverseAsSkip
  - canStack: draw2 叠 draw2、wild4 叠 wild4、配置关闭
  - canJumpIn: 同色同数字跳入、同色同类型跳入

- [x] Task 4: 编写 `src/utils/ai.test.ts` — ai.ts 的单元测试
  - findBestCard: 无可出牌 → null、优先数字牌、攻击威胁对手、7/0 规则
  - chooseColor: 选最多颜色、best 策略
  - shouldStackDraw: aggression=1 → 叠、aggression=0 → 不叠
  - shouldChallengeWild4: 挑战判断逻辑

- [x] Task 5: 编写 `src/utils/layout.test.ts` — layout.ts 的单元测试
  - distributeAIPlayers: count=0/1/2/3/5 各路分布

- [x] Task 6: 编写 `src/config/defaults.test.ts` — defaults.ts 的单元测试
  - DEFAULT_CONFIG 结构完整性
  - loadConfig 无 localStorage → 默认值
  - deepMerge 嵌套合并
  - DIFFICULTY_CONFIGS 完整性

- [x] Task 7: 编写 `src/config/presets.test.ts` — presets.ts 的单元测试
  - PRESETS 三个预设存在
  - getPresetConfig 正常/不存在

- [x] Task 8: 编写 `src/store/configStore.test.ts` — configStore 的集成测试
  - updateParam 更新分组
  - applyPreset 切换预设
  - resetToDefaults 恢复默认

- [x] Task 9: 编写 `src/store/gameStore.test.ts` — gameStore 的集成测试
  - initGame 初始化：玩家数、手牌数、phase、牌库数量
  - playCard: 合法出牌、非法出牌被拒绝、出完牌获胜
  - drawCard: 无可出牌时抽牌、有可出牌时不能抽牌
  - pickColor: 选色后 phase 变为 playing
  - startNewGame: 重置并重新初始化

- [x] Task 10: 编写 `src/components/Card.test.tsx` — Card 组件渲染测试
  - 数字牌渲染数字和颜色样式
  - 功能牌渲染对应图标文字
  - Wild 牌渲染（无颜色时默认样式）

- [x] Task 11: 编写 `src/components/CardBack.test.tsx` — CardBack 组件渲染测试
  - 卡背元素渲染

- [x] Task 12: 编写 `src/components/ColorPicker.test.tsx` — ColorPicker 组件渲染测试
  - 四种颜色选项渲染
  - onClick 回调触发

- [x] Task 13: 编写 `src/components/GameBoard.test.tsx` — GameBoard 组件渲染测试
  - 页面可正常挂载

- [x] Task 14: 验证覆盖率达标并修复
  - 运行 `npm run test:coverage`
  - 确认行覆盖率 ≥ 60%，分支覆盖率 ≥ 50%
  - 若未达标，补充边界测试用例

# Task Dependencies
- [Task 2], [Task 3], [Task 4], [Task 5], [Task 6], [Task 7] 均依赖 [Task 1]（测试基础设施）
- [Task 8], [Task 9] 依赖 [Task 1]
- [Task 10], [Task 11], [Task 12], [Task 13] 依赖 [Task 1]
- [Task 14] 依赖所有其他 Task
- Task 2-7 可并行执行
- Task 8-9 可并行执行
- Task 10-13 可并行执行