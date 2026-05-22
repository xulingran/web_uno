import { useRef, useEffect } from 'react'
import type { DealItem } from '@/utils/types'

interface DealAnimatorProps {
  dealItem: DealItem | null
  sourceRef: React.RefObject<HTMLDivElement | null>
  targetRefs: Map<number, HTMLDivElement>
  duration: number
  easing: string
  onComplete: () => void
}

export default function DealAnimator({ dealItem, sourceRef, targetRefs, duration, easing, onComplete }: DealAnimatorProps) {
  const completedRef = useRef(false)

  useEffect(() => {
    if (!dealItem) return

    completedRef.current = false
    const sourceEl = sourceRef.current
    const targetEl = targetRefs.get(dealItem.playerIndex)
    if (!sourceEl || !targetEl) {
      onComplete()
      return
    }

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
    flyEl.style.transition = `all ${duration}ms ${easing}`
    flyEl.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5)'
    document.body.appendChild(flyEl)

    const handleTransitionEnd = () => {
      if (completedRef.current) return
      completedRef.current = true
      flyEl.remove()
      onComplete()
    }

    flyEl.addEventListener('transitionend', handleTransitionEnd, { once: true })

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        flyEl.style.left = `${targetRect.left + targetRect.width / 2 - 35}px`
        flyEl.style.top = `${targetRect.top + targetRect.height / 2 - 52}px`
        flyEl.style.opacity = '0.7'
        flyEl.style.transform = 'scale(0.8)'
      })
    })

    const fallbackTimer = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true
        flyEl.remove()
        onComplete()
      }
    }, duration + 100)

    return () => {
      clearTimeout(fallbackTimer)
      if (!completedRef.current) {
        completedRef.current = true
        flyEl.remove()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealItem])

  return null
}
