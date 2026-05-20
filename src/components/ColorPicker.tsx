import { useEffect, useState } from 'react'
import type { CardColor } from '@/utils/types'

interface ColorPickerProps {
  visible: boolean
  onPickColor: (color: CardColor) => void
}

const colors: { color: CardColor; hex: string; name: string; ring: string }[] = [
  { color: 'red', hex: '#E53935', name: '红', ring: 'ring-red-500' },
  { color: 'yellow', hex: '#FDD835', name: '黄', ring: 'ring-yellow-400' },
  { color: 'blue', hex: '#1E88E5', name: '蓝', ring: 'ring-blue-500' },
  { color: 'green', hex: '#43A047', name: '绿', ring: 'ring-green-500' },
]

export default function ColorPicker({ visible, onPickColor }: ColorPickerProps) {
  const [show, setShow] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (visible) {
      setShow(true)
      requestAnimationFrame(() => setAnimating(true))
    } else {
      setAnimating(false)
      const timer = setTimeout(() => setShow(false), 300)
      return () => clearTimeout(timer)
    }
  }, [visible])

  if (!show) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        animating ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent'
      }`}
    >
      <div
        className={`flex flex-col items-center gap-6 p-8 rounded-2xl bg-gray-900/90 border border-white/10 shadow-2xl transition-all duration-300 ${
          animating ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}
      >
        <h2 className="text-2xl font-game text-white">选择颜色</h2>
        <div className="flex gap-5">
          {colors.map(({ color, hex, name, ring }) => (
            <button
              key={color}
              onClick={() => onPickColor(color)}
              className={`w-[72px] h-[72px] rounded-full font-game text-lg shadow-lg transition-all duration-200 hover:scale-110 hover:ring-4 ${ring} active:scale-95`}
              style={{
                backgroundColor: hex,
                color: color === 'yellow' ? '#000' : '#fff',
                textShadow: color === 'yellow' ? 'none' : '0 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}