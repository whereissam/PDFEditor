import { useRef, useState, useCallback, memo } from 'react'
import type { PDFPageProxy } from 'pdfjs-dist'
import { useEditorStore, type Annotation, type Point } from '@/stores/editor-store'
import { useAnnotations } from '@/hooks/useAnnotations'
import {
  rectPdfToViewport,
  pdfToViewport,
  quadPointsPdfToViewport,
  simplifyPath,
} from '@/lib/geometry'

type PageViewport = ReturnType<PDFPageProxy['getViewport']>
import { HighlightAnnotation } from '../annotations/HighlightAnnotation'
import { ShapeAnnotation } from '../annotations/ShapeAnnotation'
import { NoteAnnotation } from '../annotations/NoteAnnotation'
import { InkAnnotation } from '../annotations/InkAnnotation'
import { cn } from '@/lib/utils'

interface AnnotationLayerProps {
  pageIndex: number
  viewport: PageViewport
}

export const AnnotationLayer = memo(function AnnotationLayer({
  pageIndex,
  viewport,
}: AnnotationLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  const activeTool = useEditorStore((s) => s.activeTool)
  const toolStyle = useEditorStore((s) => s.toolStyle)
  const annotations = useEditorStore((s) => s.getAnnotationsForPage(pageIndex))
  const selectedIds = useEditorStore((s) => s.selectedAnnotationIds)

  const {
    addNote,
    addRectangle,
    addEllipse,
    addArrow,
    addLine,
    addInk,
    addText,
    updateAnnotation,
    selectAnnotation,
    clearSelection,
  } = useAnnotations()

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<Point | null>(null)
  const [drawCurrent, setDrawCurrent] = useState<Point | null>(null)
  const [inkPoints, setInkPoints] = useState<Point[]>([])

  // Get mouse position relative to SVG
  const getMousePosition = useCallback(
    (e: React.MouseEvent): Point => {
      if (!svgRef.current) return { x: 0, y: 0 }
      const rect = svgRef.current.getBoundingClientRect()
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    },
    []
  )

  // Handle mouse down for drawing
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return // Only left click

      const pos = getMousePosition(e)

      // Handle different tools
      switch (activeTool) {
        case 'select':
          // Clear selection if clicking on empty area
          clearSelection()
          break
        case 'note':
          addNote(pageIndex, pos.x, pos.y, viewport)
          break
        case 'rectangle':
        case 'ellipse':
        case 'arrow':
        case 'line':
        case 'text':
          setIsDrawing(true)
          setDrawStart(pos)
          setDrawCurrent(pos)
          break
        case 'ink':
          setIsDrawing(true)
          setInkPoints([pos])
          break
      }
    },
    [activeTool, pageIndex, viewport, getMousePosition, addNote, clearSelection]
  )

  // Handle mouse move for drawing
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing) return

      const pos = getMousePosition(e)

      if (activeTool === 'ink') {
        setInkPoints((prev) => [...prev, pos])
      } else {
        setDrawCurrent(pos)
      }
    },
    [isDrawing, activeTool, getMousePosition]
  )

  // Handle mouse up for drawing
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing) return

      const pos = getMousePosition(e)

      if (activeTool === 'ink' && inkPoints.length > 1) {
        // Simplify the path and create annotation
        const simplified = simplifyPath(inkPoints, 2)
        addInk(pageIndex, simplified, viewport)
      } else if (drawStart && drawCurrent) {
        const minX = Math.min(drawStart.x, pos.x)
        const minY = Math.min(drawStart.y, pos.y)
        const width = Math.abs(pos.x - drawStart.x)
        const height = Math.abs(pos.y - drawStart.y)

        // Only create if there's some size
        if (width > 5 || height > 5) {
          switch (activeTool) {
            case 'rectangle':
              addRectangle(pageIndex, minX, minY, width, height, viewport)
              break
            case 'ellipse':
              addEllipse(pageIndex, minX, minY, width, height, viewport)
              break
            case 'arrow':
              addArrow(pageIndex, drawStart.x, drawStart.y, pos.x, pos.y, viewport)
              break
            case 'line':
              addLine(pageIndex, drawStart.x, drawStart.y, pos.x, pos.y, viewport)
              break
            case 'text':
              addText(pageIndex, minX, minY, Math.max(width, 100), Math.max(height, 30), '', viewport)
              break
          }
        }
      }

      // Reset drawing state
      setIsDrawing(false)
      setDrawStart(null)
      setDrawCurrent(null)
      setInkPoints([])
    },
    [
      isDrawing,
      activeTool,
      drawStart,
      drawCurrent,
      inkPoints,
      pageIndex,
      viewport,
      getMousePosition,
      addRectangle,
      addEllipse,
      addArrow,
      addLine,
      addInk,
      addText,
    ]
  )

  // Handle annotation selection
  const handleAnnotationClick = useCallback(
    (annotationId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      selectAnnotation(annotationId, e.shiftKey)
    },
    [selectAnnotation]
  )

  // Render drawing preview with ghost effect
  const renderDrawingPreview = () => {
    if (!isDrawing) return null

    // Ghost filter ID for this layer
    const ghostFilterId = `ghost-filter-${pageIndex}`

    if (activeTool === 'ink' && inkPoints.length > 1) {
      // Use quadratic bezier for smoother preview
      let pathData = `M ${inkPoints[0].x} ${inkPoints[0].y}`
      for (let i = 1; i < inkPoints.length - 1; i++) {
        const p1 = inkPoints[i]
        const p2 = inkPoints[i + 1]
        const midX = (p1.x + p2.x) / 2
        const midY = (p1.y + p2.y) / 2
        pathData += ` Q ${p1.x} ${p1.y} ${midX} ${midY}`
      }
      // Add last point
      if (inkPoints.length > 1) {
        const last = inkPoints[inkPoints.length - 1]
        pathData += ` L ${last.x} ${last.y}`
      }
      return (
        <g className="ghost-preview" filter={`url(#${ghostFilterId})`}>
          {/* Shadow layer for depth */}
          <path
            d={pathData}
            fill="none"
            stroke={toolStyle.color}
            strokeWidth={(toolStyle.strokeWidth || 2) + 2}
            opacity={0.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Main stroke */}
          <path
            d={pathData}
            fill="none"
            stroke={toolStyle.color}
            strokeWidth={toolStyle.strokeWidth}
            opacity={toolStyle.opacity}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )
    }

    if (!drawStart || !drawCurrent) return null

    const minX = Math.min(drawStart.x, drawCurrent.x)
    const minY = Math.min(drawStart.y, drawCurrent.y)
    const width = Math.abs(drawCurrent.x - drawStart.x)
    const height = Math.abs(drawCurrent.y - drawStart.y)

    switch (activeTool) {
      case 'rectangle':
        return (
          <g className="ghost-preview" filter={`url(#${ghostFilterId})`}>
            {/* Glow effect */}
            <rect
              x={minX - 2}
              y={minY - 2}
              width={width + 4}
              height={height + 4}
              fill="none"
              stroke={toolStyle.color}
              strokeWidth={4}
              opacity={0.15}
              rx={2}
            />
            {/* Main shape */}
            <rect
              x={minX}
              y={minY}
              width={width}
              height={height}
              fill={toolStyle.color}
              fillOpacity={toolStyle.opacity * 0.2}
              stroke={toolStyle.color}
              strokeWidth={toolStyle.strokeWidth}
              opacity={toolStyle.opacity}
              strokeDasharray="6 3"
            />
            {/* Corner indicators */}
            <circle cx={minX} cy={minY} r={3} fill={toolStyle.color} opacity={0.8} />
            <circle cx={minX + width} cy={minY} r={3} fill={toolStyle.color} opacity={0.8} />
            <circle cx={minX} cy={minY + height} r={3} fill={toolStyle.color} opacity={0.8} />
            <circle cx={minX + width} cy={minY + height} r={3} fill={toolStyle.color} opacity={0.8} />
          </g>
        )
      case 'ellipse':
        return (
          <g className="ghost-preview" filter={`url(#${ghostFilterId})`}>
            {/* Glow effect */}
            <ellipse
              cx={minX + width / 2}
              cy={minY + height / 2}
              rx={width / 2 + 2}
              ry={height / 2 + 2}
              fill="none"
              stroke={toolStyle.color}
              strokeWidth={4}
              opacity={0.15}
            />
            {/* Main shape */}
            <ellipse
              cx={minX + width / 2}
              cy={minY + height / 2}
              rx={width / 2}
              ry={height / 2}
              fill={toolStyle.color}
              fillOpacity={toolStyle.opacity * 0.2}
              stroke={toolStyle.color}
              strokeWidth={toolStyle.strokeWidth}
              opacity={toolStyle.opacity}
              strokeDasharray="6 3"
            />
          </g>
        )
      case 'arrow':
      case 'line':
        return (
          <g className="ghost-preview" filter={`url(#${ghostFilterId})`}>
            {/* Glow line */}
            <line
              x1={drawStart.x}
              y1={drawStart.y}
              x2={drawCurrent.x}
              y2={drawCurrent.y}
              stroke={toolStyle.color}
              strokeWidth={(toolStyle.strokeWidth || 2) + 4}
              opacity={0.15}
              strokeLinecap="round"
            />
            {/* Main line */}
            <line
              x1={drawStart.x}
              y1={drawStart.y}
              x2={drawCurrent.x}
              y2={drawCurrent.y}
              stroke={toolStyle.color}
              strokeWidth={toolStyle.strokeWidth}
              opacity={toolStyle.opacity}
              strokeLinecap="round"
              markerEnd={activeTool === 'arrow' ? 'url(#arrow-head-preview)' : undefined}
            />
            {/* End point indicators */}
            <circle cx={drawStart.x} cy={drawStart.y} r={4} fill={toolStyle.color} opacity={0.6} />
            <circle cx={drawCurrent.x} cy={drawCurrent.y} r={4} fill={toolStyle.color} opacity={0.6} />
          </g>
        )
      case 'text':
        return (
          <g className="ghost-preview">
            <rect
              x={minX}
              y={minY}
              width={width}
              height={height}
              fill={toolStyle.color}
              fillOpacity={0.05}
              stroke={toolStyle.color}
              strokeWidth={1}
              strokeDasharray="4 2"
              opacity={0.7}
            />
            {/* Text cursor indicator */}
            <line
              x1={minX + 4}
              y1={minY + 4}
              x2={minX + 4}
              y2={minY + Math.min(height - 4, 20)}
              stroke={toolStyle.color}
              strokeWidth={2}
              opacity={0.8}
            />
          </g>
        )
      default:
        return null
    }
  }

  // Render annotations
  const renderAnnotation = (annotation: Annotation) => {
    const isSelected = selectedIds.has(annotation.id)

    switch (annotation.type) {
      case 'highlight':
      case 'underline':
      case 'strikethrough': {
        const viewportQuadPoints = quadPointsPdfToViewport(
          annotation.quadPoints.points,
          viewport
        )
        return (
          <HighlightAnnotation
            key={annotation.id}
            annotation={annotation}
            quadPoints={viewportQuadPoints}
            isSelected={isSelected}
            onClick={(e) => handleAnnotationClick(annotation.id, e)}
          />
        )
      }
      case 'rectangle':
      case 'ellipse': {
        const viewportRect = rectPdfToViewport(annotation.rect, viewport)
        return (
          <ShapeAnnotation
            key={annotation.id}
            annotation={annotation}
            rect={viewportRect}
            viewport={viewport}
            isSelected={isSelected}
            onClick={(e) => handleAnnotationClick(annotation.id, e)}
            onUpdate={(changes) => updateAnnotation(annotation.id, changes)}
          />
        )
      }
      case 'arrow':
      case 'line': {
        const start = pdfToViewport(annotation.start, viewport)
        const end = pdfToViewport(annotation.end, viewport)
        return (
          <g
            key={annotation.id}
            onClick={(e) => handleAnnotationClick(annotation.id, e)}
            style={{ cursor: 'pointer' }}
          >
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={annotation.style.color}
              strokeWidth={annotation.style.strokeWidth}
              opacity={annotation.style.opacity}
              markerEnd={annotation.type === 'arrow' ? 'url(#arrow-head)' : undefined}
            />
            {isSelected && (
              <>
                <circle cx={start.x} cy={start.y} r={5} fill={annotation.style.color} />
                <circle cx={end.x} cy={end.y} r={5} fill={annotation.style.color} />
              </>
            )}
          </g>
        )
      }
      case 'note': {
        const position = pdfToViewport(annotation.position, viewport)
        return (
          <NoteAnnotation
            key={annotation.id}
            annotation={annotation}
            position={position}
            isSelected={isSelected}
            onClick={(e) => handleAnnotationClick(annotation.id, e)}
            onUpdate={(changes) => updateAnnotation(annotation.id, changes)}
          />
        )
      }
      case 'ink': {
        return (
          <InkAnnotation
            key={annotation.id}
            annotation={annotation}
            viewport={viewport}
            isSelected={isSelected}
            onClick={(e) => handleAnnotationClick(annotation.id, e)}
          />
        )
      }
      case 'text': {
        const viewportRect = rectPdfToViewport(annotation.rect, viewport)
        return (
          <foreignObject
            key={annotation.id}
            x={viewportRect.x}
            y={viewportRect.y}
            width={viewportRect.width}
            height={viewportRect.height}
            onClick={(e) => handleAnnotationClick(annotation.id, e)}
          >
            <div
              className={cn(
                'w-full h-full p-1 overflow-hidden',
                isSelected && 'ring-2 ring-primary'
              )}
              style={{
                color: annotation.style.color,
                fontSize: annotation.style.fontSize,
                fontFamily: annotation.style.fontFamily,
                opacity: annotation.style.opacity,
              }}
            >
              {annotation.content || (
                <span className="text-muted-foreground italic">Click to edit...</span>
              )}
            </div>
          </foreignObject>
        )
      }
      default:
        return null
    }
  }

  // Determine if the layer should capture events
  const shouldCaptureEvents = [
    'select',
    'note',
    'rectangle',
    'ellipse',
    'arrow',
    'line',
    'ink',
    'text',
  ].includes(activeTool)

  return (
    <svg
      ref={svgRef}
      className="absolute top-0 left-0 w-full h-full"
      style={{
        pointerEvents: shouldCaptureEvents ? 'auto' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Marker and filter definitions */}
      <defs>
        {/* Ghost glow filter */}
        <filter id={`ghost-filter-${pageIndex}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
          <feFlood floodColor={toolStyle.color} floodOpacity="0.3" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Arrow marker for existing annotations */}
        <marker
          id="arrow-head"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill={toolStyle.color} />
        </marker>
        {/* Arrow marker for preview (dashed style) */}
        <marker
          id="arrow-head-preview"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill={toolStyle.color} opacity={toolStyle.opacity} />
        </marker>
      </defs>

      {/* Render existing annotations */}
      {annotations.map(renderAnnotation)}

      {/* Render drawing preview */}
      {renderDrawingPreview()}
    </svg>
  )
})
