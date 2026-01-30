# PDF Editor

A modern, fast PDF editor for general consumers (students, individuals) with focus on annotation, page operations, and delightful UX.

## Features

- **PDF Viewing**: Smooth scrolling, zoom controls, page navigation
- **Annotations**: Highlight, underline, strikethrough, sticky notes, shapes, arrows, freehand drawing, text boxes
- **Page Operations**: Rotate, delete, reorder pages via drag-and-drop
- **Undo/Redo**: Full history support for all operations
- **Export**: Download edited PDF with annotations baked in
- **Persistence**: Auto-save to browser storage, resume where you left off
- **Keyboard Shortcuts**: H=highlight, N=note, R=rectangle, etc.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite + Tailwind v4 + TanStack Router |
| UI Components | shadcn/ui + Lucide icons |
| PDF Rendering | PDF.js |
| PDF Export | pdf-lib |
| State | Zustand (ops-log pattern) |
| Storage | IndexedDB (Dexie.js) |
| Backend | Bun + Hono |

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) v1.0+
- [Docker](https://www.docker.com/) (optional, for backend)

### Development

```bash
# Frontend (port 3110)
cd frontend
bun install
bun run dev

# Backend (port 3120)
cd backend
bun install
bun run dev
```

### Using Docker (Backend)

```bash
cd backend
docker build -t pdfeditor-backend .
docker run -p 3120:3120 -v $(pwd)/storage:/app/storage pdfeditor-backend
```

### Production Build

```bash
# Frontend
cd frontend
bun run build
bun run preview

# Backend
cd backend
bun run build
bun run start
```

## Project Structure

```
pdfeditor/
├── README.md
├── docs/
│   └── todo.md                 # Implementation tracking
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── stores/             # Zustand state
│   │   ├── lib/                # Utilities
│   │   └── routes/             # TanStack Router pages
│   ├── package.json
│   └── vite.config.ts
└── backend/                    # Hono API server
    ├── src/
    │   ├── index.ts            # Entry point
    │   ├── routes/             # API routes
    │   └── lib/                # Utilities
    ├── Dockerfile
    └── package.json
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `V` / `Esc` | Select tool |
| `H` | Highlight |
| `U` | Underline |
| `S` | Strikethrough |
| `N` | Sticky note |
| `R` | Rectangle |
| `O` | Ellipse |
| `A` | Arrow |
| `L` | Line |
| `P` | Pen (freehand) |
| `T` | Text box |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Cmd/Ctrl + F` | Search |
| `Cmd/Ctrl + +/-` | Zoom in/out |
| `PageUp/Down` | Navigate pages |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/upload` | Upload PDF file |
| GET | `/api/documents` | List all documents |
| GET | `/api/documents/:id` | Get document info |
| GET | `/api/documents/:id/download` | Download PDF |
| DELETE | `/api/documents/:id` | Delete document |

## Ports

| Service | Port |
|---------|------|
| Frontend | 3110 |
| Backend | 3120 |

## License

MIT
