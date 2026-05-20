# 任务清单

- [x] 任务 1：初始化项目脚手架
  - [x] 使用 Vite + React + TypeScript + Tailwind CSS 模板创建项目
  - [x] 安装依赖（zustand、lucide-react）
  - [x] 配置 Tailwind CSS 主题（UNO 四色 + 暗色牌桌风格）
  - [x] 验证 `npm run dev` 正常启动

- [x] 任务 2：创建核心类型定义与牌组工具
  - [x] 创建 `src/utils/types.ts`：Card、Player、GameState 等类型定义
  - [x] 创建 `src/utils/deck.ts`：createDeck()、shuffleDeck() 函数
  - [x] 验证：运行 `npx tsx src/utils/deck.ts` 输出 108 张牌

- [x] 任务 3：实现游戏规则引擎
  - [x] 创建 `src/utils/rules.ts`：canPlayCard()、getNextPlayerIndex()、calculateScore() 等函数
  - [x] 实现所有卡牌效果逻辑（Skip/Reverse/+2/Wild/Wild+4）
  - [x] 验证：编写 Node 测试脚本验证规则正确性

- [x] 任务 4：实现 AI 决策系统
  - [x] 创建 `src/utils/ai.ts`：findBestCard()、chooseColor() 函数
  - [x] AI 优先级：数字牌 > Skip/Reverse > +2 > Wild > Wild+4
  - [x] 验证：测试 AI 在各种场景下的出牌选择

- [x] 任务 5：创建 Zustand 全局状态管理
  - [x] 创建 `src/store/gameStore.ts`：完整 GameState 及所有 actions
  - [x] Actions：initGame、playCard、drawCard、pickColor、advanceTurn、startNewGame
  - [x] 集成牌组工具和规则引擎

- [x] 任务 6：实现卡牌 UI 组件
  - [x] 创建 `src/components/Card.tsx`：渲染卡牌（颜色、数字/符号、角标）
  - [x] 卡牌样式：白色底、圆角、阴影、不同颜色边框
  - [x] 创建 `src/components/CardBack.tsx`：UNO 经典红色卡背样式
  - [x] 悬停效果和点击动画

- [x] 任务 7：实现游戏主面板组件
  - [x] 创建 `src/components/GameBoard.tsx`：牌桌布局
  - [x] 创建 `src/components/PlayerHand.tsx`：玩家手牌区（扇形排列，可出牌高亮）
  - [x] 创建 `src/components/AIHand.tsx`：AI 手牌展示（卡背 + 牌数）
  - [x] 创建 `src/components/DiscardPile.tsx`：弃牌堆展示
  - [x] 创建 `src/components/DrawPile.tsx`：牌库堆（可点击抽牌）

- [x] 任务 8：实现游戏交互组件
  - [x] 创建 `src/components/ColorPicker.tsx`：四色圆形选择面板
  - [x] 创建 `src/components/GameInfo.tsx`：方向指示器、当前颜色指示
  - [x] 创建 `src/components/UNOCall.tsx`：UNO 呼叫动画提示
  - [x] 创建 `src/components/Scoreboard.tsx`：回合结束计分板

- [x] 任务 9：实现游戏引擎 Hook
  - [x] 创建 `src/hooks/useGameEngine.ts`：协调游戏流程
  - [x] 处理玩家回合（点击出牌、抽牌、变色选择）
  - [x] 处理 AI 回合（自动延迟出牌）
  - [x] 处理回合切换、UNO 检测、牌库重洗

- [x] 任务 10：组装 GamePage 并完成整体集成
  - [x] 创建 `src/pages/GamePage.tsx`：整合所有组件
  - [x] 创建 `src/App.tsx`：路由配置
  - [x] 创建 `src/main.tsx`：应用入口
  - [x] 创建 `src/index.css`：全局样式、字体配置、Tailwind 指令
  - [x] 端到端验证：完整游戏流程可运行

- [x] 任务 11：验证与优化
  - [x] 运行 `npm run build` 确保构建成功
  - [x] 验证所有游戏场景（Skip/Reverse/+2/Wild/Wild+4/UNO/获胜）
  - [x] 验证响应式布局
  - [x] 修复视觉和交互细节

- [x] 任务 12：GitHub Pages 部署配置
  - [x] 配置 `vite.config.ts` 的 `base` 为 `'/uno/'`
  - [x] 将路由改为 HashRouter 避免刷新 404
  - [x] 创建 `.github/workflows/deploy.yml` 自动部署工作流
  - [x] 验证 `npm run build` 产物可正确托管

# 任务依赖

- 任务 2 无依赖，可并行
- 任务 3 依赖任务 2
- 任务 4 依赖任务 2、3
- 任务 5 依赖任务 2、3、4
- 任务 6 依赖任务 2
- 任务 7 依赖任务 5、6
- 任务 8 依赖任务 5
- 任务 9 依赖任务 5
- 任务 10 依赖任务 7、8、9
- 任务 11 依赖任务 10
- 任务 12 依赖任务 11