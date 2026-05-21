import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import type { DealItem } from '@/utils/types'

interface UseDealAnimationReturn {
  currentDealItem: DealItem | null
  isDealing: boolean
  dealProgress: number
  onDealAnimationComplete: () => void
}

export function useDealAnimation(): UseDealAnimationReturn {
  const phase = useGameStore((s) => s.phase)
  const dealSequence = useGameStore((s) => s.dealSequence)
  const dealtIndex = useGameStore((s) => s.dealtIndex)
  const dealAnimConfig = useGameStore((s) => s.dealAnimConfig)
  const addDealtCard = useGameStore((s) => s.addDealtCard)
  const completeDealing = useGameStore((s) => s.completeDealing)

  const [currentDealItem, setCurrentDealItem] = useState<DealItem | null>(null)
  const [animatingIndex, setAnimatingIndex] = useState(-1)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isPausedRef = useRef(false)

  const isDealing = phase === 'dealing'
  const dealProgress = dealSequence.length > 0 ? dealtIndex / dealSequence.length : 0

  const startNextAnimation = useCallback((index: number) => {
    if (index >= dealSequence.length) {
      completeDealing()
      return
    }
    setAnimatingIndex(index)
    setCurrentDealItem(dealSequence[index])
  }, [dealSequence, completeDealing])

  const onDealAnimationComplete = useCallback(() => {
    if (animatingIndex < 0) return

    addDealtCard(animatingIndex)
    setCurrentDealItem(null)

    const nextIndex = animatingIndex + 1
    if (nextIndex >= dealSequence.length) {
      completeDealing()
      return
    }

    if (isPausedRef.current) return

    intervalRef.current = setTimeout(() => {
      startNextAnimation(nextIndex)
    }, dealAnimConfig.cardInterval)
  }, [animatingIndex, addDealtCard, dealSequence.length, completeDealing, dealAnimConfig.cardInterval, startNextAnimation])

  useEffect(() => {
    if (phase !== 'dealing') return

    timeoutRef.current = setTimeout(() => {
      completeDealing()
    }, dealAnimConfig.timeout)

    startNextAnimation(0)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (intervalRef.current) clearTimeout(intervalRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPausedRef.current = true
        if (intervalRef.current) clearTimeout(intervalRef.current)
      } else {
        isPausedRef.current = false
        const state = useGameStore.getState()
        if (state.phase === 'dealing' && !currentDealItem) {
          const nextIndex = state.dealtIndex
          if (nextIndex < state.dealSequence.length) {
            startNextAnimation(nextIndex)
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [currentDealItem, startNextAnimation])

  useEffect(() => {
    if (phase !== 'dealing') {
      setCurrentDealItem(null)
      setAnimatingIndex(-1)
    }
  }, [phase])

  return {
    currentDealItem,
    isDealing,
    dealProgress,
    onDealAnimationComplete,
  }
}
