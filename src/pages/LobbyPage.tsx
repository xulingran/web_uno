import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLobbyStore } from '@/store/lobbyStore'
import { useConfigStore } from '@/store/configStore'
import { PeerHost, getHostInstance } from '@/network/peerHost'
import { PeerClient, getClientInstance } from '@/network/peerClient'
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
    players, setPlayers, addPlayer, removePlayer,
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

      const peerId = await host.createRoom(maxHumanPlayers - 1)
      setHostPeerId(peerId)
      setMyPeerId(peerId)
      setMyPlayerIndex(0)
      setRoomCode(host.getRoomCode())
      setConnectionStatus('connected')

      const hostPlayer: LobbyPlayer = {
        index: 0,
        id: 'p0',
        name: playerName || '房主',
        isHost: true,
        isHuman: true,
        ready: true,
      }
      addPlayer(hostPlayer)

      // 添加人类槽位占位
      for (let i = 1; i < maxHumanPlayers; i++) {
        addPlayer({
          index: i,
          id: `pending-p${i}`,
          name: `等待加入...`,
          isHost: false,
          isHuman: true,
          ready: false,
        })
      }

      // 添加 AI 占位
      for (let i = 0; i < aiCount; i++) {
        const idx = maxHumanPlayers + i
        const aiNames = ['电脑A', '电脑B', '电脑C', '电脑D']
        addPlayer({
          index: idx,
          id: `ai-${idx}`,
          name: aiNames[i] || `电脑${idx}`,
          isHost: false,
          isHuman: false,
          ready: true,
        })
      }

      host.setCallbacks({
        onPlayerJoined: (index, conn) => {
          // 移除占位，添加真实玩家
          useLobbyStore.getState().removePlayer(index)
          const playerName = `玩家${index}`
          addPlayer({
            index,
            id: `p${index}`,
            name: playerName,
            isHost: false,
            isHuman: true,
            ready: true,
          })
          // 给新玩家发送房间信息
          host.sendToClient(index, {
            type: 'room:info',
            code: host.getPeerId(),
            players: useLobbyStore.getState().players,
            config: useLobbyStore.getState().config,
          })
        },
        onPlayerLeft: (index) => {
          removePlayer(index)
          // 放回占位
          addPlayer({
            index,
            id: `pending-p${index}`,
            name: `等待加入...`,
            isHost: false,
            isHuman: true,
            ready: false,
          })
        },
        onClientMessage: (_clientIndex, _msg) => {
          // 大厅阶段的消息由 PeerHost 内部处理
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

      await client.joinByPeerId(inputCode.trim(), playerName || '玩家')
      setMyPeerId(client.getPeerId())
      setConnectionStatus('connected')

      client.setCallbacks({
        onMessage: (msg: HostMessage) => {
          if (msg.type === 'room:info') {
            setHostPeerId(msg.code)
            setLobbyConfig(msg.config)
            setPlayers(msg.players)
            setRoomCode(msg.code.slice(0, 4).toUpperCase())
          } else if (msg.type === 'room:player-joined') {
            removePlayer(msg.playerIndex)
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
    const currentPlayers = useLobbyStore.getState().players
    const host = getHostInstance()
    // 只向人类客户端（非自己）发送 game:started
    currentPlayers
      .filter((p) => p.isHuman && !p.isHost)
      .forEach((p) => {
        host?.sendToClient(p.index, {
          type: 'game:started',
          config: lobbyConfig,
        })
      })
    host?.setCallbacks({
      ...host?.['callbacks'],
    })
    navigate('/game')
  }

  const handleBack = () => {
    hostRef.current?.destroy()
    clientRef.current?.destroy()
    useLobbyStore.getState().reset()
    navigate('/')
  }

  if (connectionStatus === 'connecting') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg">正在连接房间...</p>
        </div>
      </div>
    )
  }

  if (networkMode === 'host' || networkMode === 'client') {
    const humanPlayers = players.filter((p) => p.isHuman)
    const aiPlayers = players.filter((p) => !p.isHuman)
    const allReady = humanPlayers.every((p) => p.ready)

    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-lg mx-auto">
          <button onClick={handleBack} className="text-gray-400 hover:text-white mb-4 transition-colors">
            ← 返回大厅
          </button>

          <h1 className="text-2xl font-bold mb-2">
            {networkMode === 'host' ? '房间大厅' : '已加入房间'}
          </h1>

          {networkMode === 'host' && hostPeerId && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-gray-400 text-sm mb-2">将以下 Peer ID 分享给其他玩家：</p>
              <div className="bg-gray-700 rounded p-3 text-center">
                <span className="text-xl font-mono font-bold text-blue-400 select-all">{hostPeerId}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">其他人输入此 ID 即可加入房间</p>
            </div>
          )}

          {networkMode === 'client' && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4 text-center">
              <span className="text-green-400">✓ 已连接到房主</span>
              <p className="text-gray-400 text-sm mt-1">等待房主开始游戏...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <h2 className="text-lg font-semibold mb-3">
              玩家列表 ({humanPlayers.length}/{maxHumanPlayers + aiCount})
            </h2>
            <div className="space-y-2">
              {players.map((p) => (
                <div
                  key={p.index}
                  className={`flex items-center justify-between rounded p-3 ${
                    p.isHost ? 'bg-blue-900/30' : 'bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>
                      {p.isHost ? '👑' : p.isHuman ? '🎮' : '🤖'}
                    </span>
                    <span>{p.name}</span>
                    {networkMode === 'host' &&
                      myPlayerIndex === p.index &&
                      '(你)'}
                  </div>
                  <span
                    className={`text-sm ${
                      p.ready ? 'text-green-400' : 'text-yellow-400'
                    }`}
                  >
                    {p.ready ? '✓ 就绪' : '⏳'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {aiPlayers.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h2 className="text-lg font-semibold mb-2">AI 玩家</h2>
              <div className="space-y-2">
                {aiPlayers.map((p) => (
                  <div key={p.index} className="flex items-center justify-between bg-gray-700 rounded p-3">
                    <div className="flex items-center gap-2">
                      <span>🤖</span>
                      <span>{p.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {networkMode === 'host' && (
            <button
              onClick={handleStartGame}
              disabled={!allReady}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              开始游戏
            </button>
          )}
        </div>
      </div>
    )
  }

  // 初始状态：选择创建或加入
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-lg mx-auto">
        <button onClick={handleBack} className="text-gray-400 hover:text-white mb-6 transition-colors">
          ← 返回
        </button>

        <h1 className="text-2xl font-bold mb-6">UNO 联机</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">你的昵称</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="输入你的名字"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
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
              <input
                type="number"
                min={2}
                max={4}
                value={maxHumanPlayers}
                onChange={(e) => setMaxHumanPlayers(Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm text-gray-300 mb-1">AI 玩家数</label>
              <input
                type="number"
                min={0}
                max={4}
                value={aiCount}
                onChange={(e) => setAiCount(Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleCreateRoom}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors"
            >
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
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="粘贴房主分享的 ID"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white font-mono placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleJoinRoom}
              disabled={!inputCode.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-lg transition-colors"
            >
              加入
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
