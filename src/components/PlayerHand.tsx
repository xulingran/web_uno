import { forwardRef } from 'react'
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

const PlayerHand = forwardRef<HTMLDivElement, PlayerHandProps>(function PlayerHand({ cards, onPlayCard, playableCards, stackableCards, jumpInCards, isCurrentTurn }, ref) {
  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {isCurrentTurn && (
        <div className="text-yellow-300 font-game text-lg animate-pulse">
          轮到你了！
        </div>
      )}
      <div ref={ref} className="w-full max-w-full overflow-x-auto flex items-end justify-center gap-1 px-4 py-1">
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
              className={`flex-shrink-0 ${playable ? 'animate-slide-up' : ''} ${extraClass}`}
              style={{
                zIndex: index,
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