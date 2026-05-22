import { describe, it, expect } from 'vitest'
import { distributeAIPlayers } from './layout'

describe('distributeAIPlayers', () => {
  it('should return empty distribution when count is 0', () => {
    expect(distributeAIPlayers(0)).toEqual({ top: [], left: null, right: null })
  })

  it('should put player 1 on top when count is 1', () => {
    expect(distributeAIPlayers(1)).toEqual({ top: [1], left: null, right: null })
  })

  it('should put player 1 on left and player 2 on right when count is 2', () => {
    expect(distributeAIPlayers(2)).toEqual({ top: [], left: 1, right: 2 })
  })

  it('should put player 2 on top when count is 3', () => {
    expect(distributeAIPlayers(3)).toEqual({ top: [2], left: 1, right: 3 })
  })

  it('should put players 2-4 on top when count is 5', () => {
    expect(distributeAIPlayers(5)).toEqual({ top: [2, 3, 4], left: 1, right: 5 })
  })
})