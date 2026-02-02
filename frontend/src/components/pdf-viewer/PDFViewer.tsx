import { useRef, useEffect, useCallback, useState } from 'react'
import { PageRenderer } from './PageRenderer'
import { ThumbnailSidebar } from './ThumbnailSidebar'
import { useViewport, usePageVisibility, useKeyboardNavigation, usePinchZoom } from '@/hooks/useViewport'
import { useEditorStore } from '@/stores/editor-store'
import { useIsMobile } from '@/hooks/useMediaQuery'
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api'
import { cn } from '@/lib/utils'

interface PDFViewerProps {
  pdfDocument: PDFDocumentProxy
  className?: string
}

export function PDFViewer({ pdfDocument, className }: PDFViewerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { containerRef, dimensions, scale, scaleMode, calculateFitWidthScale, calculateFitPageScale } =
    useViewport()

  const document = useEditorStore((s) => s.document)
  const isThumbnailSidebarOpen = useEditorStore((s) => s.isThumbnailSidebarOpen)
  const closeMobileSidebar = useEditorStore((s) => s.closeMobileSidebar)
  const currentPage = useEditorStore((s) => s.currentPage)
  const setScale = useEditorStore((s) => s.setScale)
  const isMobile = useIsMobile()

  const { registerPage } = usePageVisibility(scrollContainerRef)
  useKeyboardNavigation()
  usePinchZoom(scrollContainerRef)

  // Track page dimensions for fit calculations
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(
    null
  )

  // Load first page to get dimensions
  useEffect(() => {
    if (!pdfDocument) return

    pdfDocument.getPage(1).then((page) => {
      const viewport = page.getViewport({ scale: 1 })
      setPageDimensions({ width: viewport.width, height: viewport.height })
    })
  }, [pdfDocument])

  // Handle scale mode changes
  useEffect(() => {
    if (!pageDimensions || dimensions.width === 0) return

    if (scaleMode === 'fit-width') {
      const newScale = calculateFitWidthScale(pageDimensions.width)
      if (Math.abs(newScale - scale) > 0.01) {
        setScale(newScale)
      }
    } else if (scaleMode === 'fit-page') {
      const newScale = calculateFitPageScale(pageDimensions.width, pageDimensions.height)
      if (Math.abs(newScale - scale) > 0.01) {
        setScale(newScale)
      }
    }
  }, [
    scaleMode,
    pageDimensions,
    dimensions,
    scale,
    setScale,
    calculateFitWidthScale,
    calculateFitPageScale,
  ])

  // Get visible pages
  const visiblePageIndices = document?.pageOrder || []

  // Auto-scroll to current page when it changes (for search navigation)
  const prevPageRef = useRef(currentPage)
  useEffect(() => {
    if (currentPage !== prevPageRef.current && scrollContainerRef.current) {
      const element = scrollContainerRef.current.querySelector(
        `[data-page-number="${currentPage}"]`
      )
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      prevPageRef.current = currentPage
    }
  }, [currentPage])

  // Scroll to page when clicking thumbnail
  const handleThumbnailClick = useCallback(
    (pageIndex: number) => {
      const pageNumber = visiblePageIndices.indexOf(pageIndex) + 1
      const element = scrollContainerRef.current?.querySelector(
        `[data-page-number="${pageNumber}"]`
      )
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    },
    [visiblePageIndices]
  )

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={cn('flex h-full w-full overflow-hidden bg-muted relative', className)}
    >
      {/* Mobile Backdrop - shown when sidebar is open on mobile */}
      {isMobile && isThumbnailSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Thumbnail Sidebar */}
      {isThumbnailSidebarOpen && (
        <ThumbnailSidebar
          pdfDocument={pdfDocument}
          pageIndices={visiblePageIndices}
          currentPage={currentPage}
          onPageClick={handleThumbnailClick}
        />
      )}

      {/* Main Viewer */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="flex flex-col items-center py-4 gap-4">
          {visiblePageIndices.map((originalIndex, displayIndex) => {
            const pageNumber = displayIndex + 1
            return (
              <PageRenderer
                key={originalIndex}
                pdfDocument={pdfDocument}
                pageNumber={originalIndex + 1} // PDF.js uses 1-based page numbers
                displayPageNumber={pageNumber}
                scale={scale}
                rotation={document?.pageRotations[originalIndex] || 0}
                registerRef={(el) => registerPage(pageNumber, el)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
