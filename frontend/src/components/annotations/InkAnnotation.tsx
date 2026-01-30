import { memo, useMemo } from 'react'
import type { InkAnnotation as InkAnnotationType } from '@/stores/editor-store'
import type { PDFPageProxy } from 'pdfjs-dist'
import { pdfToViewport } from '@/lib/geometry'

type PageViewport = ReturnType<PDFPageProxy['getViewport']>

interface InkAnnotationProps {
  annotation: InkAnnotationType
  viewport: PageViewport
  isSelected: boolean
  onClick: (e: React.MouseEvent) => void
}

export const InkAnnotation = memo(function InkAnnotation({
  annotation,
  viewport,
  isSelected,
  onClick,
}: InkAnnotationProps) {
  const { paths, style } = annotation

  // Convert paths to viewport coordinates and generate SVG path data
  const pathData = useMemo(() => {
    return paths.map((path) => {
      const viewportPoints = path.points.map((p) => pdfToViewport(p, viewport))

      if (viewportPoints.length === 0) return ''
      if (viewportPoints.length === 1) {
        // Single point - draw a dot
        return `M ${viewportPoints[0].x} ${viewportPoints[0].y} L ${viewportPoints[0].x} ${viewportPoints[0].y}`
      }

      // Generate smooth path using quadratic bezier curves
      let d = `M ${viewportPoints[0].x} ${viewportPoints[0].y}`

      for (let i = 1; i < viewportPoints.length - 1; i++) {
        const p1 = viewportPoints[i]
        const p2 = viewportPoints[i + 1]

        // Control point is the current point
        // End point is midway between current and next
        const endX = (p1.x + p2.x) / 2
        const endY = (p1.y + p2.y) / 2

        d += ` Q ${p1.x} ${p1.y} ${endX} ${endY}`
      }

      // Draw final segment
      const lastPoint = viewportPoints[viewportPoints.length - 1]
      d += ` L ${lastPoint.x} ${lastPoint.y}`

      return d
    })
  }, [paths, viewport])

  // Calculate bounding box for selection
  const boundingBox = useMemo(() => {
    if (paths.length === 0) return null

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const path of paths) {
      for (const point of path.points) {
        const vp = pdfToViewport(point, viewport)
        minX = Math.min(minX, vp.x)
        minY = Math.min(minY, vp.y)
        maxX = Math.max(maxX, vp.x)
        maxY = Math.max(maxY, vp.y)
      }
    }

    return {
      x: minX - 5,
      y: minY - 5,
      width: maxX - minX + 10,
      height: maxY - minY + 10,
    }
  }, [paths, viewport])

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Ink strokes */}
      {pathData.map((d, index) => (
        <path
          key={index}
          d={d}
          fill="none"
          stroke={style.color}
          strokeWidth={style.strokeWidth || 2}
          opacity={style.opacity}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* Selection border */}
      {isSelected && boundingBox && (
        <rect
          x={boundingBox.x}
          y={boundingBox.y}
          width={boundingBox.width}
          height={boundingBox.height}
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="4"
          className="text-primary"
        />
      )}
    </g>
  )
})
