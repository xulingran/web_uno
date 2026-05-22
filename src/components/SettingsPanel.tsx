import { useState } from 'react'
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import { useConfigStore } from '@/store/configStore'
import { PRESETS } from '@/config/presets'
import { DIFFICULTY_CONFIGS } from '@/config/defaults'
import type { GameConfig, PresetName, Difficulty } from '@/config/types'

interface SettingsPanelProps {
  compact?: boolean
  onStartGame?: () => void
}

type GroupKey = 'params' | 'actionCards' | 'draw' | 'uno' | 'scoring'

interface GroupDef {
  key: GroupKey
  label: string
  defaultOpen: boolean
}

const GROUPS: GroupDef[] = [
  { key: 'params', label: '基础参数', defaultOpen: true },
  { key: 'actionCards', label: '功能牌行为', defaultOpen: true },
  { key: 'draw', label: '抽牌规则', defaultOpen: false },
  { key: 'uno', label: 'UNO 规则', defaultOpen: false },
  { key: 'scoring', label: '计分', defaultOpen: false },
]

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard']

export default function SettingsPanel({ compact, onStartGame }: SettingsPanelProps) {
  const config = useConfigStore((s) => s.config)
  const activePreset = useConfigStore((s) => s.activePreset)
  const updateParam = useConfigStore((s) => s.updateParam)
  const applyPreset = useConfigStore((s) => s.applyPreset)
  const resetToDefaults = useConfigStore((s) => s.resetToDefaults)

  const [openGroups, setOpenGroups] = useState<Set<GroupKey>>(
    new Set(GROUPS.filter((g) => g.defaultOpen).map((g) => g.key))
  )

  const toggleGroup = (key: GroupKey) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handlePresetChange = (name: string) => {
    applyPreset(name as PresetName)
  }

  const handleDifficultyChange = (difficulty: Difficulty) => {
    updateParam('ai', DIFFICULTY_CONFIGS[difficulty])
  }

  const renderToggle = (label: string, group: keyof GameConfig, field: string) => (
    <label className="flex items-center justify-between py-2.5 px-1 hover:bg-white/5 rounded cursor-pointer">
      <span className="text-white/80 text-sm">{label}</span>
      <input
        type="checkbox"
        className="w-5 h-5 accent-yellow-400"
        checked={(config[group] as unknown as Record<string, boolean>)[field]}
        onChange={(e) => updateParam(group, { [field]: e.target.checked })}
      />
    </label>
  )

  const renderNumber = (label: string, group: keyof GameConfig, field: string, min = 0, max = 99) => (
    <div className="flex items-center justify-between py-2.5 px-1">
      <span className="text-white/80 text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button
          className="w-7 h-7 rounded-full bg-white/10 text-white text-lg flex items-center justify-center hover:bg-white/20"
          onClick={() => {
            const val = (config[group] as unknown as Record<string, number>)[field]
            if (val > min) updateParam(group, { [field]: val - 1 })
          }}
        >
          −
        </button>
        <span className="text-white font-game w-8 text-center">
          {(config[group] as unknown as Record<string, number>)[field]}
        </span>
        <button
          className="w-7 h-7 rounded-full bg-white/10 text-white text-lg flex items-center justify-center hover:bg-white/20"
          onClick={() => {
            const val = (config[group] as unknown as Record<string, number>)[field]
            if (val < max) updateParam(group, { [field]: val + 1 })
          }}
        >
          +
        </button>
      </div>
    </div>
  )

  if (compact) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 justify-center">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => handlePresetChange(p.name)}
              className={`px-4 py-2 rounded-lg font-game text-sm transition-all ${
                activePreset === p.name
                  ? 'bg-yellow-400 text-black'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-center items-center">
          <span className="text-white/60 text-xs">AI 难度:</span>
          {DIFFICULTY_ORDER.map((d) => (
            <button
              key={d}
              onClick={() => handleDifficultyChange(d)}
              className={`px-3 py-1 rounded-lg font-game text-xs transition-all ${
                config.ai.difficulty === d
                  ? 'bg-yellow-400 text-black'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>
        <div className="text-white/50 text-xs text-center space-y-1">
          <div>
            玩家数: {1 + config.params.aiPlayerCount} | 初始手牌: {config.params.initialHandSize}张
            {config.params.targetScore > 0 ? ` | 目标: ${config.params.targetScore}分` : ''}
          </div>
          <div className="flex flex-wrap gap-x-3 justify-center">
            {config.actionCards.stackingDraw2 && <span>+2堆叠</span>}
            {config.actionCards.stackingDraw4 && <span>+4堆叠</span>}
            {config.actionCards.challengeWild4 && <span>Wild+4质疑</span>}
            {config.actionCards.jumpIn && <span>跳入</span>}
            {config.actionCards.sevenORule && <span>7-0</span>}
            {config.draw.forcePlay && <span>强制出牌</span>}
            {config.draw.drawToMatch && <span>抽到可出</span>}
            {config.uno.requireUNOCall && <span>UNO罚抽</span>}
          </div>
        </div>
        {onStartGame && (
          <button
            onClick={onStartGame}
            className="mt-2 px-8 py-3 rounded-xl bg-yellow-400 text-black font-game text-lg shadow-lg hover:bg-yellow-300 transition-all"
          >
            开始游戏
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6 max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto">
      <div className="flex flex-col gap-2">
        <h3 className="font-game text-white text-lg">预设</h3>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => handlePresetChange(p.name)}
              className={`px-4 py-2 rounded-lg font-game text-sm transition-all ${
                activePreset === p.name
                  ? 'bg-yellow-400 text-black'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
              title={p.description}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-1 text-white/40 text-xs hover:text-white/70 self-start"
        >
          <RotateCcw size={12} /> 恢复全部默认
        </button>
      </div>

      {GROUPS.map((group) => (
        <div key={group.key} className="border border-white/15 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleGroup(group.key)}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-white/5 hover:bg-white/10 transition-colors"
          >
            <span className="font-game text-white text-sm">{group.label}</span>
            {openGroups.has(group.key) ? (
              <ChevronDown size={16} className="text-white/50" />
            ) : (
              <ChevronRight size={16} className="text-white/50" />
            )}
          </button>
          {openGroups.has(group.key) && (
            <div className="px-4 py-2 flex flex-col">
              {group.key === 'params' && (
                <>
                  {renderNumber('初始手牌数', 'params', 'initialHandSize', 3, 15)}
                  {renderNumber('AI 数量', 'params', 'aiPlayerCount', 1, 5)}
                  {renderNumber('目标分数 (0=不限)', 'params', 'targetScore', 0, 9999)}
                  {renderNumber('回合限时秒 (0=不限)', 'params', 'turnTimeLimit', 0, 300)}
                  <div className="flex items-center justify-between py-2 px-1">
                    <span className="text-white/80 text-sm">AI 难度</span>
                    <div className="flex gap-1">
                      {DIFFICULTY_ORDER.map((d) => (
                        <button
                          key={d}
                          onClick={() => handleDifficultyChange(d)}
                          className={`px-3 py-1 rounded-lg font-game text-xs transition-all ${
                            config.ai.difficulty === d
                              ? 'bg-yellow-400 text-black'
                              : 'bg-white/10 text-white/60 hover:bg-white/20'
                          }`}
                        >
                          {DIFFICULTY_LABELS[d]}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {group.key === 'actionCards' && (
                <>
                  {renderToggle('+2 堆叠链', 'actionCards', 'stackingDraw2')}
                  {renderToggle('+4 堆叠链', 'actionCards', 'stackingDraw4')}
                  {renderToggle('Wild+4 质疑挑战', 'actionCards', 'challengeWild4')}
                  {renderToggle('Reverse = Skip (2人时)', 'actionCards', 'reverseAsSkip')}
                  {renderToggle('同卡跳入 (Jump-in)', 'actionCards', 'jumpIn')}
                  {renderToggle('7-0 换手轮转', 'actionCards', 'sevenORule')}
                </>
              )}
              {group.key === 'draw' && (
                <>
                  {renderToggle('抽到可出为止', 'draw', 'drawToMatch')}
                  {renderToggle('有牌必须出 (Force Play)', 'draw', 'forcePlay')}
                  {renderNumber('无牌可出抽几张', 'draw', 'multiDrawCount', 1, 10)}
                </>
              )}
              {group.key === 'uno' && (
                <>
                  {renderToggle('需呼叫 UNO', 'uno', 'requireUNOCall')}
                  {renderNumber('漏叫罚抽张数', 'uno', 'unoPenaltyDraw', 0, 10)}
                  {renderToggle('系统自动提示 UNO', 'uno', 'autoDetectUNO')}
                </>
              )}
              {group.key === 'scoring' && (
                <>
                  <div className="flex items-center justify-between py-2 px-1">
                    <span className="text-white/80 text-sm">数字牌计分方式</span>
                    <select
                      className="bg-white/10 text-white text-sm rounded px-2 py-1"
                      value={config.scoring.numberCard > 0 ? 'fixed' : 'face'}
                      onChange={(e) => {
                        if (e.target.value === 'face') {
                          updateParam('scoring', { numberCard: 0 })
                        } else {
                          updateParam('scoring', { numberCard: 10 })
                        }
                      }}
                    >
                      <option value="face">按面值</option>
                      <option value="fixed">固定值</option>
                    </select>
                  </div>
                  {config.scoring.numberCard > 0 && renderNumber('数字牌固定分值', 'scoring', 'numberCard', 1, 50)}
                  {renderNumber('功能牌分值', 'scoring', 'actionCard', 1, 100)}
                  {renderNumber('万能牌分值', 'scoring', 'wildCard', 1, 100)}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}