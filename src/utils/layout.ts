export interface AIPlayerDistribution {
  top: number[]
  left: number | null
  right: number | null
}

export function distributeAIPlayers(count: number): AIPlayerDistribution {
  if (count <= 0) return { top: [], left: null, right: null }
  if (count === 1) return { top: [1], left: null, right: null }

  const top: number[] = []
  for (let i = 2; i < count; i++) {
    top.push(i)
  }

  return {
    top,
    left: 1,
    right: count,
  }
}
