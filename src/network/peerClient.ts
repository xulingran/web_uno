import { Peer, type DataConnection } from 'peerjs'
import type { ClientMessage, HostMessage } from './protocol'
import { PEERJS_CONFIG } from './peerConfig'
import { logger } from '@/utils/logger'

export type ClientEventCallback = {
  onMessage?: (message: HostMessage) => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
}

const CONNECT_TIMEOUT_MS = 15000

// 模块级单例，支持跨页面访问
let _clientInstance: PeerClient | null = null
export function getClientInstance() { return _clientInstance }
export function setClientInstance(c: PeerClient | null) { _clientInstance = c }

export class PeerClient {
  private peer: Peer
  private connection: DataConnection | null = null
  private callbacks: ClientEventCallback = {}
  private dataHandler: ((data: unknown) => void) | null = null
  private closeHandler: (() => void) | null = null
  private errorHandler: ((err: Error) => void) | null = null

  constructor() {
    logger.debug('[PeerClient] 创建 Peer 实例，连接信令服务器...')
    this.peer = new Peer(PEERJS_CONFIG)
    setClientInstance(this)

    this.peer.on('open', (id) => {
      logger.debug('[PeerClient] 已连接信令服务器，我的 peerId:', id)
    })

    this.peer.on('disconnected', () => {
      logger.warn('[PeerClient] 与信令服务器断开连接')
    })

    this.peer.on('error', (err) => {
      console.error('[PeerClient] Peer 错误:', err)
    })
  }

  /** 通过完整 peerId 连接房主 */
  async joinByPeerId(hostPeerId: string, playerName: string): Promise<void> {
    logger.debug('[PeerClient] 开始连接房主:', hostPeerId)
    return new Promise((resolve, reject) => {
      let settled = false

      const errorHandler = (err: Error) => {
        done(err)
      }

      const disconnectedHandler = () => {
        done(new Error('与信令服务器断开连接，请检查网络'))
      }

      const done = (err?: Error) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        this.peer.off('error', errorHandler)
        this.peer.off('disconnected', disconnectedHandler)
        this.peer.off('open', openHandler)
        if (err) {
          console.error('[PeerClient] 连接失败:', err.message)
          reject(err)
        } else {
          logger.debug('[PeerClient] 连接成功')
          resolve()
        }
      }

      const timeout = setTimeout(() => {
        done(new Error('连接超时，请检查网络或确认房主 Peer ID 是否正确'))
      }, CONNECT_TIMEOUT_MS)

      this.peer.on('error', errorHandler)

      this.peer.on('disconnected', disconnectedHandler)

      const doConnect = () => {
        logger.debug('[PeerClient] 发起 P2P 连接请求...')
        const conn = this.peer.connect(hostPeerId, { reliable: true })

        conn.on('open', () => {
          logger.debug('[PeerClient] DataConnection 已建立！')
          this.connection = conn
          conn.send({ type: 'room:join', name: playerName } satisfies ClientMessage)
          done()
        })

        conn.on('data', (data) => {
          logger.debug('[PeerClient] 收到数据:', (data as HostMessage).type)
          this.callbacks.onMessage?.(data as HostMessage)
        })

        conn.on('close', () => {
          logger.warn('[PeerClient] DataConnection 关闭')
          this.callbacks.onDisconnected?.()
        })

        conn.on('error', (err) => {
          console.error('[PeerClient] DataConnection 错误:', err)
          this.callbacks.onError?.(err)
          done(err)
        })

        conn.on('iceStateChanged', (state) => {
          logger.debug('[PeerClient] ICE 状态变化:', state)
        })
      }

      const openHandler = () => {
        doConnect()
      }

      // 必须等自己的 peer 连接信令服务器后，再发起 P2P 连接
      if (this.peer.id) {
        logger.debug('[PeerClient] Peer 已就绪，直接发起连接')
        doConnect()
      } else {
        logger.debug('[PeerClient] 等待信令服务器连接...')
        this.peer.on('open', openHandler)
      }
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
    if (this.connection) {
      if (this.dataHandler) this.connection.off('data', this.dataHandler)
      if (this.closeHandler) this.connection.off('close', this.closeHandler)
      if (this.errorHandler) this.connection.off('error', this.errorHandler)

      this.dataHandler = (data: unknown) => {
        this.callbacks.onMessage?.(data as HostMessage)
      }
      this.closeHandler = () => {
        this.callbacks.onDisconnected?.()
      }
      this.errorHandler = (err: Error) => {
        this.callbacks.onError?.(err)
      }

      this.connection.on('data', this.dataHandler)
      this.connection.on('close', this.closeHandler)
      this.connection.on('error', this.errorHandler)
    }
  }

  getPeerId(): string {
    return this.peer.id
  }

  destroy(): void {
    logger.debug('[PeerClient] 销毁')
    this.connection?.close()
    this.peer.destroy()
    setClientInstance(null)
  }
}
