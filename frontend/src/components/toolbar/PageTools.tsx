import { memo } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { Button } from '@/components/ui/button'
import { RotateCw, Trash2 } from 'lucide-react'

export const PageTools = memo(function PageTools() {
  const currentPage = useEditorStore((s) => s.currentPage)
  const document = useEditorStore((s) => s.document)
  const rotatePage = useEditorStore((s) => s.rotatePage)
  const deletePage = useEditorStore((s) => s.deletePage)

  // Get the original page index from the current display page
  const pageIndex = document?.pageOrder[currentPage - 1] ?? -1
  const canDeletePage = document && document.pageOrder.length > 1

  const handleRotate = () => {
    if (pageIndex >= 0) {
      rotatePage(pageIndex, 90)
    }
  }

  const handleDelete = () => {
    if (pageIndex >= 0 && canDeletePage) {
      const confirmed = window.confirm(
        `Are you sure you want to delete page ${currentPage}?`
      )
      if (confirmed) {
        deletePage(pageIndex)
      }
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleRotate}
        disabled={pageIndex < 0}
        title="Rotate page 90 degrees"
        className="h-8 w-8"
      >
        <RotateCw className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        disabled={!canDeletePage}
        title="Delete page"
        className="h-8 w-8 text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
})
