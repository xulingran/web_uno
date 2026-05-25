# UNO 局域网联机功能设计

## 概述

为现有的 UNO 卡牌游戏添加局域网联机功能，支持多名人类玩家通过浏览器在同一局域网内对战，同时保留 AI 玩家混合使用的能力。基于 PeerJS (WebRTC) 实现，无需后端服务器，兼容 GitHub Pages 纯静态部署。

## 架构模型：房主制 (Host-Client)

采用房主制架构，类似于桌游联机方式：

- **房主 (Host)**：创建房间的玩家，其浏览器充当"服务器"，运行完整的游戏引擎、AI 逻辑，维护权威游戏状态，并广播状态更新给所有客户端。
- **客户端 (Client)**：加入房间的其他玩家，仅负责展示 UI 和发送用户操作，不执行任何游戏逻辑。

### 角色职责

| 职责 | 房主 | 客户端 |
|------|------|--------|
| 游戏逻辑执行 | ✅ | ❌ |
| AI 决策 | ✅ | ❌ |
| 权威状态维护 | ✅ | ❌ |
| UI 展示 | ✅ | ✅ |
| 用户输入 | ✅ | ✅ |

### 数据流

1. 客户端发送操作请求 (`game:play-card`, `game:draw-card` 等) → 房主
2. 房主执行操作，更新本地 `gameStore` 状态
3. 房主通过 `stateView` 过滤状态 → 广播给每个客户端
4. 客户端收到状态 → 更新本地 `remoteGameStore` → UI 响应
5. AI 回合：房主本地执行 AI 操作 → 广播结果给所有客户端

## 通信技术：PeerJS (WebRTC)

使用 PeerJS 库简化 WebRTC 连接建立：

- 房主创建 PeerJS peer，生成 4 位房间码（派生自 peer ID）
- 客户端通过房间码连接到房主的 peer
- PeerJS 提供免费云端信令服务器用于初始握手（需要联网，但能访问 GitHub Pages 即有网）
- 握手完成后，数据通过 WebRTC 数据通道直接在浏览器间传输（局域网内低延迟）

## 状态可见性规则

**所有人（包括房主）都只能看到自己的手牌，其他人的手牌只显示数量。**

| 信息 | 任何玩家看到的 |
|------|---------------|
| 自己的手牌 | ✅ 全部 |
| 他人手牌 | 🔢 仅数量 |
| 弃牌堆 | ✅ 全部可见 |
| 摸牌堆 | 🔢 仅数量 |
| 当前颜色/方向/回合 | ✅ 全部可见 |

房主内部维护完整状态（AI 运算需要），但 UI 展示和网络广播都经过 `stateView` 过滤。

## 房间/大厅系统

### 流程

1. 房主点击「创建房间」→ 生成 PeerJS peer → 显示 4 位房间码（如 `A3K9`）
2. 房主在大厅界面配置：人类玩家数量、AI 玩家数量、规则设置
3. 其他玩家打开同一页面，输入房间码 → PeerJS 连接到房主 → 进入大厅
4. 所有人类玩家就位 → 房主点击「开始游戏」→ 游戏开始

### 大厅界面

房主视角：
- 显示房间码（方便分享给其他玩家）
- 玩家列表：显示已加入的人类玩家和 AI 玩家
- 房间设置：人类玩家数、AI 玩家数、规则配置
- 「开始游戏」按钮（只有房主可操作）

客户端视角：
- 显示房间码和已连接状态
- 玩家列表
- 等待房主开始游戏

## 消息协议

### 客户端 → 房主

| 消息类型 | 数据 | 说明 |
|---------|------|------|
| `room:join` | `{ name }` | 请求加入房间 |
| `game:play-card` | `{ cardId }` | 出牌 |
| `game:draw-card` | `{}` | 摸牌 |
| `game:pick-color` | `{ color }` | 选择颜色 |
| `game:accept-draw` | `{}` | 接受罚摸 |
| `game:resolve-uno` | `{ confirmed }` | UNO 确认 |
| `game:resolve-challenge` | `{ challenge }` | 挑战万能+4 |

### 房主 → 客户端

| 消息类型 | 数据 | 说明 |
|---------|------|------|
| `room:info` | `{ code, players, config }` | 房间信息 |
| `room:player-joined` | `{ playerIndex, name }` | 新玩家加入 |
| `room:player-left` | `{ playerIndex }` | 玩家离开 |
| `game:state` | `{ 完整可见状态 }` | 状态同步（每个客户端收到的不同） |
| `game:deal-card` | `{ playerIndex, card, total, current }` | 逐张发牌动画 |
| `game:action-effect` | `{ type, timestamp, ... }` | 动画效果触发 |
| `game:started` | `{ config }` | 游戏开始 |

## 混合人类 + AI 模型

创建房间时，房主设定总玩家数和 AI 数量。例如 4 人游戏、1 个 AI，则前 3 个人类玩家通过房间码加入，第 4 个位置由 AI 填充。

- **人类玩家**：通过 PeerJS 连接，操作由消息传递
- **AI 玩家**：存在于房主本地，由现有 `useGameEngine` hook 驱动
- **房主本人**：在逻辑上直接调用本地 store（不走网络）

对客户端来说，AI 玩家和远程人类玩家没有区别——都是"别人的回合，等待状态更新"。

## 断线处理

- **客户端断线**：房主将 AI 临时接管该玩家，客户端重连后可恢复控制
- **房主断线**：游戏结束（房主制的固有局限，无法避免）

## 代码结构

### 新增模块

```
src/network/
  ├── protocol.ts          # 消息类型定义
  ├── peerHost.ts           # 房主端 PeerJS 逻辑
  ├── peerClient.ts         # 客户端 PeerJS 逻辑
  └── stateView.ts          # 全量状态 → 客户端视图过滤

src/store/
  └── lobbyStore.ts         # 房间/大厅状态管理

src/store/
  └── remoteGameStore.ts    # 客户端只读状态副本

src/pages/
  └── LobbyPage.tsx         # 大厅页面
```

### 现有文件改动

| 文件 | 改动 | 说明 |
|------|------|------|
| `utils/ai.ts` | 不改 | - |
| `utils/deck.ts` | 不改 | - |
| `utils/rules.ts` | 不改 | - |
| `utils/display.ts` | 不改 | - |
| `config/*` | 不改 | - |
| `store/gameStore.ts` | 小改 | 加状态变化时的广播通知钩子 |
| `hooks/useGameEngine.ts` | 小改 | 加模式判断，客户端模式下不运行 |
| `App.tsx` | 小改 | 加大厅路由 |
| UI 组件 | 小改 | 通过 `GameStoreView` 接口统一读取 |

### Store 策略

**两种模式使用不同的 store：**

- **单机 / 房主模式**：使用现有 `gameStore`（权威状态），几乎不改
- **客户端模式**：使用新的 `remoteGameStore`（只读状态副本），从网络消息更新

**统一接口**：定义 `GameStoreView` 类型，`gameStore` 和 `remoteGameStore` 都满足此接口，UI 组件不关心数据来源。

```typescript
type GameStoreView = {
  players: PlayerView[]
  discardPile: Card[]
  currentColor: CardColor
  currentPlayerIndex: number
  direction: Direction
  phase: GamePhase
  pendingDrawCount: number
  // ... 其他公共字段
}
```

### 房主广播机制

房主通过订阅 `gameStore` 的状态变化来触发广播：

```
gameStore.subscribe() → 检测状态变化 → stateView.filter(state, playerIndex)
  → peerHost.sendToClient(clientId, { type: 'game:state', payload: viewState })
```

每个客户端收到的是经过过滤的、只包含自己可见信息的状态视图。

### 发牌动画处理

发牌动画需要逐张推送：

1. 房主执行发牌逻辑时，每发一张牌向对应客户端推送 `game:deal-card`
2. 客户端收到后播放动画，然后等待下一张
3. 非发牌目标的客户端只看到其他玩家手牌数量增加

## 新增依赖

- `peerjs` — WebRTC 简化库，用于浏览器间 P2P 通信
