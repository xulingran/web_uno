import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
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
  const lastDrawEvent = useGameStore((s) => s.lastDrawEvent)
  const dealAnimConfig = useGameStore((s) => s.dealAnimConfig)
  const completeDrawAnimation = useGameStore((s) => s.completeDrawAnimation)

  const [currentDrawItem, setCurrentDrawItem] = useState<DealItem | null>(null)
  const [queue, setQueue] = useState<DealItem[]>([])
  const [animatingIndex, setAnimatingIndex] = useState(-1)
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isPausedRef = useRef(false)

  const finishQueue = useCallback(() => {
    setQueue([])
    setAnimatingIndex(-1)
    setCurrentDrawItem(null)
    completeDrawAnimation()
  }, [completeDrawAnimation])

  const startNextAnimation = useCallback((items: DealItem[], index: number) => {
    if (index >= items.length) {
      finishQueue()
      return
    }

    setAnimatingIndex(index)
    setCurrentDrawItem(items[index])
  }, [finishQueue])

  const onDrawAnimationComplete = useCallback(() => {
    if (animatingIndex < 0) return

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
  }, [animatingIndex, queue, finishQueue, startNextAnimation, dealAnimConfig.cardInterval])

  useEffect(() => {
    if (!lastDrawEvent || lastDrawEvent.cardCount <= 0) return

    const nextQueue = Array.from({ length: lastDrawEvent.cardCount }, (_, index) =>
      createDrawAnimationItem(lastDrawEvent.playerIndex, lastDrawEvent.timestamp, index)
    )

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
