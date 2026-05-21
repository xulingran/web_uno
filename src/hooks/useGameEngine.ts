import { useEffect, useRef } from 'react'
import { useGameStore } from '@/store/gameStore'
import { findBestCard, chooseColor, shouldStackDraw, shouldChallengeWild4 } from '@/utils/ai'
import { canPlayCard, getActionEffect, getNextPlayerIndex, getCardActionEffectType } from '@/utils/rules'
import { shuffleDeck, drawCards, getCardScore, ensureNotEmpty } from '@/utils/deck'

import type { Card } from '@/utils/types'

function formatCardInfo(card: Card): string {
  const colorMap: Record<string, string> = { red: '红色', yellow: '黄色', blue: '蓝色', green: '绿色' }
  const typeMap: Record<string, string> = { number: '', skip: '跳过', reverse: '反转', draw2: '+2', wild: '万能', wild4: '万能+4' }
  const colorStr = card.color ? (colorMap[card.color] ?? '') : ''
  const typeStr = typeMap[card.type] ?? ''
  if (card.type === 'number') return `${colorStr} ${card.value}`
  return `${colorStr} ${typeStr}`.trim()
}

export function useGameEngine() {
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex)
  const currentColor = useGameStore((s) => s.currentColor)
  const phase = useGameStore((s) => s.phase)
  const pendingDrawCount = useGameStore((s) => s.pendingDrawCount)
  const discardPileLength = useGameStore((s) => s.discardPile.length)
  const aiHandLengths = useGameStore((s) => s.players.map((p) => p.hand.length).join(','))
  const drawAnimating = useGameStore((s) => s.drawAnimating)

  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processingRef = useRef(false)

  useEffect(() => {
    if (phase !== 'playing') return
    if (drawAnimating) return
    if (currentPlayerIndex === 0) return

    const currentState = useGameStore.getState()
    const currentPlayer = currentState.players[currentPlayerIndex]
    if (!currentPlayer || currentPlayer.isHuman) return
    if (processingRef.current) return

    processingRef.current = true

    const delay = 600 + Math.random() * 900

    aiTimerRef.current = setTimeout(() => {
      const state = useGameStore.getState()
      if (state.phase !== 'playing') {
        processingRef.current = false
        return
      }

      const aiPlayer = state.players[state.currentPlayerIndex]
      if (!aiPlayer || aiPlayer.isHuman) {
        processingRef.current = false
        return
      }

      const topCard = state.discardPile[state.discardPile.length - 1]
      const cfg = state.config

      if (state.pendingDrawCount > 0) {
        let stackCard = shouldStackDraw(aiPlayer.hand, topCard, cfg)
        if (stackCard && stackCard.type === 'wild4') {
          const hasMatchingColor = aiPlayer.hand.some((c) => c.color === state.currentColor)
          if (hasMatchingColor) stackCard = null
        }
        if (stackCard) {
          const cardIndex = aiPlayer.hand.findIndex((c) => c.id === stackCard.id)
          const newHand = [...aiPlayer.hand]
          newHand.splice(cardIndex, 1)
          const stackEffect = getActionEffect(stackCard, state.players.length, cfg.actionCards.reverseAsSkip)

          const newDrawCount = state.pendingDrawCount + stackEffect.drawCount
          let newCurrentColor = state.currentColor

          if (stackCard.type === 'wild' || stackCard.type === 'wild4') {
            newCurrentColor = chooseColor(newHand, cfg.ai, state.discardPile)
          }

          const allUpdates: Record<string, unknown> = {
            players: state.players.map((p, i) =>
              i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
            ),
            discardPile: [...state.discardPile, stackCard],
            pendingDrawCount: newDrawCount,
            currentColor: newCurrentColor,
            cardJustDrawn: null,
            lastPlayedBy: { playerIndex: state.currentPlayerIndex, cardId: stackCard.id },
          }
          if (stackCard.color != null) {
            allUpdates.currentColor = stackCard.color
          }
          const effectType = getCardActionEffectType(stackCard)
          if (effectType) {
            allUpdates.lastActionEffect = { ...effectType, timestamp: Date.now() }
          }
          useGameStore.setState(allUpdates)

          useGameStore.getState().addLogEntry({ event: 'play', playerName: aiPlayer.name, cardInfo: formatCardInfo(stackCard) })

          useGameStore.getState().advanceTurn(1)
          processingRef.current = false
          return
        }

        let drawP = [...state.drawPile]
        let discP = [...state.discardPile]
        const reshuffled = ensureNotEmpty(drawP, discP)
        drawP = reshuffled.drawPile
        discP = reshuffled.discardPile
        const actual = Math.min(state.pendingDrawCount, drawP.length)
        if (actual > 0) {
          const { drawn, remaining } = drawCards(drawP, actual)
          useGameStore.setState({
            players: state.players.map((p, i) =>
              i === state.currentPlayerIndex ? { ...p, hand: [...p.hand, ...drawn] } : p
            ),
            drawPile: remaining,
            discardPile: discP,
            pendingDrawCount: 0,
            drawAnimating: true,
            lastDrawEvent: { playerIndex: state.currentPlayerIndex, cardCount: drawn.length, timestamp: Date.now() },
            pendingDrawResolution: { type: 'advanceTurn', skipCount: 1 },
          })
          useGameStore.getState().addLogEntry({ event: 'draw', playerName: aiPlayer.name, extra: `${actual}张` })
        } else {
          useGameStore.setState({ pendingDrawCount: 0 })
          useGameStore.getState().advanceTurn(1)
          processingRef.current = false
          return
        }
        processingRef.current = false
        return
      }

      const opponents = state.players
        .filter((_, i) => i !== state.currentPlayerIndex)
        .map((p) => ({ handLength: p.hand.length }))

      const nextIdx = getNextPlayerIndex(state.currentPlayerIndex, state.direction, state.players.length, 0)
      const bestCard = findBestCard(
        aiPlayer.hand, topCard, state.currentColor, cfg, opponents,
        state.players[nextIdx].hand.length
      )

      if (bestCard) {
        const cardIndex = aiPlayer.hand.findIndex((c) => c.id === bestCard.id)
        if (cardIndex === -1) {
          processingRef.current = false
          return
        }

        const card = aiPlayer.hand[cardIndex]
        const newHand = [...aiPlayer.hand]
        newHand.splice(cardIndex, 1)
        const newDiscardPile = [...state.discardPile, card]
        const newPlayers = state.players.map((p, i) =>
          i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
        )

        if (cfg.actionCards.sevenORule && card.type === 'number') {
          if (card.value === 7) {
            let maxCards = 0
            let swapTarget = -1
            for (let i = 0; i < newPlayers.length; i++) {
              if (i !== state.currentPlayerIndex && newPlayers[i].hand.length > maxCards) {
                maxCards = newPlayers[i].hand.length
                swapTarget = i
              }
            }
            if (swapTarget >= 0) {
              const temp = newPlayers[state.currentPlayerIndex].hand
              newPlayers[state.currentPlayerIndex] = { ...newPlayers[state.currentPlayerIndex], hand: newPlayers[swapTarget].hand }
              newPlayers[swapTarget] = { ...newPlayers[swapTarget], hand: temp }
            }
          } else if (card.value === 0) {
            const hands = newPlayers.map((p) => [...p.hand])
            const dir = state.direction === 'clockwise' ? 1 : newPlayers.length - 1
            for (let i = 0; i < newPlayers.length; i++) {
              newPlayers[i] = { ...newPlayers[i], hand: hands[(i - dir + newPlayers.length) % newPlayers.length] }
            }
          }
        }

        const effect = getActionEffect(card, newPlayers.length, cfg.actionCards.reverseAsSkip)

        if (card.type === 'wild4' && cfg.actionCards.challengeWild4) {
          const nNextIdx = getNextPlayerIndex(state.currentPlayerIndex, state.direction, newPlayers.length, 0)
          const nextPlayer = newPlayers[nNextIdx]
          if (nextPlayer) {
            if (nextPlayer.isHuman) {
              useGameStore.setState({
                players: newPlayers,
                discardPile: newDiscardPile,
                cardJustDrawn: null,
                currentColor: chooseColor(newHand, cfg.ai, newDiscardPile),
                colorBeforeWild: state.currentColor,
                lastPlayedBy: { playerIndex: state.currentPlayerIndex, cardId: card.id },
                lastActionEffect: { type: 'wild4', timestamp: Date.now() },
                challengePlayerIndex: nNextIdx,
                pendingDrawCount: (state.pendingDrawCount || 0) + 4,
                phase: 'challenge',
              })
              processingRef.current = false
              return
            }
            const willChallenge = shouldChallengeWild4(nextPlayer.hand, state.currentColor, cfg)
            if (willChallenge) {
              const hadMatching = aiPlayer.hand.some(
                (c) => c.color === state.currentColor && c.type !== 'wild' && c.type !== 'wild4'
              )
              if (hadMatching) {
                const returnCard = newDiscardPile.pop()!
                let returnHand = [...newPlayers[state.currentPlayerIndex].hand, returnCard]
                let aiDrawPile = [...state.drawPile]
                let aiDiscardPile = [...newDiscardPile]
                const reshuffled = ensureNotEmpty(aiDrawPile, aiDiscardPile)
                aiDrawPile = reshuffled.drawPile
                aiDiscardPile = reshuffled.discardPile
                const penaltyDraw = Math.min(4, aiDrawPile.length)
                if (penaltyDraw > 0) {
                  const { drawn: penaltyDrawn, remaining: penaltyRemaining } = drawCards(aiDrawPile, penaltyDraw)
                  returnHand = [...returnHand, ...penaltyDrawn]
                  aiDrawPile = penaltyRemaining
                }
                newPlayers[state.currentPlayerIndex] = { ...newPlayers[state.currentPlayerIndex], hand: returnHand }
                useGameStore.setState({
                  players: newPlayers,
                  discardPile: aiDiscardPile,
                  drawPile: aiDrawPile,
                  cardJustDrawn: null,
                  lastPlayedBy: { playerIndex: state.currentPlayerIndex, cardId: card.id },
                  currentPlayerIndex: nNextIdx,
                })
                processingRef.current = false
                return
              } else {
                const chosenColor = chooseColor(newHand, cfg.ai, newDiscardPile)
                useGameStore.setState({
                  players: newPlayers,
                  discardPile: newDiscardPile,
                  cardJustDrawn: null,
                  currentColor: chosenColor,
                  lastPlayedBy: { playerIndex: state.currentPlayerIndex, cardId: card.id },
                  lastActionEffect: { type: 'wild4', timestamp: Date.now() },
                })
                const challengerIdx = nNextIdx
                const challengerHand = [...nextPlayer.hand]
                let aiDrawPile2 = [...state.drawPile]
                let aiDiscardPile2 = [...newDiscardPile]
                const reshuffled2 = ensureNotEmpty(aiDrawPile2, aiDiscardPile2)
                aiDrawPile2 = reshuffled2.drawPile
                aiDiscardPile2 = reshuffled2.discardPile
                const penaltyDraw2 = Math.min(6, aiDrawPile2.length)
                if (penaltyDraw2 > 0) {
                  const { drawn: penaltyDrawn2, remaining: penaltyRemaining2 } = drawCards(aiDrawPile2, penaltyDraw2)
                  const newChallengerHand = [...challengerHand, ...penaltyDrawn2]
                  const updatedPlayers = useGameStore.getState().players.map((p, i) =>
                    i === challengerIdx ? { ...p, hand: newChallengerHand } : p
                  )
                  useGameStore.setState({
                    players: updatedPlayers,
                    drawPile: penaltyRemaining2,
                    discardPile: aiDiscardPile2,
                  })
                }
                const afterSkip = getNextPlayerIndex(challengerIdx, state.direction, newPlayers.length, 1)
                useGameStore.setState({ currentPlayerIndex: afterSkip })
                processingRef.current = false
                return
              }
            }
          }
        }

        if (newPlayers[state.currentPlayerIndex].hand.length === 0) {
          const newScores = [...state.scores]
          let totalPoints = 0
          for (let i = 0; i < newPlayers.length; i++) {
            if (i !== state.currentPlayerIndex) {
              const points = newPlayers[i].hand.reduce((sum, c) => sum + getCardScore(c, cfg), 0)
              totalPoints += points
            }
          }
          newScores[state.currentPlayerIndex] += totalPoints
          useGameStore.setState({
            players: newPlayers,
            discardPile: newDiscardPile,
            cardJustDrawn: null,
            winner: { ...newPlayers[state.currentPlayerIndex], hand: newHand },
            phase: 'round-over',
            scores: newScores,
          })
          useGameStore.getState().addLogEntry({ event: 'round-over', playerName: '系统', extra: `${aiPlayer.name} 获胜` })
          processingRef.current = false
          return
        }

        if (effect.needsColorPick) {
          const chosenColor = chooseColor(newHand, cfg.ai, newDiscardPile)
          const allUpdates: Record<string, unknown> = {
            players: newPlayers,
            discardPile: newDiscardPile,
            cardJustDrawn: null,
            currentColor: chosenColor,
            lastPlayedBy: { playerIndex: state.currentPlayerIndex, cardId: card.id },
          }
          const effectType = getCardActionEffectType(card)
          if (effectType) {
            allUpdates.lastActionEffect = { ...effectType, timestamp: Date.now() }
          }
          useGameStore.setState(allUpdates)

          useGameStore.getState().addLogEntry({ event: 'play', playerName: aiPlayer.name, cardInfo: formatCardInfo(card) })
          const colorNameMap: Record<string, string> = { red: '红色', yellow: '黄色', blue: '蓝色', green: '绿色' }
          useGameStore.getState().addLogEntry({ event: 'color-pick', playerName: aiPlayer.name, extra: `选择了 ${colorNameMap[chosenColor] ?? chosenColor}` })

          if (card.type === 'wild4') {
            useGameStore.setState({ pendingDrawCount: (state.pendingDrawCount || 0) + 4 })
          }

          if (newHand.length === 1 && cfg.uno.requireUNOCall) {
            useGameStore.setState({ unoCalledPlayer: aiPlayer.id })
          }

          useGameStore.getState().advanceTurn(1)
          processingRef.current = false
          return
        }

        const allUpdates: Record<string, unknown> = {
          players: newPlayers,
          discardPile: newDiscardPile,
          cardJustDrawn: null,
          lastPlayedBy: { playerIndex: state.currentPlayerIndex, cardId: card.id },
        }
        if (card.color != null) {
          allUpdates.currentColor = card.color
        }

        if (effect.reverse) {
          allUpdates.direction = state.direction === 'clockwise' ? 'counterclockwise' : 'clockwise'
        }

        let unoCalled: string | null = null
        if (newHand.length === 1 && cfg.uno.requireUNOCall) {
          unoCalled = aiPlayer.id
        }
        allUpdates.unoCalledPlayer = unoCalled

        const actionEffectType = getCardActionEffectType(card)
        if (actionEffectType) {
          allUpdates.lastActionEffect = { ...actionEffectType, timestamp: Date.now() }
        }

        if (effect.drawCount > 0) {
          allUpdates.pendingDrawCount = (state.pendingDrawCount || 0) + effect.drawCount
        }

        useGameStore.setState(allUpdates)

        const cardInfo = formatCardInfo(card)
        useGameStore.getState().addLogEntry({ event: 'play', playerName: aiPlayer.name, cardInfo })
        if (cfg.actionCards.sevenORule && card.type === 'number') {
          if (card.value === 7) {
            const swapTarget = state.players.findIndex((p, i) => i !== state.currentPlayerIndex && p.hand === newPlayers[state.currentPlayerIndex].hand)
            const targetName = swapTarget >= 0 ? state.players[swapTarget]?.name : undefined
            useGameStore.getState().addLogEntry({ event: 'hand-swap', playerName: aiPlayer.name, cardInfo, extra: targetName ? `与${targetName}交换` : undefined })
          } else if (card.value === 0) {
            useGameStore.getState().addLogEntry({ event: 'hand-rotate', playerName: aiPlayer.name, cardInfo, extra: '所有玩家手牌轮转' })
          }
        }
        if (card.type === 'reverse') {
          useGameStore.getState().addLogEntry({ event: 'reverse', playerName: aiPlayer.name, cardInfo, extra: '方向反转' })
        }

        if (effect.reverse && newPlayers.length === 2 && cfg.actionCards.reverseAsSkip) {
          useGameStore.getState().advanceTurn(2)
          processingRef.current = false
          return
        }

        if (effect.skipNext && effect.drawCount === 0) {
          useGameStore.getState().advanceTurn(2)
          processingRef.current = false
          return
        }

        if (effect.drawCount > 0) {
          useGameStore.getState().advanceTurn(1)
          processingRef.current = false
          return
        }

        if (effect.reverse) {
          useGameStore.getState().advanceTurn(1)
          processingRef.current = false
          return
        }

        useGameStore.getState().advanceTurn(1)
        processingRef.current = false
        return
      }

      let cDrawPile = [...state.drawPile]
      let cDiscard = [...state.discardPile]

      if (cfg.draw.drawToMatch) {
        const reshuffled0 = ensureNotEmpty(cDrawPile, cDiscard)
        cDrawPile = reshuffled0.drawPile
        cDiscard = reshuffled0.discardPile

        const newH = [...aiPlayer.hand]
        const topForMatch = cDiscard[cDiscard.length - 1]
        let foundPlayable = false
        let lastPlayableCard: Card | null = null

        while (cDrawPile.length > 0 && !foundPlayable) {
          const drawnCard = cDrawPile.shift()!
          newH.push(drawnCard)
          if (canPlayCard(drawnCard, topForMatch, state.currentColor, newH)) {
            foundPlayable = true
            lastPlayableCard = drawnCard
          }
          if (cDrawPile.length === 0 && cDiscard.length > 1) {
            const top2 = cDiscard[cDiscard.length - 1]
            const rest2 = cDiscard.slice(0, -1)
            cDrawPile = shuffleDeck(rest2)
            cDiscard = [top2]
          }
        }

        useGameStore.setState({
          players: state.players.map((p, i) =>
            i === state.currentPlayerIndex ? { ...p, hand: newH } : p
          ),
          drawPile: cDrawPile,
          discardPile: cDiscard,
          cardJustDrawn: newH.length > aiPlayer.hand.length ? newH[newH.length - 1] : null,
          drawAnimating: true,
          lastDrawEvent: { playerIndex: state.currentPlayerIndex, cardCount: newH.length - aiPlayer.hand.length, timestamp: Date.now() },
        })
        useGameStore.getState().addLogEntry({ event: 'draw', playerName: aiPlayer.name, extra: `${newH.length - aiPlayer.hand.length}张` })

        if (foundPlayable && cfg.draw.forcePlay && lastPlayableCard) {
          // Card is in hand, AI will pick it up on next tick via findBestCard
          processingRef.current = false
          return
        }

        useGameStore.setState({ pendingDrawResolution: { type: 'advanceTurn', skipCount: 1 } })
      } else {
        const reshuffled0 = ensureNotEmpty(cDrawPile, cDiscard)
        cDrawPile = reshuffled0.drawPile
        cDiscard = reshuffled0.discardPile

        const drawCount = Math.max(1, cfg.draw.multiDrawCount)
        const actual = Math.min(drawCount, cDrawPile.length)

        if (actual > 0) {
          const drawn = cDrawPile.splice(0, actual)
          const newH = [...aiPlayer.hand, ...drawn]

          useGameStore.setState({
            players: state.players.map((p, i) =>
              i === state.currentPlayerIndex ? { ...p, hand: newH } : p
            ),
            drawPile: cDrawPile,
            discardPile: cDiscard,
            cardJustDrawn: drawn[drawn.length - 1],
            drawAnimating: true,
            lastDrawEvent: { playerIndex: state.currentPlayerIndex, cardCount: drawn.length, timestamp: Date.now() },
          })
          useGameStore.getState().addLogEntry({ event: 'draw', playerName: aiPlayer.name, extra: `${drawn.length}张` })

          const topForCheck = cDiscard[cDiscard.length - 1]
          const lastDrawn = drawn[drawn.length - 1]
          if (cfg.draw.forcePlay && canPlayCard(lastDrawn, topForCheck, state.currentColor, newH)) {
            processingRef.current = false
            return
          }
        }

        useGameStore.setState({ pendingDrawResolution: { type: 'advanceTurn', skipCount: 1 } })
      }

      processingRef.current = false
    }, delay)

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
      processingRef.current = false
    }
  }, [currentPlayerIndex, phase, discardPileLength, pendingDrawCount, aiHandLengths, currentColor, drawAnimating])
}
