import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useRemoteGameStore } from '@/store/remoteGameStore'
import { useLobbyStore } from '@/store/lobbyStore'
import type { DealItem } from '@/utils/types'

interface UseDealAnimationReturn {
  currentDealItem: DealItem | null
  isDealing: boolean
  dealProgress: number
  onDealAnimationComplete: () => void
}

export function useDealAnimation(): UseDealAnimationReturn {
  const networkMode = useLobbyStore((s) => s.networkMode)

  // 本地/主机模式：从 gameStore 读取
  const localPhase = useGameStore((s) => s.phase)
  const localDealSequence = useGameStore((s) => s.dealSequence)
  const localDealtIndex = useGameStore((s) => s.dealtIndex)
  const localDealAnimConfig = useGameStore((s) => s.dealAnimConfig)
  const addDealtCard = useGameStore((s) => s.addDealtCard)
  const completeDealing = useGameStore((s) => s.completeDealing)

  // 客户端模式：从 remoteGameStore 读取
  const remotePhase = useRemoteGameStore((s) => s.phase)
  const remoteDealSequence = useRemoteGameStore((s) => s.dealSequence)
  const remoteDealtIndex = useRemoteGameStore((s) => s.dealtIndex)
  const remoteDealAnimConfig = useRemoteGameStore((s) => s.dealAnimConfig)

  const isClient = networkMode === 'client'
  const phase = isClient ? remotePhase : localPhase
  const dealSequence = isClient ? remoteDealSequence : localDealSequence
  const dealtIndex = isClient ? remoteDealtIndex : localDealtIndex
  const dealAnimConfig = isClient
    ? (remoteDealAnimConfig ?? { singleCardDuration: 500, cardInterval: 100, timeout: 2000, easing: 'ease-out' })
    : localDealAnimConfig

  const [currentDealItem, setCurrentDealItem] = useState<DealItem | null>(null)
  const [animatingIndex, setAnimatingIndex] = useState(-1)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isPausedRef = useRef(false)
  // 客户端独立追踪下一个要播放的动画索引
  const clientNextIndexRef = useRef(-1)

  const isDealing = phase === 'dealing'
  const dealProgress = dealSequence.length > 0 ? (isClient ? clientNextIndexRef.current : dealtIndex) / dealSequence.length : 0

  const startNextAnimation = useCallback((index: number) => {
    if (index >= dealSequence.length) {
      if (!isClient) completeDealing()
      return
    }
    setAnimatingIndex(index)
    setCurrentDealItem(dealSequence[index])
  }, [dealSequence, completeDealing, isClient])

  // 统一的动画完成回调：主机端和客户端都使用相同的按序播放逻辑
  const onDealAnimationComplete = useCallback(() => {
    if (animatingIndex < 0) return

    // 主机端：实际添加牌到玩家手牌
    if (!isClient) {
      addDealtCard(animatingIndex)
    }
    setCurrentDealItem(null)

    const nextIndex = animatingIndex + 1
    if (nextIndex >= dealSequence.length) {
      // 全部完成
      if (!isClient) completeDealing()
      clientNextIndexRef.current = -1
      return
    }

    // 更新客户端已播放索引
    if (isClient) {
      clientNextIndexRef.current = nextIndex
    }

    if (isPausedRef.current) return

    // 延迟后播放下一张（与主机端完全相同的逻辑）
    intervalRef.current = setTimeout(() => {
      startNextAnimation(nextIndex)
    }, dealAnimConfig.cardInterval)
  }, [animatingIndex, addDealtCard, dealSequence.length, completeDealing, dealAnimConfig.cardInterval, startNextAnimation, isClient])

  // 主机端：phase 进入 dealing 时启动动画序列
  useEffect(() => {
    if (isClient) return
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
  }, [phase, isClient])

  // 客户端：phase 进入 dealing 且 dealSequence 就绪时，从 dealtIndex 开始按序播放
  useEffect(() => {
    if (!isClient) return
    if (phase !== 'dealing') return
    if (dealSequence.length === 0) return
    if (clientNextIndexRef.current >= 0) return // 已经启动过，不重复

    // 从服务器 dealtIndex 开始播放
    const startIndex = dealtIndex
    if (startIndex < dealSequence.length) {
      clientNextIndexRef.current = startIndex
      startNextAnimation(startIndex)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isClient, dealSequence.length, dealtIndex])

  // 客户端：当服务器 dealtIndex 超过客户端已播放的位置时，追赶播放
  useEffect(() => {
    if (!isClient) return
    if (phase !== 'dealing') return
    if (clientNextIndexRef.current < 0) return // 尚未启动

    const serverDealtTo = dealtIndex
    const nextToPlay = clientNextIndexRef.current

    // 如果服务器已经发了更多牌，且当前没有在动画中
    if (serverDealtTo > nextToPlay && !currentDealItem) {
      const toPlay = nextToPlay
      if (toPlay < serverDealtTo && toPlay < dealSequence.length) {
        startNextAnimation(toPlay)
      }
    }
  }, [dealtIndex, isClient, phase, currentDealItem, dealSequence, startNextAnimation])

  // 客户端：页面可见性处理
  useEffect(() => {
    if (!isClient) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPausedRef.current = true
        if (intervalRef.current) clearTimeout(intervalRef.current)
      } else {
        isPausedRef.current = false
        const state = useRemoteGameStore.getState()
        if (state.phase === 'dealing' && !currentDealItem) {
          const nextIndex = clientNextIndexRef.current >= 0 ? clientNextIndexRef.current : state.dealtIndex
          if (nextIndex < state.dealSequence.length) {
            clientNextIndexRef.current = nextIndex
            startNextAnimation(nextIndex)
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [currentDealItem, startNextAnimation, isClient])

  // phase 离开 dealing 时清理
  useEffect(() => {
    if (phase !== 'dealing') {
      setCurrentDealItem(null)
      setAnimatingIndex(-1)
      clientNextIndexRef.current = -1
    }
  }, [phase])

  return {
    currentDealItem,
    isDealing,
    dealProgress,
    onDealAnimationComplete,
  }
}
