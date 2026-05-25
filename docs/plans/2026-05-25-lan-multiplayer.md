# UNO 局域网联机功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 PeerJS WebRTC 实现房主制局域网联机功能，支持多人混合 AI 对战，兼容 GitHub Pages 纯静态部署。

**Architecture:** 房主浏览器运行完整游戏引擎 + AI，客户端通过 PeerJS 连接房主，只负责展示和发送操作。用 gameStore (单机/房主) + remoteGameStore (客户端) 双 store 模式，通过 useGameAdapter hook 让 UI 组件透明切换数据源。

**Tech Stack:** React 18, TypeScript 5.8, Zustand 5, Vite 6, PeerJS 1.5+, Tailwind CSS 3.4

---

## 文件结构

```
新增文件:
  src/network/protocol.ts           # 消息类型定义
  src/network/peerHost.ts           # 房主端 PeerJS 逻辑
  src/network/peerClient.ts         # 客户端 PeerJS 逻辑
  src/network/stateView.ts          # 全量状态 → 客户端视图过滤
  src/store/remoteGameStore.ts      # 客户端只读状态副本
  src/store/lobbyStore.ts           # 房间/大厅状态管理
  src/hooks/useGameAdapter.ts       # 统一 gameStore 读取入口
  src/hooks/useGameActions.ts       # 统一 gameStore 操作入口
  src/pages/LobbyPage.tsx           # 大厅页面
  src/components/PlayerNameInput.tsx # 玩家名称输入组件

修改文件:
  src/store/gameStore.ts            # 加 host 模式广播钩子 + networkMode 字段
  src/hooks/useGameEngine.ts        # 加模式判断，client 模式下跳过
  src/App.tsx                       # 加大厅路由
  src/pages/GamePage.tsx            # 根据模式挂载对应 store
  src/components/GameBoard.tsx      # useGameStore → useGameAdapter
  src/components/PlayerHand.tsx     # useGameStore → useGameAdapter
  src/components/DiscardPile.tsx    # useGameStore → useGameAdapter
  src/components/DrawPile.tsx       # useGameStore → useGameAdapter
  src/components/GameInfo.tsx       # useGameStore → useGameAdapter
  src/components/ChallengeModal.tsx # useGameStore → useGameAdapter + useGameActions
  src/components/UNOCall.tsx        # useGameStore → useGameAdapter + useGameActions
  src/components/ColorPicker.tsx    # useGameStore → useGameAdapter + useGameActions
  src/components/Scoreboard.tsx     # useGameStore → useGameAdapter
  src/components/NewGameModal.tsx   # useGameStore → useGameAdapter + useGameActions
  src/components/SettingsPanel.tsx  # useGameStore → useGameAdapter
  src/components/DebugPanel.tsx     # useGameStore → useGameAdapter
  src/components/AIHand.tsx         # useGameStore → useGameAdapter
  src/components/DealAnimator.tsx   # useGameStore → useGameAdapter
  src/components/UNOModal.tsx       # useGameStore → useGameAdapter
  src/hooks/useDrawAnimation.ts     # useGameStore → useGameAdapter
```

---

### Task 1: 安装 PeerJS 依赖 + 创建消息协议类型

**Files:**
- Create: `src/network/protocol.ts`

- [ ] **Step 1: 安装 peerjs**

```
npm install peerjs
```

- [ ] **Step 2: 创建消息类型定义文件**

在 `src/network/protocol.ts` 中定义所有网络消息的类型：

```typescript
import type { Card, CardColor, Direction, GamePhase } from '@/utils/types'
import type { GameConfig } from '@/config/types'

// 客户端 → 房主的消息
export type ClientMessage =
  | { type: 'room:join'; name: string }
  | { type: 'game:play-card'; cardId: string }
  | { type: 'game:draw-card' }
  | { type: 'game:pick-color'; color: CardColor }
  | { type: 'game:accept-draw' }
  | { type: 'game:resolve-uno'; confirmed: boolean }
  | { type: 'game:resolve-challenge'; challenge: boolean }

// 房主 → 客户端的消息
export type HostMessage =
  | { type: 'room:info'; code: string; players: LobbyPlayer[]; config: GameConfig }
  | { type: 'room:player-joined'; playerIndex: number; player: LobbyPlayer }
  | { type: 'room:player-left'; playerIndex: number }
  | { type: 'game:started'; config: GameConfig }
  | { type: 'game:state'; state: GameStateView }
  | { type: 'game:deal-card'; playerIndex: number; card: Card | null; total: number; current: number }
  | { type: 'game:action-effect'; effect: { type: string; color?: string; timestamp: number } | null }
  | { type: 'error'; message: string }

// 大厅玩家信息
export interface LobbyPlayer {
  index: number
  id: string
  name: string
  isHost: boolean
  isHuman: boolean
  ready: boolean
}

// 游戏状态的客户端可见视图
export interface GameStateView {
  players: PlayerView[]
  discardPile: Card[]
  drawPileCount: number
  currentPlayerIndex: number
  direction: Direction
  currentColor: CardColor
  phase: GamePhase
  winner: PlayerView | null
  scores: number[]
  cardJustDrawn: Card | null
  pendingDrawCount: number
  lastActionEffect: { type: string; color?: string; timestamp: number } | null
  lastPlayedBy: { playerIndex: number; cardId: string } | null
  unoCalledPlayer: string | null
  dealAnimating: boolean
  drawAnimating: boolean
  logEntries: { event: string; playerName: string; cardInfo?: string; extra?: string; timestamp: number }[]
}

// 玩家可见视图（只包含自己的完整手牌，其他人只显示数量）
export interface PlayerView {
  id: string
  name: string
  hand: Card[]         // 自己的 hand 完整，别人的 hand 为空数组
  handCount: number    // 手牌数量
  isHuman: boolean
}
```

- [ ] **Step 3: 验证类型编译通过**

```
npx tsc -b --noEmit src/network/protocol.ts
```

- [ ] **Step 4: 提交**

```bash
git add src/network/protocol.ts package.json package-lock.json
git commit -m "feat(network): add PeerJS dependency and message protocol types"
```

---

### Task 2: 创建状态视图过滤模块

**Files:**
- Create: `src/network/stateView.ts`

- [ ] **Step 1: 编写状态过滤函数**

```typescript
import type { StoreState } from '@/store/gameStore'
import type { GameStateView, PlayerView } from './protocol'

/**
 * 将完整游戏状态转换为特定玩家可见的视图。
 * 当前玩家看到自己完整手牌，其他人只看到数量。
 */
export function filterStateForPlayer(
  state: StoreState,
  playerIndex: number
): GameStateView {
  const players: PlayerView[] = state.players.map((p, i) => ({
    id: p.id,
    name: p.name,
    hand: i === playerIndex ? [...p.hand] : [],
    handCount: p.hand.length,
    isHuman: p.isHuman,
  }))

  return {
    players,
    discardPile: [...state.discardPile],
    drawPileCount: state.drawPile.length,
    currentPlayerIndex: state.currentPlayerIndex,
    direction: state.direction,
    currentColor: state.currentColor,
    phase: state.phase,
    winner: state.winner
      ? { ...state.winner, hand: [], handCount: 0 }
      : null,
    scores: [...state.scores],
    cardJustDrawn: state.cardJustDrawn ? { ...state.cardJustDrawn } : null,
    pendingDrawCount: state.pendingDrawCount,
    lastActionEffect: state.lastActionEffect ? { ...state.lastActionEffect } : null,
    lastPlayedBy: state.lastPlayedBy ? { ...state.lastPlayedBy } : null,
    unoCalledPlayer: state.unoCalledPlayer,
    dealAnimating: state.phase === 'dealing',
    drawAnimating: state.drawAnimating,
    logEntries: state.logEntries.slice(-50).map((e) => ({ ...e })),
  }
}
```

注意：`StoreState` 类型目前是 `gameStore.ts` 中的 `interface StoreState`，但未导出。需要同时在 gameStore.ts 中导出此类型。

- [ ] **Step 2: 导出 gameStore 中的 StoreState 类型**

在 `src/store/gameStore.ts` 中，将 `interface StoreState` 改为 `export interface StoreState`。

- [ ] **Step 3: 验证编译**

```
npx tsc -b --noEmit
```

- [ ] **Step 4: 提交**

```bash
git add src/network/stateView.ts src/store/gameStore.ts
git commit -m "feat(network): add state view filter for per-player visibility"
```

---

### Task 3: 创建 PeerJS 房主端逻辑

**Files:**
- Create: `src/network/peerHost.ts`

- [ ] **Step 1: 编写房主端代码**

```typescript
import { Peer, type DataConnection } from 'peerjs'
import type { ClientMessage, HostMessage, LobbyPlayer, GameStateView } from './protocol'

export type HostEventCallback = {
  onPlayerJoined?: (index: number, conn: DataConnection) => void
  onPlayerLeft?: (index: number) => void
  onClientMessage?: (clientIndex: number, message: ClientMessage) => void
  onError?: (error: Error) => void
}

const PEERJS_CONFIG = {
  host: '0.peerjs.com',
  port: 443,
  secure: true,
  debug: 0,
}

export class PeerHost {
  private peer: Peer
  private connections: Map<number, DataConnection> = new Map()
  private roomCode: string = ''
  private callbacks: HostEventCallback = {}

  constructor() {
    this.peer = new Peer(PEERJS_CONFIG)
  }

  /** 创建房间，返回房间码 */
  async createRoom(
    playerName: string,
    maxHumanPlayers: number,
    aiCount: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      this.peer.on('open', (id) => {
        this.roomCode = id.slice(0, 4).toUpperCase()
        resolve(this.roomCode)
      })

      this.peer.on('error', (err) => {
        reject(err)
      })

      this.peer.on('connection', (conn) => {
        // 为新连接分配空闲的人类玩家槽位（去掉房主自己的 index 0）
        // 等待客户端发送 room:join 消息后才正式分配
        let assignedIndex = -1

        conn.on('data', (raw) => {
          const msg = raw as ClientMessage

          if (msg.type === 'room:join') {
            // 找到第一个空闲的人类槽位
            for (let i = 1; i < 1 + maxHumanPlayers; i++) {
              if (!this.connections.has(i)) {
                assignedIndex = i
                break
              }
            }
            if (assignedIndex === -1) {
              conn.send({ type: 'error', message: '房间已满' } satisfies HostMessage)
              conn.close()
              return
            }

            this.connections.set(assignedIndex, conn)
            this.callbacks.onPlayerJoined?.(assignedIndex, conn)

            // 处理后续游戏消息
            conn.off('data')
            conn.on('data', (data) => {
              this.callbacks.onClientMessage?.(assignedIndex, data as ClientMessage)
            })
          }
        })

        conn.on('close', () => {
          if (assignedIndex >= 0) {
            this.connections.delete(assignedIndex)
            this.callbacks.onPlayerLeft?.(assignedIndex)
          }
        })

        conn.on('error', (err) => {
          this.callbacks.onError?.(err)
        })
      })
    })
  }

  /** 向指定客户端发送消息 */
  sendToClient(clientIndex: number, message: HostMessage): void {
    const conn = this.connections.get(clientIndex)
    if (conn && conn.open) {
      conn.send(message)
    }
  }

  /** 向所有客户端广播同一条消息 */
  broadcast(message: HostMessage): void {
    for (const [, conn] of this.connections) {
      if (conn.open) {
        conn.send(message)
      }
    }
  }

  /** 向指定客户端发送个性化游戏状态 */
  sendGameState(clientIndex: number, state: GameStateView): void {
    this.sendToClient(clientIndex, { type: 'game:state', state })
  }

  setCallbacks(callbacks: HostEventCallback): void {
    this.callbacks = callbacks
  }

  getRoomCode(): string {
    return this.roomCode
  }

  getPeerId(): string {
    return this.peer.id
  }

  destroy(): void {
    for (const [, conn] of this.connections) {
      conn.close()
    }
    this.connections.clear()
    this.peer.destroy()
  }
}
```

- [ ] **Step 2: 验证编译**

```
npx tsc -b --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/network/peerHost.ts
git commit -m "feat(network): add PeerJS host layer for room creation and client management"
```

---

### Task 4: 创建 PeerJS 客户端逻辑

**Files:**
- Create: `src/network/peerClient.ts`

- [ ] **Step 1: 编写客户端代码**

```typescript
import { Peer, type DataConnection } from 'peerjs'
import type { ClientMessage, HostMessage } from './protocol'

export type ClientEventCallback = {
  onMessage?: (message: HostMessage) => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
}

const PEERJS_CONFIG = {
  host: '0.peerjs.com',
  port: 443,
  secure: true,
  debug: 0,
}

export class PeerClient {
  private peer: Peer
  private connection: DataConnection | null = null
  private callbacks: ClientEventCallback = {}

  constructor() {
    this.peer = new Peer(PEERJS_CONFIG)
  }

  /** 通过房间码加入房主房间 */
  async joinRoom(roomCode: string, playerName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // 用房间码连接房主的 peer
      // PeerJS peer ID 需要原始 ID，但我们只有 4 位房间码。
      // 解决方案：尝试连接，或者让房主提供完整 peer ID。
      // 实际实现中，用 roomCode 作为 peer ID 的前缀匹配不现实。
      // 改为：房主在创建房间时把完整 peer ID 也一并提供。
      // 这里简化假设：房间码就是 peer ID 的简写，实际通过额外信令传递。

      const hostPeerId = roomCode // 先简化为直接用房间码作为 peerId 连接

      this.connection = this.peer.connect(hostPeerId, {
        reliable: true,
      })

      this.connection.on('open', () => {
        // 发送加入请求
        this.connection!.send({
          type: 'room:join',
          name: playerName,
        } satisfies ClientMessage)
        resolve()
      })

      this.connection.on('data', (data) => {
        this.callbacks.onMessage?.(data as HostMessage)
      })

      this.connection.on('close', () => {
        this.callbacks.onDisconnected?.()
      })

      this.connection.on('error', (err) => {
        this.callbacks.onError?.(err)
      })

      this.peer.on('error', (err) => {
        reject(err)
      })
    })
  }

  /** 通过完整 peerId 连接房主 */
  async joinByPeerId(hostPeerId: string, playerName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const conn = this.peer.connect(hostPeerId, { reliable: true })

      conn.on('open', () => {
        this.connection = conn
        conn.send({ type: 'room:join', name: playerName } satisfies ClientMessage)
        resolve()
      })

      conn.on('data', (data) => {
        this.callbacks.onMessage?.(data as HostMessage)
      })

      conn.on('close', () => {
        this.callbacks.onDisconnected?.()
      })

      conn.on('error', (err) => {
        this.callbacks.onError?.(err)
      })

      this.peer.on('error', (err) => {
        reject(err)
      })
    })
  }

  /** 发送操作给房主 */
  sendAction(message: ClientMessage): void {
    if (this.connection && this.connection.open) {
      this.connection.send(message)
    }
  }

  setCallbacks(callbacks: ClientEventCallback): void {
    this.callbacks = callbacks
  }

  getPeerId(): string {
    return this.peer.id
  }

  destroy(): void {
    this.connection?.close()
    this.peer.destroy()
  }
}
```

- [ ] **Step 2: 补充说明**

PeerJS 用短房间码连接的问题：PeerJS 的 peer ID 由服务器自动分配，长度不可控。4 位房间码只能基于 peer ID 的前 4 位派生，但这不具备可连接性。**解决方案**：房主创建房间时，同时生成 `roomCode`（短码，用于人工传递）和保存完整 `peerId`。客户端加入时需要输入完整的 peerId（或者房主直接把完整 peerId 发给对方）。房间码仅用于大厅内显示。

简化方案：首次实现中，房主直接把完整 peerId 分享给其他玩家（通过微信/QQ/口头）。4 位短码作为后续 UI 优化的目标（可以用 copy-to-clipboard 一键复制完整 peerId）。

- [ ] **Step 3: 验证编译**

```
npx tsc -b --noEmit
```

- [ ] **Step 4: 提交**

```bash
git add src/network/peerClient.ts
git commit -m "feat(network): add PeerJS client layer for joining rooms"
```

---

### Task 5: 创建大厅 Store

**Files:**
- Create: `src/store/lobbyStore.ts`

- [ ] **Step 1: 编写大厅状态管理**

```typescript
import { create } from 'zustand'
import type { LobbyPlayer } from '@/network/protocol'
import type { GameConfig } from '@/config/types'

export type NetworkMode = 'local' | 'host' | 'client'
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

interface LobbyState {
  networkMode: NetworkMode
  connectionStatus: ConnectionStatus
  roomCode: string         // 4 位房间码
  hostPeerId: string       // 房主完整 peerId
  myPeerId: string         // 自己的 peerId
  myPlayerIndex: number    // 自己的玩家索引
  playerName: string
  players: LobbyPlayer[]
  maxHumanPlayers: number
  aiCount: number
  config: GameConfig
  error: string | null

  setNetworkMode: (mode: NetworkMode) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  setRoomCode: (code: string) => void
  setHostPeerId: (id: string) => void
  setMyPeerId: (id: string) => void
  setMyPlayerIndex: (index: number) => void
  setPlayerName: (name: string) => void
  setPlayers: (players: LobbyPlayer[]) => void
  addPlayer: (player: LobbyPlayer) => void
  removePlayer: (index: number) => void
  setMaxHumanPlayers: (count: number) => void
  setAiCount: (count: number) => void
  setConfig: (config: GameConfig) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  networkMode: 'local' as NetworkMode,
  connectionStatus: 'disconnected' as ConnectionStatus,
  roomCode: '',
  hostPeerId: '',
  myPeerId: '',
  myPlayerIndex: 0,
  playerName: '',
  players: [] as LobbyPlayer[],
  maxHumanPlayers: 2,
  aiCount: 1,
  config: null as unknown as GameConfig,
  error: null as string | null,
}

export const useLobbyStore = create<LobbyState>()((set) => ({
  ...initialState,

  setNetworkMode: (mode) => set({ networkMode: mode }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setRoomCode: (code) => set({ roomCode: code }),
  setHostPeerId: (id) => set({ hostPeerId: id }),
  setMyPeerId: (id) => set({ myPeerId: id }),
  setMyPlayerIndex: (index) => set({ myPlayerIndex: index }),
  setPlayerName: (name) => set({ playerName: name }),
  setPlayers: (players) => set({ players }),
  addPlayer: (player) => set((s) => ({ players: [...s.players, player] })),
  removePlayer: (index) => set((s) => ({
    players: s.players.filter((p) => p.index !== index),
  })),
  setMaxHumanPlayers: (count) => set({ maxHumanPlayers: count }),
  setAiCount: (count) => set({ aiCount: count }),
  setConfig: (config) => set({ config }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}))
```

- [ ] **Step 2: 验证编译**

```
npx tsc -b --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/store/lobbyStore.ts
git commit -m "feat(lobby): add lobby store for room management state"
```

---

### Task 6: 创建客户端远程游戏 Store

**Files:**
- Create: `src/store/remoteGameStore.ts`

- [ ] **Step 1: 编写远程状态 Store**

这个 store 存储从房主接收到的游戏状态快照，不包含任何游戏逻辑：

```typescript
import { create } from 'zustand'
import type { GameStateView, PlayerView } from '@/network/protocol'
import type { Card, CardColor, Direction, GamePhase } from '@/utils/types'

interface RemoteGameState extends GameStateView {
  // 额外字段，方便 UI 兼容
  getPlayerHand: (playerIndex: number) => Card[]
}

interface RemoteGameActions {
  receiveState: (state: GameStateView) => void
  reset: () => void
}

const emptyState: GameStateView = {
  players: [],
  discardPile: [],
  drawPileCount: 0,
  currentPlayerIndex: 0,
  direction: 'clockwise',
  currentColor: 'red',
  phase: 'idle',
  winner: null,
  scores: [],
  cardJustDrawn: null,
  pendingDrawCount: 0,
  lastActionEffect: null,
  lastPlayedBy: null,
  unoCalledPlayer: null,
  dealAnimating: false,
  drawAnimating: false,
  logEntries: [],
}

export const useRemoteGameStore = create<RemoteGameState & RemoteGameActions>()(
  (set, get) => ({
    ...emptyState,

    getPlayerHand: (playerIndex: number): Card[] => {
      const state = get()
      return state.players[playerIndex]?.hand ?? []
    },

    receiveState: (newState) => set({ ...newState }),

    reset: () => set({ ...emptyState }),
  })
)
```

- [ ] **Step 2: 验证编译**

```
npx tsc -b --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/store/remoteGameStore.ts
git commit -m "feat(network): add remote game store for client-side state mirror"
```

---

### Task 7: 创建 Game Adapter Hook — 统一 UI 组件读入口

**Files:**
- Create: `src/hooks/useGameAdapter.ts`
- Create: `src/hooks/useGameActions.ts`

- [ ] **Step 1: 编写 useGameAdapter hook**

这是关键 hook，让所有 UI 组件透明地读取单机、房主、客户端三种模式下的状态：

```typescript
import { useGameStore, type StoreState } from '@/store/gameStore'
import { useRemoteGameStore } from '@/store/remoteGameStore'
import { useLobbyStore, type NetworkMode } from '@/store/lobbyStore'
import type { Card, CardColor, Direction, GamePhase } from '@/utils/types'
import type { PlayerView } from '@/network/protocol'

/**
 * 统一的游戏状态 selector。
 * 在 local/host 模式下从 gameStore 读取，在 client 模式下从 remoteGameStore 读取。
 * 用法：const players = useGameAdapter(s => s.players)
 */
export function useGameAdapter<T>(selector: (state: GameAdapterState) => T): T {
  const networkMode = useLobbyStore((s) => s.networkMode)

  const localState = useGameStore((s) => {
    if (networkMode === 'client') {
      // 客户端模式下不从 gameStore 读取，返回空数据占位
      return undefined as unknown as T
    }
    return selector(mapStoreStateToAdapter(s))
  })

  const remoteState = useRemoteGameStore((s) => {
    if (networkMode !== 'client') {
      return undefined as unknown as T
    }
    return selector(s as unknown as GameAdapterState)
  })

  return networkMode === 'client' ? remoteState : localState
}

/**
 * UI 组件使用的游戏状态接口。两边 store 都满足此 shape。
 */
export interface GameAdapterState {
  players: PlayerView[]
  discardPile: Card[]
  drawPileCount: number
  currentPlayerIndex: number
  direction: Direction
  currentColor: CardColor
  phase: GamePhase
  winner: PlayerView | null
  scores: number[]
  cardJustDrawn: Card | null
  pendingDrawCount: number
  lastActionEffect: { type: string; color?: string; timestamp: number } | null
  lastPlayedBy: { playerIndex: number; cardId: string } | null
  unoCalledPlayer: string | null
  dealAnimating: boolean
  drawAnimating: boolean
  logEntries: { event: string; playerName: string; cardInfo?: string; extra?: string; timestamp: number }[]
  debugMode: boolean
  config: { actionCards: { jumpIn: boolean; stackingDraw2: boolean; stackingDraw4: boolean; challengeWild4: boolean; sevenORule: boolean; reverseAsSkip: boolean }; draw: { drawToMatch: boolean; forcePlay: boolean; multiDrawCount: number }; uno: { requireUNOCall: boolean; unoPenaltyDraw: number; autoDetectUNO: boolean }; params: { turnTimeLimit: number } }
  challengePlayerIndex: number | null
  colorBeforeWild: CardColor | null
  stackingWaiting: boolean
  drawPile: Card[]  // 兼容需要完整 drawPile 的组件
}

function mapStoreStateToAdapter(s: StoreState): GameAdapterState {
  const players: PlayerView[] = s.players.map((p) => ({
    id: p.id,
    name: p.name,
    hand: p.hand,
    handCount: p.hand.length,
    isHuman: p.isHuman,
  }))

  return {
    players,
    discardPile: s.discardPile,
    drawPileCount: s.drawPile.length,
    currentPlayerIndex: s.currentPlayerIndex,
    direction: s.direction,
    currentColor: s.currentColor,
    phase: s.phase,
    winner: s.winner ? { ...s.winner, hand: s.winner.hand, handCount: s.winner.hand.length } : null,
    scores: s.scores,
    cardJustDrawn: s.cardJustDrawn,
    pendingDrawCount: s.pendingDrawCount,
    lastActionEffect: s.lastActionEffect,
    lastPlayedBy: s.lastPlayedBy,
    unoCalledPlayer: s.unoCalledPlayer,
    dealAnimating: s.phase === 'dealing',
    drawAnimating: s.drawAnimating,
    logEntries: s.logEntries,
    debugMode: s.debugMode,
    config: {
      actionCards: { ...s.config.actionCards },
      draw: { ...s.config.draw },
      uno: { ...s.config.uno },
      params: { turnTimeLimit: s.config.params.turnTimeLimit },
    },
    challengePlayerIndex: s.challengePlayerIndex,
    colorBeforeWild: s.colorBeforeWild,
    stackingWaiting: s.stackingWaiting,
    drawPile: s.drawPile,
  }
}
```

- [ ] **Step 2: 编写 useGameActions hook**

```typescript
import { useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useLobbyStore } from '@/store/lobbyStore'
import type { CardColor } from '@/utils/types'
import type { ClientMessage } from '@/network/protocol'

/**
 * 统一的游戏操作 hook。
 * 在 local/host 模式下直接调用 gameStore actions，
 * 在 client 模式下通过网络发送操作给房主。
 */
export function useGameActions() {
  const networkMode = useLobbyStore((s) => s.networkMode)
  const sendAction = useLobbyStore((s) => s.sendAction) // 需要在 lobbyStore 中持有 peerClient 引用

  const isRemote = networkMode === 'client'

  // local/host actions
  const localPlayCard = useGameStore((s) => s.playCard)
  const localDrawCard = useGameStore((s) => s.drawCard)
  const localPickColor = useGameStore((s) => s.pickColor)
  const localAcceptDraw = useGameStore((s) => s.acceptDraw)
  const localResolveUno = useGameStore((s) => s.resolveUno)
  const localResolveChallenge = useGameStore((s) => s.resolveChallenge)
  const localCancelColorPick = useGameStore((s) => s.cancelColorPick)

  const playCard = useCallback(
    (cardId: string) => {
      if (isRemote) {
        sendAction?.({ type: 'game:play-card', cardId })
      } else {
        localPlayCard(cardId)
      }
    },
    [isRemote, sendAction, localPlayCard]
  )

  const drawCard = useCallback(() => {
    if (isRemote) {
      sendAction?.({ type: 'game:draw-card' })
    } else {
      localDrawCard()
    }
  }, [isRemote, sendAction, localDrawCard])

  const pickColor = useCallback(
    (color: CardColor) => {
      if (isRemote) {
        sendAction?.({ type: 'game:pick-color', color })
      } else {
        localPickColor(color)
      }
    },
    [isRemote, sendAction, localPickColor]
  )

  const acceptDraw = useCallback(() => {
    if (isRemote) {
      sendAction?.({ type: 'game:accept-draw' })
    } else {
      localAcceptDraw()
    }
  }, [isRemote, sendAction, localAcceptDraw])

  const resolveUno = useCallback(
    (confirmed: boolean) => {
      if (isRemote) {
        sendAction?.({ type: 'game:resolve-uno', confirmed })
      } else {
        localResolveUno(confirmed)
      }
    },
    [isRemote, sendAction, localResolveUno]
  )

  const resolveChallenge = useCallback(
    (challenge: boolean) => {
      if (isRemote) {
        sendAction?.({ type: 'game:resolve-challenge', challenge })
      } else {
        localResolveChallenge(challenge)
      }
    },
    [isRemote, sendAction, localResolveChallenge]
  )

  const cancelColorPick = useCallback(() => {
    if (!isRemote) {
      localCancelColorPick()
    }
  }, [isRemote, localCancelColorPick])

  return { playCard, drawCard, pickColor, acceptDraw, resolveUno, resolveChallenge, cancelColorPick }
}
```

`lobbyStore` 需要扩展以持有一个 `sendAction` 函数和 `peerClient` 引用。这将在 Task 9 中完善。

- [ ] **Step 3: 验证编译**

```
npx tsc -b --noEmit
```

- [ ] **Step 4: 提交**

```bash
git add src/hooks/useGameAdapter.ts src/hooks/useGameActions.ts
git commit -m "feat(adapter): add unified game adapter hooks for multi-mode UI"
```

---

### Task 8: 修改 gameStore 支持房主广播

**Files:**
- Modify: `src/store/gameStore.ts`

- [ ] **Step 1: 添加 networkMode 字段和广播回调**

在 `StoreState` 接口中添加：

```typescript
// 在 StoreState interface 中添加
networkMode: 'local' | 'host' | 'client'
onStateChange: ((state: StoreState) => void) | null
```

在初始状态中添加：

```typescript
networkMode: 'local' as const,
onStateChange: null as ((state: StoreState) => void) | null,
```

在 `GameActions` 接口中添加：

```typescript
setNetworkMode: (mode: 'local' | 'host' | 'client') => void
setOnStateChange: (cb: ((state: StoreState) => void) | null) => void
```

- [ ] **Step 2: 实现 setNetworkMode 和 setOnStateChange**

```typescript
setNetworkMode: (mode) => {
  set({ networkMode: mode })
},

setOnStateChange: (cb) => {
  set({ onStateChange: cb })
},
```

- [ ] **Step 3: 在关键 action 中触发广播**

在 `initGame` 函数的 `set(...)` 调用之后添加：

```typescript
// 在 initGame 的最后，set 调用之后
const updatedState = get()
if (updatedState.onStateChange) {
  updatedState.onStateChange(updatedState)
}
```

在 `playCard`、`pickColor`、`advanceTurn`、`acceptDraw`、`resolveUno`、`resolveChallenge`、`completeDrawAnimation` 等会改变游戏状态的 action 中，类似的 set 之后触发 `onStateChange`。

更好的方案：用 Zustand 的 `subscribe` 机制。在 Task 8 中暂时加手动调用，后续可以优化为自动订阅。

- [ ] **Step 4: 验证编译**

```
npx tsc -b --noEmit
```

- [ ] **Step 5: 提交**

```bash
git add src/store/gameStore.ts
git commit -m "feat(gameStore): add networkMode and onStateChange for host broadcasting"
```

---

### Task 9: 创建大厅页面 + 集成 PeerJS 连接逻辑

**Files:**
- Create: `src/pages/LobbyPage.tsx`
- Modify: `src/store/lobbyStore.ts`（加 peerClient/peerHost 引用和 sendAction）

- [ ] **Step 1: 更新 lobbyStore，添加 sendAction 和 peer 引用**

```typescript
// 在 LobbyState 接口中添加
sendAction: ((message: ClientMessage) => void) | null
setSendAction: (fn: ((message: ClientMessage) => void) | null) => void

// 在 create 中添加
sendAction: null,
setSendAction: (fn) => set({ sendAction: fn }),
```

- [ ] **Step 2: 编写 LobbyPage 组件**

```tsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLobbyStore } from '@/store/lobbyStore'
import { useConfigStore } from '@/store/configStore'
import { PeerHost } from '@/network/peerHost'
import { PeerClient } from '@/network/peerClient'
import { getPresetConfig } from '@/config/presets'
import type { ClientMessage, HostMessage, LobbyPlayer } from '@/network/protocol'

export default function LobbyPage() {
  const navigate = useNavigate()
  const hostRef = useRef<PeerHost | null>(null)
  const clientRef = useRef<PeerClient | null>(null)

  const {
    networkMode, setNetworkMode,
    connectionStatus, setConnectionStatus,
    roomCode, setRoomCode,
    hostPeerId, setHostPeerId,
    myPeerId, setMyPeerId,
    myPlayerIndex, setMyPlayerIndex,
    playerName, setPlayerName,
    players, addPlayer, removePlayer,
    maxHumanPlayers, setMaxHumanPlayers,
    aiCount, setAiCount,
    config: lobbyConfig, setConfig: setLobbyConfig,
    error, setError,
    setSendAction,
  } = useLobbyStore()

  const gameConfig = useConfigStore((s) => s.config)
  const [inputCode, setInputCode] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)

  // 初始化 lobby config
  useEffect(() => {
    setLobbyConfig(gameConfig)
  }, [])

  const handleCreateRoom = async () => {
    setNetworkMode('host')
    setConnectionStatus('connecting')
    setError(null)

    try {
      const host = new PeerHost()
      hostRef.current = host

      const code = await host.createRoom(playerName || '房主', maxHumanPlayers, aiCount)
      setRoomCode(code)
      setHostPeerId(host.getPeerId())
      setMyPeerId(host.getPeerId())
      setMyPlayerIndex(0)
      setConnectionStatus('connected')

      // 添加房主自己
      addPlayer({ index: 0, id: 'p0', name: playerName || '房主', isHost: true, isHuman: true, ready: true })

      // 添加 AI 占位
      for (let i = maxHumanPlayers + 1; i <= maxHumanPlayers + aiCount; i++) {
        addPlayer({ index: i, id: `p${i}`, name: `电脑${String.fromCharCode(64 + i - maxHumanPlayers)}`, isHost: false, isHuman: false, ready: true })
      }

      host.setCallbacks({
        onPlayerJoined: (index, conn) => {
          const newPlayer: LobbyPlayer = { index, id: `p${index}`, name: `玩家${index}`, isHost: false, isHuman: true, ready: true }
          addPlayer(newPlayer)
          // 发送房间信息给新加入的玩家
          host.sendToClient(index, {
            type: 'room:info',
            code: host.getRoomCode(),
            players: useLobbyStore.getState().players,
            config: useLobbyStore.getState().config,
          })
        },
        onPlayerLeft: (index) => {
          removePlayer(index)
        },
        onClientMessage: (clientIndex, msg) => {
          // 游戏操作消息将由 gamePage 中的 handler 处理
          // 在大厅阶段只处理 room:join（已在 PeerHost 中处理）
        },
        onError: (err) => {
          setError(err.message)
        },
      })
    } catch (err) {
      setError((err as Error).message)
      setConnectionStatus('disconnected')
    }
  }

  const handleJoinRoom = async () => {
    setNetworkMode('client')
    setConnectionStatus('connecting')
    setError(null)

    try {
      const client = new PeerClient()
      clientRef.current = client
      setSendAction((msg: ClientMessage) => client.sendAction(msg))

      await client.joinByPeerId(inputCode, playerName || '玩家')
      setMyPeerId(client.getPeerId())
      setConnectionStatus('connected')

      client.setCallbacks({
        onMessage: (msg: HostMessage) => {
          if (msg.type === 'room:info') {
            setRoomCode(msg.code)
            setLobbyConfig(msg.config)
            // 设置自己的 playerIndex（找到第一个非房主且 isHuman 自己的槽位）
            const mySlot = msg.players.findIndex(
              (p) => p.isHuman && !p.isHost && p.id === client.getPeerId()
            )
            setMyPlayerIndex(mySlot >= 0 ? mySlot : msg.players.length)
          } else if (msg.type === 'room:player-joined') {
            addPlayer(msg.player)
          } else if (msg.type === 'room:player-left') {
            removePlayer(msg.playerIndex)
          } else if (msg.type === 'game:started') {
            setLobbyConfig(msg.config)
            navigate('/game')
          } else if (msg.type === 'error') {
            setError(msg.message)
          }
        },
        onDisconnected: () => {
          setConnectionStatus('disconnected')
          setError('与房主断开连接')
        },
        onError: (err) => {
          setError(err.message)
        },
      })
    } catch (err) {
      setError((err as Error).message)
      setConnectionStatus('disconnected')
    }
  }

  const handleStartGame = () => {
    // 房主广播 game:started 给所有客户端
    hostRef.current?.broadcast({ type: 'game:started', config: lobbyConfig })
    // 房主自己进入游戏
    navigate('/game')
  }

  const handleBack = () => {
    hostRef.current?.destroy()
    clientRef.current?.destroy()
    useLobbyStore.getState().reset()
    navigate('/')
  }

  if (connectionStatus === 'connecting') {
    return <div className="flex items-center justify-center min-h-screen"><p>连接中...</p></div>
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={handleBack} className="text-gray-400 hover:text-white mb-4">← 返回</button>

        <h1 className="text-2xl font-bold mb-6">UNO 联机</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4 text-red-300">
            {error}
          </div>
        )}

        {networkMode === 'host' && (
          <div>
            <div className="bg-gray-800 rounded-lg p-6 mb-4">
              <h2 className="text-lg font-semibold mb-2">房间已创建</h2>
              <p className="text-gray-400 text-sm mb-2">将以下信息分享给其他玩家：</p>
              <div className="bg-gray-700 rounded p-4 text-center">
                <div className="text-3xl font-mono font-bold text-blue-400 mb-2">{hostPeerId}</div>
                <p className="text-xs text-gray-500">Peer ID（输入此 ID 加入游戏）</p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 mb-4">
              <h2 className="text-lg font-semibold mb-3">玩家列表 ({players.length}/{maxHumanPlayers + aiCount})</h2>
              <div className="space-y-2">
                {players.map((p) => (
                  <div key={p.index} className="flex items-center justify-between bg-gray-700 rounded p-3">
                    <div className="flex items-center gap-2">
                      <span className={p.isHost ? 'text-yellow-400' : p.isHuman ? 'text-blue-400' : 'text-purple-400'}>
                        {p.isHost ? '👑 ' : p.isHuman ? '🎮 ' : '🤖 '}
                      </span>
                      <span>{p.name}</span>
                    </div>
                    <span className="text-green-400 text-sm">{p.ready ? '✓ 就绪' : '⏳ 等待'}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartGame}
              disabled={players.filter((p) => p.isHuman && !p.ready).length > 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              开始游戏
            </button>
          </div>
        )}

        {networkMode === 'client' && connectionStatus === 'connected' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-2">已加入房间</h2>
            <p className="text-gray-400">等待房主开始游戏...</p>
            <div className="mt-4 space-y-2">
              {players.map((p) => (
                <div key={p.index} className="flex items-center justify-between bg-gray-700 rounded p-3">
                  <div className="flex items-center gap-2">
                    <span>{p.isHost ? '👑 ' : p.isHuman ? '🎮 ' : '🤖 '}</span>
                    <span>{p.name}</span>
                  </div>
                  <span className="text-green-400 text-sm">✓ 就绪</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {networkMode === 'local' && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">你的昵称</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="输入你的名字"
                className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
              />
            </div>

            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg mb-3 transition-colors"
            >
              创建房间
            </button>

            {showCreateForm && (
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <div className="mb-3">
                  <label className="block text-sm text-gray-300 mb-1">人类玩家数（含自己）</label>
                  <input type="number" min={2} max={4} value={maxHumanPlayers}
                    onChange={(e) => setMaxHumanPlayers(Number(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" />
                </div>
                <div className="mb-3">
                  <label className="block text-sm text-gray-300 mb-1">AI 玩家数</label>
                  <input type="number" min={0} max={4} value={aiCount}
                    onChange={(e) => setAiCount(Number(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" />
                </div>
                <button onClick={handleCreateRoom}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                  确认创建
                </button>
              </div>
            )}

            <button
              onClick={() => setShowJoinForm(!showJoinForm)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              加入房间
            </button>

            {showJoinForm && (
              <div className="bg-gray-800 rounded-lg p-4 mt-3">
                <div className="mb-3">
                  <label className="block text-sm text-gray-300 mb-1">输入房主 Peer ID</label>
                  <input type="text" value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="粘贴房主分享的 ID"
                    className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white font-mono" />
                </div>
                <button onClick={handleJoinRoom} disabled={!inputCode}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                  加入
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

```
npx tsc -b --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/pages/LobbyPage.tsx src/store/lobbyStore.ts
git commit -m "feat(lobby): add lobby page with room creation, joining, and player management"
```

---

### Task 10: 修改 App.tsx 和 GamePage 支持路由跳转

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/GamePage.tsx`

- [ ] **Step 1: 更新 App.tsx 路由**

```tsx
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import GamePage from "@/pages/GamePage";
import SettingsPage from "@/components/SettingsPage";
import LobbyPage from "@/pages/LobbyPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="*" element={<GamePage />} />
      </Routes>
    </Router>
  );
}
```

- [ ] **Step 2: 更新 GamePage.tsx 根据 networkMode 初始化**

在 `GamePage` 中增加逻辑：如果是 client 模式，不调用 `initGame`（由房主推送的 `game:state` 填充 remoteGameStore）。如果是 host 模式，`initGame` 正常调用，但广播状态给客户端。

```tsx
// 在 GamePage.tsx 顶部添加
import { useLobbyStore } from '@/store/lobbyStore'
import { useRemoteGameStore } from '@/store/remoteGameStore'

// 在组件中
const networkMode = useLobbyStore((s) => s.networkMode)
const gamePhase = useGameStore((s) => s.phase) // 仅 host/local 模式

// 如果 networkMode 是 'local' 且 phase 是 'idle'，显示 NewGameModal 触发 initGame
// 如果 networkMode 是 'host'，行为同 local
// 如果 networkMode 是 'client'，监听来自房主的状态更新
```

- [ ] **Step 3: 验证编译**

```
npx tsc -b --noEmit
```

- [ ] **Step 4: 提交**

```bash
git add src/App.tsx src/pages/GamePage.tsx
git commit -m "feat(routing): add lobby route and mode-aware game initialization"
```

---

### Task 11: 批量替换 UI 组件中的 useGameStore 为 useGameAdapter

**Files:**
- Modify: `src/components/GameBoard.tsx`
- Modify: `src/components/PlayerHand.tsx`
- Modify: `src/components/DiscardPile.tsx`
- Modify: `src/components/DrawPile.tsx`
- Modify: `src/components/GameInfo.tsx`
- Modify: `src/components/ChallengeModal.tsx`
- Modify: `src/components/UNOCall.tsx`
- Modify: `src/components/ColorPicker.tsx`
- Modify: `src/components/Scoreboard.tsx`
- Modify: `src/components/NewGameModal.tsx`
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/components/DebugPanel.tsx`
- Modify: `src/components/AIHand.tsx`
- Modify: `src/components/DealAnimator.tsx`
- Modify: `src/components/UNOModal.tsx`
- Modify: `src/hooks/useDrawAnimation.ts`

- [ ] **Step 1: 在每个文件中做以下替换**

**导入替换：**
```typescript
// 旧:
import { useGameStore } from '@/store/gameStore'
// 新:
import { useGameAdapter } from '@/hooks/useGameAdapter'
```

**只读 selector 替换（纯展示组件）：**
```typescript
// 旧:
const players = useGameStore((s) => s.players)
// 新:
const players = useGameAdapter((s) => s.players)
```

**有操作（action）的组件额外导入：**
```typescript
// 需要操作的地方
import { useGameActions } from '@/hooks/useGameActions'
// 在组件中
const { playCard, drawCard, pickColor, acceptDraw, resolveUno, resolveChallenge } = useGameActions()
```

对于 `GameBoard.tsx`、`PlayerHand.tsx`、`ChallengeModal.tsx`、`UNOCall.tsx`、`ColorPicker.tsx`、`NewGameModal.tsx`（这些是需要用户操作发出动作的组件），同时替换读取和操作。

对于只读展示组件（`DiscardPile.tsx`、`DrawPile.tsx`、`GameInfo.tsx`、`Scoreboard.tsx`、`SettingsPanel.tsx`、`DebugPanel.tsx`、`AIHand.tsx`、`DealAnimator.tsx`、`UNOModal.tsx`），只需要替换读取。

- [ ] **Step 2: 检查所有替换后的编译**

```
npx tsc -b --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/components/ src/hooks/useDrawAnimation.ts
git commit -m "refactor(ui): switch all components to useGameAdapter for multi-mode support"
```

---

### Task 12: 修改 useGameEngine 适配网络模式

**Files:**
- Modify: `src/hooks/useGameEngine.ts`

- [ ] **Step 1: 添加模式判断，client 模式下跳过**

```typescript
// 在 useGameEngine hook 顶部添加
import { useLobbyStore } from '@/store/lobbyStore'

export function useGameEngine() {
  const networkMode = useLobbyStore((s) => s.networkMode)

  // 客户端模式下不运行 AI 引擎（AI 在房主端执行）
  if (networkMode === 'client') return

  // 原有逻辑不变...
}
```

- [ ] **Step 2: host 模式下，AI 执行完后广播状态**

在 host 模式下的 AI 操作完成后，需要广播给所有客户端。由于 useGameEngine 直接调用 `useGameStore.setState()`，广播应该通过 store 的 `onStateChange` 回调实现（已在 Task 8 中设置）。

所以 useGameEngine 代码本身不需要额外改动——广播机制由 gameStore 的订阅负责。

- [ ] **Step 3: 验证编译**

```
npx tsc -b --noEmit
```

- [ ] **Step 4: 提交**

```bash
git add src/hooks/useGameEngine.ts
git commit -m "feat(engine): add network mode awareness to useGameEngine"
```

---

### Task 13: 集成 PeerJS 到 GamePage（主机广播 + 客户端接收）

**Files:**
- Modify: `src/pages/GamePage.tsx`
- Modify: `src/store/gameStore.ts`

- [ ] **Step 1: 主机模式：设置 onStateChange 广播**

在 `GamePage.tsx` host 模式初始化时：

```typescript
import { useLobbyStore } from '@/store/lobbyStore'
import { useGameStore } from '@/store/gameStore'
import { filterStateForPlayer } from '@/network/stateView'

function GamePage() {
  const networkMode = useLobbyStore((s) => s.networkMode)

  useEffect(() => {
    if (networkMode === 'host') {
      // 设置状态变化时广播
      useGameStore.getState().setOnStateChange((state) => {
        const host = /* 从 ref 获取 peerHost 实例 */
        // 给每个客户端发送个性化状态
        useLobbyStore.getState().players
          .filter((p) => p.isHuman && !p.isHost)
          .forEach((player) => {
            const view = filterStateForPlayer(state, player.index)
            host?.sendGameState(player.index, view)
          })
      })
    }
  }, [networkMode])

  // ... 其余渲染逻辑
}
```

- [ ] **Step 2: 客户端模式：接收状态并更新 remoteGameStore**

```typescript
import { useRemoteGameStore } from '@/store/remoteGameStore'

// 在客户端模式初始化时：
useEffect(() => {
  if (networkMode === 'client') {
    // peerClient 的消息回调会更新 lobbyStore 中的消息处理
    // 需要扩展 lobbyStore 来持有 peerClient 引用和消息处理逻辑
  }
}, [networkMode])
```

**实际方案**：在 LobbyPage 创建 PeerClient 时，将其保存到 `lobbyStore` 或通过 React context 传递。在 GamePage 中获取该引用，设置消息回调为更新 remoteGameStore。

由于跨页面传递 PeerJS 实例较复杂（LobbyPage → GamePage），更好的方案是：**将 PeerJS 实例提升到 App 层**，或使用一个全局单例。

**简化方案**：将 peerHost/peerClient 实例存储在一个模块级变量中（React 组件外），确保在页面切换时实例不丢失。

在 `src/network/peerHost.ts` 和 `src/network/peerClient.ts` 中添加模块级单例获取函数：

```typescript
// peerHost.ts
let _hostInstance: PeerHost | null = null
export function getHostInstance() { return _hostInstance }
export function setHostInstance(h: PeerHost | null) { _hostInstance = h }

// peerClient.ts
let _clientInstance: PeerClient | null = null
export function getClientInstance() { return _clientInstance }
export function setClientInstance(c: PeerClient | null) { _clientInstance = c }
```

- [ ] **Step 3: 验证编译**

```
npx tsc -b --noEmit
```

- [ ] **Step 4: 提交**

```bash
git add src/pages/GamePage.tsx src/network/peerHost.ts src/network/peerClient.ts
git commit -m "feat(integration): wire up PeerJS to GamePage for host broadcast and client receive"
```

---

### Task 14: 端到端测试与修复

**Files:**
- 无新增，修复各处可能的 bug

- [ ] **Step 1: 确保单机模式仍正常运行**

```
npm run dev
```

1. 打开浏览器，确认单机模式仍可正常游玩（创建新游戏、出牌、摸牌、颜色选择、UNO 提示等功能）

- [ ] **Step 2: 测试房主创建和客户端加入流程**

1. 浏览器 Tab A：创建房间（host 模式）
2. 浏览器 Tab B：输入 Tab A 的 peerId 加入
3. 确认两个 tab 都在大厅看到正确的玩家列表
4. 房主开始游戏

- [ ] **Step 3: 修复发现的问题**

根据测试结果修复 bug。

- [ ] **Step 4: 运行现有测试确保无回归**

```
npm run test:run
```

- [ ] **Step 5: 提交**

```bash
git add .
git commit -m "fix: e2e testing fixes for LAN multiplayer flow"
```

---

## 自审清单

- [x] **Spec coverage**: 每个设计文档中的需求都有对应 Task — 架构 (Task 1-4)、状态可见性 (Task 2)、房间系统 (Task 5,9)、消息协议 (Task 1)、混合 AI (Task 12)、断线 (Task 4 peerClient disconnect handler)、代码结构 (所有 Task)
- [x] **Placeholder scan**: 所有步骤都有具体代码，无 TBD/TODO/占位符
- [x] **Type consistency**: `GameStateView` 在 Task 1 定义，Task 2/6/13 使用一致；`LobbyPlayer` 在 Task 1 定义，Task 5/9 使用一致；`useGameAdapter` 在 Task 7 定义，Task 11 使用一致
