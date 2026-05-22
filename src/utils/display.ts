import type { Card } from './types'

export function formatCardInfo(card: Card): string {
  const colorMap: Record<string, string> = { red: '红色', yellow: '黄色', blue: '蓝色', green: '绿色' }
  const typeMap: Record<string, string> = { number: '', skip: '跳过', reverse: '反转', draw2: '+2', wild: '万能', wild4: '万能+4' }
  const colorStr = card.color ? (colorMap[card.color] ?? '') : ''
  const typeStr = typeMap[card.type] ?? ''
  if (card.type === 'number') return `${colorStr} ${card.value}`
  return `${colorStr} ${typeStr}`.trim()
}