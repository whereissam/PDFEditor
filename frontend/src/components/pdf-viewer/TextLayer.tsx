import { useRef, useEffect, useCallback, useState, memo } from 'react'
import type { PDFPageProxy } from 'pdfjs-dist'

type PageViewport = ReturnType<PDFPageProxy['getViewport']>
import {
  renderTextLayer,
  textLayerStyles,
  findTextSpansBetweenPoints,
  getQuadPointsFromSpans,
  getTextFromSpans,
} from '@/lib/pdf/text-layer'
import { domRectsToQuadPoints } from '@/lib/geometry'
import { useEditorStore } from '@/stores/editor-store'
import { useAnnotations } from '@/hooks/useAnnotations'

interface TextLayerProps {
  page: PDFPageProxy
  viewport: PageViewport
  pageIndex: number
}

interface DragState {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

export const TextLayer = memo(function TextLayer({
  page,
  viewport,
  pageIndex,
}: TextLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)

  const activeTool = useEditorStore((s) => s.activeTool)
  const toolStyle = useEditorStore((s) => s.toolStyle)
  const { addHighlight, addUnderline, addStrikethrough } = useAnnotations()

  // Drag state for snap-to-text highlighting
  const [isDragging, setIsDragging] = useState(false)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [previewSpans, setPreviewSpans] = useState<HTMLElement[]>([])

  // Inject text layer styles
  useEffect(() => {
    const styleId = 'pdf-text-layer-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = textLayerStyles
      document.head.appendChild(style)
    }
  }, [])

  // Render text layer
  useEffect(() => {
    if (!containerRef.current) return

    let cancelled = false

    // Cancel previous render
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel()
    }

    page.getTextContent().then((textContent) => {
      if (cancelled || !containerRef.current) return

      const task = renderTextLayer({
        textContent,
        container: containerRef.current,
        viewport,
      })

      renderTaskRef.current = task
    })

    return () => {
      cancelled = true
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
      }
    }
  }, [page, viewport])

  // Get mouse position relative to container
  const getMousePosition = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }, [])

  // Handle mouse down for snap-to-text highlighting
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!['highlight', 'underline', 'strikethrough'].includes(activeTool)) {
        return
      }
      if (e.button !== 0) return // Only left click

      const pos = getMousePosition(e)
      setIsDragging(true)
      setDragState({
        startX: pos.x,
        startY: pos.y,
        currentX: pos.x,
        currentY: pos.y,
      })
      setPreviewSpans([])

      // Prevent text selection while dragging
      e.preventDefault()
    },
    [activeTool, getMousePosition]
  )

  // Handle mouse move for snap-to-text preview
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !dragState || !containerRef.current) return

      const pos = getMousePosition(e)
      setDragState((prev) =>
        prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null
      )

      // Find text spans between start and current position
      const spans = findTextSpansBetweenPoints(
        containerRef.current,
        dragState.startX,
        dragState.startY,
        pos.x,
        pos.y
      )
      setPreviewSpans(spans)
    },
    [isDragging, dragState, getMousePosition]
  )

  // Handle mouse up to create annotation from snapped selection
  const handleMouseUp = useCallback(() => {
    // First, check for snap-to-text drag selection
    if (isDragging && previewSpans.length > 0 && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const quadPoints = getQuadPointsFromSpans(previewSpans, containerRect)
      const text = getTextFromSpans(previewSpans)

      if (quadPoints.length > 0) {
        switch (activeTool) {
          case 'highlight':
            addHighlight(pageIndex, quadPoints, viewport, text)
            break
          case 'underline':
            addUnderline(pageIndex, quadPoints, viewport, text)
            break
          case 'strikethrough':
            addStrikethrough(pageIndex, quadPoints, viewport, text)
            break
        }
      }

      setIsDragging(false)
      setDragState(null)
      setPreviewSpans([])
      return
    }

    // Fallback to native text selection for manual selection
    if (!['highlight', 'underline', 'strikethrough'].includes(activeTool)) {
      setIsDragging(false)
      setDragState(null)
      setPreviewSpans([])
      return
    }

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !containerRef.current) {
      setIsDragging(false)
      setDragState(null)
      setPreviewSpans([])
      return
    }

    const text = selection.toString().trim()
    if (!text) {
      setIsDragging(false)
      setDragState(null)
      setPreviewSpans([])
      return
    }

    const range = selection.getRangeAt(0)

    // Check if selection is within this text layer
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      setIsDragging(false)
      setDragState(null)
      setPreviewSpans([])
      return
    }

    // Get client rects and convert to quadpoints
    const clientRects = Array.from(range.getClientRects())
    if (clientRects.length === 0) {
      setIsDragging(false)
      setDragState(null)
      setPreviewSpans([])
      return
    }

    const containerRect = containerRef.current.getBoundingClientRect()
    const quadPoints = domRectsToQuadPoints(clientRects, containerRect)

    // Create annotation based on tool
    switch (activeTool) {
      case 'highlight':
        addHighlight(pageIndex, quadPoints, viewport, text)
        break
      case 'underline':
        addUnderline(pageIndex, quadPoints, viewport, text)
        break
      case 'strikethrough':
        addStrikethrough(pageIndex, quadPoints, viewport, text)
        break
    }

    // Clear selection
    selection.removeAllRanges()
    setIsDragging(false)
    setDragState(null)
    setPreviewSpans([])
  }, [
    isDragging,
    previewSpans,
    activeTool,
    pageIndex,
    viewport,
    addHighlight,
    addUnderline,
    addStrikethrough,
  ])

  // Render preview highlight for snap-to-text
  const renderPreview = useCallback(() => {
    if (!isDragging || previewSpans.length === 0 || !containerRef.current) {
      return null
    }

    const containerRect = containerRef.current.getBoundingClientRect()
    const color = toolStyle.color || '#FFEB3B'

    return (
      <svg
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10 }}
      >
        {previewSpans.map((span, index) => {
          const rect = span.getBoundingClientRect()
          const x = rect.left - containerRect.left
          const y = rect.top - containerRect.top
          const width = rect.width
          const height = rect.height

          return (
            <rect
              key={index}
              x={x}
              y={y}
              width={width}
              height={height}
              fill={color}
              fillOpacity={0.3}
              stroke={color}
              strokeWidth={1}
              strokeOpacity={0.5}
              rx={2}
            />
          )
        })}
      </svg>
    )
  }, [isDragging, previewSpans, toolStyle.color])

  // Determine if text selection should be enabled
  const isTextTool = ['highlight', 'underline', 'strikethrough'].includes(activeTool)

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 w-full h-full"
      style={{
        pointerEvents: isTextTool ? 'auto' : 'none',
        userSelect: isTextTool ? 'text' : 'none',
        cursor: isTextTool ? 'text' : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Snap-to-text preview overlay */}
      {renderPreview()}
    </div>
  )
})
