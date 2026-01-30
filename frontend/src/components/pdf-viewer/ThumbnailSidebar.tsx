import { useRef, useEffect, useState, useCallback, memo } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { renderThumbnail } from '@/lib/pdf/renderer'
import { useEditorStore } from '@/stores/editor-store'
import { cn } from '@/lib/utils'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ThumbnailSidebarProps {
  pdfDocument: PDFDocumentProxy
  pageIndices: number[]
  currentPage: number
  onPageClick: (pageIndex: number) => void
}

interface ThumbnailProps {
  pdfDocument: PDFDocumentProxy
  pageIndex: number
  pageNumber: number
  isActive: boolean
  onClick: () => void
}

const Thumbnail = memo(function Thumbnail({
  pdfDocument,
  pageIndex,
  pageNumber,
  isActive,
  onClick,
}: ThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pageIndex.toString() })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  useEffect(() => {
    let cancelled = false

    pdfDocument.getPage(pageIndex + 1).then((page) => {
      if (cancelled || !canvasRef.current) return

      renderThumbnail({
        page,
        canvas: canvasRef.current,
        maxWidth: 120,
        maxHeight: 160,
      }).then(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })
    })

    return () => {
      cancelled = true
    }
  }, [pdfDocument, pageIndex])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative flex flex-col items-center p-2 cursor-pointer rounded-lg transition-colors',
        isActive ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-muted',
        isDragging && 'z-50'
      )}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <div className="relative">
        <canvas
          ref={canvasRef}
          className={cn(
            'border border-border shadow-sm',
            isLoading && 'bg-muted animate-pulse'
          )}
          style={{ maxWidth: 120, maxHeight: 160 }}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <span className="mt-1 text-xs text-muted-foreground">{pageNumber}</span>
    </div>
  )
})

export function ThumbnailSidebar({
  pdfDocument,
  pageIndices,
  currentPage,
  onPageClick,
}: ThumbnailSidebarProps) {
  const reorderPages = useEditorStore((s) => s.reorderPages)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = pageIndices.findIndex(
          (idx) => idx.toString() === active.id
        )
        const newIndex = pageIndices.findIndex(
          (idx) => idx.toString() === over.id
        )

        if (oldIndex !== -1 && newIndex !== -1) {
          reorderPages(oldIndex, newIndex)
        }
      }
    },
    [pageIndices, reorderPages]
  )

  return (
    <div className="w-[160px] min-w-[160px] h-full overflow-y-auto border-r border-border bg-background">
      <div className="p-2 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">Pages</h3>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={pageIndices.map((i) => i.toString())}
          strategy={verticalListSortingStrategy}
        >
          <div className="p-2 space-y-2">
            {pageIndices.map((pageIndex, displayIndex) => (
              <Thumbnail
                key={pageIndex}
                pdfDocument={pdfDocument}
                pageIndex={pageIndex}
                pageNumber={displayIndex + 1}
                isActive={currentPage === displayIndex + 1}
                onClick={() => onPageClick(pageIndex)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
