import { useState, useEffect, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PDFViewer } from '@/components/pdf-viewer/PDFViewer'
import { Toolbar } from '@/components/toolbar/Toolbar'
import { usePDFDocument } from '@/hooks/usePDFDocument'
import { useEditorStore } from '@/stores/editor-store'
import { useAutoSave } from '@/hooks/useHistory'
import { exportPDF, downloadPDF } from '@/lib/pdf/export'
import { getDocument } from '@/lib/storage'
import { SearchProvider } from '@/contexts/SearchContext'
import { Loader2, AlertCircle, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PDFDocumentProxy } from 'pdfjs-dist'

export const Route = createFileRoute('/editor/$docId')({
  component: EditorPage,
})

function EditorPage() {
  const params = Route.useParams()
  const docId = params.docId
  const navigate = useNavigate()

  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const { loadFromStorage } = usePDFDocument()
  const storeDocument = useEditorStore((s) => s.document)
  const annotations = useEditorStore((s) => s.annotations)
  const isLoading = useEditorStore((s) => s.isLoading)

  // Auto-save annotations
  useAutoSave(docId, 2000)

  // Load document on mount
  useEffect(() => {
    const loadDoc = async () => {
      try {
        // Check if document exists in storage
        const storedDoc = await getDocument(docId)

        if (storedDoc) {
          await loadFromStorage(docId)
        } else if (storeDocument?.id === docId) {
          // Document is already loaded in memory (came from file upload)
        } else {
          setLoadError('Document not found')
          return
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load document')
      }
    }

    loadDoc()
  }, [docId, loadFromStorage, storeDocument])

  // Get PDF.js document when store document changes
  useEffect(() => {
    if (storeDocument?.pdfData && storeDocument.pdfData.length > 0) {
      import('pdfjs-dist').then(async (pdfjsLib) => {
        const pdfData = storeDocument.pdfData
        if (!pdfData) return
        const loadingTask = pdfjsLib.getDocument({ data: pdfData })
        const doc = await loadingTask.promise
        setPdfDocument(doc)
      }).catch((err) => {
        setLoadError(err.message || 'Failed to initialize PDF viewer')
      })
    }
  }, [storeDocument?.pdfData])

  // Handle export
  const handleExport = useCallback(async () => {
    if (!storeDocument?.pdfData) return

    try {
      const annotationsArray = Array.from(annotations.values())
      const exportedPdf = await exportPDF({
        pdfData: storeDocument.pdfData,
        annotations: annotationsArray,
        pageRotations: storeDocument.pageRotations,
        pageOrder: storeDocument.pageOrder,
        deletedPages: storeDocument.deletedPages,
      })

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
      const filename = `edited_${timestamp}.pdf`

      await downloadPDF(exportedPdf, filename)
    } catch (err) {
      console.error('Export failed:', err)
      alert('Failed to export PDF: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }, [storeDocument, annotations])

  // Handle go home
  const handleGoHome = useCallback(() => {
    navigate({ to: '/' })
  }, [navigate])

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (loadError) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="p-4 bg-destructive/10 rounded-full">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Failed to Load</h2>
          <p className="text-muted-foreground">{loadError}</p>
          <Button onClick={handleGoHome}>
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  // No document state
  if (!storeDocument || !pdfDocument) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <p className="text-muted-foreground">No document loaded</p>
          <Button onClick={handleGoHome}>
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <SearchProvider pdfDocument={pdfDocument}>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        <Toolbar onExport={handleExport} />
        <PDFViewer pdfDocument={pdfDocument} className="flex-1" />
      </div>
    </SearchProvider>
  )
}
