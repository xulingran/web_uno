import { create } from 'zustand'
import type { LobbyPlayer, ClientMessage } from '@/network/protocol'
import type { GameConfig } from '@/config/types'

export type NetworkMode = 'local' | 'host' | 'client'
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

interface LobbyState {
  networkMode: NetworkMode
  connectionStatus: ConnectionStatus
  roomCode: string
  hostPeerId: string
  myPeerId: string
  myPlayerIndex: number
  playerName: string
  players: LobbyPlayer[]
  maxHumanPlayers: number
  aiCount: number
  config: GameConfig
  error: string | null
  sendAction: ((message: ClientMessage) => void) | null

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
  setSendAction: (fn: ((message: ClientMessage) => void) | null) => void
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
  sendAction: null as ((message: ClientMessage) => void) | null,
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
  removePlayer: (index) =>
    set((s) => ({
      players: s.players.filter((p) => p.index !== index),
    })),
  setMaxHumanPlayers: (count) => set({ maxHumanPlayers: count }),
  setAiCount: (count) => set({ aiCount: count }),
  setConfig: (config) => set({ config }),
  setError: (error) => set({ error }),
  setSendAction: (fn) => set({ sendAction: fn }),
  reset: () => set(initialState),
}))
