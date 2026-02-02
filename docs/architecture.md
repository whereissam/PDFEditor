# PDF Editor Architecture

## Overview

A modern, client-side PDF editor built for general consumers (students, individuals) with focus on annotation, page operations, and delightful UX. The architecture prioritizes performance for 100+ page documents and works entirely in the browser.

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | React 19 + TypeScript | UI components |
| Build | Vite | Fast development and bundling |
| Styling | Tailwind CSS v4 + shadcn/ui | Utility-first CSS with accessible components |
| Routing | TanStack Router | Type-safe file-based routing |
| State | Zustand | Global state with ops-log pattern |
| PDF Rendering | PDF.js | Industry-standard PDF rendering |
| PDF Export | pdf-lib | Client-side PDF manipulation |
| Search | MiniSearch + Web Worker | Full-text search without blocking UI |
| OCR | Tesseract.js (WASM) | Scanned PDF text extraction |
| Storage | IndexedDB (Dexie.js) | Local document persistence |
| Backend | Bun + Hono | Optional REST API |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Browser                                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      React Application                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │  │
│  │  │   Toolbar   │  │  Sidebar    │  │    PDF Viewer       │   │  │
│  │  │  (controls) │  │ (thumbnails)│  │   (page stack)      │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘   │  │
│  │                           │                                    │  │
│  │                    ┌──────▼──────┐                            │  │
│  │                    │   Zustand   │                            │  │
│  │                    │   Store     │                            │  │
│  │                    └──────┬──────┘                            │  │
│  └───────────────────────────┼───────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────┼───────────────────────────────────┐  │
│  │                     Web Workers                                │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │  │
│  │  │   Search    │  │    OCR      │  │    PDF.js Worker    │   │  │
│  │  │   Worker    │  │   Worker    │  │    (rendering)      │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────▼───────────────────────────────────┐  │
│  │                      IndexedDB                                 │  │
│  │              (documents, annotations, settings)                │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4-Layer Viewer Stack

The PDF viewer uses a layered architecture for rendering and interaction:

```
┌─────────────────────────────────────────┐
│  Interaction Layer (hit-testing)        │  ← Mouse/touch events, cursor
├─────────────────────────────────────────┤
│  Annotation Overlay (SVG)               │  ← Shapes, ink, highlights
├─────────────────────────────────────────┤
│  Text Layer (DOM spans)                 │  ← Selectable text, search highlights
├─────────────────────────────────────────┤
│  PDF Raster Layer (Canvas)              │  ← PDF.js rendered page
└─────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| Interaction | React event handlers | Mouse/touch events, tool-based cursor changes |
| Annotation | SVG | Renders all annotation types with selection/resize handles |
| Text | DOM (invisible spans) | PDF.js text layer for selection and search |
| Raster | Canvas | PDF.js renders page content at device pixel ratio |

### Ghost Preview Layer

During annotation creation, a temporary preview layer provides immediate visual feedback:

```
┌─────────────────────────────────────────┐
│  Ghost Layer (SVG with glow filter)     │  ← Low-opacity preview while drawing
├─────────────────────────────────────────┤
│  ... rest of stack ...                  │
└─────────────────────────────────────────┘
```

---

## State Management

### Zustand Store Architecture

```typescript
EditorStore
├── Document State
│   ├── document: DocumentState | null
│   ├── isLoading: boolean
│   └── loadError: string | null
│
├── View State
│   ├── currentPage: number
│   ├── scale: number
│   ├── scaleMode: 'fit-width' | 'fit-page' | 'custom'
│   └── pdfDarkMode: boolean
│
├── Tool State
│   ├── activeTool: Tool
│   └── toolStyle: AnnotationStyle
│
├── Annotation State
│   ├── annotations: Map<string, Annotation>
│   └── selectedAnnotationIds: Set<string>
│
├── History (Ops-Log)
│   ├── operations: Operation[]
│   ├── undoStack: Operation[]
│   └── redoStack: Operation[]
│
└── UI State
    ├── isThumbnailSidebarOpen: boolean
    ├── isSearchOpen: boolean
    └── searchQuery/Results/Index
```

### Ops-Log Pattern

All changes are recorded as operations for undo/redo:

```typescript
type Operation =
  | AddAnnotationOperation
  | UpdateAnnotationOperation
  | DeleteAnnotationOperation
  | RotatePageOperation
  | DeletePageOperation
  | ReorderPagesOperation
```

Each operation stores enough data to reverse it:
- `AddAnnotation`: stores the annotation (undo = delete)
- `UpdateAnnotation`: stores previous state (undo = restore)
- `DeleteAnnotation`: stores the annotation (undo = re-add)

---

## Component Hierarchy

```
App
├── ThemeProvider
└── RouterProvider
    └── EditorPage
        ├── OCRProvider
        │   └── SearchProvider
        │       ├── Toolbar
        │       │   ├── Navigation (page, zoom)
        │       │   ├── AnnotationTools
        │       │   ├── PageTools
        │       │   └── SearchBar
        │       │
        │       └── PDFViewer
        │           ├── ThumbnailSidebar
        │           └── PageRenderer[] (virtualized)
        │               ├── Canvas (PDF raster)
        │               ├── TextLayer
        │               └── AnnotationLayer
        │                   ├── HighlightAnnotation
        │                   ├── ShapeAnnotation
        │                   ├── NoteAnnotation
        │                   └── InkAnnotation
```

---

## Performance Optimizations

### 1. Lazy Rendering with Intersection Observer

Only pages near the viewport render TextLayer and AnnotationLayer:

```typescript
// PageRenderer.tsx
const observer = new IntersectionObserver(
  (entries) => {
    setIsNearViewport(entry.isIntersecting)
  },
  { rootMargin: '200% 0px' } // Pre-render buffer
)
```

### 2. Web Worker Search

Text extraction and indexing runs in a separate thread:

```
Main Thread                    Worker Thread
     │                              │
     │──── index pages ────────────▶│
     │                              │ Build MiniSearch index
     │◀──── indexed ────────────────│
     │                              │
     │──── search(query) ──────────▶│
     │                              │ Find matches
     │◀──── results[] ──────────────│
```

### 3. Ink Path Simplification

Ramer-Douglas-Peucker algorithm reduces freehand path points:

```
Before: 1000+ points from mousemove
After:  ~50 essential points
Result: Same visual quality, smaller file size
```

### 4. Canvas Rendering

- Device pixel ratio support for sharp rendering
- Render task cancellation on page change
- Only render visible pages

---

## Data Flow

### Annotation Creation Flow

```
1. User selects tool (e.g., rectangle)
   └── setActiveTool('rectangle')

2. User draws on page
   └── AnnotationLayer handles mousedown/move/up
   └── Ghost preview shows shape in real-time

3. Mouse up finalizes annotation
   └── useAnnotations.addRectangle()
   └── Converts viewport coords → PDF coords
   └── addAnnotation() in store

4. Store updates
   └── Creates AddAnnotationOperation
   └── Pushes to operations[] and undoStack[]
   └── Clears redoStack[]

5. Component re-renders
   └── AnnotationLayer receives updated annotations
   └── Renders ShapeAnnotation component
```

### Search Flow

```
1. Document loads
   └── SearchProvider extracts text from all pages
   └── Sends to Web Worker for indexing

2. User types in SearchBar
   └── Debounced (200ms) search trigger
   └── Worker searches MiniSearch index

3. Results returned
   └── SearchContext updates results[]
   └── SearchBar shows snippets dropdown
   └── Page navigation on result click
```

---

## File Organization

```
frontend/src/
├── components/
│   ├── pdf-viewer/          # Viewer components
│   ├── toolbar/             # Toolbar components
│   ├── annotations/         # Annotation renderers
│   └── ui/                  # shadcn/ui components
│
├── contexts/
│   ├── SearchContext.tsx    # Search state & Web Worker
│   └── OCRContext.tsx       # Tesseract.js integration
│
├── hooks/
│   ├── usePDFDocument.ts    # PDF.js loading
│   ├── useAnnotations.ts    # Annotation CRUD
│   ├── useViewport.ts       # Zoom, scroll, pinch
│   └── useHistory.ts        # Undo/redo, auto-save
│
├── stores/
│   └── editor-store.ts      # Zustand store
│
├── lib/
│   ├── pdf/                 # PDF.js & pdf-lib utilities
│   ├── geometry.ts          # Coordinate transforms
│   └── storage.ts           # IndexedDB (Dexie)
│
├── workers/
│   └── search-worker.ts     # MiniSearch indexing
│
└── routes/
    ├── index.tsx            # Landing page
    └── editor.$docId.tsx    # Editor page
```

---

## Coordinate Systems

The editor works with two coordinate systems:

### PDF Coordinates (Storage)
- Origin at bottom-left of page
- Units in PDF points (1/72 inch)
- All annotations stored in PDF coordinates

### Viewport Coordinates (Display)
- Origin at top-left of rendered page
- Units in CSS pixels (scaled by zoom)
- Used for rendering and hit-testing

### Conversion Functions

```typescript
// geometry.ts
viewportToPdf(point, viewport)    // Display → Storage
pdfToViewport(point, viewport)    // Storage → Display
rectViewportToPdf(rect, viewport)
rectPdfToViewport(rect, viewport)
```

---

## Security Considerations

- All PDF processing happens client-side
- No sensitive data sent to server (offline-first)
- IndexedDB storage is origin-sandboxed
- PDF.js handles malformed PDFs safely

---

## Future Architecture Considerations

### Multi-user Collaboration
- Would require WebSocket server for real-time sync
- CRDT or OT for conflict resolution
- Presence indicators for cursor positions

### Cloud Storage
- Backend API for document storage
- Sync mechanism with local IndexedDB
- Conflict resolution strategy

### Mobile Support
- Touch event handling for annotations
- Responsive toolbar layout
- Gesture recognition (pinch, pan)
