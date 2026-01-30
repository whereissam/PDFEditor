import { memo } from 'react'
import type { HighlightAnnotation as HighlightAnnotationType } from '@/stores/editor-store'
import { cn } from '@/lib/utils'

interface HighlightAnnotationProps {
  annotation: HighlightAnnotationType
  quadPoints: number[][] // Already converted to viewport coordinates
  isSelected: boolean
  onClick: (e: React.MouseEvent) => void
}

export const HighlightAnnotation = memo(function HighlightAnnotation({
  annotation,
  quadPoints,
  isSelected,
  onClick,
}: HighlightAnnotationProps) {
  const { type, style } = annotation

  // Render different styles based on annotation type
  if (type === 'highlight') {
    return (
      <g onClick={onClick} style={{ cursor: 'pointer' }}>
        {quadPoints.map((quad, index) => {
          // QuadPoints format: [x1, y1, x2, y2, x3, y3, x4, y4]
          // Representing: bottom-left, bottom-right, top-right, top-left
          const pathData = `M ${quad[6]} ${quad[7]} L ${quad[4]} ${quad[5]} L ${quad[2]} ${quad[3]} L ${quad[0]} ${quad[1]} Z`

          return (
            <path
              key={index}
              d={pathData}
              fill={style.color}
              fillOpacity={style.opacity}
              stroke={isSelected ? 'currentColor' : 'none'}
              strokeWidth={isSelected ? 1 : 0}
              className={cn(isSelected && 'text-primary')}
            />
          )
        })}
      </g>
    )
  }

  if (type === 'underline') {
    return (
      <g onClick={onClick} style={{ cursor: 'pointer' }}>
        {quadPoints.map((quad, index) => {
          // Draw a line at the bottom of each quad
          const y = Math.max(quad[1], quad[3]) // Bottom y coordinate
          const x1 = Math.min(quad[0], quad[6])
          const x2 = Math.max(quad[2], quad[4])

          return (
            <line
              key={index}
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke={style.color}
              strokeWidth={style.strokeWidth || 2}
              opacity={style.opacity}
            />
          )
        })}
        {isSelected && (
          <rect
            x={Math.min(...quadPoints.flat().filter((_, i) => i % 2 === 0)) - 2}
            y={Math.min(...quadPoints.flat().filter((_, i) => i % 2 === 1)) - 2}
            width={
              Math.max(...quadPoints.flat().filter((_, i) => i % 2 === 0)) -
              Math.min(...quadPoints.flat().filter((_, i) => i % 2 === 0)) +
              4
            }
            height={
              Math.max(...quadPoints.flat().filter((_, i) => i % 2 === 1)) -
              Math.min(...quadPoints.flat().filter((_, i) => i % 2 === 1)) +
              4
            }
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="2"
            className="text-primary"
          />
        )}
      </g>
    )
  }

  if (type === 'strikethrough') {
    return (
      <g onClick={onClick} style={{ cursor: 'pointer' }}>
        {quadPoints.map((quad, index) => {
          // Draw a line through the middle of each quad
          const topY = Math.min(quad[5], quad[7])
          const bottomY = Math.max(quad[1], quad[3])
          const y = (topY + bottomY) / 2
          const x1 = Math.min(quad[0], quad[6])
          const x2 = Math.max(quad[2], quad[4])

          return (
            <line
              key={index}
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke={style.color}
              strokeWidth={style.strokeWidth || 2}
              opacity={style.opacity}
            />
          )
        })}
        {isSelected && (
          <rect
            x={Math.min(...quadPoints.flat().filter((_, i) => i % 2 === 0)) - 2}
            y={Math.min(...quadPoints.flat().filter((_, i) => i % 2 === 1)) - 2}
            width={
              Math.max(...quadPoints.flat().filter((_, i) => i % 2 === 0)) -
              Math.min(...quadPoints.flat().filter((_, i) => i % 2 === 0)) +
              4
            }
            height={
              Math.max(...quadPoints.flat().filter((_, i) => i % 2 === 1)) -
              Math.min(...quadPoints.flat().filter((_, i) => i % 2 === 1)) +
              4
            }
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="2"
            className="text-primary"
          />
        )}
      </g>
    )
  }

  return null
})
