# 为项目添加测试覆盖率 Spec

## Why
当前项目无任何自动化测试，核心游戏逻辑（牌组、规则、AI 决策、计分、状态管理）完全依赖手动验证。一旦重构或新增规则变体，回归风险极高。需要为关键模块建立单元测试体系，确保代码质量和可维护性。

## What Changes
- 安装 Vitest + @testing-library/react + jsdom 测试套件
- 为 `src/utils/` 下所有纯函数模块编写单元测试（deck.ts, rules.ts, ai.ts, layout.ts）
- 为 `src/config/` 下配置模块编写单元测试（defaults.ts, presets.ts）
- 为 `src/store/` 下 Zustand store 编写集成测试（gameStore.ts, configStore.ts）
- 为关键 React 组件编写渲染测试（Card.tsx, GameBoard.tsx, ColorPicker.tsx 等）
- 在 package.json 中添加 test / test:coverage 脚本
- 配置 Vitest 的覆盖率阈值（行覆盖率 ≥ 60%，分支覆盖率 ≥ 50%）

## Impact
- Affected specs: 无（新增基础设施）
- Affected code: `package.json`, `vite.config.ts`, `tsconfig.json`（新增 vitest 配置）, 新增 `src/**/__tests__/` 目录

## ADDED Requirements

### Requirement: 测试基础设施搭建
系统 SHALL 集成 Vitest 作为测试运行器，支持 TypeScript、JSX/TSX、路径别名 `@/`。

#### Scenario: 运行测试命令
- **WHEN** 执行 `npm run test`
- **THEN** Vitest 发现并运行所有 `*.test.ts` 和 `*.test.tsx` 文件

#### Scenario: 生成覆盖率报告
- **WHEN** 执行 `npm run test:coverage`
- **THEN** 输出覆盖率报告（text + html），行覆盖率 ≥ 60%，分支覆盖率 ≥ 50%

#### Scenario: CI 环境运行测试
- **WHEN** `npm run test:run` 执行
- **THEN** 单次运行所有测试，零交互，退出码反映成功/失败

### Requirement: utils/deck.ts 单元测试
系统 SHALL 测试 `createDeck`、`shuffleDeck`、`dealCards`、`drawCards`、`getCardScore` 五个导出函数。

#### Scenario: createDeck 生成 108 张标准牌组
- **WHEN** 调用 `createDeck()`
- **THEN** 返回 108 张牌的数组，包含 76 张数字牌、8 张 Skip、8 张 Reverse、8 张 Draw2、4 张 Wild、4 张 Wild4

#### Scenario: shuffleDeck 洗牌不改变牌组内容
- **WHEN** 对标准牌组调用 `shuffleDeck()`
- **THEN** 返回相同数量的牌，所有牌 ID 与原牌组一致（仅顺序不同）

#### Scenario: dealCards 正确发牌
- **WHEN** 对 108 张牌调用 `dealCards(deck, 3, 7)`
- **THEN** 返回 3 组各 7 张牌，剩余 87 张

#### Scenario: drawCards 从牌堆抽牌
- **WHEN** 对 10 张牌调用 `drawCards(pile, 3)`
- **THEN** 返回 3 张抽出的牌，剩余 7 张

#### Scenario: getCardScore 计算卡牌分数
- **WHEN** 传入数字牌 value=5，默认配置
- **THEN** 返回 5（按面值计分）
- **WHEN** 传入功能牌（skip/reverse/draw2），默认配置
- **THEN** 返回 20
- **WHEN** 传入 Wild/Wild4
- **THEN** 返回 50

### Requirement: utils/rules.ts 单元测试
系统 SHALL 测试 `canPlayCard`、`getNextPlayerIndex`、`getActionEffect`、`canStack`、`canJumpIn` 五个导出函数。

#### Scenario: canPlayCard 判断出牌合法性
- **WHEN** 弃牌堆为空
- **THEN** 任意牌均可打出
- **WHEN** 卡牌颜色与当前颜色匹配
- **THEN** 可打出
- **WHEN** 卡牌数字与弃牌堆顶部数字相同
- **THEN** 可打出
- **WHEN** 卡牌类型与弃牌堆顶部类型相同（同为 skip）
- **THEN** 可打出
- **WHEN** Wild 卡在任意情况
- **THEN** 可打出
- **WHEN** Wild4 且手牌中有当前颜色
- **THEN** 不可打出
- **WHEN** Wild4 且手牌中无当前颜色
- **THEN** 可打出

#### Scenario: getNextPlayerIndex 正确计算下家
- **WHEN** 3 人局，顺时针，当前位置 0，skipCount=0
- **THEN** 返回 1
- **WHEN** 3 人局，逆时针，当前位置 0，skipCount=0
- **THEN** 返回 2
- **WHEN** 2 人局，任意方向，skipCount=1
- **THEN** 返回当前玩家（跳过自己）

#### Scenario: getActionEffect 返回正确的卡牌效果
- **WHEN** 传入 Skip 卡
- **THEN** 返回 `{ skipNext: true, needsColorPick: false, reverse: false, drawCount: 0 }`
- **WHEN** 传入 Draw2 卡
- **THEN** 返回 `{ skipNext: true, drawCount: 2 }`
- **WHEN** 传入 Wild4 卡
- **THEN** 返回 `{ needsColorPick: true, skipNext: true, drawCount: 4 }`
- **WHEN** 2 人局传入 Reverse，reverseAsSkip=true
- **THEN** 返回 `{ skipNext: true, reverse: false }`

#### Scenario: canStack 判断叠牌合法性
- **WHEN** stackingDraw2=true 且在 draw2 上再出 draw2
- **THEN** 返回 true
- **WHEN** stackingDraw4=true 且在 wild4 上再出 wild4
- **THEN** 返回 true
- **WHEN** 配置关闭叠牌
- **THEN** 返回 false

### Requirement: utils/ai.ts 单元测试
系统 SHALL 测试 `findBestCard`、`chooseColor`、`shouldStackDraw`、`shouldChallengeWild4` 四个导出函数。

#### Scenario: findBestCard 无牌可出时返回 null
- **WHEN** 手牌无匹配弃牌堆顶的牌
- **THEN** 返回 null

#### Scenario: findBestCard 优先出数字牌
- **WHEN** 手牌有数字牌和功能牌均可出
- **THEN** 返回数字牌（最高数值优先）

#### Scenario: findBestCard 有对手即将胜利时出攻击牌
- **WHEN** considerOpponent=true 且有对手手牌 ≤ 2
- **THEN** 优先出 draw2/skip/reverse

#### Scenario: chooseColor 选择手牌中最多的颜色
- **WHEN** 手牌中红色最多
- **THEN** 返回 'red'

#### Scenario: shouldStackDraw 根据栈叠侵略性决定
- **WHEN** stackAggression=1.0 且有可叠 draw2
- **THEN** 返回 draw2 牌（确定叠）
- **WHEN** stackAggression=0 且有可叠 draw2
- **THEN** 返回 null（不叠）

### Requirement: utils/layout.ts 单元测试
系统 SHALL 测试 `distributeAIPlayers` 函数。

#### Scenario: 0 个 AI 时返回空分布
- **WHEN** count=0
- **THEN** top 为空，left/right 为 null

#### Scenario: 1 个 AI 时放在顶部
- **WHEN** count=1
- **THEN** top=[1]，left/right 为 null

#### Scenario: 3 个 AI 时分左右
- **WHEN** count=3
- **THEN** top=[2]，left=1，right=3

### Requirement: config/defaults.ts 单元测试
系统 SHALL 测试 `loadConfig`、`saveConfig`、`deepMerge`、`DEFAULT_CONFIG`。

#### Scenario: DEFAULT_CONFIG 结构完整
- **WHEN** 读取 DEFAULT_CONFIG
- **THEN** 包含 params、actionCards、draw、uno、scoring、ai 六个分组

#### Scenario: loadConfig 在无 localStorage 时返回默认值
- **WHEN** localStorage 为空
- **THEN** 返回 DEFAULT_CONFIG 的深拷贝

#### Scenario: deepMerge 正确合并嵌套对象
- **WHEN** 合并两个含嵌套结构的配置
- **THEN** 保留未覆盖的默认值，覆盖指定的值

### Requirement: config/presets.ts 单元测试
系统 SHALL 测试 `getPresetConfig` 和 `PRESETS` 数据。

#### Scenario: 获取已知预设
- **WHEN** 调用 getPresetConfig('classic')
- **THEN** 返回经典规则配置

#### Scenario: 获取不存在的预设
- **WHEN** 调用 getPresetConfig('nonexistent')
- **THEN** 返回 undefined

### Requirement: store/gameStore.ts 集成测试
系统 SHALL 测试 Zustand store 的核心 action：`initGame`、`playCard`、`drawCard`、`pickColor`、`startNewGame`。

#### Scenario: initGame 初始化游戏状态
- **WHEN** 调用 initGame()
- **THEN** players 长度为 3（1 玩家 + 2 AI），每人 7 张牌，phase 为 'playing'，deck 剩余 87 张

#### Scenario: playCard 打出合法卡牌
- **WHEN** 当前玩家为人类且有可出牌，调用 playCard(cardId)
- **THEN** 该牌从手牌移除，加入弃牌堆，轮到下家

#### Scenario: playCard 打出非法卡牌不生效
- **WHEN** 尝试打出不匹配的卡牌
- **THEN** 状态不变

#### Scenario: drawCard 抽牌
- **WHEN** 手牌无可出牌且玩家点击抽牌
- **THEN** 手牌增加 1 张，牌库减少 1 张

#### Scenario: pickColor 选色后继续游戏
- **WHEN** phase 为 'color-picking'，调用 pickColor('blue')
- **THEN** currentColor 变为 'blue'，phase 变为 'playing'

#### Scenario: 出完牌后游戏结束
- **WHEN** 玩家打出最后一张牌
- **THEN** winner 不为 null，phase 为 'round-over'

### Requirement: store/configStore.ts 集成测试
系统 SHALL 测试 configStore 的 `updateParam`、`applyPreset`、`resetToDefaults`。

#### Scenario: updateParam 更新配置分组
- **WHEN** 调用 updateParam('params', { aiPlayerCount: 3 })
- **THEN** config.params.aiPlayerCount 变为 3

#### Scenario: applyPreset 应用预设
- **WHEN** 调用 applyPreset('casual')
- **THEN** config 变为休闲娱乐预设

#### Scenario: resetToDefaults 恢复默认
- **WHEN** 调用 resetToDefaults()
- **THEN** config 等于 DEFAULT_CONFIG

### Requirement: React 组件基础渲染测试
系统 SHALL 为关键组件编写渲染测试，验证组件可正常挂载且无崩溃。

#### Scenario: Card 组件渲染
- **WHEN** 渲染 `<Card card={...} />` 传入数字牌
- **THEN** 显示数字和颜色

#### Scenario: CardBack 组件渲染
- **WHEN** 渲染 `<CardBack />`
- **THEN** 显示卡背图案

#### Scenario: ColorPicker 组件渲染
- **WHEN** 渲染 `<ColorPicker />` 并传入 onPick 回调
- **THEN** 显示四种颜色选项

#### Scenario: GameBoard 组件渲染
- **WHEN** 渲染 `<GameBoard />`
- **THEN** 页面不崩溃，显示游戏区域