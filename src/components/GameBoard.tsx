import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Settings, Bug } from 'lucide-react'
import { useGameAdapter } from '@/hooks/useGameAdapter'
import { useGameActions } from '@/hooks/useGameActions'
import { useGameStore } from '@/store/gameStore'
import { useRemoteGameStore } from '@/store/remoteGameStore'
import { useLobbyStore } from '@/store/lobbyStore'
import { canPlayCard, canStack, canJumpIn } from '@/utils/rules'
import { distributeAIPlayers } from '@/utils/layout'
import { useDealAnimation } from '@/hooks/useDealAnimation'
import { useDrawAnimation } from '@/hooks/useDrawAnimation'
import PlayerHand from './PlayerHand'
import AIHand from './AIHand'
import DiscardPile from './DiscardPile'
import DrawPile from './DrawPile'
import ColorPicker from './ColorPicker'
import GameInfo from './GameInfo'
import UNOCall from './UNOCall'
import Scoreboard from './Scoreboard'
import NewGameModal from './NewGameModal'
import UNOModal from './UNOModal'
import ChallengeModal from './ChallengeModal'
import DealAnimator from './DealAnimator'
import DebugPanel from './DebugPanel'

const actionLabels: Record<string, string> = {
  draw2: '+2!',
  wild4: '+4!',
  skip: '禁止!',
  reverse: '反转!',
}

const actionColors: Record<string, string> = {
  draw2: '#E53935',
  wild4: '#333',
  skip: '#FF9800',
  reverse: '#9C27B0',
}

export default function GameBoard() {
  const navigate = useNavigate()
  const location = useLocation()
  const players = useGameAdapter((s) => s.players)
  const discardPile = useGameAdapter((s) => s.discardPile)
  const drawPileCount = useGameAdapter((s) => s.drawPileCount)
  const currentPlayerIndex = useGameAdapter((s) => s.currentPlayerIndex)
  const direction = useGameAdapter((s) => s.direction)
  const currentColor = useGameAdapter((s) => s.currentColor)
  const phase = useGameAdapter((s) => s.phase)
  const winner = useGameAdapter((s) => s.winner)
  const scores = useGameAdapter((s) => s.scores)
  const cardJustDrawn = useGameAdapter((s) => s.cardJustDrawn)
  const pendingDrawCount = useGameAdapter((s) => s.pendingDrawCount)
  const config = useGameAdapter((s) => s.config)
  const unoCalledPlayer = useGameAdapter((s) => s.unoCalledPlayer)
  const lastPlayedBy = useGameAdapter((s) => s.lastPlayedBy)
  const lastActionEffect = useGameAdapter((s) => s.lastActionEffect)
  const debugMode = useGameAdapter((s) => s.debugMode)
  const logEntries = useGameAdapter((s) => s.logEntries)
  const dealAnimConfig = useGameAdapter((s) => s.dealAnimConfig)
  const drawAnimating = useGameAdapter((s) => s.drawAnimating)

  const turnStartTime = useGameStore((s) => s.turnStartTime)
  const gameStartTime = useGameStore((s) => s.gameStartTime)
  const pendingUnoAdvance = useGameStore((s) => s.pendingUnoAdvance)

  const {
    playCard, drawCard, pickColor, startNewGame, initGame,
    acceptDraw, resolveUno, resolveChallenge, cancelColorPick,
    toggleDebugMode, advanceTurn,
  } = useGameActions()

  const [showNewGameModal, setShowNewGameModal] = useState(() => !!location.state?.showNewGame)
  const [unoNeedsConfirm, setUnoNeedsConfirm] = useState(false)
  const [actionOverlay, setActionOverlay] = useState<{ type: string; color?: string } | null>(null)
  const [discardBounce, setDiscardBounce] = useState(false)

  const { currentDealItem, isDealing, onDealAnimationComplete } = useDealAnimation()
  const { currentDrawItem, onDrawAnimationComplete } = useDrawAnimation()

  const aiRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const discardPileRef = useRef<HTMLDivElement>(null)
  const drawPileRef = useRef<HTMLDivElement>(null)
  const playerHandRef = useRef<HTMLDivElement>(null)

  const networkMode = useLobbyStore((s) => s.networkMode)
  const myPlayerIndex = useLobbyStore((s) => s.myPlayerIndex)
  const humanPlayer = players[myPlayerIndex]
  const aiCount = players.length - 1
  const distribution = useMemo(() => distributeAIPlayers(aiCount), [aiCount])
  const isHumanTurn = currentPlayerIndex === myPlayerIndex
  const currentPlayer = players[currentPlayerIndex]
  const topCard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null

  const playableCards = useMemo(() => {
    if (isDealing) return new Set<string>()
    if (drawAnimating) return new Set<string>()
    if (!humanPlayer || !topCard || !isHumanTurn) return new Set<string>()
    if (pendingDrawCount > 0) return new Set<string>()

    const playable = new Set<string>()
    for (const card of humanPlayer.hand) {
      if (canPlayCard(card, topCard, currentColor, humanPlayer.hand)) {
        playable.add(card.id)
      }
    }

    if (cardJustDrawn && canPlayCard(cardJustDrawn, topCard, currentColor, humanPlayer.hand)) {
      playable.add(cardJustDrawn.id)
    }

    return playable
  }, [humanPlayer, topCard, currentColor, isHumanTurn, cardJustDrawn, pendingDrawCount, isDealing, drawAnimating])

  const stackableCards = useMemo(() => {
    if (isDealing) return new Set<string>()
    if (drawAnimating) return new Set<string>()
    if (!humanPlayer || !topCard || pendingDrawCount <= 0) return new Set<string>()
    if (!config.actionCards.stackingDraw2 && !config.actionCards.stackingDraw4) return new Set<string>()
    const stackable = new Set<string>()
    for (const card of humanPlayer.hand) {
      if (canStack(card, topCard, config.actionCards)) {
        if (card.type === 'wild4' && humanPlayer.hand.some((c) => c.color === currentColor)) continue
        stackable.add(card.id)
      }
    }
    return stackable
  }, [humanPlayer, topCard, pendingDrawCount, config, currentColor, isDealing, drawAnimating])

  const jumpInCards = useMemo(() => {
    if (isDealing) return new Set<string>()
    if (drawAnimating) return new Set<string>()
    if (!humanPlayer || !topCard || !config.actionCards.jumpIn) return new Set<string>()
    if (isHumanTurn) return new Set<string>()
    const jumpable = new Set<string>()
    for (const card of humanPlayer.hand) {
      if (canJumpIn(card, topCard, currentColor)) {
        jumpable.add(card.id)
      }
    }
    return jumpable
  }, [humanPlayer, topCard, currentColor, config, isHumanTurn, isDealing, drawAnimating])

  const hasPlayableCards = playableCards.size > 0
  const canDraw = isHumanTurn && phase === 'playing' && !isDealing && !drawAnimating && !hasPlayableCards

  const showUNO = humanPlayer ? humanPlayer.hand.length === 1 : false

  const prevHandLen = useRef(humanPlayer?.hand.length ?? 0)

  useEffect(() => {
    if (!humanPlayer || phase !== 'playing') return
    const currentLen = humanPlayer.hand.length
    if (prevHandLen.current === 2 && currentLen === 1) {
      if (config.uno.requireUNOCall && unoCalledPlayer === null && pendingUnoAdvance > 0) {
        setUnoNeedsConfirm(true)
      }
    }
    prevHandLen.current = currentLen
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [humanPlayer?.hand.length, phase, config.uno.requireUNOCall, unoCalledPlayer, pendingUnoAdvance])

  const turnTimeLeft = useMemo(() => {
    if (!config.params.turnTimeLimit || currentPlayerIndex !== myPlayerIndex || !turnStartTime) return 0
    return Math.max(0, config.params.turnTimeLimit * 1000 - (Date.now() - turnStartTime))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.params.turnTimeLimit, turnStartTime, currentPlayerIndex, phase])

  useEffect(() => {
    if (!config.params.turnTimeLimit || config.params.turnTimeLimit <= 0) return
    if (currentPlayerIndex !== myPlayerIndex) return
    if (phase !== 'playing' || !humanPlayer) return
    if (drawAnimating) return

    const timeoutMs = config.params.turnTimeLimit * 1000
    const start = turnStartTime ?? Date.now()
    const elapsed = Date.now() - start
    if (elapsed >= timeoutMs) return

    const remaining = timeoutMs - elapsed
    const timer = setTimeout(() => {
      const lobbyState = useLobbyStore.getState()
      const state = lobbyState.networkMode === 'client'
        ? useRemoteGameStore.getState()
        : useGameStore.getState()

      if (state.currentPlayerIndex !== myPlayerIndex || state.phase !== 'playing') return
      if (state.drawAnimating) return

      const hp = state.players[myPlayerIndex]
      if (!hp) return

      if (state.pendingDrawCount > 0) {
        if (lobbyState.networkMode === 'client') {
          lobbyState.sendAction?.({ type: 'game:accept-draw' })
        } else {
          useGameStore.getState().acceptDraw()
        }
        return
      }

      const tCard = state.discardPile[state.discardPile.length - 1]
      if (!tCard) return

      const playable = hp.hand.filter((c) => canPlayCard(c, tCard, state.currentColor, hp.hand))
      if (playable.length > 0) {
        if (lobbyState.networkMode === 'client') {
          lobbyState.sendAction?.({ type: 'game:play-card', cardId: playable[0].id })
        } else {
          useGameStore.getState().playCard(playable[0].id)
        }
      } else {
        if (lobbyState.networkMode === 'client') {
          lobbyState.sendAction?.({ type: 'game:draw-card' })
        } else {
          useGameStore.getState().drawCard()
        }
      }
    }, remaining)

    return () => clearTimeout(timer)
  }, [config.params.turnTimeLimit, turnStartTime, currentPlayerIndex, phase, humanPlayer, drawAnimating])

  // Flying card animation
  useEffect(() => {
    if (!lastPlayedBy) return

    const sourceEl = aiRefs.current.get(lastPlayedBy.playerIndex)
    const targetEl = discardPileRef.current
    if (!sourceEl || !targetEl) return

    const sourceRect = sourceEl.getBoundingClientRect()
    const targetRect = targetEl.getBoundingClientRect()

    const flyEl = document.createElement('div')
    flyEl.style.position = 'fixed'
    flyEl.style.left = `${sourceRect.left + sourceRect.width / 2 - 35}px`
    flyEl.style.top = `${sourceRect.top + sourceRect.height / 2 - 52}px`
    flyEl.style.width = '70px'
    flyEl.style.height = '105px'
    flyEl.style.borderRadius = '10px'
    flyEl.style.background = 'linear-gradient(135deg, #c62828 0%, #d32f2f 50%, #b71c1c 100%)'
    flyEl.style.border = '3px solid #ffcc00'
    flyEl.style.zIndex = '9999'
    flyEl.style.pointerEvents = 'none'
    flyEl.style.transition = 'all 400ms ease-out'
    flyEl.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5)'
    document.body.appendChild(flyEl)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        flyEl.style.left = `${targetRect.left + targetRect.width / 2 - 35}px`
        flyEl.style.top = `${targetRect.top + targetRect.height / 2 - 52}px`
        flyEl.style.opacity = '0.7'
        flyEl.style.transform = 'scale(0.8)'
      })
    })

    const removeTimer = setTimeout(() => flyEl.remove(), 450)
    const bounceTimer = setTimeout(() => setDiscardBounce(true), 400)

    return () => {
      clearTimeout(removeTimer)
      clearTimeout(bounceTimer)
    }
  }, [lastPlayedBy])

  useEffect(() => {
    if (discardBounce) {
      const t = setTimeout(() => setDiscardBounce(false), 200)
      return () => clearTimeout(t)
    }
  }, [discardBounce])

  // Action effect overlay
  useEffect(() => {
    if (!lastActionEffect) return
    setActionOverlay({ type: lastActionEffect.type, color: lastActionEffect.color })
    const timer = setTimeout(() => setActionOverlay(null), 600)
    return () => clearTimeout(timer)
  }, [lastActionEffect])

  // Turn transition animation
  const prevPlayerIndex = useRef(currentPlayerIndex)
  const [turnTransition, setTurnTransition] = useState<number | null>(null)

  useEffect(() => {
    if (prevPlayerIndex.current !== currentPlayerIndex) {
      setTurnTransition(currentPlayerIndex)
      const t = setTimeout(() => setTurnTransition(null), 300)
      prevPlayerIndex.current = currentPlayerIndex
      return () => clearTimeout(t)
    }
  }, [currentPlayerIndex])

  const setAIRef = useCallback((playerIndex: number, el: HTMLDivElement | null) => {
    if (el) aiRefs.current.set(playerIndex, el)
    else aiRefs.current.delete(playerIndex)
  }, [])

  if (phase === 'idle') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-uno-dark">
        <div
          className="font-game text-7xl"
          style={{
            color: '#ffcc00',
            textShadow: '4px 4px 0 #c62828, 8px 8px 0 rgba(0,0,0,0.3)',
          }}
        >
          UNO
        </div>
        <button
          onClick={() => setShowNewGameModal(true)}
          className="px-10 py-4 rounded-2xl bg-yellow-400 text-black font-game text-2xl shadow-xl hover:bg-yellow-300 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          开始游戏
        </button>
        <button
          onClick={() => navigate('/lobby')}
          className="px-8 py-3 rounded-2xl bg-blue-600 text-white font-game text-lg shadow-xl hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          局域网联机
        </button>
        <NewGameModal
          visible={showNewGameModal}
          onStart={() => {
            setShowNewGameModal(false)
            initGame()
          }}
          onCancel={() => setShowNewGameModal(false)}
        />
      </div>
    )
  }

  const leftPlayer = distribution.left !== null ? players[distribution.left] : null
  const rightPlayer = distribution.right !== null ? players[distribution.right] : null
  const topPlayers = distribution.top.map((idx) => players[idx]).filter(Boolean)

  return (
    <div className="game-board w-full h-full bg-uno-dark relative overflow-hidden">
      {/* Row 1: GameInfo */}
      <div className="flex justify-center pt-3 pb-1 relative" style={{ gridColumn: '1 / -1', gridRow: '1' }}>
        <GameInfo
          direction={direction}
          currentColor={currentColor}
          currentPlayerName={currentPlayer?.name ?? ''}
          gameStartTime={gameStartTime}
        />
        <button
          onClick={() => navigate('/settings')}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
          title="设置"
        >
          <Settings size={22} />
        </button>
        <button
          onClick={toggleDebugMode}
          className={`absolute right-12 top-1/2 -translate-y-1/2 transition-colors ${debugMode ? 'text-green-400' : 'text-white/40 hover:text-white/80'}`}
          title="调试模式"
        >
          <Bug size={20} />
        </button>
      </div>

      {/* Row 2: Turn timer (conditional) */}
      {turnTimeLeft > 0 && currentPlayerIndex === myPlayerIndex && (
        <div className="text-center text-white/50 text-sm" style={{ gridColumn: '1 / -1', gridRow: '2' }}>
          ⏱ {Math.ceil(turnTimeLeft / 1000)}s
        </div>
      )}

      {/* Row 2/3: Top AI row */}
      {topPlayers.length > 0 && (
        <div className="flex justify-center gap-3 sm:gap-6 py-2 px-4" style={{ gridColumn: '1 / -1', gridRow: '2' }}>
          {topPlayers.map((p) => {
            const idx = players.indexOf(p)
            return (
              <div
                key={p.id}
                ref={(el) => setAIRef(idx, el)}
                className={turnTransition === idx ? 'animate-turn-indicator' : ''}
              >
                <AIHand
                  player={p}
                  isCurrentTurn={currentPlayerIndex === idx}
                  position="top"
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Row 3: Left AI */}
      <div className={`flex items-center justify-center ${leftPlayer ? 'p-2' : ''}`} style={{ gridRow: '3', alignSelf: 'center' }}>
        {leftPlayer && (() => {
          const idx = distribution.left!
          return (
            <div
              ref={(el) => setAIRef(idx, el)}
              className={turnTransition === idx ? 'animate-turn-indicator' : ''}
            >
              <AIHand
                player={leftPlayer}
                isCurrentTurn={currentPlayerIndex === idx}
                position="left"
              />
            </div>
          )
        })()}
      </div>

      {/* Row 3: Center piles - center in Row 3 */}
      <div className="flex items-center justify-center relative" style={{ gridRow: '3', placeSelf: 'center', zIndex: 1 }}>
        <div className="flex items-center gap-6 sm:gap-12">
          <DrawPile
            ref={drawPileRef}
            count={drawPileCount}
            onDraw={drawCard}
            canDraw={canDraw && pendingDrawCount <= 0}
          />
          <div ref={discardPileRef} className={discardBounce ? 'animate-bounce-in' : ''}>
            <DiscardPile
              topCard={topCard}
              currentColor={currentColor}
            />
          </div>
        </div>

        {actionOverlay && (
          <div
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
            style={{ zIndex: 50 }}
          >
            <div
              className="absolute inset-0 animate-action-flash"
              style={{ backgroundColor: actionOverlay.color ?? actionColors[actionOverlay.type] ?? '#E53935', opacity: 0.3 }}
            />
            <div
              className="relative font-game text-5xl text-white animate-action-text"
              style={{
                textShadow: '3px 3px 0 #000, 6px 6px 0 rgba(0,0,0,0.3)',
                zIndex: 51,
              }}
            >
              {actionLabels[actionOverlay.type] ?? ''}
            </div>
          </div>
        )}
      </div>

      {/* Row 3: Right AI */}
      <div className={`flex items-center justify-center ${rightPlayer ? 'p-2' : ''}`} style={{ gridRow: '3', alignSelf: 'center' }}>
        {rightPlayer && (() => {
          const idx = distribution.right!
          return (
            <div
              ref={(el) => setAIRef(idx, el)}
              className={turnTransition === idx ? 'animate-turn-indicator' : ''}
            >
              <AIHand
                player={rightPlayer}
                isCurrentTurn={currentPlayerIndex === idx}
                position="right"
              />
            </div>
          )
        })()}
      </div>

      {/* Row 4: Pending draw button (conditional) */}
      {pendingDrawCount > 0 && isHumanTurn && (
        <div className="flex justify-center pb-2" style={{ gridColumn: '1 / -1', gridRow: '4' }}>
          <button
            onClick={() => acceptDraw()}
            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 font-game text-sm hover:bg-red-500/30 transition-all"
          >
            接受罚抽 ({pendingDrawCount}张)
          </button>
        </div>
      )}

      {/* Row 4: Skip after draw button (conditional) */}
      {cardJustDrawn && !config.draw.forcePlay && isHumanTurn && !drawAnimating && (
        <div className="flex justify-center pb-2" style={{ gridColumn: '1 / -1', gridRow: '4' }}>
          <button
            onClick={() => advanceTurn(1)}
            className="px-4 py-2 rounded-lg bg-white/10 text-white/60 font-game text-sm hover:bg-white/20 hover:text-white/90 transition-all"
          >
            跳过
          </button>
        </div>
      )}

      {/* Row 4: Bottom: Human hand */}
      <div className={`flex justify-center pb-4 sm:pb-6 px-2 sm:px-4 ${isDealing ? 'pointer-events-none opacity-50' : ''}`} style={{ gridColumn: '1 / -1', gridRow: '4', alignSelf: 'end' }}>
        {humanPlayer && (
          <PlayerHand
            ref={playerHandRef}
            cards={humanPlayer.hand}
            onPlayCard={(id) => playCard(id)}
            playableCards={playableCards}
            stackableCards={stackableCards}
            jumpInCards={jumpInCards}
            isCurrentTurn={isHumanTurn}
          />
        )}
      </div>

      <ColorPicker
        visible={phase === 'color-picking'}
        onPickColor={pickColor}
        onCancel={cancelColorPick}
      />

      <UNOCall
        visible={showUNO && phase === 'playing' && !unoNeedsConfirm}
        playerName={humanPlayer?.name ?? ''}
      />

      <UNOModal
        visible={unoNeedsConfirm || phase === 'uno-call'}
        onConfirm={() => {
          setUnoNeedsConfirm(false)
          resolveUno(true)
        }}
        onTimeout={() => {
          setUnoNeedsConfirm(false)
          resolveUno(false)
        }}
      />

      <ChallengeModal
        visible={phase === 'challenge'}
        onChallenge={() => resolveChallenge(true)}
        onAccept={() => resolveChallenge(false)}
      />

      <Scoreboard
        visible={phase === 'round-over'}
        players={players}
        scores={scores}
        winner={winner}
        onNewGame={() => setShowNewGameModal(true)}
      />

      <NewGameModal
        visible={showNewGameModal}
        onStart={() => {
          setShowNewGameModal(false)
          startNewGame()
        }}
        onCancel={() => setShowNewGameModal(false)}
      />

      <DealAnimator
        dealItem={currentDealItem}
        sourceRef={drawPileRef}
        targetRefs={(() => { const m = new Map(aiRefs.current); if (playerHandRef.current) m.set(myPlayerIndex, playerHandRef.current); return m })()}
        duration={dealAnimConfig.singleCardDuration}
        easing={dealAnimConfig.easing}
        onComplete={onDealAnimationComplete}
      />

      <DealAnimator
        dealItem={currentDrawItem}
        sourceRef={drawPileRef}
        targetRefs={(() => { const m = new Map(aiRefs.current); if (playerHandRef.current) m.set(myPlayerIndex, playerHandRef.current); return m })()}
        duration={dealAnimConfig.singleCardDuration}
        easing={dealAnimConfig.easing}
        onComplete={onDrawAnimationComplete}
      />

      <DebugPanel
        visible={debugMode}
        logEntries={logEntries}
        onClose={toggleDebugMode}
        players={players}
        phase={phase}
        direction={direction}
        currentColor={currentColor}
        currentPlayerIndex={currentPlayerIndex}
        winner={winner}
        scores={scores}
        addLogEntry={useGameStore.getState().addLogEntry}
      />
    </div>
  )
}
