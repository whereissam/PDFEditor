# PDF Editor API Reference

## Table of Contents
- [Store (Zustand)](#store-zustand)
- [Hooks](#hooks)
- [Contexts](#contexts)
- [Components](#components)
- [Utilities](#utilities)
- [Types](#types)

---

## Store (Zustand)

### `useEditorStore`

Main application store managing document, annotations, and UI state.

```typescript
import { useEditorStore } from '@/stores/editor-store'
```

#### State

| Property | Type | Description |
|----------|------|-------------|
| `document` | `DocumentState \| null` | Current document state |
| `isLoading` | `boolean` | Document loading status |
| `loadError` | `string \| null` | Loading error message |
| `currentPage` | `number` | Current page number (1-indexed) |
| `scale` | `number` | Zoom scale (0.1 - 5.0) |
| `scaleMode` | `'fit-width' \| 'fit-page' \| 'custom'` | Current zoom mode |
| `activeTool` | `Tool` | Currently selected annotation tool |
| `toolStyle` | `AnnotationStyle` | Current tool styling |
| `annotations` | `Map<string, Annotation>` | All annotations by ID |
| `selectedAnnotationIds` | `Set<string>` | Currently selected annotation IDs |
| `pdfDarkMode` | `boolean` | PDF dark mode enabled |

#### Actions

##### Document Actions
```typescript
loadDocument(pdfData: Uint8Array, hash: string, numPages: number): void
closeDocument(): void
setLoading(loading: boolean): void
setLoadError(error: string | null): void
```

##### View Actions
```typescript
setCurrentPage(page: number): void
setScale(scale: number): void
setScaleMode(mode: 'fit-width' | 'fit-page' | 'custom'): void
zoomIn(): void
zoomOut(): void
fitWidth(): void
fitPage(): void
```

##### Tool Actions
```typescript
setActiveTool(tool: Tool): void
setToolStyle(style: Partial<AnnotationStyle>): void
```

##### Annotation Actions
```typescript
addAnnotation(annotation: Annotation): void
updateAnnotation(id: string, changes: Partial<Annotation>): void
deleteAnnotation(id: string): void
selectAnnotation(id: string, addToSelection?: boolean): void
deselectAnnotation(id: string): void
clearSelection(): void
getAnnotationsForPage(pageIndex: number): Annotation[]
```

##### Page Operations
```typescript
rotatePage(pageIndex: number, degrees: number): void
deletePage(pageIndex: number): void
reorderPages(fromIndex: number, toIndex: number): void
getPageRotation(pageIndex: number): number
getVisiblePageIndices(): number[]
```

##### History Actions
```typescript
undo(): void
redo(): void
canUndo(): boolean
canRedo(): boolean
```

##### UI Actions
```typescript
toggleThumbnailSidebar(): void
togglePdfDarkMode(): void
setSearchOpen(open: boolean): void
setSearchQuery(query: string): void
```

#### Usage Example
```typescript
const Component = () => {
  const scale = useEditorStore((s) => s.scale)
  const zoomIn = useEditorStore((s) => s.zoomIn)

  return <button onClick={zoomIn}>Zoom: {scale * 100}%</button>
}
```

---

## Hooks

### `usePDFDocument`

Manages PDF.js document loading and page access.

```typescript
import { usePDFDocument } from '@/hooks/usePDFDocument'
```

#### Returns
```typescript
interface UsePDFDocumentReturn {
  document: PDFDocumentProxy | null
  isLoading: boolean
  error: string | null
  numPages: number
  loadFromFile(file: File): Promise<void>
  loadFromUrl(url: string): Promise<void>
  loadFromStorage(documentId: string): Promise<void>
  getPageData(pageNumber: number): Promise<PDFPageProxy>
  getPageViewport(page: PDFPageProxy, scale: number, rotation?: number): PageViewport
  getPageText(page: PDFPageProxy): Promise<TextContent>
  closeDocument(): void
}
```

#### Usage
```typescript
const { loadFromFile, document, isLoading } = usePDFDocument()

const handleUpload = async (file: File) => {
  await loadFromFile(file)
}
```

---

### `useAnnotations`

High-level annotation operations with coordinate conversion.

```typescript
import { useAnnotations } from '@/hooks/useAnnotations'
```

#### Returns
```typescript
interface UseAnnotationsReturn {
  annotations: Map<string, Annotation>
  selectedIds: Set<string>
  getAnnotationsForPage(pageIndex: number): Annotation[]

  // Creation (viewport coords → PDF coords automatically)
  addHighlight(pageIndex: number, quadPoints: number[][], viewport: PageViewport, selectedText?: string): string
  addUnderline(pageIndex: number, quadPoints: number[][], viewport: PageViewport, selectedText?: string): string
  addStrikethrough(pageIndex: number, quadPoints: number[][], viewport: PageViewport, selectedText?: string): string
  addNote(pageIndex: number, x: number, y: number, viewport: PageViewport): string
  addRectangle(pageIndex: number, x: number, y: number, width: number, height: number, viewport: PageViewport): string
  addEllipse(pageIndex: number, x: number, y: number, width: number, height: number, viewport: PageViewport): string
  addArrow(pageIndex: number, startX: number, startY: number, endX: number, endY: number, viewport: PageViewport): string
  addLine(pageIndex: number, startX: number, startY: number, endX: number, endY: number, viewport: PageViewport): string
  addInk(pageIndex: number, points: Point[], viewport: PageViewport): string
  addText(pageIndex: number, x: number, y: number, width: number, height: number, content: string, viewport: PageViewport): string

  // Management
  updateAnnotation(id: string, changes: Partial<Annotation>): void
  deleteAnnotation(id: string): void
  selectAnnotation(id: string, addToSelection?: boolean): void
  deselectAnnotation(id: string): void
  clearSelection(): void

  // Styling
  toolStyle: AnnotationStyle
  setToolStyle(style: Partial<AnnotationStyle>): void
}
```

---

### `useViewport`

Zoom, pan, and viewport calculations.

```typescript
import { useViewport, usePageVisibility, usePinchZoom, useKeyboardNavigation } from '@/hooks/useViewport'
```

#### `useViewport` Returns
```typescript
interface UseViewportReturn {
  containerRef: React.RefObject<HTMLDivElement>
  dimensions: { width: number; height: number }
  scale: number
  scaleMode: 'fit-width' | 'fit-page' | 'custom'
  setScale(scale: number): void
  zoomIn(): void
  zoomOut(): void
  fitWidth(): void
  fitPage(): void
  calculateFitWidthScale(pageWidth: number, padding?: number): number
  calculateFitPageScale(pageWidth: number, pageHeight: number, padding?: number): number
}
```

#### `usePageVisibility`
Tracks visible pages using Intersection Observer.
```typescript
const { registerPage } = usePageVisibility(containerRef)
```

#### `usePinchZoom`
Handles trackpad pinch-to-zoom gestures.
```typescript
usePinchZoom(containerRef)
```

#### `useKeyboardNavigation`
Global keyboard shortcuts for navigation and tools.
```typescript
useKeyboardNavigation()
```

---

### `useHistory`

Undo/redo and auto-save functionality.

```typescript
import { useHistory, useAutoSave } from '@/hooks/useHistory'
```

#### Returns
```typescript
interface UseHistoryReturn {
  canUndo: boolean
  canRedo: boolean
  undo(): void
  redo(): void
}
```

#### Auto-save
```typescript
// Saves to IndexedDB every 2 seconds when changes occur
useAutoSave(documentId, 2000)
```

---

## Contexts

### `SearchContext`

Full-text search with Web Worker.

```typescript
import { SearchProvider, useSearchContext } from '@/contexts/SearchContext'
```

#### Provider Props
```typescript
interface SearchProviderProps {
  children: ReactNode
  pdfDocument: PDFDocumentProxy | null
}
```

#### Context Value
```typescript
interface SearchContextType {
  isIndexing: boolean
  isIndexed: boolean
  isSearching: boolean
  results: SearchResult[]
  currentResult: SearchResult | null
  totalResults: number
  currentIndex: number

  search(query: string): void
  nextResult(): void
  prevResult(): void
  goToResult(index: number): void
  clearSearch(): void
}
```

#### SearchResult Type
```typescript
interface SearchResult {
  pageIndex: number
  matchIndex: number
  text: string          // Matched text
  snippet: string       // Context around match
  startOffset: number
  endOffset: number
}
```

---

### `OCRContext`

Tesseract.js OCR integration.

```typescript
import { OCRProvider, useOCRContext } from '@/contexts/OCRContext'
```

#### Context Value
```typescript
interface OCRContextType {
  isInitialized: boolean
  isProcessing: boolean
  progress: number          // 0-100
  currentPage: number | null
  results: Map<number, OCRPageResult>

  initializeOCR(): Promise<void>
  runOCROnPage(pdfDocument: PDFDocumentProxy, pageNumber: number, scale?: number): Promise<OCRPageResult>
  runOCROnAllPages(pdfDocument: PDFDocumentProxy, pagesWithoutText: number[], scale?: number): Promise<void>
  cancelOCR(): void
  getPageOCRText(pageIndex: number): string | null
  terminateOCR(): Promise<void>
}
```

---

## Components

### `PDFViewer`

Main PDF viewer container.

```typescript
import { PDFViewer } from '@/components/pdf-viewer/PDFViewer'
```

#### Props
```typescript
interface PDFViewerProps {
  pdfDocument: PDFDocumentProxy
  className?: string
}
```

---

### `PageRenderer`

Individual page renderer with lazy loading.

```typescript
import { PageRenderer } from '@/components/pdf-viewer/PageRenderer'
```

#### Props
```typescript
interface PageRendererProps {
  pdfDocument: PDFDocumentProxy
  pageNumber: number           // 1-based PDF page number
  displayPageNumber: number    // Display number after reordering
  scale: number
  rotation?: number
  registerRef?: (element: HTMLElement | null) => void
}
```

---

### `AnnotationLayer`

SVG overlay for annotations with drawing support.

```typescript
import { AnnotationLayer } from '@/components/pdf-viewer/AnnotationLayer'
```

#### Props
```typescript
interface AnnotationLayerProps {
  pageIndex: number
  viewport: PageViewport
}
```

---

### `TextLayer`

PDF.js text layer with snap-to-text highlighting.

```typescript
import { TextLayer } from '@/components/pdf-viewer/TextLayer'
```

#### Props
```typescript
interface TextLayerProps {
  page: PDFPageProxy
  viewport: PageViewport
  pageIndex: number
}
```

---

### Annotation Components

#### `HighlightAnnotation`
```typescript
interface HighlightAnnotationProps {
  annotation: HighlightAnnotation
  quadPoints: number[][]      // Viewport coordinates
  isSelected: boolean
  onClick: (e: React.MouseEvent) => void
}
```

#### `ShapeAnnotation`
```typescript
interface ShapeAnnotationProps {
  annotation: ShapeAnnotation
  rect: Rect                  // Viewport coordinates
  viewport: PageViewport
  isSelected: boolean
  onClick: (e: React.MouseEvent) => void
  onUpdate?: (changes: Partial<ShapeAnnotation>) => void
}
```

#### `NoteAnnotation`
```typescript
interface NoteAnnotationProps {
  annotation: NoteAnnotation
  position: Point             // Viewport coordinates
  isSelected: boolean
  onClick: (e: React.MouseEvent) => void
  onUpdate?: (changes: Partial<NoteAnnotation>) => void
}
```

#### `InkAnnotation`
```typescript
interface InkAnnotationProps {
  annotation: InkAnnotation
  viewport: PageViewport
  isSelected: boolean
  onClick: (e: React.MouseEvent) => void
}
```

---

## Utilities

### `geometry.ts`

Coordinate transformation and geometry utilities.

```typescript
import {
  viewportToPdf,
  pdfToViewport,
  rectViewportToPdf,
  rectPdfToViewport,
  quadPointsPdfToViewport,
  quadPointsViewportToPdf,
  getBoundingBoxFromQuadPoints,
  domRectsToQuadPoints,
  isPointInRect,
  isPointInQuad,
  distance,
  angle,
  getResizeHandles,
  applyResize,
  simplifyPath,
} from '@/lib/geometry'
```

#### Key Functions

```typescript
// Coordinate conversion
viewportToPdf(viewportPoint: Point, viewport: PageViewport): Point
pdfToViewport(pdfPoint: Point, viewport: PageViewport): Point
rectViewportToPdf(rect: Rect, viewport: PageViewport): Rect
rectPdfToViewport(rect: Rect, viewport: PageViewport): Rect

// Hit testing
isPointInRect(point: Point, rect: Rect): boolean
isPointInQuad(point: Point, quad: number[]): boolean

// Resize handling
getResizeHandles(rect: Rect, handleSize?: number): ResizeHandle[]
applyResize(rect: Rect, handle: Position, dx: number, dy: number, minSize?: number): Rect

// Path optimization (Ramer-Douglas-Peucker)
simplifyPath(points: Point[], epsilon?: number): Point[]
```

---

### `storage.ts`

IndexedDB persistence with Dexie.js.

```typescript
import {
  saveDocument,
  getDocument,
  getDocumentByHash,
  deleteDocument,
  listDocuments,
  saveAnnotations,
  getAnnotations,
} from '@/lib/storage'
```

#### Functions
```typescript
saveDocument(doc: StoredDocument): Promise<void>
getDocument(id: string): Promise<StoredDocument | undefined>
getDocumentByHash(hash: string): Promise<StoredDocument | undefined>
deleteDocument(id: string): Promise<void>
listDocuments(): Promise<StoredDocument[]>
saveAnnotations(documentId: string, annotations: Annotation[]): Promise<void>
getAnnotations(documentId: string): Promise<Annotation[]>
```

---

### `pdf/loader.ts`

PDF.js document loading utilities.

```typescript
import {
  loadPDFFromFile,
  loadPDFFromUrl,
  getPage,
  getViewport,
  getTextContent,
  computeHash,
} from '@/lib/pdf/loader'
```

---

### `pdf/export.ts`

PDF export with annotations.

```typescript
import { exportPDF, downloadPDF } from '@/lib/pdf/export'

interface ExportOptions {
  pdfData: Uint8Array
  annotations: Annotation[]
  pageRotations: Record<number, number>
  pageOrder: number[]
  deletedPages: Set<number>
}

exportPDF(options: ExportOptions): Promise<Uint8Array>
downloadPDF(pdfBytes: Uint8Array, filename: string): Promise<void>
```

---

## Types

### Core Types

```typescript
// Geometry
interface Point {
  x: number
  y: number
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface QuadPoints {
  points: number[][] // Array of [x1,y1,x2,y2,x3,y3,x4,y4]
}

interface Path {
  points: Point[]
  closed?: boolean
}

// Tools
type Tool =
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

// Styling
interface AnnotationStyle {
  color: string
  opacity: number
  strokeWidth?: number
  fontSize?: number
  fontFamily?: string
}
```

### Annotation Types

```typescript
type AnnotationType =
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

interface BaseAnnotation {
  id: string
  type: AnnotationType
  pageIndex: number
  style: AnnotationStyle
  createdAt: number
  updatedAt: number
}

interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight' | 'underline' | 'strikethrough'
  quadPoints: QuadPoints
  selectedText?: string
}

interface NoteAnnotation extends BaseAnnotation {
  type: 'note'
  position: Point
  content: string
  isOpen?: boolean
}

interface ShapeAnnotation extends BaseAnnotation {
  type: 'rectangle' | 'ellipse'
  rect: Rect
}

interface LineAnnotation extends BaseAnnotation {
  type: 'arrow' | 'line'
  start: Point
  end: Point
}

interface InkAnnotation extends BaseAnnotation {
  type: 'ink'
  paths: Path[]
}

interface TextAnnotation extends BaseAnnotation {
  type: 'text'
  rect: Rect
  content: string
}

type Annotation =
  | HighlightAnnotation
  | NoteAnnotation
  | ShapeAnnotation
  | LineAnnotation
  | InkAnnotation
  | TextAnnotation
```

### Operation Types

```typescript
type OperationType =
  | 'add_annotation'
  | 'update_annotation'
  | 'delete_annotation'
  | 'rotate_page'
  | 'delete_page'
  | 'reorder_pages'

interface AddAnnotationOperation {
  id: string
  type: 'add_annotation'
  annotation: Annotation
  timestamp: number
}

interface UpdateAnnotationOperation {
  id: string
  type: 'update_annotation'
  annotationId: string
  changes: Partial<Annotation>
  previousState: Partial<Annotation>
  timestamp: number
}

interface DeleteAnnotationOperation {
  id: string
  type: 'delete_annotation'
  annotation: Annotation
  timestamp: number
}
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `V` or `Escape` | Select tool |
| `H` | Highlight |
| `U` | Underline |
| `S` | Strikethrough |
| `N` | Sticky note |
| `R` | Rectangle |
| `O` | Ellipse |
| `A` | Arrow |
| `L` | Line |
| `P` | Pen (ink) |
| `T` | Text box |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Cmd/Ctrl + F` | Search |
| `Cmd/Ctrl + +` | Zoom in |
| `Cmd/Ctrl + -` | Zoom out |
| `Delete/Backspace` | Delete selected |
| `Arrow Up/Down` | Previous/next page |
| `Home/End` | First/last page |
