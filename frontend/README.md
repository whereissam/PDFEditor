# PDF Editor

A modern, fast PDF editor for general consumers (students, individuals) with focus on annotation, page operations, and delightful UX. Built entirely in the browser with no server-side PDF processing required.

## Features

### Core Features
- **PDF Viewing** - Smooth scrolling, zoom (pinch-to-zoom supported), fit-to-width/page
- **Text Selection** - Select and copy text from PDFs
- **Full-Text Search** - Fast search with contextual snippets and result navigation
- **Dark Mode** - Invert PDF colors for comfortable night reading

### Annotations
- **Highlight/Underline/Strikethrough** - Text-snapped markup with color customization
- **Shapes** - Rectangle, ellipse, arrow, line with resize handles
- **Sticky Notes** - Pop-up notes with editable content
- **Freehand Ink** - Draw with optimized path compression
- **Text Box** - Add custom text with font controls

### Page Operations
- **Thumbnail Sidebar** - Visual page navigation with drag-drop reordering
- **Page Rotation** - Rotate individual pages 90°
- **Page Deletion** - Remove unwanted pages

### Advanced Features
- **OCR** - Extract text from scanned PDFs using Tesseract.js
- **Undo/Redo** - Full history with Ctrl+Z/Ctrl+Shift+Z
- **Auto-Save** - Automatic persistence to IndexedDB
- **Export** - Download annotated PDF with embedded annotations

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| Tailwind CSS v4 | Styling |
| shadcn/ui | Component library |
| TanStack Router | Routing |
| Zustand | State management |
| PDF.js | PDF rendering |
| pdf-lib | PDF export |
| MiniSearch | Full-text search |
| Tesseract.js | OCR |
| Dexie.js | IndexedDB wrapper |

## Getting Started

### Prerequisites
- Node.js 20+ or Bun 1.0+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd pdfeditor/frontend

# Install dependencies
bun install

# Start development server
bun run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```bash
bun run build
bun run preview
```

## Project Structure

```
src/
├── components/
│   ├── pdf-viewer/          # PDF rendering components
│   │   ├── PDFViewer.tsx    # Main viewer container
│   │   ├── PageRenderer.tsx # Individual page renderer
│   │   ├── TextLayer.tsx    # Selectable text overlay
│   │   ├── AnnotationLayer.tsx # SVG annotation overlay
│   │   └── ThumbnailSidebar.tsx
│   ├── toolbar/             # Toolbar components
│   │   ├── Toolbar.tsx
│   │   ├── AnnotationTools.tsx
│   │   ├── PageTools.tsx
│   │   └── SearchBar.tsx
│   ├── annotations/         # Annotation renderers
│   └── ui/                  # shadcn/ui components
│
├── contexts/
│   ├── SearchContext.tsx    # Search with Web Worker
│   └── OCRContext.tsx       # Tesseract.js integration
│
├── hooks/
│   ├── usePDFDocument.ts    # PDF.js loading
│   ├── useAnnotations.ts    # Annotation CRUD
│   ├── useViewport.ts       # Zoom, scroll, gestures
│   └── useHistory.ts        # Undo/redo, auto-save
│
├── stores/
│   └── editor-store.ts      # Zustand state
│
├── lib/
│   ├── pdf/                 # PDF utilities
│   │   ├── loader.ts        # PDF.js wrapper
│   │   ├── renderer.ts      # Page rendering
│   │   ├── text-layer.ts    # Text extraction
│   │   └── export.ts        # pdf-lib export
│   ├── geometry.ts          # Coordinate transforms
│   └── storage.ts           # IndexedDB persistence
│
├── workers/
│   └── search-worker.ts     # MiniSearch indexing
│
└── routes/
    ├── index.tsx            # Landing page
    └── editor.$docId.tsx    # Editor page
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `V` / `Escape` | Select tool |
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
| `Cmd/Ctrl + +/-` | Zoom in/out |
| `Delete` | Delete selected |

## Architecture

The PDF viewer uses a 4-layer stack:

```
┌─────────────────────────────────────┐
│ Interaction Layer (events)          │
├─────────────────────────────────────┤
│ Annotation Layer (SVG)              │
├─────────────────────────────────────┤
│ Text Layer (DOM)                    │
├─────────────────────────────────────┤
│ PDF Raster Layer (Canvas)           │
└─────────────────────────────────────┘
```

See [docs/architecture.md](../docs/architecture.md) for detailed documentation.

## Performance

- **Lazy Rendering** - Only pages near viewport render text/annotation layers
- **Web Worker Search** - Text indexing doesn't block UI
- **Ink Optimization** - Ramer-Douglas-Peucker algorithm reduces path points
- **Device Pixel Ratio** - Sharp rendering on HiDPI displays

## Documentation

- [Architecture](../docs/architecture.md) - System design and data flow
- [API Reference](../docs/api.md) - Component and hook documentation
- [TODO](../docs/todo.md) - Implementation roadmap

## Scripts

```bash
bun run dev      # Start dev server
bun run build    # Build for production
bun run preview  # Preview production build
bun run lint     # Run ESLint
```

## Browser Support

- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

## License

MIT License
