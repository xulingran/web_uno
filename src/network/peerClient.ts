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

// 模块级单例，支持跨页面访问
let _clientInstance: PeerClient | null = null
export function getClientInstance() { return _clientInstance }
export function setClientInstance(c: PeerClient | null) { _clientInstance = c }

export class PeerClient {
  private peer: Peer
  private connection: DataConnection | null = null
  private callbacks: ClientEventCallback = {}

  constructor() {
    this.peer = new Peer(PEERJS_CONFIG)
    setClientInstance(this)
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
    // 如果已有连接，重新绑定 data 事件
    if (this.connection) {
      this.connection.off('data')
      this.connection.off('close')
      this.connection.off('error')
      this.connection.on('data', (data) => {
        this.callbacks.onMessage?.(data as HostMessage)
      })
      this.connection.on('close', () => {
        this.callbacks.onDisconnected?.()
      })
      this.connection.on('error', (err) => {
        this.callbacks.onError?.(err)
      })
    }
  }

  getPeerId(): string {
    return this.peer.id
  }

  destroy(): void {
    this.connection?.close()
    this.peer.destroy()
    setClientInstance(null)
  }
}
