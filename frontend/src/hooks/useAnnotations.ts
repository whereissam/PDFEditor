import { useCallback } from 'react'
import { useEditorStore, type Annotation, type AnnotationStyle } from '@/stores/editor-store'
import type { PDFPageProxy } from 'pdfjs-dist'
import {
  rectViewportToPdf,
  quadPointsViewportToPdf,
  viewportToPdf,
} from '@/lib/geometry'

type PageViewport = ReturnType<PDFPageProxy['getViewport']>

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export interface UseAnnotationsReturn {
  annotations: Map<string, Annotation>
  selectedIds: Set<string>
  getAnnotationsForPage: (pageIndex: number) => Annotation[]
  addHighlight: (
    pageIndex: number,
    quadPoints: number[][],
    viewport: PageViewport,
    selectedText?: string
  ) => string
  addUnderline: (
    pageIndex: number,
    quadPoints: number[][],
    viewport: PageViewport,
    selectedText?: string
  ) => string
  addStrikethrough: (
    pageIndex: number,
    quadPoints: number[][],
    viewport: PageViewport,
    selectedText?: string
  ) => string
  addNote: (pageIndex: number, x: number, y: number, viewport: PageViewport) => string
  addRectangle: (
    pageIndex: number,
    x: number,
    y: number,
    width: number,
    height: number,
    viewport: PageViewport
  ) => string
  addEllipse: (
    pageIndex: number,
    x: number,
    y: number,
    width: number,
    height: number,
    viewport: PageViewport
  ) => string
  addArrow: (
    pageIndex: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    viewport: PageViewport
  ) => string
  addLine: (
    pageIndex: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    viewport: PageViewport
  ) => string
  addInk: (
    pageIndex: number,
    points: { x: number; y: number }[],
    viewport: PageViewport
  ) => string
  addText: (
    pageIndex: number,
    x: number,
    y: number,
    width: number,
    height: number,
    content: string,
    viewport: PageViewport
  ) => string
  updateAnnotation: (id: string, changes: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => void
  selectAnnotation: (id: string, addToSelection?: boolean) => void
  deselectAnnotation: (id: string) => void
  clearSelection: () => void
  toolStyle: AnnotationStyle
  setToolStyle: (style: Partial<AnnotationStyle>) => void
}

export function useAnnotations(): UseAnnotationsReturn {
  const annotations = useEditorStore((s) => s.annotations)
  const selectedIds = useEditorStore((s) => s.selectedAnnotationIds)
  const toolStyle = useEditorStore((s) => s.toolStyle)
  const getAnnotationsForPageStore = useEditorStore((s) => s.getAnnotationsForPage)
  const addAnnotationStore = useEditorStore((s) => s.addAnnotation)
  const updateAnnotationStore = useEditorStore((s) => s.updateAnnotation)
  const deleteAnnotationStore = useEditorStore((s) => s.deleteAnnotation)
  const selectAnnotationStore = useEditorStore((s) => s.selectAnnotation)
  const deselectAnnotationStore = useEditorStore((s) => s.deselectAnnotation)
  const clearSelectionStore = useEditorStore((s) => s.clearSelection)
  const setToolStyleStore = useEditorStore((s) => s.setToolStyle)

  const getAnnotationsForPage = useCallback(
    (pageIndex: number) => getAnnotationsForPageStore(pageIndex),
    [getAnnotationsForPageStore]
  )

  const addHighlight = useCallback(
    (
      pageIndex: number,
      quadPoints: number[][],
      viewport: PageViewport,
      selectedText?: string
    ): string => {
      const id = generateId()
      const pdfQuadPoints = quadPointsViewportToPdf(quadPoints, viewport)
      const now = Date.now()

      addAnnotationStore({
        id,
        type: 'highlight',
        pageIndex,
        quadPoints: { points: pdfQuadPoints },
        selectedText,
        style: { ...toolStyle, color: toolStyle.color || '#FFEB3B', opacity: 0.5 },
        createdAt: now,
        updatedAt: now,
      })

      return id
    },
    [addAnnotationStore, toolStyle]
  )

  const addUnderline = useCallback(
    (
      pageIndex: number,
      quadPoints: number[][],
      viewport: PageViewport,
      selectedText?: string
    ): string => {
      const id = generateId()
      const pdfQuadPoints = quadPointsViewportToPdf(quadPoints, viewport)
      const now = Date.now()

      addAnnotationStore({
        id,
        type: 'underline',
        pageIndex,
        quadPoints: { points: pdfQuadPoints },
        selectedText,
        style: { ...toolStyle, color: toolStyle.color || '#F44336', opacity: 1 },
        createdAt: now,
        updatedAt: now,
      })

      return id
    },
    [addAnnotationStore, toolStyle]
  )

  const addStrikethrough = useCallback(
    (
      pageIndex: number,
      quadPoints: number[][],
      viewport: PageViewport,
      selectedText?: string
    ): string => {
      const id = generateId()
      const pdfQuadPoints = quadPointsViewportToPdf(quadPoints, viewport)
      const now = Date.now()

      addAnnotationStore({
        id,
        type: 'strikethrough',
        pageIndex,
        quadPoints: { points: pdfQuadPoints },
        selectedText,
        style: { ...toolStyle, color: toolStyle.color || '#F44336', opacity: 1 },
        createdAt: now,
        updatedAt: now,
      })

      return id
    },
    [addAnnotationStore, toolStyle]
  )

  const addNote = useCallback(
    (pageIndex: number, x: number, y: number, viewport: PageViewport): string => {
      const id = generateId()
      const pdfPoint = viewportToPdf({ x, y }, viewport)
      const now = Date.now()

      addAnnotationStore({
        id,
        type: 'note',
        pageIndex,
        position: pdfPoint,
        content: '',
        isOpen: true,
        style: { ...toolStyle, color: toolStyle.color || '#FFC107', opacity: 1 },
        createdAt: now,
        updatedAt: now,
      })

      return id
    },
    [addAnnotationStore, toolStyle]
  )

  const addRectangle = useCallback(
    (
      pageIndex: number,
      x: number,
      y: number,
      width: number,
      height: number,
      viewport: PageViewport
    ): string => {
      const id = generateId()
      const pdfRect = rectViewportToPdf({ x, y, width, height }, viewport)
      const now = Date.now()

      addAnnotationStore({
        id,
        type: 'rectangle',
        pageIndex,
        rect: pdfRect,
        style: { ...toolStyle, color: toolStyle.color || '#2196F3', opacity: 0.3, strokeWidth: 2 },
        createdAt: now,
        updatedAt: now,
      })

      return id
    },
    [addAnnotationStore, toolStyle]
  )

  const addEllipse = useCallback(
    (
      pageIndex: number,
      x: number,
      y: number,
      width: number,
      height: number,
      viewport: PageViewport
    ): string => {
      const id = generateId()
      const pdfRect = rectViewportToPdf({ x, y, width, height }, viewport)
      const now = Date.now()

      addAnnotationStore({
        id,
        type: 'ellipse',
        pageIndex,
        rect: pdfRect,
        style: { ...toolStyle, color: toolStyle.color || '#2196F3', opacity: 0.3, strokeWidth: 2 },
        createdAt: now,
        updatedAt: now,
      })

      return id
    },
    [addAnnotationStore, toolStyle]
  )

  const addArrow = useCallback(
    (
      pageIndex: number,
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      viewport: PageViewport
    ): string => {
      const id = generateId()
      const pdfStart = viewportToPdf({ x: startX, y: startY }, viewport)
      const pdfEnd = viewportToPdf({ x: endX, y: endY }, viewport)
      const now = Date.now()

      addAnnotationStore({
        id,
        type: 'arrow',
        pageIndex,
        start: pdfStart,
        end: pdfEnd,
        style: { ...toolStyle, color: toolStyle.color || '#F44336', opacity: 1, strokeWidth: 2 },
        createdAt: now,
        updatedAt: now,
      })

      return id
    },
    [addAnnotationStore, toolStyle]
  )

  const addLine = useCallback(
    (
      pageIndex: number,
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      viewport: PageViewport
    ): string => {
      const id = generateId()
      const pdfStart = viewportToPdf({ x: startX, y: startY }, viewport)
      const pdfEnd = viewportToPdf({ x: endX, y: endY }, viewport)
      const now = Date.now()

      addAnnotationStore({
        id,
        type: 'line',
        pageIndex,
        start: pdfStart,
        end: pdfEnd,
        style: { ...toolStyle, color: toolStyle.color || '#F44336', opacity: 1, strokeWidth: 2 },
        createdAt: now,
        updatedAt: now,
      })

      return id
    },
    [addAnnotationStore, toolStyle]
  )

  const addInk = useCallback(
    (
      pageIndex: number,
      points: { x: number; y: number }[],
      viewport: PageViewport
    ): string => {
      const id = generateId()
      const pdfPoints = points.map((p) => viewportToPdf(p, viewport))
      const now = Date.now()

      addAnnotationStore({
        id,
        type: 'ink',
        pageIndex,
        paths: [{ points: pdfPoints }],
        style: { ...toolStyle, color: toolStyle.color || '#000000', opacity: 1, strokeWidth: 2 },
        createdAt: now,
        updatedAt: now,
      })

      return id
    },
    [addAnnotationStore, toolStyle]
  )

  const addText = useCallback(
    (
      pageIndex: number,
      x: number,
      y: number,
      width: number,
      height: number,
      content: string,
      viewport: PageViewport
    ): string => {
      const id = generateId()
      const pdfRect = rectViewportToPdf({ x, y, width, height }, viewport)
      const now = Date.now()

      addAnnotationStore({
        id,
        type: 'text',
        pageIndex,
        rect: pdfRect,
        content,
        style: {
          ...toolStyle,
          color: toolStyle.color || '#000000',
          opacity: 1,
          fontSize: toolStyle.fontSize || 14,
          fontFamily: toolStyle.fontFamily || 'sans-serif',
        },
        createdAt: now,
        updatedAt: now,
      })

      return id
    },
    [addAnnotationStore, toolStyle]
  )

  return {
    annotations,
    selectedIds,
    getAnnotationsForPage,
    addHighlight,
    addUnderline,
    addStrikethrough,
    addNote,
    addRectangle,
    addEllipse,
    addArrow,
    addLine,
    addInk,
    addText,
    updateAnnotation: updateAnnotationStore,
    deleteAnnotation: deleteAnnotationStore,
    selectAnnotation: selectAnnotationStore,
    deselectAnnotation: deselectAnnotationStore,
    clearSelection: clearSelectionStore,
    toolStyle,
    setToolStyle: setToolStyleStore,
  }
}

