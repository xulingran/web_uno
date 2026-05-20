import { useEffect, useState } from 'react'

interface UNOCallProps {
  visible: boolean
  playerName: string
}

export default function UNOCall({ visible, playerName }: UNOCallProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (visible) {
      setShow(true)
      const timer = setTimeout(() => setShow(false), 2000)
      return () => clearTimeout(timer)
    } else {
      setShow(false)
    }
  }, [visible])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center gap-2 animate-uno-pulse">
        <div
          className="font-game text-6xl"
          style={{
            color: '#ffcc00',
            textShadow: '3px 3px 0 #c62828, 6px 6px 0 rgba(0,0,0,0.3)',
          }}
        >
          UNO！
        </div>
        <div className="text-white/80 font-game text-lg bg-black/40 px-4 py-1 rounded-full">
          {playerName}
        </div>
      </div>
    </div>
  )
}