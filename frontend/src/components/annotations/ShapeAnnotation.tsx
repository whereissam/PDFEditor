import { useState, useCallback, memo } from 'react'
import type { ShapeAnnotation as ShapeAnnotationType, Rect } from '@/stores/editor-store'
import { getResizeHandles, applyResize, type ResizeHandle } from '@/lib/geometry'

interface ShapeAnnotationProps {
  annotation: ShapeAnnotationType
  rect: Rect // Already converted to viewport coordinates
  isSelected: boolean
  onClick: (e: React.MouseEvent) => void
  onUpdate?: (changes: Partial<ShapeAnnotationType>) => void
}

export const ShapeAnnotation = memo(function ShapeAnnotation({
  annotation,
  rect,
  isSelected,
  onClick,
}: ShapeAnnotationProps) {
  const { type, style } = annotation
  const [isResizing, setIsResizing] = useState(false)
  const [activeHandle, setActiveHandle] = useState<ResizeHandle['position'] | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [currentRect, setCurrentRect] = useState(rect)

  // Handle resize start
  const handleResizeStart = useCallback(
    (handle: ResizeHandle['position'], e: React.MouseEvent) => {
      e.stopPropagation()
      setIsResizing(true)
      setActiveHandle(handle)
      setDragStart({ x: e.clientX, y: e.clientY })
      setCurrentRect(rect)
    },
    [rect]
  )

  // Handle resize move
  const handleResizeMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isResizing || !activeHandle || !dragStart) return

      const dx = e.clientX - dragStart.x
      const dy = e.clientY - dragStart.y

      const newRect = applyResize(rect, activeHandle, dx, dy)
      setCurrentRect(newRect)
    },
    [isResizing, activeHandle, dragStart, rect]
  )

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    if (isResizing && currentRect !== rect) {
      // Note: Would need to convert back to PDF coordinates before updating
      // For now, just updating local state
    }
    setIsResizing(false)
    setActiveHandle(null)
    setDragStart(null)
  }, [isResizing, currentRect, rect])

  const displayRect = isResizing ? currentRect : rect
  const handles = isSelected ? getResizeHandles(displayRect, 8) : []

  if (type === 'rectangle') {
    return (
      <g
        onClick={onClick}
        onMouseMove={handleResizeMove}
        onMouseUp={handleResizeEnd}
        onMouseLeave={handleResizeEnd}
        style={{ cursor: isResizing ? 'grabbing' : 'pointer' }}
      >
        <rect
          x={displayRect.x}
          y={displayRect.y}
          width={displayRect.width}
          height={displayRect.height}
          fill={style.color}
          fillOpacity={style.opacity * 0.3}
          stroke={style.color}
          strokeWidth={style.strokeWidth || 2}
          opacity={style.opacity}
        />

        {/* Selection border */}
        {isSelected && (
          <rect
            x={displayRect.x - 2}
            y={displayRect.y - 2}
            width={displayRect.width + 4}
            height={displayRect.height + 4}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="4"
            className="text-primary"
          />
        )}

        {/* Resize handles */}
        {handles.map((handle) => (
          <rect
            key={handle.position}
            x={handle.x}
            y={handle.y}
            width={8}
            height={8}
            fill="white"
            stroke="currentColor"
            strokeWidth={1}
            className="text-primary"
            style={{ cursor: handle.cursor }}
            onMouseDown={(e) => handleResizeStart(handle.position, e)}
          />
        ))}
      </g>
    )
  }

  if (type === 'ellipse') {
    const cx = displayRect.x + displayRect.width / 2
    const cy = displayRect.y + displayRect.height / 2
    const rx = displayRect.width / 2
    const ry = displayRect.height / 2

    return (
      <g
        onClick={onClick}
        onMouseMove={handleResizeMove}
        onMouseUp={handleResizeEnd}
        onMouseLeave={handleResizeEnd}
        style={{ cursor: isResizing ? 'grabbing' : 'pointer' }}
      >
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill={style.color}
          fillOpacity={style.opacity * 0.3}
          stroke={style.color}
          strokeWidth={style.strokeWidth || 2}
          opacity={style.opacity}
        />

        {/* Selection border */}
        {isSelected && (
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx + 2}
            ry={ry + 2}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="4"
            className="text-primary"
          />
        )}

        {/* Resize handles */}
        {handles.map((handle) => (
          <rect
            key={handle.position}
            x={handle.x}
            y={handle.y}
            width={8}
            height={8}
            fill="white"
            stroke="currentColor"
            strokeWidth={1}
            className="text-primary"
            style={{ cursor: handle.cursor }}
            onMouseDown={(e) => handleResizeStart(handle.position, e)}
          />
        ))}
      </g>
    )
  }

  return null
})
