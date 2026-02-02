# PDF Editor Implementation TODO

## Overview
Build a modern, fast PDF editor for **general consumers** (students, individuals) with focus on annotation, page operations, and delightful UX.

**Tech Stack:**
- Frontend: React 19 + Vite + Tailwind v4 + TanStack Router/Query + shadcn/ui
- Backend: Bun + Hono
- PDF Rendering: PDF.js
- PDF Export: pdf-lib (client-side)
- State: Zustand (ops-log pattern for undo/redo)
- Local Storage: IndexedDB (Dexie.js)

---

## Implementation Order

### Phase 1: Core Infrastructure
- [x] Set up PDF.js and basic viewer
- [x] Add zoom controls and page navigation
- [x] Implement virtualized page rendering
- [x] Create Zustand store with ops-log

### Phase 2: Text & Search
- [x] Add text layer with selection
- [x] Implement search functionality (full text search with MiniSearch)
- [x] Web Worker for background text extraction
- [x] Build search index with MiniSearch on PDF load
- [x] Contextual snippets (3-4 words before/after match)
- [x] Auto-scroll to search result with smooth animation

### Phase 3: Annotations
- [x] Add highlight annotation (text-snapped)
- [x] Add underline/strikethrough annotations
- [x] Add shape annotations (rect, ellipse, arrow, line)
- [x] Add sticky note annotation
- [x] Add freehand ink annotation
- [x] Add text box annotation
- [x] Implement selection/move for annotations
- [x] Implement resize for annotations
- [x] Add undo/redo system
- [x] Ghost preview layer (real-time low-opacity preview while drawing)
- [x] Snap-to-text highlighting using PDF.js text layer quads
- [x] Ink path optimization (Ramer-Douglas-Peucker algorithm)

### Phase 4: Page Operations
- [x] Create thumbnail sidebar
- [x] Add page rotation
- [x] Add page deletion
- [x] Add page reorder (drag-drop in sidebar)
- [ ] Smart delete (auto-remove annotations when page is deleted)

### Phase 5: Export & Persistence
- [x] Implement PDF export with pdf-lib
- [x] Add IndexedDB persistence with Dexie.js
- [x] Auto-save functionality
- [ ] Fix page reorder export (copyPages with new order)

### Phase 6: Polish
- [x] Keyboard shortcuts (H=highlight, N=note, etc.)
- [x] Drag-drop file upload
- [x] Color picker improvements (custom colors, hex input, recent colors)
- [x] Better annotation style controls (font size, font family, stroke width)
- [x] Pinch-to-zoom (trackpad support via wheel+ctrlKey)
- [x] Dark mode PDF (canvas invert filter with toggle)

### Phase 7: Backend (Optional for MVP)
- [x] Set up Hono backend structure
- [x] Upload endpoint
- [x] Document CRUD routes
- [ ] Cloud storage integration (future)

### Phase 8: Advanced Features
- [x] WASM-based OCR with Tesseract.js (make scanned PDFs searchable)
- [x] Lazy annotation rendering with Intersection Observer

---

## Architecture

### 4-Layer Viewer Stack
```
┌─────────────────────────────────────────┐
│  Interaction Layer (hit-testing, cursor)│  ← Single global event listener
├─────────────────────────────────────────┤     delegates to page index
│  Annotation Overlay (SVG - shapes, ink) │
├─────────────────────────────────────────┤
│  Text Layer (DOM - selectable text)     │
├─────────────────────────────────────────┤
│  PDF Raster Layer (Canvas - PDF.js)     │
└─────────────────────────────────────────┘
```

**Performance Note:** The Interaction Layer should be a single global listener that delegates events down to the specific page index, avoiding per-page event listeners for 100+ page documents.

### Ghost Preview Layer
For "delightful UX", render annotations in real-time while drawing:
```
┌─────────────────────────────────────────┐
│  Ghost Layer (temp canvas/SVG group)    │  ← Low-opacity preview
├─────────────────────────────────────────┤
│  Interaction Layer                      │
├─────────────────────────────────────────┤
│  ...rest of stack                       │
└─────────────────────────────────────────┘
```

### Data Model (Ops-Log Pattern)
```typescript
interface Document {
  id: string
  originalPdfHash: string
  operations: Operation[]
  createdAt: Date
  updatedAt: Date
}

interface Operation {
  id: string
  type: 'add_annotation' | 'update_annotation' | 'delete_annotation' |
        'rotate_page' | 'delete_page' | 'reorder_pages'
  payload: AnnotationPayload | PagePayload
  timestamp: number
}

interface Annotation {
  id: string
  type: 'highlight' | 'underline' | 'strikethrough' | 'note' |
        'rectangle' | 'ellipse' | 'arrow' | 'line' | 'ink' | 'text'
  pageIndex: number
  geometry: Rect | QuadPoints | Path  // PDF user space coordinates
  style: { color: string; opacity: number; strokeWidth?: number }
  content?: string  // for notes/text
}
```

### Ink Path Optimization
For freehand annotations, apply **Ramer-Douglas-Peucker** before saving:
```typescript
// Before: 1000+ points from mousemove events
// After: ~50 essential points, same visual quality
const optimizedPath = simplifyPath(rawPoints, epsilon: 1.5)
```

---

## Technical Implementation Notes

### Snap-to-Text Highlighting
Use PDF.js text layer data for precise highlighting:
```typescript
// In highlight mode:
// 1. Get text layer spans from PDF.js
// 2. Find nearest span to cursor position
// 3. Snap highlight geometry to span's bounding box (quads)
// 4. Result: Crisp, text-aligned highlights instead of jittery mouse-following
```

### Advanced Search Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Main Thread                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │ SearchBar   │───▶│ Zustand     │◀───│ TanStack    │ │
│  │ Component   │    │ Store       │    │ Query       │ │
│  └─────────────┘    └──────┬──────┘    └─────────────┘ │
└────────────────────────────┼────────────────────────────┘
                             │ postMessage
                    ┌────────▼────────┐
                    │   Web Worker    │
                    │  ┌───────────┐  │
                    │  │ MiniSearch│  │  ← Index built on PDF load
                    │  │ /FlexSearch│  │
                    │  └───────────┘  │
                    └─────────────────┘
```

### Lazy Annotation Rendering
For 100+ page documents, use Intersection Observer:
```typescript
// Only mount AnnotationLayer + TextLayer for visible pages
const visiblePages = currentPage ± 2  // Buffer of 2 pages

// Zustand store holds ALL annotation data
// PageRenderer receives only annotations where pageIndex in visiblePages
```

### Page Reorder Export Fix
```typescript
// Solution for pdf-lib page reordering:
async function exportWithReorder(originalBytes: Uint8Array, newOrder: number[]) {
  const srcDoc = await PDFDocument.load(originalBytes)
  const newDoc = await PDFDocument.create()

  // Copy pages in the new order defined by Zustand store
  const copiedPages = await newDoc.copyPages(srcDoc, newOrder)
  copiedPages.forEach(page => newDoc.addPage(page))

  // Apply annotations to the new pages
  await applyAnnotations(newDoc, annotations)

  return newDoc.save()
}
```

### Dark Mode Implementation
```css
/* Simple canvas invert for late-night studying */
.pdf-canvas.dark-mode {
  filter: invert(1) hue-rotate(180deg);
}
```

---

## Project Structure

```
pdfeditor/
├── docs/
│   └── todo.md                           # This file
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── pdf-viewer/
│       │   │   ├── PDFViewer.tsx         # Main container
│       │   │   ├── PageRenderer.tsx      # Single page (canvas + layers)
│       │   │   ├── TextLayer.tsx         # Selectable text overlay
│       │   │   ├── AnnotationLayer.tsx   # SVG annotation overlay
│       │   │   ├── GhostLayer.tsx        # Real-time drawing preview
│       │   │   └── ThumbnailSidebar.tsx  # Page thumbnails
│       │   ├── toolbar/
│       │   │   ├── Toolbar.tsx           # Main toolbar
│       │   │   ├── AnnotationTools.tsx   # Highlight, shapes, etc.
│       │   │   ├── PageTools.tsx         # Rotate, delete, etc.
│       │   │   └── SearchBar.tsx         # Cmd+F search
│       │   └── annotations/
│       │       ├── HighlightAnnotation.tsx
│       │       ├── ShapeAnnotation.tsx
│       │       ├── NoteAnnotation.tsx
│       │       └── InkAnnotation.tsx
│       ├── hooks/
│       │   ├── usePDFDocument.ts         # PDF.js document loading
│       │   ├── useAnnotations.ts         # Annotation state & ops
│       │   ├── useViewport.ts            # Zoom, pan, scroll
│       │   ├── useHistory.ts             # Undo/redo
│       │   └── useVisiblePages.ts        # Intersection Observer for lazy rendering
│       ├── stores/
│       │   └── editor-store.ts           # Zustand store
│       ├── lib/
│       │   ├── pdf/
│       │   │   ├── loader.ts             # PDF.js wrapper
│       │   │   ├── renderer.ts           # Page rendering
│       │   │   ├── text-layer.ts         # Text extraction
│       │   │   └── export.ts             # pdf-lib export
│       │   ├── geometry.ts               # Coordinate transforms
│       │   ├── path-simplify.ts          # Ramer-Douglas-Peucker algorithm
│       │   └── storage.ts                # IndexedDB (Dexie)
│       ├── workers/
│       │   └── search-worker.ts          # Background text indexing
│       └── routes/
│           ├── index.tsx                 # Landing/upload
│           └── editor.$docId.tsx         # Editor page
│
└── backend/
    ├── src/
    │   ├── index.ts                      # Hono app entry
    │   ├── routes/
    │   │   ├── upload.ts                 # PDF upload endpoint
    │   │   └── documents.ts              # Document CRUD
    │   └── lib/
    │       └── storage.ts                # File storage
    ├── package.json
    └── tsconfig.json
```

---

## Priority Matrix

| Task | Category | Impact | Effort | Why |
|------|----------|--------|--------|-----|
| Ghost Preview Layer | UX | High | Low | Instant feedback, feels "delightful" |
| Pinch-to-Zoom | UX | High | Low | Essential for students on trackpads |
| Snap-to-Text Highlighting | UX | High | Medium | Eliminates jittery highlighting |
| Web Worker Search | Performance | High | Medium | Non-blocking text extraction |
| Lazy Annotation Rendering | Performance | High | Medium | Critical for 100+ page docs |
| Dark Mode PDF | UX | Medium | Low | Late-night studying feature |
| Ink Path Optimization | Performance | Medium | Low | Reduces file size significantly |
| Smart Delete | UX | Medium | Low | Prevents orphaned annotations |
| Page Reorder Export Fix | Bug Fix | High | Low | Completes page operations feature |
| WASM OCR | Feature | Medium | High | Makes scanned PDFs searchable |

---

## Verification Checklist

### Manual Testing
- [ ] Open 100+ page PDF, scroll smoothly, zoom in/out
- [ ] Select text, copy to clipboard, Cmd+F search works
- [ ] Add each annotation type, move/resize, change color
- [ ] Ctrl+Z/Ctrl+Shift+Z works for all operations
- [ ] Reorder thumbnails, rotate, delete page
- [ ] Download PDF with annotations visible in Adobe Reader
- [ ] Close tab, reopen, document state restored
- [ ] Pinch-to-zoom on trackpad works smoothly
- [ ] Dark mode toggle inverts PDF correctly
- [ ] Search finds text across all pages with snippets

### Test Files to Use
- Simple 1-page PDF
- 100+ page document (performance)
- PDF with existing annotations
- Scanned PDF (no text layer)
- PDF with rotated pages

---

## Known Issues & Solutions

| Issue | Status | Solution |
|-------|--------|----------|
| Text layer rendering | Open | `renderTextLayer` API has compatibility issues with PDF.js types |
| Annotation resize | Partial | Resize handles displayed, actual resize saving needs work |
| Search | In Progress | Use Web Worker + MiniSearch for full-text search across pages |
| Export reordering | **Solved** | Use `copyPages(srcDoc, newOrder)` to create new doc in correct order |

---

## Future Enhancements

- [ ] Form filling support
- [ ] Signature/stamp annotations
- [ ] Multi-user collaboration
- [ ] Cloud sync
- [ ] Mobile responsive design
- [ ] Bookmark navigation
- [ ] Outline/TOC display
- [ ] Print with annotations
- [ ] Annotation comments/replies
- [ ] AI-powered text summarization
- [ ] Voice annotations
- [ ] Measurement tools (ruler, area)
