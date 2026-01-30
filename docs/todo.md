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
- [ ] Implement search functionality (basic structure done, needs full text search)

### Phase 3: Annotations
- [x] Add highlight annotation (text-snapped)
- [x] Add underline/strikethrough annotations
- [x] Add shape annotations (rect, ellipse, arrow, line)
- [x] Add sticky note annotation
- [x] Add freehand ink annotation
- [x] Add text box annotation
- [x] Implement selection/move for annotations
- [ ] Implement resize for annotations (partial)
- [x] Add undo/redo system

### Phase 4: Page Operations
- [x] Create thumbnail sidebar
- [x] Add page rotation
- [x] Add page deletion
- [x] Add page reorder (drag-drop in sidebar)

### Phase 5: Export & Persistence
- [x] Implement PDF export with pdf-lib
- [x] Add IndexedDB persistence with Dexie.js
- [x] Auto-save functionality

### Phase 6: Polish
- [x] Keyboard shortcuts (H=highlight, N=note, etc.)
- [x] Drag-drop file upload
- [ ] Color picker improvements
- [ ] Better annotation style controls

### Phase 7: Backend (Optional for MVP)
- [x] Set up Hono backend structure
- [x] Upload endpoint
- [x] Document CRUD routes
- [ ] Cloud storage integration (future)

---

## Architecture

### 4-Layer Viewer Stack
```
┌─────────────────────────────────────────┐
│  Interaction Layer (hit-testing, cursor)│
├─────────────────────────────────────────┤
│  Annotation Overlay (SVG - shapes, ink) │
├─────────────────────────────────────────┤
│  Text Layer (DOM - selectable text)     │
├─────────────────────────────────────────┤
│  PDF Raster Layer (Canvas - PDF.js)     │
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
│       │   └── useHistory.ts             # Undo/redo
│       ├── stores/
│       │   └── editor-store.ts           # Zustand store
│       ├── lib/
│       │   ├── pdf/
│       │   │   ├── loader.ts             # PDF.js wrapper
│       │   │   ├── renderer.ts           # Page rendering
│       │   │   ├── text-layer.ts         # Text extraction
│       │   │   └── export.ts             # pdf-lib export
│       │   ├── geometry.ts               # Coordinate transforms
│       │   └── storage.ts                # IndexedDB (Dexie)
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

## Verification Checklist

### Manual Testing
- [ ] Open 100+ page PDF, scroll smoothly, zoom in/out
- [ ] Select text, copy to clipboard, Cmd+F search works
- [ ] Add each annotation type, move/resize, change color
- [ ] Ctrl+Z/Ctrl+Shift+Z works for all operations
- [ ] Reorder thumbnails, rotate, delete page
- [ ] Download PDF with annotations visible in Adobe Reader
- [ ] Close tab, reopen, document state restored

### Test Files to Use
- Simple 1-page PDF
- 100+ page document (performance)
- PDF with existing annotations
- Scanned PDF (no text layer)
- PDF with rotated pages

---

## Known Issues

1. **Text layer rendering**: The `renderTextLayer` API has compatibility issues with PDF.js types
2. **Annotation resize**: Resize handles are displayed but actual resize saving needs work
3. **Search**: Basic structure exists but full-text search across pages needs implementation
4. **Export reordering**: Page reordering is not preserved in PDF export (pdf-lib limitation)

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
