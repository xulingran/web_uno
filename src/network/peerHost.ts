import { Peer, type DataConnection } from 'peerjs'
import type { ClientMessage, HostMessage, GameStateView } from './protocol'

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
  debug: 3,
}

// 模块级单例，支持跨页面访问
let _hostInstance: PeerHost | null = null
export function getHostInstance() { return _hostInstance }
export function setHostInstance(h: PeerHost | null) { _hostInstance = h }

export class PeerHost {
  private peer: Peer
  private connections: Map<number, DataConnection> = new Map()
  private roomCode: string = ''
  private callbacks: HostEventCallback = {}

  constructor() {
    console.log('[PeerHost] 创建 Peer 实例，连接信令服务器...')
    this.peer = new Peer(PEERJS_CONFIG)
    setHostInstance(this)

    this.peer.on('disconnected', () => {
      console.warn('[PeerHost] 与信令服务器断开连接')
      this.callbacks.onError?.(new Error('与信令服务器断开连接，请检查网络'))
    })

    this.peer.on('error', (err) => {
      console.error('[PeerHost] Peer 错误:', err)
    })
  }

  /** 创建房间，返回房间码 (完整 peerId) */
  async createRoom(
    maxHumanPlayers: number,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      this.peer.on('open', (id) => {
        console.log('[PeerHost] 已连接信令服务器，我的 peerId:', id)
        this.roomCode = id.slice(0, 4).toUpperCase()
        resolve(id)
      })

      this.peer.on('error', (err) => {
        this.callbacks.onError?.(err)
        reject(err)
      })

      this.peer.on('disconnected', () => {
        console.warn('[PeerHost] 与信令服务器断开连接')
        this.callbacks.onError?.(new Error('与信令服务器断开连接，请检查网络'))
      })

      this.peer.on('connection', (conn) => {
        console.log('[PeerHost] 收到传入连接请求')
        let assignedIndex = -1

        conn.on('data', (raw) => {
          const msg = raw as ClientMessage
          console.log('[PeerHost] 收到客户端消息:', msg.type)

          if (msg.type === 'room:join') {
            for (let i = 1; i < 1 + maxHumanPlayers; i++) {
              if (!this.connections.has(i)) {
                assignedIndex = i
                break
              }
            }
            if (assignedIndex === -1) {
              console.warn('[PeerHost] 房间已满，拒绝连接')
              conn.send({ type: 'error', message: '房间已满' } satisfies HostMessage)
              conn.close()
              return
            }

            console.log('[PeerHost] 分配玩家索引:', assignedIndex)
            this.connections.set(assignedIndex, conn)
            this.callbacks.onPlayerJoined?.(assignedIndex, conn)

            conn.off('data')
            conn.on('data', (data) => {
              this.callbacks.onClientMessage?.(assignedIndex, data as ClientMessage)
            })
          }
        })

        conn.on('close', () => {
          console.log('[PeerHost] 客户端连接关闭, 索引:', assignedIndex)
          if (assignedIndex >= 0) {
            this.connections.delete(assignedIndex)
            this.callbacks.onPlayerLeft?.(assignedIndex)
          }
        })

        conn.on('error', (err) => {
          console.error('[PeerHost] 连接错误:', err)
          this.callbacks.onError?.(err)
        })

        conn.on('iceStateChanged', (state) => {
          console.log('[PeerHost] ICE 状态变化:', state)
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
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  getRoomCode(): string {
    return this.roomCode
  }

  getPeerId(): string {
    return this.peer.id
  }

  destroy(): void {
    console.log('[PeerHost] 销毁')
    for (const [, conn] of this.connections) {
      conn.close()
    }
    this.connections.clear()
    this.peer.destroy()
    setHostInstance(null)
  }
}
