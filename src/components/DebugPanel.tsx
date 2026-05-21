import { useRef, useEffect } from 'react'
import { X, Copy } from 'lucide-react'
import type { GameLogEntry, GameEventType } from '@/utils/types'

interface DebugPanelProps {
  visible: boolean
  logEntries: GameLogEntry[]
  onClose: () => void
}

const EVENT_LABELS: Record<GameEventType, string> = {
  'game-start': '游戏开始',
  'deal': '发牌',
  'play': '出牌',
  'draw': '摸牌',
  'skip': '跳过',
  'reverse': '反转',
  'color-pick': '选颜色',
  'draw2-stack': '+2叠加',
  'wild4-challenge': '+4挑战',
  'uno-call': 'UNO!',
  'round-over': '回合结束',
  'hand-swap': '交换手牌',
  'hand-rotate': '轮转手牌',
}

const EVENT_COLORS: Record<GameEventType, string> = {
  'game-start': 'text-yellow-300',
  'deal': 'text-gray-400',
  'play': 'text-green-400',
  'draw': 'text-blue-400',
  'skip': 'text-orange-400',
  'reverse': 'text-purple-400',
  'color-pick': 'text-cyan-400',
  'draw2-stack': 'text-red-400',
  'wild4-challenge': 'text-red-400',
  'uno-call': 'text-yellow-400',
  'round-over': 'text-yellow-300',
  'hand-swap': 'text-pink-400',
  'hand-rotate': 'text-pink-400',
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

function formatEntryText(entry: GameLogEntry): string {
  const label = EVENT_LABELS[entry.event] ?? entry.event
  let text = `[${formatTime(entry.timestamp)}] ${entry.playerName} ${label}`
  if (entry.cardInfo) text += `：${entry.cardInfo}`
  if (entry.extra) text += ` → ${entry.extra}`
  return text
}

export default function DebugPanel({ visible, logEntries, onClose }: DebugPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logEntries.length])

  if (!visible) return null

  const handleCopyAll = () => {
    const text = logEntries.map(formatEntryText).join('\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <div
      className="fixed right-0 top-0 z-[60] flex flex-col"
      style={{ width: '280px', height: '60vh' }}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-black/90 border-b border-white/10">
        <span className="text-xs font-mono text-yellow-300">调试日志</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-white/60 hover:text-white/90 hover:bg-white/10 transition-all"
          >
            <Copy size={12} /> 复制
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-white/60 hover:text-white/90 hover:bg-white/10 transition-all"
          >
            <X size={12} /> 关闭
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 bg-black/85 font-mono text-xs leading-relaxed"
      >
        {logEntries.length === 0 ? (
          <div className="text-white/30 text-center mt-4">暂无日志</div>
        ) : (
          logEntries.map((entry, i) => (
            <div key={i} className={`${EVENT_COLORS[entry.event] ?? 'text-white/80'} select-text`}>
              {formatEntryText(entry)}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
