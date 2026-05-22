import { forwardRef, useMemo } from 'react'
import type { Card as CardType } from '@/utils/types'
import Card from './Card'

interface PlayerHandProps {
  cards: CardType[]
  onPlayCard: (id: string) => void
  playableCards: Set<string>
  stackableCards?: Set<string>
  jumpInCards?: Set<string>
  isCurrentTurn: boolean
}

const CARD_WIDTH_PX = 90
const MIN_OVERLAP_PX = 4

const PlayerHand = forwardRef<HTMLDivElement, PlayerHandProps>(function PlayerHand({ cards, onPlayCard, playableCards, stackableCards, jumpInCards, isCurrentTurn }, ref) {
  const overlap = useMemo(() => {
    if (typeof window === 'undefined' || cards.length <= 1) return 0
    const containerWidth = window.innerWidth * 0.92
    const totalWidth = cards.length * CARD_WIDTH_PX
    if (totalWidth <= containerWidth) return 0
    return Math.min(
      CARD_WIDTH_PX - MIN_OVERLAP_PX,
      Math.max(0, (totalWidth - containerWidth) / (cards.length - 1))
    )
  }, [cards.length])

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-[95vw]">
      {isCurrentTurn && (
        <div className="text-yellow-300 font-game text-base sm:text-lg animate-pulse">
          轮到你了！
        </div>
      )}
      <div ref={ref} className="w-full overflow-x-auto flex items-end justify-center px-2 sm:px-4 py-1">
        {cards.map((card, index) => {
          const isPlayable = playableCards.has(card.id)
          const isStackable = stackableCards?.has(card.id) ?? false
          const isJumpIn = jumpInCards?.has(card.id) ?? false
          const playable = (isCurrentTurn || isJumpIn) && (isPlayable || isStackable || isJumpIn)

          let extraClass = ''
          if (isStackable) {
            extraClass = 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-transparent'
          } else if (isJumpIn) {
            extraClass = 'ring-2 ring-green-400 ring-offset-2 ring-offset-transparent animate-uno-pulse'
          }

          return (
            <div
              key={card.id}
              className={`flex-shrink-0 hover:z-50 hover:-translate-y-2 ${playable ? 'animate-slide-up' : ''} ${extraClass}`}
              style={{
                zIndex: index,
                marginLeft: index === 0 ? 0 : -overlap,
                transition: 'margin-left 0.2s ease, transform 0.2s ease',
              }}
            >
              <Card
                card={card}
                playable={playable}
                onClick={playable ? () => onPlayCard(card.id) : undefined}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default PlayerHand