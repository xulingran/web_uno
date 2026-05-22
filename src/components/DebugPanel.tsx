import { useState, useRef, useEffect } from 'react'
import { X, Copy, ChevronDown, ChevronRight, Send } from 'lucide-react'
import type { GameLogEntry, GameEventType, Player, GamePhase, Direction, CardColor, Card } from '@/utils/types'

interface DebugPanelProps {
  visible: boolean
  logEntries: GameLogEntry[]
  onClose: () => void
  players: Player[]
  phase: GamePhase
  direction: Direction
  currentColor: CardColor
  currentPlayerIndex: number
  winner: Player | null
  scores: number[]
  addLogEntry: (entry: Omit<GameLogEntry, 'timestamp'>) => void
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
  'debug': '调试',
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
  'debug': 'text-white/70',
}

const PHASE_LABELS: Record<GamePhase, string> = {
  'idle': '未开始',
  'dealing': '发牌中',
  'playing': '出牌中',
  'color-picking': '选颜色中',
  'round-over': '回合结束',
  'challenge': '挑战中',
  'stacking': '堆叠中',
  'seven-swap': '七换手中',
  'uno-call': 'UNO呼喊中',
}

const DIRECTION_LABELS: Record<Direction, string> = {
  'clockwise': '顺时针',
  'counterclockwise': '逆时针',
}

const COLOR_LABELS: Record<string, string> = {
  'red': '红',
  'yellow': '黄',
  'blue': '蓝',
  'green': '绿',
}

const COLOR_TEXT_CLASSES: Record<string, string> = {
  'red': 'text-red-400',
  'yellow': 'text-yellow-400',
  'blue': 'text-blue-400',
  'green': 'text-green-400',
}

const COLOR_DOT_CLASSES: Record<string, string> = {
  'red': 'bg-red-500',
  'yellow': 'bg-yellow-500',
  'blue': 'bg-blue-500',
  'green': 'bg-green-500',
}

const TYPE_LABELS: Record<string, string> = {
  'skip': '跳过',
  'reverse': '反转',
  'draw2': '+2',
  'wild': '万能',
  'wild4': '万能+4',
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

function formatCardName(card: Card): string {
  if (card.color) {
    const colorName = COLOR_LABELS[card.color] ?? card.color
    if (card.type === 'number') {
      return `${colorName}${card.value ?? ''}`
    }
    return `${colorName}${TYPE_LABELS[card.type] ?? card.type}`
  }
  return TYPE_LABELS[card.type] ?? card.type
}

function getCardColorClass(card: Card): string {
  if (card.color) {
    return COLOR_TEXT_CLASSES[card.color] ?? 'text-white/80'
  }
  return 'text-white/80'
}

interface CollapsibleSectionProps {
  title: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

function CollapsibleSection({ title, isExpanded, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-1 px-3 py-2 hover:bg-white/5 transition-colors text-left"
      >
        {isExpanded ? <ChevronDown size={12} className="text-white/50 shrink-0" /> : <ChevronRight size={12} className="text-white/50 shrink-0" />}
        <span className="text-xs font-mono text-white/80">{title}</span>
      </button>
      {isExpanded && (
        <div className="px-3 pb-2">
          {children}
        </div>
      )}
    </div>
  )
}

export default function DebugPanel({
  visible,
  logEntries,
  onClose,
  players,
  phase,
  direction,
  currentColor,
  currentPlayerIndex,
  winner,
  scores,
  addLogEntry,
}: DebugPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    gameState: false,
    aiHands: false,
    logs: true,
  })

  const [debugInput, setDebugInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logEntries.length])

  if (!visible) return null

  const toggleSection = (section: 'gameState' | 'aiHands' | 'logs') => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handleCopyAll = () => {
    const text = logEntries.map(formatEntryText).join('\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const handleSendDebug = () => {
    const trimmed = debugInput.trim()
    if (!trimmed) return
    addLogEntry({ event: 'debug', playerName: 'DEBUG', extra: trimmed })
    setDebugInput('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendDebug()
    }
  }

  const currentPlayer = players[currentPlayerIndex]

  return (
    <div
      className="fixed right-0 top-0 z-[60] flex flex-col"
      style={{ width: '320px', maxHeight: '80vh' }}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-black/90 border-b border-white/10 shrink-0">
        <span className="text-xs font-mono text-yellow-300">调试面板</span>
        <button
          onClick={onClose}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-white/60 hover:text-white/90 hover:bg-white/10 transition-all"
        >
          <X size={12} /> 关闭
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-black/85 font-mono text-xs leading-relaxed">
        <CollapsibleSection
          title="游戏状态"
          isExpanded={expandedSections.gameState}
          onToggle={() => toggleSection('gameState')}
        >
          <div className="space-y-1 text-white/70">
            <div>
              <span className="text-white/40">阶段：</span>
              {PHASE_LABELS[phase] ?? phase}
            </div>
            <div>
              <span className="text-white/40">方向：</span>
              {DIRECTION_LABELS[direction] ?? direction}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-white/40">颜色：</span>
              <span className={`inline-block w-3 h-3 rounded-full ${COLOR_DOT_CLASSES[currentColor] ?? 'bg-gray-500'}`} />
              <span>{COLOR_LABELS[currentColor] ?? currentColor}</span>
            </div>
            <div>
              <span className="text-white/40">当前玩家：</span>
              {currentPlayer?.name ?? '—'}
            </div>
            {winner && (
              <>
                <div className="text-yellow-300 mt-1">🏆 胜者：{winner.name}</div>
                <div className="text-white/60">
                  {scores.map((s, i) => (
                    <div key={i}>玩家{i + 1}：{s}分</div>
                  ))}
                </div>
              </>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="AI 手牌"
          isExpanded={expandedSections.aiHands}
          onToggle={() => toggleSection('aiHands')}
        >
          <div className="space-y-2">
            {players.filter((p) => !p.isHuman).map((p) => (
              <div key={p.id}>
                <div className="text-white/60 font-bold">{p.name}</div>
                <div className="flex flex-wrap gap-x-0.5">
                  {p.hand.map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && <span className="text-white/30">、</span>}
                      <span className={getCardColorClass(c)}>{formatCardName(c)}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {players.filter((p) => !p.isHuman).length === 0 && (
              <div className="text-white/30">无AI玩家</div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="事件日志"
          isExpanded={expandedSections.logs}
          onToggle={() => toggleSection('logs')}
        >
          <div className="flex items-center justify-end mb-1">
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-white/60 hover:text-white/90 hover:bg-white/10 transition-all"
            >
              <Copy size={10} /> 复制
            </button>
          </div>
          <div
            ref={scrollRef}
            className="max-h-40 overflow-y-auto mb-2"
          >
            {logEntries.length === 0 ? (
              <div className="text-white/30 text-center">暂无日志</div>
            ) : (
              logEntries.map((entry, i) => (
                <div key={i} className={`${EVENT_COLORS[entry.event] ?? 'text-white/80'} select-text`}>
                  {formatEntryText(entry)}
                </div>
              ))
            )}
          </div>
          <div className="flex gap-1">
            <input
              ref={inputRef}
              type="text"
              value={debugInput}
              onChange={(e) => setDebugInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="手动添加调试日志..."
              className="flex-1 bg-white/10 border border-white/10 rounded px-2 py-1 text-xs text-white/80 placeholder-white/30 outline-none focus:border-white/30"
            />
            <button
              onClick={handleSendDebug}
              className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 text-white/60 hover:bg-white/20 hover:text-white/90 transition-all text-xs"
            >
              <Send size={10} /> 发送
            </button>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  )
}