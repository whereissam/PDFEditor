import { useState, useCallback, useRef, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { FileUp, Upload, Clock, FileText, Trash2 } from 'lucide-react'
import { usePDFDocument } from '@/hooks/usePDFDocument'
import { getRecentDocuments, deleteDocument, type RecentDocument } from '@/lib/storage'
import { useEditorStore } from '@/stores/editor-store'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [recentDocs, setRecentDocs] = useState<RecentDocument[]>([])

  const { loadFromFile, isLoading, error } = usePDFDocument()

  // Load recent documents on mount
  useEffect(() => {
    getRecentDocuments(5).then((docs) => {
      setRecentDocs(docs)
    })
  }, [])

  // Handle file selection
  const handleFileSelect = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') {
        alert('Please select a PDF file')
        return
      }

      await loadFromFile(file)

      // Navigate to editor after loading
      const docId = useEditorStore.getState().document?.id
      if (docId) {
        navigate({ to: '/editor/$docId', params: { docId } })
      }
    },
    [loadFromFile, navigate]
  )

  // Handle file input change
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect]
  )

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect]
  )

  // Handle recent document click
  const handleRecentClick = useCallback(
    (docId: string) => {
      navigate({ to: '/editor/$docId', params: { docId } })
    },
    [navigate]
  )

  // Handle delete recent document
  const handleDeleteRecent = useCallback(async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation()
    if (confirm('Delete this document from history?')) {
      await deleteDocument(docId)
      setRecentDocs((prev) => prev.filter((d) => d.id !== docId))
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <FileText className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">PDF Editor</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Annotate, highlight, and edit your PDF documents right in the browser.
            Fast, simple, and secure - your files never leave your device.
          </p>
        </div>

        {/* Upload Area */}
        <div
          className={cn(
            'relative border-2 border-dashed rounded-xl p-12 text-center transition-all',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50',
            isLoading && 'opacity-50 pointer-events-none'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-4">
            <div
              className={cn(
                'p-4 rounded-full transition-colors',
                isDragging ? 'bg-primary/20' : 'bg-muted'
              )}
            >
              <Upload
                className={cn(
                  'h-8 w-8',
                  isDragging ? 'text-primary' : 'text-muted-foreground'
                )}
              />
            </div>

            <div>
              <p className="text-lg font-medium text-foreground mb-1">
                {isDragging ? 'Drop your PDF here' : 'Drag and drop a PDF file'}
              </p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>

            <Button
              size="lg"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <FileUp className="mr-2 h-5 w-5" />
              {isLoading ? 'Loading...' : 'Select PDF'}
            </Button>
          </div>

          {error && (
            <p className="mt-4 text-sm text-destructive">{error}</p>
          )}
        </div>

        {/* Recent Documents */}
        {recentDocs.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-medium text-foreground">Recent Documents</h2>
            </div>

            <div className="grid gap-2">
              {recentDocs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleRecentClick(doc.id)}
                  className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-accent transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">{doc.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.pageCount} pages • {formatDate(doc.updatedAt)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteRecent(e, doc.id)}
                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 rounded-lg transition-all"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="mt-16 grid sm:grid-cols-3 gap-6">
          <div className="text-center p-6">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full w-fit mx-auto mb-4">
              <span className="text-2xl">✏️</span>
            </div>
            <h3 className="font-semibold text-foreground mb-2">Annotate</h3>
            <p className="text-sm text-muted-foreground">
              Highlight, underline, strikethrough, add notes and shapes
            </p>
          </div>

          <div className="text-center p-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full w-fit mx-auto mb-4">
              <span className="text-2xl">📄</span>
            </div>
            <h3 className="font-semibold text-foreground mb-2">Organize</h3>
            <p className="text-sm text-muted-foreground">
              Rotate, delete, and reorder pages with drag and drop
            </p>
          </div>

          <div className="text-center p-6">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full w-fit mx-auto mb-4">
              <span className="text-2xl">💾</span>
            </div>
            <h3 className="font-semibold text-foreground mb-2">Save</h3>
            <p className="text-sm text-muted-foreground">
              Download edited PDF with all annotations baked in
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`

  return date.toLocaleDateString()
}
