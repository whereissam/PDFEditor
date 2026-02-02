import { useRef, useEffect, useState, useCallback, memo } from 'react'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'

type PageViewport = ReturnType<PDFPageProxy['getViewport']>
import { renderPage } from '@/lib/pdf/renderer'
import { TextLayer } from './TextLayer'
import { AnnotationLayer } from './AnnotationLayer'
import { useEditorStore } from '@/stores/editor-store'
import { cn } from '@/lib/utils'

interface PageRendererProps {
  pdfDocument: PDFDocumentProxy
  pageNumber: number // 1-based page number in the PDF
  displayPageNumber: number // The displayed page number after reordering
  scale: number
  rotation?: number
  registerRef?: (element: HTMLElement | null) => void
}

export const PageRenderer = memo(function PageRenderer({
  pdfDocument,
  pageNumber,
  displayPageNumber,
  scale,
  rotation = 0,
  registerRef,
}: PageRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [page, setPage] = useState<PDFPageProxy | null>(null)
  const [viewport, setViewport] = useState<PageViewport | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNearViewport, setIsNearViewport] = useState(false)
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)

  const activeTool = useEditorStore((s) => s.activeTool)
  const pdfDarkMode = useEditorStore((s) => s.pdfDarkMode)
  const pageIndex = pageNumber - 1 // Convert to 0-based index

  // Intersection Observer for lazy rendering
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Create observer with rootMargin to pre-load nearby pages
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Page is near viewport (within buffer zone) - render layers
          setIsNearViewport(entry.isIntersecting || entry.intersectionRatio > 0)
        })
      },
      {
        // Use pixel-based rootMargin for consistent pre-loading behavior.
        // Note: percentage-based rootMargin is resolved against root WIDTH (not height),
        // making it unreliable for vertical scrolling scenarios.
        // 1500px provides ~2 viewport heights of buffer on typical screens.
        rootMargin: '1500px 0px',
        threshold: [0, 0.1],
      }
    )

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [])

  // Load page
  useEffect(() => {
    let cancelled = false

    pdfDocument.getPage(pageNumber).then((loadedPage) => {
      if (!cancelled) {
        setPage(loadedPage)
        setError(null)
      }
    }).catch((err) => {
      if (!cancelled) {
        setError(err.message || 'Failed to load page')
      }
    })

    return () => {
      cancelled = true
    }
  }, [pdfDocument, pageNumber])

  // Update viewport when page, scale, or rotation changes
  useEffect(() => {
    if (!page) return

    const newViewport = page.getViewport({ scale, rotation })
    setViewport(newViewport)
  }, [page, scale, rotation])

  // Render page to canvas - only when visible or near viewport
  useEffect(() => {
    if (!page || !viewport || !canvasRef.current) return
    // Only render canvas when page is near viewport
    if (!isNearViewport) return

    // Cancel previous render
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel()
    }

    setIsRendering(true)

    const { task, cancel } = renderPage({
      page,
      canvas: canvasRef.current,
      viewport,
      devicePixelRatio: window.devicePixelRatio || 1,
    })

    renderTaskRef.current = { cancel }

    task.promise
      .then(() => {
        setIsRendering(false)
      })
      .catch((err) => {
        if (err.name !== 'RenderingCancelledException') {
          setError(err.message || 'Failed to render page')
        }
        setIsRendering(false)
      })

    return () => {
      cancel()
    }
  }, [page, viewport, isNearViewport])

  // Register ref for scroll tracking
  useEffect(() => {
    if (registerRef) {
      registerRef(containerRef.current)
    }
    return () => {
      if (registerRef) {
        registerRef(null)
      }
    }
  }, [registerRef])

  // Determine cursor based on active tool
  const getCursor = useCallback(() => {
    switch (activeTool) {
      case 'select':
        return 'default'
      case 'pan':
        return 'grab'
      case 'highlight':
      case 'underline':
      case 'strikethrough':
        return 'text'
      case 'note':
        return 'crosshair'
      case 'rectangle':
      case 'ellipse':
      case 'arrow':
      case 'line':
      case 'text':
        return 'crosshair'
      case 'ink':
        return 'crosshair'
      default:
        return 'default'
    }
  }, [activeTool])

  // Should render interactive layers (text, annotations)?
  // Only render when page is visible or very close to viewport
  const shouldRenderLayers = isNearViewport

  if (error) {
    return (
      <div
        ref={containerRef}
        data-page-number={displayPageNumber}
        className="flex items-center justify-center bg-white shadow-lg"
        style={{ width: viewport?.width || 612, height: viewport?.height || 792 }}
      >
        <div className="text-destructive text-sm p-4 text-center">
          <p>Failed to load page {displayPageNumber}</p>
          <p className="text-xs mt-1 text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      data-page-number={displayPageNumber}
      className={cn(
        'relative shadow-lg',
        isRendering && 'animate-pulse',
        pdfDarkMode ? 'bg-neutral-800' : 'bg-white'
      )}
      style={{
        width: viewport?.width || 'auto',
        height: viewport?.height || 'auto',
        cursor: getCursor(),
      }}
    >
      {/* PDF Raster Layer - always render placeholder, actual content when near viewport */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0"
        style={{
          width: viewport?.width,
          height: viewport?.height,
          // Dark mode: invert colors and rotate hue to preserve color integrity
          filter: pdfDarkMode ? 'invert(1) hue-rotate(180deg)' : 'none',
        }}
      />

      {/* Text Layer - lazy rendered */}
      {shouldRenderLayers && page && viewport && (
        <TextLayer page={page} viewport={viewport} pageIndex={pageIndex} />
      )}

      {/* Annotation Layer - lazy rendered */}
      {shouldRenderLayers && viewport && (
        <AnnotationLayer
          pageIndex={pageIndex}
          viewport={viewport}
        />
      )}

      {/* Loading indicator for pages not yet rendered */}
      {!isNearViewport && viewport && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
          <span className="text-sm text-muted-foreground">Page {displayPageNumber}</span>
        </div>
      )}

      {/* Page number indicator */}
      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
        {displayPageNumber}
      </div>
    </div>
  )
})
