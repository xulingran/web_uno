export interface PlayerDistribution {
  top: number[]
  left: number | null
  right: number | null
}

/**
 * 根据当前玩家视角，计算其他玩家在牌桌上的分布位置。
 * @param totalPlayers 总玩家数
 * @param myIndex 当前玩家的索引（本地模式为0，联机模式下为myPlayerIndex）
 */
export function distributePlayers(totalPlayers: number, myIndex: number = 0): PlayerDistribution {
  const otherCount = totalPlayers - 1
  if (otherCount <= 0) return { top: [], left: null, right: null }

  // 收集除自己以外的其他玩家索引，按顺时针顺序排列
  const others: number[] = []
  for (let i = 1; i < totalPlayers; i++) {
    const idx = (myIndex + i) % totalPlayers
    others.push(idx)
  }

  // 按顺时针方向分配位置：第一个是左边，最后一个是右边，中间的在上方
  if (others.length === 1) {
    return { top: [others[0]], left: null, right: null }
  }

  return {
    top: others.slice(1, -1),
    left: others[0],
    right: others[others.length - 1],
  }
}
