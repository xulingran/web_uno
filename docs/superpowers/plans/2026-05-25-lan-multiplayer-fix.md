# LAN Multiplayer Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 interconnected bugs preventing LAN multiplayer from working: host ignoring client actions, hardcoded player index, action routing bypassing network layer, wrong DealAnimator mapping, and wrong draw pile count display.

**Architecture:** The existing host-authority model (host runs game logic, clients receive state views) is sound. The fix wires up missing connections: client actions → host processing, correct player index handling, and proper display in client mode.

**Tech Stack:** React 18, Zustand 5, PeerJS 1.5, TypeScript, Vite, Vitest

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/network/protocol.ts` | Modify | Add `game:advance-turn` to `ClientMessage` union |
| `src/network/peerHost.ts` | Modify | Change `setCallbacks` to merge instead of replace |
| `src/hooks/useGameEngine.ts` | Modify | Fix human player check from hardcoded index to `isHuman` |
| `src/hooks/useGameActions.ts` | Modify | Add network-aware `advanceTurn` method |
| `src/pages/GamePage.tsx` | Modify | Add host client message router + import `ClientMessage` |
| `src/components/GameBoard.tsx` | Modify | Fix advanceTurn source, DealAnimator index, draw pile display, timeout handler |

---

### Task 1: Add `game:advance-turn` to protocol

**Files:**
- Modify: `src/network/protocol.ts:6-12`

- [ ] **Step 1: Add the new message type**

In `src/network/protocol.ts`, add one line at the end of the `ClientMessage` union (after line 12):

```typescript
export type ClientMessage =
  | { type: 'room:join'; name: string }
  | { type: 'game:play-card'; cardId: string }
  | { type: 'game:draw-card' }
  | { type: 'game:pick-color'; color: CardColor }
  | { type: 'game:accept-draw' }
  | { type: 'game:resolve-uno'; confirmed: boolean }
  | { type: 'game:resolve-challenge'; challenge: boolean }
  | { type: 'game:advance-turn'; skipCount: number }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/network/protocol.ts
git commit -m "fix(protocol): add game:advance-turn to ClientMessage"
```

---

### Task 2: Fix useGameEngine human player check

**Files:**
- Modify: `src/hooks/useGameEngine.ts:30-38`

- [ ] **Step 1: Replace hardcoded index 0 check with isHuman check**

Replace lines 30–38:

**Before:**
```typescript
  useEffect(() => {
    if (phase !== 'playing') return
    if (drawAnimating) return
    if (currentPlayerIndex === 0) return

    const currentState = useGameStore.getState()
    const currentPlayer = currentState.players[currentPlayerIndex]
    if (!currentPlayer || currentPlayer.isHuman) return
    if (processingRef.current) return
```

**After:**
```typescript
  useEffect(() => {
    if (phase !== 'playing') return
    if (drawAnimating) return

    const currentState = useGameStore.getState()
    const currentPlayer = currentState.players[currentPlayerIndex]
    if (!currentPlayer || currentPlayer.isHuman) return
    if (processingRef.current) return
```

Changes: remove the `if (currentPlayerIndex === 0) return` line. The existing `isHuman` check on the next line already handles skipping human players at any index.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGameEngine.ts
git commit -m "fix(engine): use isHuman check instead of hardcoded index 0"
```

---

### Task 3: Add advanceTurn to useGameActions

**Files:**
- Modify: `src/hooks/useGameActions.ts:86-106`

- [ ] **Step 1: Add the advanceTurn callback**

In `src/hooks/useGameActions.ts`, after the `cancelColorPick` callback (after line 92), add a new `advanceTurn` callback:

```typescript
  const advanceTurn = useCallback(
    (skipCount: number) => {
      if (isRemote) {
        sendAction?.({ type: 'game:advance-turn', skipCount })
      } else {
        useGameStore.getState().advanceTurn(skipCount)
      }
    },
    [isRemote, sendAction]
  )
```

- [ ] **Step 2: Add advanceTurn to the return object**

Update the return statement:

**Before:**
```typescript
  return {
    playCard,
    drawCard,
    pickColor,
    acceptDraw,
    resolveUno,
    resolveChallenge,
    cancelColorPick,
    startNewGame: localStartNewGame,
    initGame: localInitGame,
    toggleDebugMode: localToggleDebugMode,
  }
```

**After:**
```typescript
  return {
    playCard,
    drawCard,
    pickColor,
    acceptDraw,
    resolveUno,
    resolveChallenge,
    cancelColorPick,
    advanceTurn,
    startNewGame: localStartNewGame,
    initGame: localInitGame,
    toggleDebugMode: localToggleDebugMode,
  }
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useGameActions.ts
git commit -m "fix(actions): add network-aware advanceTurn method"
```

---

### Task 4: Fix PeerHost setCallbacks + Add host client message router

This is the critical fix. PeerHost's `setCallbacks` currently replaces all callbacks, which would wipe `onPlayerJoined`/`onPlayerLeft` when GamePage sets only `onClientMessage`. Then we add the message router.

**Files:**
- Modify: `src/network/peerHost.ts:140-142`
- Modify: `src/pages/GamePage.tsx:1-44`

- [ ] **Step 4a: Change PeerHost setCallbacks to merge**

In `src/network/peerHost.ts`, replace the `setCallbacks` method:

**Before:**
```typescript
  setCallbacks(callbacks: HostEventCallback): void {
    this.callbacks = callbacks
  }
```

**After:**
```typescript
  setCallbacks(callbacks: HostEventCallback): void {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }
```

This ensures that setting `onClientMessage` in GamePage won't wipe `onPlayerJoined` / `onPlayerLeft` set in LobbyPage.

- [ ] **Step 4b: Add ClientMessage import in GamePage**

At the top of `src/pages/GamePage.tsx`, update the import from protocol:

**Before (line 9):**
```typescript
import type { HostMessage } from '@/network/protocol'
```

**After:**
```typescript
import type { ClientMessage, HostMessage } from '@/network/protocol'
```

- [ ] **Step 4c: Add host client message router**

Replace the host mode `useEffect` in `src/pages/GamePage.tsx` (lines 20–44):

**Before:**
```typescript
  // Host mode: subscribe to state changes and broadcast to clients
  useEffect(() => {
    if (networkMode !== 'host') return

    console.log('[GamePage:Host] 开始订阅 gameStore 状态变化')
    const unsubscribe = useGameStore.subscribe((state) => {
      const host = getHostInstance()
      if (!host) return

      const currentPlayers = useLobbyStore.getState().players
      const humanClients = currentPlayers.filter((p) => p.isHuman && !p.isHost)
      if (humanClients.length === 0) return

      console.log(`[GamePage:Host] 广播状态: phase=${state.phase}, 玩家数=${state.players.length}, 客户端数=${humanClients.length}`)
      humanClients.forEach((p) => {
        const view = filterStateForPlayer(state, p.index)
        console.log(`[GamePage:Host] 发送给客户端 index=${p.index}, 手牌数=${view.players.find((v) => v.id === p.id)?.handCount ?? 0}`)
        host.sendGameState(p.index, view)
      })
    })

    return () => {
      console.log('[GamePage:Host] 取消订阅 gameStore')
      unsubscribe()
    }
  }, [networkMode])
```

**After:**
```typescript
  // Host mode: route client actions + subscribe to state changes and broadcast
  useEffect(() => {
    if (networkMode !== 'host') return

    const host = getHostInstance()
    if (!host) return

    // Route client game actions to gameStore
    host.setCallbacks({
      onClientMessage: (_clientIndex: number, msg: ClientMessage) => {
        const store = useGameStore.getState()
        switch (msg.type) {
          case 'game:play-card':
            store.playCard(msg.cardId)
            break
          case 'game:draw-card':
            store.drawCard()
            break
          case 'game:pick-color':
            store.pickColor(msg.color)
            break
          case 'game:accept-draw':
            store.acceptDraw()
            break
          case 'game:resolve-uno':
            store.resolveUno(msg.confirmed)
            break
          case 'game:resolve-challenge':
            store.resolveChallenge(msg.challenge)
            break
          case 'game:advance-turn':
            store.advanceTurn(msg.skipCount)
            break
        }
      },
    })

    console.log('[GamePage:Host] 开始订阅 gameStore 状态变化')
    const unsubscribe = useGameStore.subscribe((state) => {
      const currentHost = getHostInstance()
      if (!currentHost) return

      const currentPlayers = useLobbyStore.getState().players
      const humanClients = currentPlayers.filter((p) => p.isHuman && !p.isHost)
      if (humanClients.length === 0) return

      console.log(`[GamePage:Host] 广播状态: phase=${state.phase}, 玩家数=${state.players.length}, 客户端数=${humanClients.length}`)
      humanClients.forEach((p) => {
        const view = filterStateForPlayer(state, p.index)
        console.log(`[GamePage:Host] 发送给客户端 index=${p.index}, 手牌数=${view.players.find((v) => v.id === p.id)?.handCount ?? 0}`)
        currentHost.sendGameState(p.index, view)
      })
    })

    return () => {
      console.log('[GamePage:Host] 取消订阅 gameStore')
      unsubscribe()
    }
  }, [networkMode])
```

Key changes:
1. Move `getHostInstance()` before subscribe to use it for callback setup
2. Add `host.setCallbacks({ onClientMessage: ... })` routing all 7 message types to gameStore actions
3. Use `currentHost` variable inside subscribe for clarity

- [ ] **Step 4d: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4e: Commit**

```bash
git add src/network/peerHost.ts src/pages/GamePage.tsx
git commit -m "fix(host): route client game actions to gameStore via onClientMessage"
```

---

### Task 5: Fix GameBoard display and action routing

Multiple fixes in GameBoard: draw pile count, advanceTurn source, DealAnimator index, timeout handler.

**Files:**
- Modify: `src/components/GameBoard.tsx`

- [ ] **Step 5a: Add useRemoteGameStore import**

At the top of `src/components/GameBoard.tsx`, add the import:

```typescript
import { useRemoteGameStore } from '@/store/remoteGameStore'
```

Place it after the `import { useGameStore } from '@/store/gameStore'` line.

- [ ] **Step 5b: Fix draw pile count display**

Replace the `drawPile` adapter selector with `drawPileCount`:

**Before (line 45):**
```typescript
  const drawPile = useGameAdapter((s) => s.drawPile)
```

**After:**
```typescript
  const drawPileCount = useGameAdapter((s) => s.drawPileCount)
```

Then update the `DrawPile` component usage. Find:

```typescript
          <DrawPile
            ref={drawPileRef}
            count={drawPile.length}
            onDraw={drawCard}
            canDraw={canDraw && pendingDrawCount <= 0}
          />
```

Replace `count={drawPile.length}` with `count={drawPileCount}`:

```typescript
          <DrawPile
            ref={drawPileRef}
            count={drawPileCount}
            onDraw={drawCard}
            canDraw={canDraw && pendingDrawCount <= 0}
          />
```

- [ ] **Step 5c: Fix advanceTurn to use useGameActions**

Remove the direct `useGameStore` access for `advanceTurn`. Find:

```typescript
  const advanceTurn = useGameStore((s) => s.advanceTurn)
```

Delete this line.

Then update the `useGameActions` destructuring to include `advanceTurn`:

**Before:**
```typescript
  const {
    playCard, drawCard, pickColor, startNewGame, initGame,
    acceptDraw, resolveUno, resolveChallenge, cancelColorPick,
    toggleDebugMode,
  } = useGameActions()
```

**After:**
```typescript
  const {
    playCard, drawCard, pickColor, startNewGame, initGame,
    acceptDraw, resolveUno, resolveChallenge, cancelColorPick,
    toggleDebugMode, advanceTurn,
  } = useGameActions()
```

- [ ] **Step 5d: Fix DealAnimator player index mapping**

There are two `DealAnimator` instances. In both, find the `targetRefs` prop:

```typescript
targetRefs={(() => { const m = new Map(aiRefs.current); if (playerHandRef.current) m.set(0, playerHandRef.current); return m })()}
```

Replace `m.set(0,` with `m.set(myPlayerIndex,` in both instances:

```typescript
targetRefs={(() => { const m = new Map(aiRefs.current); if (playerHandRef.current) m.set(myPlayerIndex, playerHandRef.current); return m })()}
```

- [ ] **Step 5e: Fix timeout handler for client mode**

The timeout handler inside the turn timer `useEffect` currently reads from `useGameStore` directly, which gives wrong data in client mode. Find the `setTimeout` callback (approximately lines 183–204):

**Before:**
```typescript
    const timer = setTimeout(() => {
      const state = useGameStore.getState()
      if (state.pendingUnoAdvance > 0) return
      if (state.currentPlayerIndex !== myPlayerIndex || state.phase !== 'playing') return
      if (state.drawAnimating) return

      const hp = state.players[myPlayerIndex]
      if (!hp) return
      if (state.pendingDrawCount > 0) {
        useGameStore.getState().acceptDraw()
        return
      }
      const tCard = state.discardPile[state.discardPile.length - 1]
      if (!tCard) return
      const playable = hp.hand.filter((c) => canPlayCard(c, tCard, state.currentColor, hp.hand))
      if (playable.length > 0) {
        useGameStore.getState().playCard(playable[0].id)
      } else {
        useGameStore.getState().drawCard()
      }
    }, remaining)
```

**After:**
```typescript
    const timer = setTimeout(() => {
      const lobbyState = useLobbyStore.getState()
      const state = lobbyState.networkMode === 'client'
        ? useRemoteGameStore.getState()
        : useGameStore.getState()

      if (state.pendingDrawCount > 0 && state.phase === 'playing') {
        if (lobbyState.networkMode === 'client') {
          lobbyState.sendAction?.({ type: 'game:accept-draw' })
        } else {
          useGameStore.getState().acceptDraw()
        }
        return
      }

      if (state.currentPlayerIndex !== myPlayerIndex || state.phase !== 'playing') return
      if (state.drawAnimating) return

      const hp = state.players[myPlayerIndex]
      if (!hp) return

      const tCard = state.discardPile[state.discardPile.length - 1]
      if (!tCard) return

      const playable = hp.hand.filter((c) => canPlayCard(c, tCard, state.currentColor, hp.hand))
      if (playable.length > 0) {
        if (lobbyState.networkMode === 'client') {
          lobbyState.sendAction?.({ type: 'game:play-card', cardId: playable[0].id })
        } else {
          useGameStore.getState().playCard(playable[0].id)
        }
      } else {
        if (lobbyState.networkMode === 'client') {
          lobbyState.sendAction?.({ type: 'game:draw-card' })
        } else {
          useGameStore.getState().drawCard()
        }
      }
    }, remaining)
```

Key changes:
1. Check `networkMode` to pick the right state source (`remoteGameStore` for client, `gameStore` for host/local)
2. All action calls check `networkMode` and use `sendAction` in client mode
3. Simplified the `pendingUnoAdvance` check — in client mode this field is not available in remote state, so removed it (the UNO flow is a pre-existing limitation in client mode)

- [ ] **Step 5f: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5g: Commit**

```bash
git add src/components/GameBoard.tsx
git commit -m "fix(board): fix draw pile display, advanceTurn routing, DealAnimator index, and timeout handler for client mode"
```

---

### Task 6: Build verification

- [ ] **Step 6a: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6b: Run lint**

Run: `npm run lint`
Expected: No errors (or only pre-existing warnings)

- [ ] **Step 6c: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 6d: Run existing tests**

Run: `npx vitest run`
Expected: All existing tests pass

- [ ] **Step 6e: Commit if any fixups were needed**

```bash
git add -A
git commit -m "fix: address build/lint issues from LAN multiplayer fix"
```

---

### Task 7: Manual integration test

- [ ] **Step 7a: Start dev server**

Run: `npm run dev`

- [ ] **Step 7b: Test 2-player game (host + client)**

1. **Window A (Host):** Open app → "局域网联机" → set nickname → create room → copy Peer ID
2. **Window B (Client):** Open app in new tab → "局域网联机" → set different nickname → paste Peer ID → join
3. **Host:** Click "开始游戏"
4. **Verify on both windows:**
   - Cards dealt correctly (7 each)
   - Draw pile shows correct count on both sides
   - Turn indicator shows whose turn it is on both sides
   - Host can play cards when it's their turn
   - Client can play cards when it's their turn — card appears on discard pile on both sides
   - Client can draw cards when it's their turn — card appears in hand
   - Turn advances correctly after each action on both sides
   - "跳过" button works for client (sends advance-turn to host)

- [ ] **Step 7c: Test with AI players**

1. Host creates room with 1 AI player
2. Client joins
3. Start game with 3 players
4. **Verify:**
   - AI takes turns correctly
   - AI does not interfere with human player turns
   - When it's client's turn, AI engine does not play for them
   - Action effects (+2, skip, reverse, wild) work correctly across all player types
