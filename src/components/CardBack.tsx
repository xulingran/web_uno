interface CardBackProps {
  count?: number
  size?: 'normal' | 'top' | 'side'
}

export default function CardBack({ count, size = 'normal' }: CardBackProps) {
  const sizeClass = size === 'normal' ? '' : size === 'top' ? 'uno-card-back-top' : 'uno-card-back-side'

  return (
    <div
      className={`uno-card-back ${sizeClass} relative flex-shrink-0`}
    >
      <div className="uno-card-back-inner">
        <span className="font-game uno-card-back-label">
          UNO
        </span>
      </div>
      {count !== undefined && (
        <div
          className="absolute bg-white text-black rounded-full flex items-center justify-center font-bold border-2 border-[#ffcc00] shadow-md"
          style={{ width: '24px', height: '24px', fontSize: '11px', bottom: '-4px', right: '-4px' }}
        >
          {count}
        </div>
      )}
    </div>
  )
}