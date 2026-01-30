import { useCallback, useEffect } from 'react'
import { useEditorStore } from '@/stores/editor-store'

export interface UseHistoryReturn {
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  undoStackSize: number
  redoStackSize: number
}

export function useHistory(): UseHistoryReturn {
  const undoStack = useEditorStore((s) => s.undoStack)
  const redoStack = useEditorStore((s) => s.redoStack)
  const undoAction = useEditorStore((s) => s.undo)
  const redoAction = useEditorStore((s) => s.redo)
  const canUndoCheck = useEditorStore((s) => s.canUndo)
  const canRedoCheck = useEditorStore((s) => s.canRedo)

  const undo = useCallback(() => {
    if (canUndoCheck()) {
      undoAction()
    }
  }, [undoAction, canUndoCheck])

  const redo = useCallback(() => {
    if (canRedoCheck()) {
      redoAction()
    }
  }, [redoAction, canRedoCheck])

  return {
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undo,
    redo,
    undoStackSize: undoStack.length,
    redoStackSize: redoStack.length,
  }
}

// Hook for auto-saving history
export function useAutoSave(documentId: string | null, debounceMs: number = 2000) {
  const annotations = useEditorStore((s) => s.annotations)
  const document = useEditorStore((s) => s.document)

  useEffect(() => {
    if (!documentId || !document) return

    const timeoutId = setTimeout(async () => {
      try {
        const { saveAnnotations, updateDocumentTimestamp } = await import('@/lib/storage')
        const annotationArray = Array.from(annotations.values())
        await saveAnnotations(documentId, annotationArray)
        await updateDocumentTimestamp(documentId)
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }, debounceMs)

    return () => clearTimeout(timeoutId)
  }, [annotations, documentId, document, debounceMs])
}
