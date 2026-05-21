# Tasks

- [x] Task 1: 在 gameStore 中新增 `gameStartTime` 状态字段
  - 在 `StoreState` 接口中添加 `gameStartTime: number | null` 字段
  - 在初始状态中设置 `gameStartTime: null`
  - 在 `completeDealing` 中设置 `gameStartTime: Date.now()`（游戏正式开始的时机）
  - 在 `startNewGame` 重置时将 `gameStartTime` 设为 `null`

- [x] Task 2: 在 GameInfo 组件中显示本局游戏计时
  - 接收 `gameStartTime` prop（由 GameBoard 传入）
  - 使用 `useState` + `useEffect` + `setInterval` 实现每秒更新的计时器
  - 格式化显示为 `MM:SS` 或 `HH:MM:SS`
  - 在状态栏中合适位置展示（作为一个新的信息段）

- [x] Task 3: 在 gameStore 中新增 `cancelColorPick` action
  - 仅当 `phase === 'color-picking'` 且当前玩家为人类时才执行
  - 从弃牌堆顶部取出最后打出的牌，退回当前玩家手牌
  - 恢复 `phase` 为 `'playing'`
  - 清除 `lastPlayedBy`、`lastActionEffect`、`colorBeforeWild` 等临时状态
  - 保留 `currentPlayerIndex` 不变（仍为该玩家回合）

- [x] Task 4: 在 ColorPicker 组件中增加取消按钮
  - 新增 `onCancel` prop（可选回调）
  - 在颜色选择按钮下方添加「取消」按钮
  - 按钮样式与现有 UI 风格一致（半透明背景，白色文字）

- [x] Task 5: 在 GameBoard 中连接取消逻辑
  - 将 `cancelColorPick` 函数传递给 `ColorPicker` 的 `onCancel` prop
  - 透传 `gameStartTime` 给 `GameInfo`

- [x] Task 6: 在结算界面（round-over 阶段）显示 debug 按钮
  - 在 GameBoard 中，当 `phase === 'round-over'` 时也渲染 debug 按钮（Bug 图标）
  - 确保 `DebugPanel` 在 round-over 阶段也能正常显示

# Task Dependencies
- Task 2 依赖 Task 1
- Task 5 依赖 Task 3 和 Task 4
- Task 1、Task 3、Task 4、Task 6 可并行执行