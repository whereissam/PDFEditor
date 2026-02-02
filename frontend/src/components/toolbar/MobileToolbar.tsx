import { memo, useCallback, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useEditorStore, type Tool } from '@/stores/editor-store'
import { useHistory } from '@/hooks/useHistory'
import { useOCRContext } from '@/contexts/OCRContext'
import { Button } from '@/components/ui/button'
import {
  PanelLeft,
  ChevronLeft,
  ChevronRight,
  Pencil,
  MoreHorizontal,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Download,
  Sun,
  Moon,
  Search,
  ScanText,
  Loader2,
  X,
  MousePointer2,
  Highlighter,
  Underline,
  Strikethrough,
  StickyNote,
  Square,
  Circle,
  ArrowRight,
  Minus,
  Type,
  RotateCw,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileToolbarProps {
  onExport?: () => void
  pdfDocument?: PDFDocumentProxy | null
}

const tools: {
  id: Tool
  icon: React.ComponentType<{ className?: string }>
  label: string
}[] = [
  { id: 'select', icon: MousePointer2, label: 'Select' },
  { id: 'highlight', icon: Highlighter, label: 'Highlight' },
  { id: 'underline', icon: Underline, label: 'Underline' },
  { id: 'strikethrough', icon: Strikethrough, label: 'Strikethrough' },
  { id: 'note', icon: StickyNote, label: 'Note' },
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { id: 'line', icon: Minus, label: 'Line' },
  { id: 'ink', icon: Pencil, label: 'Pen' },
  { id: 'text', icon: Type, label: 'Text' },
]

export const MobileToolbar = memo(function MobileToolbar({
  onExport,
  pdfDocument,
}: MobileToolbarProps) {
  const [activePanel, setActivePanel] = useState<'none' | 'tools' | 'more'>('none')

  const scale = useEditorStore((s) => s.scale)
  const currentPage = useEditorStore((s) => s.currentPage)
  const document = useEditorStore((s) => s.document)
  const activeTool = useEditorStore((s) => s.activeTool)
  const pdfDarkMode = useEditorStore((s) => s.pdfDarkMode)

  const zoomIn = useEditorStore((s) => s.zoomIn)
  const zoomOut = useEditorStore((s) => s.zoomOut)
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage)
  const toggleThumbnailSidebar = useEditorStore((s) => s.toggleThumbnailSidebar)
  const setActiveTool = useEditorStore((s) => s.setActiveTool)
  const setSearchOpen = useEditorStore((s) => s.setSearchOpen)
  const togglePdfDarkMode = useEditorStore((s) => s.togglePdfDarkMode)
  const rotatePage = useEditorStore((s) => s.rotatePage)
  const deletePage = useEditorStore((s) => s.deletePage)

  const { canUndo, canRedo, undo, redo } = useHistory()

  // OCR functionality
  const { isProcessing: isOCRProcessing, progress: ocrProgress, runOCROnAllPages } = useOCRContext()

  const handleRunOCR = useCallback(async () => {
    if (!pdfDocument) return
    const allPages = Array.from({ length: pdfDocument.numPages }, (_, i) => i + 1)
    await runOCROnAllPages(pdfDocument, allPages, 2)
  }, [pdfDocument, runOCROnAllPages])

  const totalPages = document?.pageOrder.length || 0
  const scalePercent = Math.round(scale * 100)

  const handleToolSelect = (tool: Tool) => {
    setActiveTool(tool)
    setActivePanel('none')
  }

  const togglePanel = (panel: 'tools' | 'more') => {
    setActivePanel((prev) => (prev === panel ? 'none' : panel))
  }

  const handleRotatePage = () => {
    if (document && currentPage > 0) {
      const pageIndex = document.pageOrder[currentPage - 1]
      rotatePage(pageIndex, 90)
    }
  }

  const handleDeletePage = () => {
    if (document && currentPage > 0 && document.pageOrder.length > 1) {
      const pageIndex = document.pageOrder[currentPage - 1]
      deletePage(pageIndex)
    }
  }

  return (
    <>
      {/* Slide-up panels */}
      {activePanel !== 'none' && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setActivePanel('none')}
        />
      )}

      {/* Tools Panel */}
      <div
        className={cn(
          'fixed left-0 right-0 bottom-[72px] z-50 bg-background border-t border-border',
          'transform transition-transform duration-200 ease-out',
          'safe-area-inset-bottom',
          activePanel === 'tools' ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Tools</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActivePanel('none')}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {tools.map((tool) => {
              const Icon = tool.icon
              const isActive = activeTool === tool.id
              return (
                <Button
                  key={tool.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className="h-14 flex-col gap-1"
                  onClick={() => handleToolSelect(tool.id)}
                >
                  <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                  <span className="text-xs">{tool.label}</span>
                </Button>
              )
            })}
          </div>
        </div>
      </div>

      {/* More Panel */}
      <div
        className={cn(
          'fixed left-0 right-0 bottom-[72px] z-50 bg-background border-t border-border',
          'transform transition-transform duration-200 ease-out',
          'safe-area-inset-bottom',
          activePanel === 'more' ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">More Actions</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActivePanel('none')}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center justify-center gap-2 mb-4 p-2 bg-muted rounded-lg">
            <Button variant="ghost" size="icon" onClick={zoomOut} className="h-11 w-11">
              <ZoomOut className="h-5 w-5" />
            </Button>
            <span className="text-sm font-medium min-w-[60px] text-center">{scalePercent}%</span>
            <Button variant="ghost" size="icon" onClick={zoomIn} className="h-11 w-11">
              <ZoomIn className="h-5 w-5" />
            </Button>
          </div>

          {/* Action grid */}
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="ghost"
              className="h-14 flex-col gap-1"
              onClick={undo}
              disabled={!canUndo}
            >
              <Undo2 className="h-5 w-5" />
              <span className="text-xs">Undo</span>
            </Button>
            <Button
              variant="ghost"
              className="h-14 flex-col gap-1"
              onClick={redo}
              disabled={!canRedo}
            >
              <Redo2 className="h-5 w-5" />
              <span className="text-xs">Redo</span>
            </Button>
            <Button
              variant={pdfDarkMode ? 'secondary' : 'ghost'}
              className="h-14 flex-col gap-1"
              onClick={togglePdfDarkMode}
            >
              {pdfDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              <span className="text-xs">{pdfDarkMode ? 'Light' : 'Dark'}</span>
            </Button>
            <Button
              variant="ghost"
              className="h-14 flex-col gap-1"
              onClick={() => {
                setSearchOpen(true)
                setActivePanel('none')
              }}
            >
              <Search className="h-5 w-5" />
              <span className="text-xs">Search</span>
            </Button>
            <Button
              variant="ghost"
              className="h-14 flex-col gap-1"
              onClick={handleRotatePage}
            >
              <RotateCw className="h-5 w-5" />
              <span className="text-xs">Rotate</span>
            </Button>
            <Button
              variant="ghost"
              className="h-14 flex-col gap-1"
              onClick={handleDeletePage}
              disabled={totalPages <= 1}
            >
              <Trash2 className="h-5 w-5" />
              <span className="text-xs">Delete</span>
            </Button>
            {pdfDocument && (
              <Button
                variant={isOCRProcessing ? 'secondary' : 'ghost'}
                className="h-14 flex-col gap-1"
                onClick={handleRunOCR}
                disabled={isOCRProcessing}
              >
                {isOCRProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ScanText className="h-5 w-5" />
                )}
                <span className="text-xs">{isOCRProcessing ? `${ocrProgress}%` : 'OCR'}</span>
              </Button>
            )}
            {onExport && (
              <Button
                variant="ghost"
                className="h-14 flex-col gap-1"
                onClick={() => {
                  onExport()
                  setActivePanel('none')
                }}
              >
                <Download className="h-5 w-5" />
                <span className="text-xs">Export</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-inset-bottom">
        <div className="flex items-center justify-around h-[72px] px-2">
          {/* Pages */}
          <Button
            variant="ghost"
            className="h-14 flex-col gap-0.5 flex-1"
            onClick={toggleThumbnailSidebar}
          >
            <PanelLeft className="h-5 w-5" />
            <span className="text-xs">Pages</span>
          </Button>

          {/* Page Navigation */}
          <div className="flex items-center flex-1 justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="h-11 w-11"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-sm font-medium min-w-[50px] text-center">
              {currentPage}/{totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="h-11 w-11"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Tools */}
          <Button
            variant={activePanel === 'tools' ? 'secondary' : 'ghost'}
            className="h-14 flex-col gap-0.5 flex-1"
            onClick={() => togglePanel('tools')}
          >
            <Pencil className="h-5 w-5" />
            <span className="text-xs">Tools</span>
          </Button>

          {/* More */}
          <Button
            variant={activePanel === 'more' ? 'secondary' : 'ghost'}
            className="h-14 flex-col gap-0.5 flex-1"
            onClick={() => togglePanel('more')}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-xs">More</span>
          </Button>
        </div>
      </div>
    </>
  )
})
