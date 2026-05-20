interface CardBackProps {
  count?: number
  size?: 'normal' | 'top' | 'side'
}

const sizeStyles: Record<string, { width: number; height: number; innerScale: number; fontSize: string }> = {
  normal: { width: 90, height: 135, innerScale: 1, fontSize: '28px' },
  top: { width: 70, height: 105, innerScale: 0.78, fontSize: '22px' },
  side: { width: 60, height: 90, innerScale: 0.67, fontSize: '18px' },
}

export default function CardBack({ count, size = 'normal' }: CardBackProps) {
  const s = sizeStyles[size]

  return (
    <div
      className="relative flex-shrink-0"
      style={{
        width: `${s.width}px`,
        height: `${s.height}px`,
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #c62828 0%, #d32f2f 50%, #b71c1c 100%)',
        border: '3px solid #ffcc00',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div
        style={{
          width: `${75 * s.innerScale}%`,
          height: `${80 * s.innerScale}%`,
          borderRadius: '50%',
          border: '3px solid #ffcc00',
          background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          className="font-game"
          style={{ color: '#ffcc00', fontSize: s.fontSize, textShadow: '2px 2px 0 #000' }}
        >
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
