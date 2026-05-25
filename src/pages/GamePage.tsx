import { useEffect } from 'react'
import GameBoard from '@/components/GameBoard'
import { useGameEngine } from '@/hooks/useGameEngine'
import { useLobbyStore } from '@/store/lobbyStore'
import { useGameStore } from '@/store/gameStore'
import { useRemoteGameStore } from '@/store/remoteGameStore'
import { getHostInstance } from '@/network/peerHost'
import { getClientInstance } from '@/network/peerClient'
import { filterStateForPlayer } from '@/network/stateView'
import type { HostMessage } from '@/network/protocol'

export default function GamePage() {
  const networkMode = useLobbyStore((s) => s.networkMode)
  const myPlayerIndex = useLobbyStore((s) => s.myPlayerIndex)
  const players = useLobbyStore((s) => s.players)

  useGameEngine()

  // Host mode: subscribe to state changes and broadcast to clients
  useEffect(() => {
    if (networkMode !== 'host') return

    const unsubscribe = useGameStore.subscribe((state) => {
      const host = getHostInstance()
      if (!host) return

      // Get current player list from lobby to find human clients
      const currentPlayers = useLobbyStore.getState().players
      currentPlayers
        .filter((p) => p.isHuman && !p.isHost)
        .forEach((p) => {
          const view = filterStateForPlayer(state, p.index)
          host.sendGameState(p.index, view)
        })
    })

    return () => {
      unsubscribe()
    }
  }, [networkMode])

  // Client mode: listen for host messages and update remote store
  useEffect(() => {
    if (networkMode !== 'client') return

    const client = getClientInstance()
    if (!client) return

    client.setCallbacks({
      onMessage: (msg: HostMessage) => {
        if (msg.type === 'game:state') {
          useRemoteGameStore.getState().receiveState(msg.state)
        }
      },
      onDisconnected: () => {
        // Handle disconnection — reset and go back to lobby
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