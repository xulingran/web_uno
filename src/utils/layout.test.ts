import { describe, it, expect } from 'vitest'
import { distributeAIPlayers } from './layout'

describe('distributeAIPlayers', () => {
  it('should return empty distribution when totalPlayers is 1 (only self)', () => {
    expect(distributeAIPlayers(1, 0)).toEqual({ top: [], left: null, right: null })
  })

  it('should put player 1 on top when totalPlayers is 2 (self + 1 other)', () => {
    expect(distributeAIPlayers(2, 0)).toEqual({ top: [1], left: null, right: null })
  })

  it('should put player 1 on left and player 2 on right when totalPlayers is 3', () => {
    expect(distributeAIPlayers(3, 0)).toEqual({ top: [], left: 1, right: 2 })
  })

  it('should put player 2 on top when totalPlayers is 4', () => {
    expect(distributeAIPlayers(4, 0)).toEqual({ top: [2], left: 1, right: 3 })
  })

  it('should put players 2-4 on top when totalPlayers is 6', () => {
    expect(distributeAIPlayers(6, 0)).toEqual({ top: [2, 3, 4], left: 1, right: 5 })
  })

  it('should respect myPlayerIndex for client perspective', () => {
    // 4 players, client is index 1: others in clockwise order are 2, 3, 0
    // left=2, top=[3], right=0
    expect(distributeAIPlayers(4, 1)).toEqual({ top: [3], left: 2, right: 0 })
  })

  it('should handle client as last player', () => {
    // 4 players, client is index 3: others in clockwise order are 0, 1, 2
    // left=0, top=[1], right=2
    expect(distributeAIPlayers(4, 3)).toEqual({ top: [1], left: 0, right: 2 })
  })
})
