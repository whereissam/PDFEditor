import { useRef, useEffect, useCallback, memo } from 'react'
import type { PDFPageProxy } from 'pdfjs-dist'

type PageViewport = ReturnType<PDFPageProxy['getViewport']>
import { renderTextLayer, textLayerStyles } from '@/lib/pdf/text-layer'
import { domRectsToQuadPoints } from '@/lib/geometry'
import { useEditorStore } from '@/stores/editor-store'
import { useAnnotations } from '@/hooks/useAnnotations'

interface TextLayerProps {
  page: PDFPageProxy
  viewport: PageViewport
  pageIndex: number
}

export const TextLayer = memo(function TextLayer({
  page,
  viewport,
  pageIndex,
}: TextLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)

  const activeTool = useEditorStore((s) => s.activeTool)
  const { addHighlight, addUnderline, addStrikethrough } = useAnnotations()

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

  // Handle text selection for highlighting
  const handleMouseUp = useCallback(() => {
    if (!['highlight', 'underline', 'strikethrough'].includes(activeTool)) {
      return
    }

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !containerRef.current) {
      return
    }

    const text = selection.toString().trim()
    if (!text) return

    const range = selection.getRangeAt(0)

    // Check if selection is within this text layer
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      return
    }

    // Get client rects and convert to quadpoints
    const clientRects = Array.from(range.getClientRects())
    if (clientRects.length === 0) return

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
  }, [activeTool, pageIndex, viewport, addHighlight, addUnderline, addStrikethrough])

  // Determine if text selection should be enabled
  const isTextTool = ['highlight', 'underline', 'strikethrough'].includes(activeTool)

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 w-full h-full"
      style={{
        pointerEvents: isTextTool ? 'auto' : 'none',
        userSelect: isTextTool ? 'text' : 'none',
      }}
      onMouseUp={handleMouseUp}
    />
  )
})
