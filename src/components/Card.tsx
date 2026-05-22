import type { Card as CardType } from '@/utils/types'

interface CardProps {
  card: CardType
  playable: boolean
  onClick?: () => void
  small?: boolean
}

const colorMap: Record<string, string> = {
  red: '#E53935',
  yellow: '#FDD835',
  blue: '#1E88E5',
  green: '#43A047',
}

function CornerContent({ card, small }: { card: CardType; small?: boolean }) {
  const sizeClass = small ? 'card-corner-sm' : ''

  switch (card.type) {
    case 'number':
      return (
        <>
          <div className={`card-corner top-left ${sizeClass}`} style={{ color: colorMap[card.color!] }}>
            {card.value}
          </div>
          <div className={`card-corner bottom-right ${sizeClass}`} style={{ color: colorMap[card.color!] }}>
            {card.value}
          </div>
        </>
      )
    case 'skip':
      return (
        <>
          <div className={`card-corner top-left ${sizeClass}`} style={{ color: colorMap[card.color!] }}>S</div>
          <div className={`card-corner bottom-right ${sizeClass}`} style={{ color: colorMap[card.color!] }}>S</div>
        </>
      )
    case 'reverse':
      return (
        <>
          <div className={`card-corner top-left ${sizeClass}`} style={{ color: colorMap[card.color!] }}>R</div>
          <div className={`card-corner bottom-right ${sizeClass}`} style={{ color: colorMap[card.color!] }}>R</div>
        </>
      )
    case 'draw2':
      return (
        <>
          <div className={`card-corner top-left ${sizeClass}`} style={{ color: colorMap[card.color!] }}>+2</div>
          <div className={`card-corner bottom-right ${sizeClass}`} style={{ color: colorMap[card.color!] }}>+2</div>
        </>
      )
    case 'wild':
      return (
        <>
          <div className={`card-corner top-left ${sizeClass} text-white`}>W</div>
          <div className={`card-corner bottom-right ${sizeClass} text-white`}>W</div>
        </>
      )
    case 'wild4':
      return (
        <>
          <div className={`card-corner top-left ${sizeClass} text-white`}>W4</div>
          <div className={`card-corner bottom-right ${sizeClass} text-white`}>W4</div>
        </>
      )
    default:
      return null
  }
}

function CenterContent({ card, small }: { card: CardType; small?: boolean }) {

  switch (card.type) {
    case 'number':
      return (
        <div className={`card-center ${small ? 'card-center-sm' : ''}`} style={{ color: colorMap[card.color!] }}>
          {card.value}
        </div>
      )
    case 'skip':
      return (
        <div className={`card-center-symbol ${small ? 'card-center-symbol-sm' : ''}`} style={{ color: colorMap[card.color!] }}>
          &#8856;
        </div>
      )
    case 'reverse':
      return (
        <div className={`card-center-symbol ${small ? 'card-center-symbol-sm' : ''}`} style={{ color: colorMap[card.color!] }}>
          &#10226;
        </div>
      )
    case 'draw2':
      return (
        <div className={`card-center ${small ? 'card-center-sm' : ''}`} style={{ color: colorMap[card.color!] }}>
          +2
        </div>
      )
    case 'wild':
      return (
        <div className={`relative ${small ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-10 h-10 sm:w-14 sm:h-14'}`}>
          <svg viewBox="0 0 56 56" className="w-full h-full">
            <defs>
              <clipPath id={`wild-clip-${card.id}`}>
                <circle cx="28" cy="28" r="26" />
              </clipPath>
            </defs>
            <g clipPath={`url(#wild-clip-${card.id})`}>
              <rect x="0" y="0" width="28" height="28" fill={colorMap.red} />
              <rect x="28" y="0" width="28" height="28" fill={colorMap.blue} />
              <rect x="0" y="28" width="28" height="28" fill={colorMap.yellow} />
              <rect x="28" y="28" width="28" height="28" fill={colorMap.green} />
            </g>
            <circle cx="28" cy="28" r="26" fill="none" stroke="#fff" strokeWidth="3" />
          </svg>
        </div>
      )
    case 'wild4':
      return (
        <div className={`relative ${small ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-10 h-10 sm:w-14 sm:h-14'}`}>
          <svg viewBox="0 0 56 56" className="w-full h-full">
            <defs>
              <clipPath id={`wild4-clip-${card.id}`}>
                <circle cx="28" cy="28" r="26" />
              </clipPath>
            </defs>
            <g clipPath={`url(#wild4-clip-${card.id})`}>
              <rect x="0" y="0" width="28" height="28" fill={colorMap.red} />
              <rect x="28" y="0" width="28" height="28" fill={colorMap.blue} />
              <rect x="0" y="28" width="28" height="28" fill={colorMap.yellow} />
              <rect x="28" y="28" width="28" height="28" fill={colorMap.green} />
            </g>
            <circle cx="28" cy="28" r="26" fill="none" stroke="#fff" strokeWidth="3" />
          </svg>
          <div
            className="absolute inset-0 flex items-center justify-center font-bold text-white"
            style={{ fontSize: small ? 'clamp(8px, 1vw, 12px)' : 'clamp(10px, 1.3vw, 16px)', textShadow: '1px 1px 2px #000' }}
          >
            +4
          </div>
        </div>
      )
    default:
      return null
  }
}

export default function Card({ card, playable, onClick, small }: CardProps) {
  const isWild = card.type === 'wild' || card.type === 'wild4'
  const borderColor = isWild ? '#333' : colorMap[card.color!]
  const bgColor = isWild ? '#333' : '#fff'
  const textColor = isWild ? 'text-white' : ''

  const sizeClass = small ? 'uno-card-small' : ''
  const playableClass = playable ? 'playable' : 'not-playable'

  return (
    <div
      className={`uno-card ${playableClass} ${sizeClass} ${textColor} bg-white flex-shrink-0`}
      style={{
        border: `${small ? 2 : 4}px solid ${borderColor}`,
        backgroundColor: bgColor,
      }}
      onClick={onClick}
    >
      <CornerContent card={card} small={small} />
      <CenterContent card={card} small={small} />
    </div>
  )
}