# 局域网联机精准修补设计

## 背景

UNO 游戏的局域网联机功能存在以下问题：
- 客户端无法抽牌、出牌
- 出牌顺序不正确
- 两边玩家身份对不上号（都认为对方是玩家 1）

根本原因：联机架构采用了房主权威模型（host 运行游戏逻辑，客户端接收状态视图），但客户端操作到房主的"回路"未接通，存在多处硬编码假设。

## 修复范围

5 个独立修复，不改变整体架构。

---

### 修复 1：房主端客户端消息处理器

**文件：** `GamePage.tsx`

**问题：** `onClientMessage` 回调在游戏阶段是空操作（`LobbyPage.tsx:133`），客户端发送的所有游戏操作被忽略。

**方案：** 在 `GamePage.tsx` 的 host mode `useEffect` 中重新设置 `host.setCallbacks`，将客户端消息路由到 gameStore action：

| 客户端消息类型 | 房主执行的 action |
|---|---|
| `game:play-card` | `playCard(msg.cardId)` |
| `game:draw-card` | `drawCard()` |
| `game:pick-color` | `pickColor(msg.color)` |
| `game:accept-draw` | `acceptDraw()` |
| `game:resolve-uno` | `resolveUno(msg.confirmed)` |
| `game:resolve-challenge` | `resolveChallenge(msg.challenge)` |
| `game:advance-turn` | `advanceTurn(msg.skipCount)` |

gameStore 内部的 action 已有合法性校验（检查当前玩家是否人类、是否轮到该玩家），无需额外验证层。

---

### 修复 2：AI 引擎人类玩家判断

**文件：** `useGameEngine.ts`

**问题：** 第 33 行 `if (currentPlayerIndex === 0) return` 硬编码人类在索引 0，联机模式下客户端人类玩家可能在索引 1+。

**方案：** 替换为 `isHuman` 属性检查，合并后续重复的 `isHuman` 判断：

```typescript
const currentPlayer = useGameStore.getState().players[currentPlayerIndex]
if (!currentPlayer || currentPlayer.isHuman) return
```

---

### 修复 3：GameBoard 操作走网络层

**文件：** `protocol.ts`、`useGameActions.ts`、`GameBoard.tsx`、`GamePage.tsx`

**问题 3a：** `GameBoard.tsx` 第 73 行直接从 `useGameStore` 读取 `advanceTurn`，客户端模式绕过网络层。

**问题 3b：** 超时处理（第 184-201 行）直接调用 `useGameStore.getState()` 的方法。

**方案：**

1. `protocol.ts` 的 `ClientMessage` 新增 `{ type: 'game:advance-turn'; skipCount: number }`
2. `useGameActions.ts` 新增 `advanceTurn` 方法，客户端模式发送网络消息
3. `GameBoard.tsx` 改为从 `useGameActions` 获取 `advanceTurn`
4. 超时处理改为调用 `useGameActions` 返回的方法（`playCard`、`drawCard`、`acceptDraw`）
5. 房主消息路由（修复 1）中处理 `game:advance-turn`

---

### 修复 4：DealAnimator 玩家索引映射

**文件：** `GameBoard.tsx`

**问题：** 约 544 行 `m.set(0, playerHandRef.current)` 硬编码人类为索引 0，客户端模式下发牌/抽牌动画目标错误。

**方案：** 改为 `m.set(myPlayerIndex, playerHandRef.current)`，两处 DealAnimator 都修改。

---

### 修复 5：抽牌堆数量显示

**文件：** `GameBoard.tsx`

**问题：** 使用 `drawPile.length` 显示抽牌堆数量，客户端模式下 `drawPile` 始终为空数组（`useGameAdapter.ts:31` 硬编码 `drawPile: []`），显示为 0。

**方案：** 改为使用 `drawPileCount` 字段（本地模式等于 `drawPile.length`，客户端模式来自远程状态）：

```typescript
const drawPileCount = useGameAdapter((s) => s.drawPileCount)
// <DrawPile count={drawPileCount} ... />
```

---

## 修改文件清单

| 文件 | 修改内容 |
|---|---|
| `src/network/protocol.ts` | ClientMessage 新增 `game:advance-turn` |
| `src/pages/GamePage.tsx` | 房主端添加客户端消息路由，处理 `game:advance-turn` |
| `src/hooks/useGameEngine.ts` | `currentPlayerIndex === 0` 改为 `isHuman` 检查 |
| `src/hooks/useGameActions.ts` | 新增 `advanceTurn` 方法 |
| `src/components/GameBoard.tsx` | advanceTurn 走 useGameActions、修复 DealAnimator 索引、修复抽牌堆显示、修复超时处理 |

## 不在范围内

- 重构网络层架构
- 新增反作弊验证
- 重命名 `aiCount` 等命名问题
- 客户端 `drawPile` 空数组在 adapter 层的根因修复（用 `drawPileCount` 绕过即可）
