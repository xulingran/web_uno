import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useRemoteGameStore } from '@/store/remoteGameStore'
import { useLobbyStore } from '@/store/lobbyStore'
import type { DealItem } from '@/utils/types'

interface UseDrawAnimationReturn {
  currentDrawItem: DealItem | null
  onDrawAnimationComplete: () => void
}

function createDrawAnimationItem(playerIndex: number, timestamp: number, itemIndex: number): DealItem {
  return {
    playerIndex,
    card: {
      id: `draw-anim-${timestamp}-${itemIndex}`,
      color: null,
      type: 'wild',
    },
  }
}

export function useDrawAnimation(): UseDrawAnimationReturn {
  const networkMode = useLobbyStore((s) => s.networkMode)
  const isClient = networkMode === 'client'

  // 根据网络模式选择数据来源：本地/主机用 gameStore，客户端用 remoteGameStore
  const localLastDrawEvent = useGameStore((s) => s.lastDrawEvent)
  const remoteLastDrawEvent = useRemoteGameStore((s) => s.lastDrawEvent)
  const lastDrawEvent = isClient ? remoteLastDrawEvent : localLastDrawEvent

  // 同样根据模式选择 store 的 action
  const localAddDrawnCard = useGameStore((s) => s.addDrawnCard)
  const localCompleteDrawAnimation = useGameStore((s) => s.completeDrawAnimation)

  const dealAnimConfig = useGameStore((s) => s.dealAnimConfig)
  const localPhase = useGameStore((s) => s.phase)
  const remotePhase = useRemoteGameStore((s) => s.phase)
  const phase = isClient ? remotePhase : localPhase

  const [currentDrawItem, setCurrentDrawItem] = useState<DealItem | null>(null)
  const [queue, setQueue] = useState<DealItem[]>([])
  const [animatingIndex, setAnimatingIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isPausedRef = useRef(false)
  const completedRef = useRef(false)
  // 追踪已处理的 lastDrawEvent 的 timestamp，防止客户端因对象引用变化而重复触发
  const processedTimestampRef = useRef<number | null>(null)

  const finishQueue = useCallback(() => {
    setQueue([])
    setAnimatingIndex(-1)
    setCurrentDrawItem(null)
    completedRef.current = true
    // 客户端不操作本地 store，只清本地动画状态
    if (networkMode !== 'client') {
      localCompleteDrawAnimation()
    }
  }, [networkMode, localCompleteDrawAnimation])

  // 客户端：当离开 playing 阶段时清理已处理的 timestamp
  useEffect(() => {
    if (!isClient) return
    if (phase !== 'playing' && phase !== 'dealing') {
      processedTimestampRef.current = null
    }
  }, [isClient, phase])

  const startNextAnimation = useCallback((items: DealItem[], index: number) => {
    if (index >= items.length) {
      finishQueue()
      return
    }
    completedRef.current = false
    setAnimatingIndex(index)
    setCurrentDrawItem(items[index])
  }, [finishQueue])

  const onDrawAnimationComplete = useCallback(() => {
    if (animatingIndex < 0 || completedRef.current) return
    completedRef.current = true

    // 本地/主机模式：更新 store 的手牌
    if (networkMode !== 'client') {
      localAddDrawnCard(animatingIndex)
    }

    const nextIndex = animatingIndex + 1
    if (nextIndex >= queue.length) {
      finishQueue()
      return
    }

    setCurrentDrawItem(null)
    if (isPausedRef.current) return

    intervalRef.current = setTimeout(() => {
      startNextAnimation(queue, nextIndex)
    }, dealAnimConfig.cardInterval)
  }, [animatingIndex, queue, networkMode, localAddDrawnCard, finishQueue, startNextAnimation, dealAnimConfig.cardInterval])

  useEffect(() => {
    if (!lastDrawEvent || lastDrawEvent.cardCount <= 0) return
    // 检查是否是新的摸牌事件（通过 timestamp 判断）
    if (lastDrawEvent.timestamp === processedTimestampRef.current) return

    const nextQueue = Array.from({ length: lastDrawEvent.cardCount }, (_, index) =>
      createDrawAnimationItem(lastDrawEvent.playerIndex, lastDrawEvent.timestamp, index)
    )

    // 记录已处理的 timestamp
    processedTimestampRef.current = lastDrawEvent.timestamp

    setQueue(nextQueue)
    startNextAnimation(nextQueue, 0)

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current)
    }
  }, [lastDrawEvent, startNextAnimation])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPausedRef.current = true
        if (intervalRef.current) clearTimeout(intervalRef.current)
        return
      }

      isPausedRef.current = false
      if (!currentDrawItem && queue.length > 0) {
        const nextIndex = animatingIndex >= 0 ? animatingIndex + 1 : 0
        if (nextIndex < queue.length) {
          startNextAnimation(queue, nextIndex)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [animatingIndex, currentDrawItem, queue, startNextAnimation])

  return {
    currentDrawItem,
    onDrawAnimationComplete,
  }
}
