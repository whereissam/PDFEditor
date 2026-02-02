import { memo, useCallback } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useEditorStore } from '@/stores/editor-store'
import { useHistory } from '@/hooks/useHistory'
import { useOCRContext } from '@/contexts/OCRContext'
import { AnnotationTools } from './AnnotationTools'
import { PageTools } from './PageTools'
import { SearchBar } from './SearchBar'
import { Button } from '@/components/ui/button'
import {
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  PanelLeftClose,
  PanelLeft,
  Search,
  Download,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  ScanText,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToolbarProps {
  onExport?: () => void
  pdfDocument?: PDFDocumentProxy | null
  className?: string
}

export const Toolbar = memo(function Toolbar({ onExport, pdfDocument, className }: ToolbarProps) {
  const scale = useEditorStore((s) => s.scale)
  const scaleMode = useEditorStore((s) => s.scaleMode)
  const currentPage = useEditorStore((s) => s.currentPage)
  const document = useEditorStore((s) => s.document)
  const isThumbnailSidebarOpen = useEditorStore((s) => s.isThumbnailSidebarOpen)
  const isSearchOpen = useEditorStore((s) => s.isSearchOpen)
  const pdfDarkMode = useEditorStore((s) => s.pdfDarkMode)

  const zoomIn = useEditorStore((s) => s.zoomIn)
  const zoomOut = useEditorStore((s) => s.zoomOut)
  const fitWidth = useEditorStore((s) => s.fitWidth)
  const fitPage = useEditorStore((s) => s.fitPage)
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage)
  const toggleThumbnailSidebar = useEditorStore((s) => s.toggleThumbnailSidebar)
  const setSearchOpen = useEditorStore((s) => s.setSearchOpen)
  const togglePdfDarkMode = useEditorStore((s) => s.togglePdfDarkMode)

  const { canUndo, canRedo, undo, redo } = useHistory()

  // OCR functionality
  const { isProcessing: isOCRProcessing, progress: ocrProgress, runOCROnAllPages } = useOCRContext()

  const handleRunOCR = useCallback(async () => {
    if (!pdfDocument) return

    // For simplicity, run OCR on all pages
    // In production, you'd want to detect pages without text first
    const allPages = Array.from({ length: pdfDocument.numPages }, (_, i) => i + 1)
    await runOCROnAllPages(pdfDocument, allPages, 2)
  }, [pdfDocument, runOCROnAllPages])

  const totalPages = document?.pageOrder.length || 0
  const scalePercent = Math.round(scale * 100)

  return (
    <div
      className={cn(
        'flex items-center justify-between px-2 py-1 bg-background border-b border-border',
        className
      )}
    >
      {/* Left section - Navigation & View */}
      <div className="flex items-center gap-1">
        {/* Sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleThumbnailSidebar}
          title={isThumbnailSidebarOpen ? 'Hide thumbnails' : 'Show thumbnails'}
        >
          {isThumbnailSidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Page navigation */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1 text-sm min-w-[80px] justify-center">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => setCurrentPage(parseInt(e.target.value) || 1)}
            className="w-12 px-1 py-0.5 text-center border border-border rounded bg-background"
          />
          <span className="text-muted-foreground">/ {totalPages}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Zoom controls */}
        <Button
          variant="ghost"
          size="icon"
          onClick={zoomOut}
          title="Zoom out (Cmd+-)"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <div className="text-sm min-w-[50px] text-center">{scalePercent}%</div>

        <Button
          variant="ghost"
          size="icon"
          onClick={zoomIn}
          title="Zoom in (Cmd+=)"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <Button
          variant={scaleMode === 'fit-width' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={fitWidth}
          title="Fit width"
          className="text-xs px-2"
        >
          <Maximize2 className="h-3 w-3 mr-1" />
          Width
        </Button>

        <Button
          variant={scaleMode === 'fit-page' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={fitPage}
          title="Fit page"
          className="text-xs px-2"
        >
          <Minimize2 className="h-3 w-3 mr-1" />
          Page
        </Button>
      </div>

      {/* Center section - Annotation tools */}
      <div className="flex items-center gap-1">
        <AnnotationTools />

        <div className="w-px h-6 bg-border mx-1" />

        <PageTools />
      </div>

      {/* Right section - Actions */}
      <div className="flex items-center gap-1">
        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="icon"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Cmd+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Dark mode toggle for PDF */}
        <Button
          variant={pdfDarkMode ? 'secondary' : 'ghost'}
          size="icon"
          onClick={togglePdfDarkMode}
          title={pdfDarkMode ? 'Light mode' : 'Dark mode (for reading)'}
        >
          {pdfDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Search */}
        <Button
          variant={isSearchOpen ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => setSearchOpen(!isSearchOpen)}
          title="Search (Cmd+F)"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* OCR */}
        {pdfDocument && (
          <Button
            variant={isOCRProcessing ? 'secondary' : 'ghost'}
            size="icon"
            onClick={handleRunOCR}
            disabled={isOCRProcessing}
            title={isOCRProcessing ? `OCR in progress (${ocrProgress}%)` : 'Run OCR on scanned pages'}
          >
            {isOCRProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ScanText className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Export */}
        {onExport && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onExport}
            title="Download PDF"
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search bar overlay */}
      {isSearchOpen && <SearchBar />}
    </div>
  )
})
