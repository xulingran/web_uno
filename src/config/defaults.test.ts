import { describe, it, expect, beforeEach } from 'vitest'
import { DEFAULT_CONFIG, DIFFICULTY_CONFIGS, loadConfig, saveConfig } from './defaults'

beforeEach(() => {
  localStorage.clear()
})

describe('DEFAULT_CONFIG', () => {
  it('包含六个分组', () => {
    expect(DEFAULT_CONFIG).toHaveProperty('params')
    expect(DEFAULT_CONFIG).toHaveProperty('actionCards')
    expect(DEFAULT_CONFIG).toHaveProperty('draw')
    expect(DEFAULT_CONFIG).toHaveProperty('uno')
    expect(DEFAULT_CONFIG).toHaveProperty('scoring')
    expect(DEFAULT_CONFIG).toHaveProperty('ai')
  })

  describe('params 分组', () => {
    it('initialHandSize 为 7', () => {
      expect(DEFAULT_CONFIG.params.initialHandSize).toBe(7)
    })

    it('aiPlayerCount 为 2', () => {
      expect(DEFAULT_CONFIG.params.aiPlayerCount).toBe(2)
    })

    it('targetScore 为 0', () => {
      expect(DEFAULT_CONFIG.params.targetScore).toBe(0)
    })

    it('turnTimeLimit 为 0', () => {
      expect(DEFAULT_CONFIG.params.turnTimeLimit).toBe(0)
    })
  })

  describe('actionCards 分组', () => {
    it('stackingDraw2 为 false', () => {
      expect(DEFAULT_CONFIG.actionCards.stackingDraw2).toBe(false)
    })

    it('stackingDraw4 为 false', () => {
      expect(DEFAULT_CONFIG.actionCards.stackingDraw4).toBe(false)
    })

    it('challengeWild4 为 false', () => {
      expect(DEFAULT_CONFIG.actionCards.challengeWild4).toBe(false)
    })

    it('reverseAsSkip 为 true', () => {
      expect(DEFAULT_CONFIG.actionCards.reverseAsSkip).toBe(true)
    })

    it('jumpIn 为 false', () => {
      expect(DEFAULT_CONFIG.actionCards.jumpIn).toBe(false)
    })

    it('sevenORule 为 false', () => {
      expect(DEFAULT_CONFIG.actionCards.sevenORule).toBe(false)
    })
  })

  describe('draw 分组', () => {
    it('drawToMatch 为 false', () => {
      expect(DEFAULT_CONFIG.draw.drawToMatch).toBe(false)
    })

    it('forcePlay 为 false', () => {
      expect(DEFAULT_CONFIG.draw.forcePlay).toBe(false)
    })

    it('multiDrawCount 为 1', () => {
      expect(DEFAULT_CONFIG.draw.multiDrawCount).toBe(1)
    })
  })

  describe('uno 分组', () => {
    it('requireUNOCall 为 true', () => {
      expect(DEFAULT_CONFIG.uno.requireUNOCall).toBe(true)
    })

    it('unoPenaltyDraw 为 2', () => {
      expect(DEFAULT_CONFIG.uno.unoPenaltyDraw).toBe(2)
    })

    it('autoDetectUNO 为 true', () => {
      expect(DEFAULT_CONFIG.uno.autoDetectUNO).toBe(true)
    })
  })

  describe('scoring 分组', () => {
    it('numberCard 为 0', () => {
      expect(DEFAULT_CONFIG.scoring.numberCard).toBe(0)
    })

    it('actionCard 为 20', () => {
      expect(DEFAULT_CONFIG.scoring.actionCard).toBe(20)
    })

    it('wildCard 为 50', () => {
      expect(DEFAULT_CONFIG.scoring.wildCard).toBe(50)
    })
  })
})

describe('DIFFICULTY_CONFIGS', () => {
  it('包含 easy, medium, hard 三个难度', () => {
    expect(DIFFICULTY_CONFIGS).toHaveProperty('easy')
    expect(DIFFICULTY_CONFIGS).toHaveProperty('medium')
    expect(DIFFICULTY_CONFIGS).toHaveProperty('hard')
  })

  describe('easy', () => {
    it('difficulty 为 easy', () => {
      expect(DIFFICULTY_CONFIGS.easy.difficulty).toBe('easy')
    })

    it('playRandomness 为 0.4', () => {
      expect(DIFFICULTY_CONFIGS.easy.playRandomness).toBe(0.4)
    })

    it('stackAggression 为 0.3', () => {
      expect(DIFFICULTY_CONFIGS.easy.stackAggression).toBe(0.3)
    })

    it('challengeAggression 为 0.3', () => {
      expect(DIFFICULTY_CONFIGS.easy.challengeAggression).toBe(0.3)
    })

    it('wild4BluffChance 为 0', () => {
      expect(DIFFICULTY_CONFIGS.easy.wild4BluffChance).toBe(0)
    })

    it('considerOpponent 为 false', () => {
      expect(DIFFICULTY_CONFIGS.easy.considerOpponent).toBe(false)
    })

    it('colorStrategy 为 most', () => {
      expect(DIFFICULTY_CONFIGS.easy.colorStrategy).toBe('most')
    })
  })

  describe('medium', () => {
    it('difficulty 为 medium', () => {
      expect(DIFFICULTY_CONFIGS.medium.difficulty).toBe('medium')
    })

    it('playRandomness 为 0.1', () => {
      expect(DIFFICULTY_CONFIGS.medium.playRandomness).toBe(0.1)
    })

    it('stackAggression 为 0.6', () => {
      expect(DIFFICULTY_CONFIGS.medium.stackAggression).toBe(0.6)
    })

    it('challengeAggression 为 0.7', () => {
      expect(DIFFICULTY_CONFIGS.medium.challengeAggression).toBe(0.7)
    })

    it('wild4BluffChance 为 0.15', () => {
      expect(DIFFICULTY_CONFIGS.medium.wild4BluffChance).toBe(0.15)
    })

    it('considerOpponent 为 true', () => {
      expect(DIFFICULTY_CONFIGS.medium.considerOpponent).toBe(true)
    })

    it('colorStrategy 为 most', () => {
      expect(DIFFICULTY_CONFIGS.medium.colorStrategy).toBe('most')
    })
  })

  describe('hard', () => {
    it('difficulty 为 hard', () => {
      expect(DIFFICULTY_CONFIGS.hard.difficulty).toBe('hard')
    })

    it('playRandomness 为 0', () => {
      expect(DIFFICULTY_CONFIGS.hard.playRandomness).toBe(0)
    })

    it('stackAggression 为 0.85', () => {
      expect(DIFFICULTY_CONFIGS.hard.stackAggression).toBe(0.85)
    })

    it('challengeAggression 为 1.0', () => {
      expect(DIFFICULTY_CONFIGS.hard.challengeAggression).toBe(1.0)
    })

    it('wild4BluffChance 为 0.35', () => {
      expect(DIFFICULTY_CONFIGS.hard.wild4BluffChance).toBe(0.35)
    })

    it('considerOpponent 为 true', () => {
      expect(DIFFICULTY_CONFIGS.hard.considerOpponent).toBe(true)
    })

    it('colorStrategy 为 best', () => {
      expect(DIFFICULTY_CONFIGS.hard.colorStrategy).toBe('best')
    })
  })
})

describe('loadConfig', () => {
  it('localStorage 为空时返回 DEFAULT_CONFIG', () => {
    const config = loadConfig()
    expect(config).toEqual(DEFAULT_CONFIG)
  })

  it('localStorage 中无数据时返回 DEFAULT_CONFIG', () => {
    localStorage.removeItem('uno-game-config')
    const config = loadConfig()
    expect(config).toEqual(DEFAULT_CONFIG)
  })

  it('localStorage 数据异常（非法 JSON）时返回 DEFAULT_CONFIG', () => {
    localStorage.setItem('uno-game-config', 'not-valid-json')
    const config = loadConfig()
    expect(config).toEqual(DEFAULT_CONFIG)
  })

  it('返回的对象是 DEFAULT_CONFIG 的副本而非引用', () => {
    const config = loadConfig()
    expect(config).not.toBe(DEFAULT_CONFIG)
  })

  it('deepMerge 合并部分配置', () => {
    const partial = { params: { initialHandSize: 10, aiPlayerCount: 4, targetScore: 500, turnTimeLimit: 60 } }
    localStorage.setItem('uno-game-config', JSON.stringify(partial))
    const config = loadConfig()

    expect(config.params.initialHandSize).toBe(10)
    expect(config.params.aiPlayerCount).toBe(4)
    expect(config.params.targetScore).toBe(500)
    expect(config.params.turnTimeLimit).toBe(60)

    expect(config.actionCards).toEqual(DEFAULT_CONFIG.actionCards)
    expect(config.draw).toEqual(DEFAULT_CONFIG.draw)
    expect(config.uno).toEqual(DEFAULT_CONFIG.uno)
    expect(config.scoring).toEqual(DEFAULT_CONFIG.scoring)
    expect(config.ai).toEqual(DEFAULT_CONFIG.ai)
  })

  it('deepMerge 合并嵌套部分配置', () => {
    const partial = { actionCards: { stackingDraw2: true }, draw: { multiDrawCount: 3 } }
    localStorage.setItem('uno-game-config', JSON.stringify(partial))
    const config = loadConfig()

    expect(config.actionCards.stackingDraw2).toBe(true)
    expect(config.actionCards.stackingDraw4).toBe(false)
    expect(config.actionCards.challengeWild4).toBe(false)
    expect(config.actionCards.reverseAsSkip).toBe(true)
    expect(config.actionCards.jumpIn).toBe(false)
    expect(config.actionCards.sevenORule).toBe(false)

    expect(config.draw.multiDrawCount).toBe(3)
    expect(config.draw.drawToMatch).toBe(false)
    expect(config.draw.forcePlay).toBe(false)

    expect(config.params).toEqual(DEFAULT_CONFIG.params)
    expect(config.uno).toEqual(DEFAULT_CONFIG.uno)
    expect(config.scoring).toEqual(DEFAULT_CONFIG.scoring)
    expect(config.ai).toEqual(DEFAULT_CONFIG.ai)
  })
})

describe('saveConfig 与 loadConfig 联动', () => {
  it('保存后再加载应返回相同的配置', () => {
    const custom: typeof DEFAULT_CONFIG = {
      params: { initialHandSize: 10, aiPlayerCount: 3, targetScore: 500, turnTimeLimit: 120 },
      actionCards: { stackingDraw2: true, stackingDraw4: true, challengeWild4: true, reverseAsSkip: false, jumpIn: true, sevenORule: true },
      draw: { drawToMatch: true, forcePlay: true, multiDrawCount: 3 },
      uno: { requireUNOCall: false, unoPenaltyDraw: 4, autoDetectUNO: false },
      scoring: { numberCard: 5, actionCard: 30, wildCard: 60 },
      ai: DIFFICULTY_CONFIGS.hard,
    }

    saveConfig(custom)
    const loaded = loadConfig()
    expect(loaded).toEqual(custom)
  })

  it('保存后再加载返回的不是同一个引用', () => {
    saveConfig(DEFAULT_CONFIG)
    const loaded = loadConfig()
    expect(loaded).not.toBe(DEFAULT_CONFIG)
  })
})