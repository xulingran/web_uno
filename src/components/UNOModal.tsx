import { useEffect, useState, useRef } from 'react'

interface UNOModalProps {
  visible: boolean
  onConfirm: () => void
  onTimeout: () => void
}

export default function UNOModal({ visible, onConfirm, onTimeout }: UNOModalProps) {
  const [show, setShow] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [timeLeft, setTimeLeft] = useState(5)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutCalledRef = useRef(false)

  useEffect(() => {
    if (visible) {
      timeoutCalledRef.current = false
      setShow(true)
      setTimeLeft(5)
      requestAnimationFrame(() => setAnimating(true))
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) return 0
          return prev - 1
        })
      }, 1000)
    } else {
      setAnimating(false)
      const timer = setTimeout(() => setShow(false), 300)
      if (timerRef.current) clearInterval(timerRef.current)
      return () => {
        clearTimeout(timer)
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [visible])

  useEffect(() => {
    if (timeLeft === 0 && show && !timeoutCalledRef.current) {
      timeoutCalledRef.current = true
      onTimeout()
      setAnimating(false)
      const timer = setTimeout(() => setShow(false), 300)
      return () => clearTimeout(timer)
    }
  }, [timeLeft, show, onTimeout])

  if (!show) return null

  const handleConfirm = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    onConfirm()
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        animating ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent'
      }`}
    >
      <div
        className={`flex flex-col items-center gap-6 p-8 rounded-2xl bg-gray-900/95 border border-white/10 shadow-2xl transition-all duration-300 ${
          animating ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}
      >
        <div
          className="font-game text-6xl"
          style={{
            color: '#ffcc00',
            textShadow: '3px 3px 0 #c62828, 6px 6px 0 rgba(0,0,0,0.3)',
          }}
        >
          UNO！
        </div>
        <div className="text-white/60 font-game text-sm">
          剩 {timeLeft} 秒确认...
        </div>
        <button
          onClick={handleConfirm}
          className="px-10 py-3 rounded-xl bg-yellow-400 text-black font-game text-xl shadow-lg hover:bg-yellow-300 hover:scale-105 active:scale-95 transition-all duration-200 animate-uno-pulse"
        >
          确认呼叫
        </button>
      </div>
    </div>
  )
}