import { useEffect } from 'react'
import GameBoard from '@/components/GameBoard'
import { useGameEngine } from '@/hooks/useGameEngine'
import { useLobbyStore } from '@/store/lobbyStore'
import { useGameStore } from '@/store/gameStore'
import { useRemoteGameStore } from '@/store/remoteGameStore'
import { getHostInstance } from '@/network/peerHost'
import { getClientInstance } from '@/network/peerClient'
import { filterStateForPlayer } from '@/network/stateView'
import type { ClientMessage, HostMessage } from '@/network/protocol'

export default function GamePage() {
  const networkMode = useLobbyStore((s) => s.networkMode)
  const myPlayerIndex = useLobbyStore((s) => s.myPlayerIndex)
  const players = useLobbyStore((s) => s.players)

  useGameEngine()

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

  // Client mode: listen for host messages and update remote store
  useEffect(() => {
    if (networkMode !== 'client') return

    console.log('[GamePage:Client] 设置消息监听')
    const client = getClientInstance()
    if (!client) {
      console.warn('[GamePage:Client] getClientInstance 返回 null!')
      return
    }

    client.setCallbacks({
      onMessage: (msg: HostMessage) => {
        if (msg.type === 'game:state') {
          const myIdx = useLobbyStore.getState().myPlayerIndex
          const myHand = msg.state.players[myIdx]?.handCount ?? '?'
          console.log(`[GamePage:Client] 收到 game:state — phase=${msg.state.phase}, 玩家数=${msg.state.players.length}, myIdx=${myIdx}, 我的手牌数=${myHand}, 玩家名=[${msg.state.players.map((p) => p.name + (p.isHuman ? '(人)' : '(AI)')).join(',')}]`)
          useRemoteGameStore.getState().receiveState(msg.state)
        }
      },
      onDisconnected: () => {
        useLobbyStore.getState().setConnectionStatus('disconnected')
        useLobbyStore.getState().setError('与房主断开连接')
      },
      onError: (err) => {
        console.error('PeerClient error:', err)
      },
    })
  }, [networkMode])

  return <GameBoard />
}