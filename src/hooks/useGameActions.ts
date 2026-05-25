import { useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useLobbyStore } from '@/store/lobbyStore'
import type { CardColor } from '@/utils/types'

/**
 * 统一的游戏操作 hook。
 * 在 local/host 模式下直接调用 gameStore actions，
 * 在 client 模式下通过网络发送操作给房主。
 */
export function useGameActions() {
  const networkMode = useLobbyStore((s) => s.networkMode)
  const sendAction = useLobbyStore((s) => s.sendAction)
  const isRemote = networkMode === 'client'

  // local/host actions
  const localPlayCard = useGameStore((s) => s.playCard)
  const localDrawCard = useGameStore((s) => s.drawCard)
  const localPickColor = useGameStore((s) => s.pickColor)
  const localAcceptDraw = useGameStore((s) => s.acceptDraw)
  const localResolveUno = useGameStore((s) => s.resolveUno)
  const localResolveChallenge = useGameStore((s) => s.resolveChallenge)
  const localCancelColorPick = useGameStore((s) => s.cancelColorPick)
  const localStartNewGame = useGameStore((s) => s.startNewGame)
  const localInitGame = useGameStore((s) => s.initGame)
  const localToggleDebugMode = useGameStore((s) => s.toggleDebugMode)

  const playCard = useCallback(
    (cardId: string) => {
      if (isRemote) {
        sendAction?.({ type: 'game:play-card', cardId })
      } else {
        localPlayCard(cardId)
      }
    },
    [isRemote, sendAction, localPlayCard]
  )

  const drawCard = useCallback(() => {
    if (isRemote) {
      sendAction?.({ type: 'game:draw-card' })
    } else {
      localDrawCard()
    }
  }, [isRemote, sendAction, localDrawCard])

  const pickColor = useCallback(
    (color: CardColor) => {
      if (isRemote) {
        sendAction?.({ type: 'game:pick-color', color })
      } else {
        localPickColor(color)
      }
    },
    [isRemote, sendAction, localPickColor]
  )

  const acceptDraw = useCallback(() => {
    if (isRemote) {
      sendAction?.({ type: 'game:accept-draw' })
    } else {
      localAcceptDraw()
    }
  }, [isRemote, sendAction, localAcceptDraw])

  const resolveUno = useCallback(
    (confirmed: boolean) => {
      if (isRemote) {
        sendAction?.({ type: 'game:resolve-uno', confirmed })
      } else {
        localResolveUno(confirmed)
      }
    },
    [isRemote, sendAction, localResolveUno]
  )

  const resolveChallenge = useCallback(
    (challenge: boolean) => {
      if (isRemote) {
        sendAction?.({ type: 'game:resolve-challenge', challenge })
      } else {
        localResolveChallenge(challenge)
      }
    },
    [isRemote, sendAction, localResolveChallenge]
  )

  const cancelColorPick = useCallback(() => {
    if (!isRemote) {
      localCancelColorPick()
    }
  }, [isRemote, localCancelColorPick])

  const advanceTurn = useCallback(
    (skipCount: number) => {
      if (isRemote) {
        sendAction?.({ type: 'game:advance-turn', skipCount })
      } else {
        useGameStore.getState().advanceTurn(skipCount)
      }
    },
    [isRemote, sendAction]
  )

  return {
    playCard,
    drawCard,
    pickColor,
    acceptDraw,
    resolveUno,
    resolveChallenge,
    cancelColorPick,
    advanceTurn,
    startNewGame: localStartNewGame,
    initGame: localInitGame,
    toggleDebugMode: localToggleDebugMode,
  }
}
