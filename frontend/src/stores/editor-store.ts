import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// Geometry types
export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface QuadPoints {
  points: number[][] // Array of [x1,y1,x2,y2,x3,y3,x4,y4]
}

export interface Path {
  points: Point[]
  closed?: boolean
}

// Annotation types
export type AnnotationType =
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'note'
  | 'rectangle'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'ink'
  | 'text'

export interface AnnotationStyle {
  color: string
  opacity: number
  strokeWidth?: number
  fontSize?: number
  fontFamily?: string
}

export interface BaseAnnotation {
  id: string
  type: AnnotationType
  pageIndex: number
  style: AnnotationStyle
  createdAt: number
  updatedAt: number
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight' | 'underline' | 'strikethrough'
  quadPoints: QuadPoints
  selectedText?: string
}

export interface NoteAnnotation extends BaseAnnotation {
  type: 'note'
  position: Point
  content: string
  isOpen?: boolean
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: 'rectangle' | 'ellipse'
  rect: Rect
}

export interface LineAnnotation extends BaseAnnotation {
  type: 'arrow' | 'line'
  start: Point
  end: Point
}

export interface InkAnnotation extends BaseAnnotation {
  type: 'ink'
  paths: Path[]
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text'
  rect: Rect
  content: string
}

export type Annotation =
  | HighlightAnnotation
  | NoteAnnotation
  | ShapeAnnotation
  | LineAnnotation
  | InkAnnotation
  | TextAnnotation

// Operation types for ops-log
export type OperationType =
  | 'add_annotation'
  | 'update_annotation'
  | 'delete_annotation'
  | 'rotate_page'
  | 'delete_page'
  | 'reorder_pages'

export interface BaseOperation {
  id: string
  timestamp: number
}

export interface AddAnnotationOperation extends BaseOperation {
  type: 'add_annotation'
  annotation: Annotation
}

export interface UpdateAnnotationOperation extends BaseOperation {
  type: 'update_annotation'
  annotationId: string
  changes: Partial<Annotation>
  previousState: Partial<Annotation>
}

export interface DeleteAnnotationOperation extends BaseOperation {
  type: 'delete_annotation'
  annotation: Annotation
}

export interface RotatePageOperation extends BaseOperation {
  type: 'rotate_page'
  pageIndex: number
  rotation: number // degrees to rotate (90, 180, 270)
  previousRotation: number
}

export interface DeletePageOperation extends BaseOperation {
  type: 'delete_page'
  pageIndex: number
  pageData?: unknown // Store page data for undo
}

export interface ReorderPagesOperation extends BaseOperation {
  type: 'reorder_pages'
  fromIndex: number
  toIndex: number
}

export type Operation =
  | AddAnnotationOperation
  | UpdateAnnotationOperation
  | DeleteAnnotationOperation
  | RotatePageOperation
  | DeletePageOperation
  | ReorderPagesOperation

// Tool types
export type Tool =
  | 'select'
  | 'pan'
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'note'
  | 'rectangle'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'ink'
  | 'text'

// Document state
export interface DocumentState {
  id: string
  originalPdfHash: string
  pdfData: Uint8Array | null
  numPages: number
  pageRotations: Record<number, number>
  deletedPages: Set<number>
  pageOrder: number[] // Original page indices in display order
  createdAt: Date
  updatedAt: Date
}

// Editor state
export interface EditorState {
  // Document
  document: DocumentState | null
  isLoading: boolean
  loadError: string | null

  // View
  currentPage: number
  scale: number
  scaleMode: 'fit-width' | 'fit-page' | 'custom'
  rotation: number // Global view rotation

  // Tool
  activeTool: Tool
  toolStyle: AnnotationStyle

  // Annotations
  annotations: Map<string, Annotation>
  selectedAnnotationIds: Set<string>

  // Operations (for undo/redo)
  operations: Operation[]
  undoStack: Operation[]
  redoStack: Operation[]

  // UI State
  isThumbnailSidebarOpen: boolean
  isSearchOpen: boolean
  searchQuery: string
  searchResults: { pageIndex: number; matchIndex: number }[]
  currentSearchIndex: number
  pdfDarkMode: boolean

  // Mobile UI State
  isMobileToolsPanelOpen: boolean
  activeMobilePanel: 'none' | 'tools' | 'more' | 'pages'
}

// Actions
export interface EditorActions {
  // Document actions
  loadDocument: (pdfData: Uint8Array, hash: string, numPages: number) => void
  closeDocument: () => void
  setLoading: (loading: boolean) => void
  setLoadError: (error: string | null) => void

  // View actions
  setCurrentPage: (page: number) => void
  setScale: (scale: number) => void
  setScaleMode: (mode: 'fit-width' | 'fit-page' | 'custom') => void
  zoomIn: () => void
  zoomOut: () => void
  fitWidth: () => void
  fitPage: () => void

  // Tool actions
  setActiveTool: (tool: Tool) => void
  setToolStyle: (style: Partial<AnnotationStyle>) => void

  // Annotation actions
  addAnnotation: (annotation: Annotation) => void
  updateAnnotation: (id: string, changes: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => void
  selectAnnotation: (id: string, addToSelection?: boolean) => void
  deselectAnnotation: (id: string) => void
  clearSelection: () => void
  getAnnotationsForPage: (pageIndex: number) => Annotation[]

  // Page operations
  rotatePage: (pageIndex: number, degrees: number) => void
  deletePage: (pageIndex: number) => void
  reorderPages: (fromIndex: number, toIndex: number) => void
  getPageRotation: (pageIndex: number) => number
  getVisiblePageIndices: () => number[]

  // History actions
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // UI actions
  toggleThumbnailSidebar: () => void
  setSearchOpen: (open: boolean) => void
  setSearchQuery: (query: string) => void
  setSearchResults: (results: { pageIndex: number; matchIndex: number }[]) => void
  navigateSearchResult: (direction: 'next' | 'prev') => void
  togglePdfDarkMode: () => void

  // Mobile UI actions
  setMobileToolsPanelOpen: (open: boolean) => void
  setActiveMobilePanel: (panel: 'none' | 'tools' | 'more' | 'pages') => void
  closeMobileSidebar: () => void
}

type EditorStore = EditorState & EditorActions

// Helper to generate IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

// Default tool style
const defaultToolStyle: AnnotationStyle = {
  color: '#FFEB3B',
  opacity: 0.5,
  strokeWidth: 2,
  fontSize: 14,
  fontFamily: 'sans-serif',
}

// Zoom levels
const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0]
const MIN_ZOOM = 0.1
const MAX_ZOOM = 5.0

export const useEditorStore = create<EditorStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    document: null,
    isLoading: false,
    loadError: null,
    currentPage: 1,
    scale: 1.0,
    scaleMode: 'fit-width',
    rotation: 0,
    activeTool: 'select',
    toolStyle: defaultToolStyle,
    annotations: new Map(),
    selectedAnnotationIds: new Set(),
    operations: [],
    undoStack: [],
    redoStack: [],
    isThumbnailSidebarOpen: true,
    isSearchOpen: false,
    searchQuery: '',
    searchResults: [],
    currentSearchIndex: -1,
    pdfDarkMode: false,
    isMobileToolsPanelOpen: false,
    activeMobilePanel: 'none',

    // Document actions
    loadDocument: (pdfData, hash, numPages) => {
      const pageOrder = Array.from({ length: numPages }, (_, i) => i)
      set({
        document: {
          id: generateId(),
          originalPdfHash: hash,
          pdfData,
          numPages,
          pageRotations: {},
          deletedPages: new Set(),
          pageOrder,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        isLoading: false,
        loadError: null,
        currentPage: 1,
        annotations: new Map(),
        operations: [],
        undoStack: [],
        redoStack: [],
      })
    },

    closeDocument: () => {
      set({
        document: null,
        annotations: new Map(),
        operations: [],
        undoStack: [],
        redoStack: [],
        selectedAnnotationIds: new Set(),
        currentPage: 1,
      })
    },

    setLoading: (loading) => set({ isLoading: loading }),
    setLoadError: (error) => set({ loadError: error, isLoading: false }),

    // View actions
    setCurrentPage: (page) => {
      const { document } = get()
      if (!document) return
      const maxPage = document.pageOrder.length
      const clampedPage = Math.max(1, Math.min(page, maxPage))
      set({ currentPage: clampedPage })
    },

    setScale: (scale) => {
      const clampedScale = Math.max(MIN_ZOOM, Math.min(scale, MAX_ZOOM))
      set({ scale: clampedScale, scaleMode: 'custom' })
    },

    setScaleMode: (mode) => set({ scaleMode: mode }),

    zoomIn: () => {
      const { scale } = get()
      const nextLevel = ZOOM_LEVELS.find((z) => z > scale + 0.01)
      if (nextLevel) {
        set({ scale: nextLevel, scaleMode: 'custom' })
      } else if (scale < MAX_ZOOM) {
        set({ scale: Math.min(scale * 1.25, MAX_ZOOM), scaleMode: 'custom' })
      }
    },

    zoomOut: () => {
      const { scale } = get()
      const prevLevel = [...ZOOM_LEVELS].reverse().find((z) => z < scale - 0.01)
      if (prevLevel) {
        set({ scale: prevLevel, scaleMode: 'custom' })
      } else if (scale > MIN_ZOOM) {
        set({ scale: Math.max(scale / 1.25, MIN_ZOOM), scaleMode: 'custom' })
      }
    },

    fitWidth: () => set({ scaleMode: 'fit-width' }),
    fitPage: () => set({ scaleMode: 'fit-page' }),

    // Tool actions
    setActiveTool: (tool) => {
      set({ activeTool: tool })
      // Update tool style based on tool type
      if (tool === 'highlight') {
        set((state) => ({
          toolStyle: { ...state.toolStyle, color: '#FFEB3B', opacity: 0.5 },
        }))
      } else if (tool === 'underline' || tool === 'strikethrough') {
        set((state) => ({
          toolStyle: { ...state.toolStyle, color: '#F44336', opacity: 1.0 },
        }))
      }
    },

    setToolStyle: (style) => {
      set((state) => ({
        toolStyle: { ...state.toolStyle, ...style },
      }))
    },

    // Annotation actions
    addAnnotation: (annotation) => {
      const operation: AddAnnotationOperation = {
        id: generateId(),
        type: 'add_annotation',
        annotation,
        timestamp: Date.now(),
      }

      set((state) => {
        const newAnnotations = new Map(state.annotations)
        newAnnotations.set(annotation.id, annotation)
        return {
          annotations: newAnnotations,
          operations: [...state.operations, operation],
          undoStack: [...state.undoStack, operation],
          redoStack: [],
          document: state.document
            ? { ...state.document, updatedAt: new Date() }
            : null,
        }
      })
    },

    updateAnnotation: (id, changes) => {
      const { annotations } = get()
      const existing = annotations.get(id)
      if (!existing) return

      const previousState: Partial<Annotation> = {}
      for (const key of Object.keys(changes) as (keyof Annotation)[]) {
        previousState[key] = existing[key] as never
      }

      const operation: UpdateAnnotationOperation = {
        id: generateId(),
        type: 'update_annotation',
        annotationId: id,
        changes,
        previousState,
        timestamp: Date.now(),
      }

      set((state) => {
        const newAnnotations = new Map(state.annotations)
        const updated = {
          ...existing,
          ...changes,
          updatedAt: Date.now(),
        } as Annotation
        newAnnotations.set(id, updated)
        return {
          annotations: newAnnotations,
          operations: [...state.operations, operation],
          undoStack: [...state.undoStack, operation],
          redoStack: [],
          document: state.document
            ? { ...state.document, updatedAt: new Date() }
            : null,
        }
      })
    },

    deleteAnnotation: (id) => {
      const { annotations } = get()
      const annotation = annotations.get(id)
      if (!annotation) return

      const operation: DeleteAnnotationOperation = {
        id: generateId(),
        type: 'delete_annotation',
        annotation,
        timestamp: Date.now(),
      }

      set((state) => {
        const newAnnotations = new Map(state.annotations)
        newAnnotations.delete(id)
        const newSelected = new Set(state.selectedAnnotationIds)
        newSelected.delete(id)
        return {
          annotations: newAnnotations,
          selectedAnnotationIds: newSelected,
          operations: [...state.operations, operation],
          undoStack: [...state.undoStack, operation],
          redoStack: [],
          document: state.document
            ? { ...state.document, updatedAt: new Date() }
            : null,
        }
      })
    },

    selectAnnotation: (id, addToSelection = false) => {
      set((state) => {
        if (addToSelection) {
          const newSelected = new Set(state.selectedAnnotationIds)
          newSelected.add(id)
          return { selectedAnnotationIds: newSelected }
        }
        return { selectedAnnotationIds: new Set([id]) }
      })
    },

    deselectAnnotation: (id) => {
      set((state) => {
        const newSelected = new Set(state.selectedAnnotationIds)
        newSelected.delete(id)
        return { selectedAnnotationIds: newSelected }
      })
    },

    clearSelection: () => set({ selectedAnnotationIds: new Set() }),

    getAnnotationsForPage: (pageIndex) => {
      const { annotations } = get()
      return Array.from(annotations.values()).filter(
        (a) => a.pageIndex === pageIndex
      )
    },

    // Page operations
    rotatePage: (pageIndex, degrees) => {
      const { document } = get()
      if (!document) return

      const previousRotation = document.pageRotations[pageIndex] || 0
      const newRotation = (previousRotation + degrees) % 360

      const operation: RotatePageOperation = {
        id: generateId(),
        type: 'rotate_page',
        pageIndex,
        rotation: degrees,
        previousRotation,
        timestamp: Date.now(),
      }

      set((state) => {
        if (!state.document) return state
        return {
          document: {
            ...state.document,
            pageRotations: {
              ...state.document.pageRotations,
              [pageIndex]: newRotation,
            },
            updatedAt: new Date(),
          },
          operations: [...state.operations, operation],
          undoStack: [...state.undoStack, operation],
          redoStack: [],
        }
      })
    },

    deletePage: (pageIndex) => {
      const { document } = get()
      if (!document || document.pageOrder.length <= 1) return

      const operation: DeletePageOperation = {
        id: generateId(),
        type: 'delete_page',
        pageIndex,
        timestamp: Date.now(),
      }

      set((state) => {
        if (!state.document) return state
        const newDeletedPages = new Set(state.document.deletedPages)
        newDeletedPages.add(pageIndex)
        const newPageOrder = state.document.pageOrder.filter((i) => i !== pageIndex)
        return {
          document: {
            ...state.document,
            deletedPages: newDeletedPages,
            pageOrder: newPageOrder,
            updatedAt: new Date(),
          },
          currentPage: Math.min(state.currentPage, newPageOrder.length),
          operations: [...state.operations, operation],
          undoStack: [...state.undoStack, operation],
          redoStack: [],
        }
      })
    },

    reorderPages: (fromIndex, toIndex) => {
      const { document } = get()
      if (!document) return

      const operation: ReorderPagesOperation = {
        id: generateId(),
        type: 'reorder_pages',
        fromIndex,
        toIndex,
        timestamp: Date.now(),
      }

      set((state) => {
        if (!state.document) return state
        const newOrder = [...state.document.pageOrder]
        const [removed] = newOrder.splice(fromIndex, 1)
        newOrder.splice(toIndex, 0, removed)
        return {
          document: {
            ...state.document,
            pageOrder: newOrder,
            updatedAt: new Date(),
          },
          operations: [...state.operations, operation],
          undoStack: [...state.undoStack, operation],
          redoStack: [],
        }
      })
    },

    getPageRotation: (pageIndex) => {
      const { document } = get()
      return document?.pageRotations[pageIndex] || 0
    },

    getVisiblePageIndices: () => {
      const { document } = get()
      return document?.pageOrder || []
    },

    // History actions
    undo: () => {
      const { undoStack } = get()
      if (undoStack.length === 0) return

      const operation = undoStack[undoStack.length - 1]

      set((state) => {
        const newUndoStack = state.undoStack.slice(0, -1)
        const newRedoStack = [...state.redoStack, operation]
        const newAnnotations = new Map(state.annotations)
        let newDocument = state.document

        switch (operation.type) {
          case 'add_annotation':
            newAnnotations.delete(operation.annotation.id)
            break
          case 'update_annotation': {
            const existing = newAnnotations.get(operation.annotationId)
            if (existing) {
              newAnnotations.set(operation.annotationId, {
                ...existing,
                ...operation.previousState,
              } as Annotation)
            }
            break
          }
          case 'delete_annotation':
            newAnnotations.set(operation.annotation.id, operation.annotation)
            break
          case 'rotate_page':
            if (newDocument) {
              newDocument = {
                ...newDocument,
                pageRotations: {
                  ...newDocument.pageRotations,
                  [operation.pageIndex]: operation.previousRotation,
                },
              }
            }
            break
          case 'delete_page':
            if (newDocument) {
              const newDeletedPages = new Set(newDocument.deletedPages)
              newDeletedPages.delete(operation.pageIndex)
              const newOrder = [...newDocument.pageOrder]
              // Insert back at the correct position
              newOrder.splice(operation.pageIndex, 0, operation.pageIndex)
              newDocument = {
                ...newDocument,
                deletedPages: newDeletedPages,
                pageOrder: newOrder,
              }
            }
            break
          case 'reorder_pages':
            if (newDocument) {
              const newOrder = [...newDocument.pageOrder]
              const [removed] = newOrder.splice(operation.toIndex, 1)
              newOrder.splice(operation.fromIndex, 0, removed)
              newDocument = {
                ...newDocument,
                pageOrder: newOrder,
              }
            }
            break
        }

        return {
          undoStack: newUndoStack,
          redoStack: newRedoStack,
          annotations: newAnnotations,
          document: newDocument,
        }
      })
    },

    redo: () => {
      const { redoStack } = get()
      if (redoStack.length === 0) return

      const operation = redoStack[redoStack.length - 1]

      set((state) => {
        const newRedoStack = state.redoStack.slice(0, -1)
        const newUndoStack = [...state.undoStack, operation]
        const newAnnotations = new Map(state.annotations)
        let newDocument = state.document

        switch (operation.type) {
          case 'add_annotation':
            newAnnotations.set(operation.annotation.id, operation.annotation)
            break
          case 'update_annotation': {
            const existing = newAnnotations.get(operation.annotationId)
            if (existing) {
              newAnnotations.set(operation.annotationId, {
                ...existing,
                ...operation.changes,
              } as Annotation)
            }
            break
          }
          case 'delete_annotation':
            newAnnotations.delete(operation.annotation.id)
            break
          case 'rotate_page':
            if (newDocument) {
              const newRotation =
                ((newDocument.pageRotations[operation.pageIndex] || 0) +
                  operation.rotation) %
                360
              newDocument = {
                ...newDocument,
                pageRotations: {
                  ...newDocument.pageRotations,
                  [operation.pageIndex]: newRotation,
                },
              }
            }
            break
          case 'delete_page':
            if (newDocument) {
              const newDeletedPages = new Set(newDocument.deletedPages)
              newDeletedPages.add(operation.pageIndex)
              const newOrder = newDocument.pageOrder.filter(
                (i) => i !== operation.pageIndex
              )
              newDocument = {
                ...newDocument,
                deletedPages: newDeletedPages,
                pageOrder: newOrder,
              }
            }
            break
          case 'reorder_pages':
            if (newDocument) {
              const newOrder = [...newDocument.pageOrder]
              const [removed] = newOrder.splice(operation.fromIndex, 1)
              newOrder.splice(operation.toIndex, 0, removed)
              newDocument = {
                ...newDocument,
                pageOrder: newOrder,
              }
            }
            break
        }

        return {
          undoStack: newUndoStack,
          redoStack: newRedoStack,
          annotations: newAnnotations,
          document: newDocument,
        }
      })
    },

    canUndo: () => get().undoStack.length > 0,
    canRedo: () => get().redoStack.length > 0,

    // UI actions
    toggleThumbnailSidebar: () => {
      set((state) => ({ isThumbnailSidebarOpen: !state.isThumbnailSidebarOpen }))
    },

    setSearchOpen: (open) => set({ isSearchOpen: open }),

    setSearchQuery: (query) => set({ searchQuery: query, currentSearchIndex: -1 }),

    setSearchResults: (results) => {
      set({ searchResults: results, currentSearchIndex: results.length > 0 ? 0 : -1 })
    },

    navigateSearchResult: (direction) => {
      set((state) => {
        if (state.searchResults.length === 0) return state
        let newIndex = state.currentSearchIndex
        if (direction === 'next') {
          newIndex = (newIndex + 1) % state.searchResults.length
        } else {
          newIndex =
            (newIndex - 1 + state.searchResults.length) %
            state.searchResults.length
        }
        const result = state.searchResults[newIndex]
        return {
          currentSearchIndex: newIndex,
          currentPage: result.pageIndex + 1,
        }
      })
    },

    togglePdfDarkMode: () => {
      set((state) => ({ pdfDarkMode: !state.pdfDarkMode }))
    },

    // Mobile UI actions
    setMobileToolsPanelOpen: (open) => set({ isMobileToolsPanelOpen: open }),

    setActiveMobilePanel: (panel) => set({ activeMobilePanel: panel }),

    closeMobileSidebar: () => set({ isThumbnailSidebarOpen: false }),
  }))
)
