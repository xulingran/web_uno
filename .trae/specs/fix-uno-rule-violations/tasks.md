# Tasks

- [x] 任务 1：修复初始翻牌逻辑（Wild / Draw Two）
  - [x] 修改 `getFirstValidTopCard`：仅拒绝 Wild Draw Four，允许普通 Wild 作为初始牌
  - [x] 修改 `initGame`：处理普通 Wild 作为初始牌时进入 color-picking 阶段
  - [x] 修改 `initGame`：初始 Draw Two 应让玩家 0 直接摸牌并被跳过，而非调用 advanceTurn

- [x] 任务 2：修复摸牌后可选择出牌
  - [x] 修改 `drawCard`：默认配置下摸牌后如果摸到的牌可出，不立即 advanceTurn，等待玩家决定
  - [x] 在 GameBoard 中添加跳过按钮：玩家可以选择不出牌，此时调用 advanceTurn

- [x] 任务 3：修复 AI 质疑 Wild Draw Four
  - [x] 修改 `pickColor`：当下一玩家是 AI 时，调用 shouldChallengeWild4 让 AI 决定是否质疑
  - [x] 处理 AI 质疑成功/失败的完整流程

- [x] 任务 4：修复 Jump-In 万能牌兼容
  - [x] 修改 `GameBoard.tsx`：导入并使用 `canJumpIn` 替换手写的 jumpInCards 逻辑

- [x] 任务 5：修复叠牌时允许普通出牌的问题
  - [x] 修改 `playCard`：当 pendingDrawCount > 0 时，只允许叠牌卡牌，拒绝普通出牌
  - [x] 同步修改 UI 层的 playableCards 计算，面临罚摸时排除普通牌

- [x] 任务 6：修复 Store 层 drawCard 校验
  - [x] 在 `drawCard` 函数开头添加校验：如果玩家有可出的牌，拒绝执行摸牌

# Task Dependencies

- 所有任务已完成