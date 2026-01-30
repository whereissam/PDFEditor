import { useState, useCallback, useEffect, useRef } from 'react'
import {
  loadPDFFromFile,
  loadPDFFromUrl,
  getPage,
  getViewport,
  getTextContent,
  computeHash,
  type PDFDocumentProxy,
  type PDFPageProxy,
  type PageViewport,
  type TextContent,
} from '@/lib/pdf/loader'
import { useEditorStore } from '@/stores/editor-store'
import {
  getDocument,
  getDocumentByHash,
  saveDocument,
  getAnnotations,
} from '@/lib/storage'

export interface UsePDFDocumentReturn {
  document: PDFDocumentProxy | null
  isLoading: boolean
  error: string | null
  numPages: number
  loadFromFile: (file: File) => Promise<void>
  loadFromUrl: (url: string) => Promise<void>
  loadFromStorage: (documentId: string) => Promise<void>
  getPageData: (pageNumber: number) => Promise<PDFPageProxy>
  getPageViewport: (page: PDFPageProxy, scale: number, rotation?: number) => PageViewport
  getPageText: (page: PDFPageProxy) => Promise<TextContent>
  closeDocument: () => void
}

export function usePDFDocument(): UsePDFDocumentReturn {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState(0)

  const pdfDataRef = useRef<Uint8Array | null>(null)

  const loadDocument = useEditorStore((s) => s.loadDocument)
  const closeDoc = useEditorStore((s) => s.closeDocument)
  const storeSetLoading = useEditorStore((s) => s.setLoading)
  const storeSetError = useEditorStore((s) => s.setLoadError)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (document) {
        document.destroy()
      }
    }
  }, [document])

  const loadFromFile = useCallback(
    async (file: File) => {
      setIsLoading(true)
      storeSetLoading(true)
      setError(null)

      try {
        // Read file and compute hash
        const arrayBuffer = await file.arrayBuffer()
        const pdfData = new Uint8Array(arrayBuffer)
        const hash = await computeHash(arrayBuffer)

        // Check if we already have this document
        const existingDoc = await getDocumentByHash(hash)
        if (existingDoc) {
          // Load from storage
          await loadFromStorageInternal(existingDoc.id, pdfData)
          return
        }

        // Load as new document
        const result = await loadPDFFromFile(file)
        setDocument(result.document)
        setNumPages(result.numPages)
        pdfDataRef.current = pdfData

        // Save to store
        loadDocument(pdfData, hash, result.numPages)

        // Save to IndexedDB
        const docId = useEditorStore.getState().document?.id
        if (docId) {
          await saveDocument({
            id: docId,
            name: file.name,
            originalPdfHash: hash,
            pdfData,
            numPages: result.numPages,
            pageRotations: {},
            deletedPages: [],
            pageOrder: Array.from({ length: result.numPages }, (_, i) => i),
          })
        }

        setIsLoading(false)
        storeSetLoading(false)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load PDF'
        setError(message)
        storeSetError(message)
        setIsLoading(false)
      }
    },
    [loadDocument, storeSetLoading, storeSetError]
  )

  const loadFromUrl = useCallback(
    async (url: string) => {
      setIsLoading(true)
      storeSetLoading(true)
      setError(null)

      try {
        const result = await loadPDFFromUrl(url)
        setDocument(result.document)
        setNumPages(result.numPages)

        // Note: For URL loading, we don't have the raw data easily
        // In production, you'd fetch the data separately to get the hash
        loadDocument(new Uint8Array(0), result.fingerprint, result.numPages)

        setIsLoading(false)
        storeSetLoading(false)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load PDF'
        setError(message)
        storeSetError(message)
        setIsLoading(false)
      }
    },
    [loadDocument, storeSetLoading, storeSetError]
  )

  const loadFromStorageInternal = async (documentId: string, pdfData?: Uint8Array) => {
    const storedDoc = await getDocument(documentId)
    if (!storedDoc) {
      throw new Error('Document not found in storage')
    }

    const data = pdfData || storedDoc.pdfData
    const result = await loadPDFFromFile(
      new File([data], storedDoc.name, { type: 'application/pdf' })
    )

    setDocument(result.document)
    setNumPages(result.numPages)
    pdfDataRef.current = data

    // Load into store with saved state
    loadDocument(data, storedDoc.originalPdfHash, result.numPages)

    // Restore page operations
    const store = useEditorStore.getState()
    if (store.document) {
      store.document.pageRotations = storedDoc.pageRotations
      store.document.deletedPages = new Set(storedDoc.deletedPages)
      store.document.pageOrder = storedDoc.pageOrder
    }

    // Load annotations
    const annotations = await getAnnotations(documentId)
    for (const annotation of annotations) {
      store.annotations.set(annotation.id, annotation)
    }

    setIsLoading(false)
    storeSetLoading(false)
  }

  const loadFromStorage = useCallback(
    async (documentId: string) => {
      setIsLoading(true)
      storeSetLoading(true)
      setError(null)

      try {
        await loadFromStorageInternal(documentId)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load document'
        setError(message)
        storeSetError(message)
        setIsLoading(false)
      }
    },
    [storeSetLoading, storeSetError]
  )

  const getPageData = useCallback(
    async (pageNumber: number): Promise<PDFPageProxy> => {
      if (!document) {
        throw new Error('No document loaded')
      }
      return getPage(document, pageNumber)
    },
    [document]
  )

  const getPageViewport = useCallback(
    (page: PDFPageProxy, scale: number, rotation: number = 0): PageViewport => {
      return getViewport(page, scale, rotation)
    },
    []
  )

  const getPageText = useCallback(async (page: PDFPageProxy): Promise<TextContent> => {
    return getTextContent(page)
  }, [])

  const closeDocument = useCallback(() => {
    if (document) {
      document.destroy()
    }
    setDocument(null)
    setNumPages(0)
    pdfDataRef.current = null
    closeDoc()
  }, [document, closeDoc])

  return {
    document,
    isLoading,
    error,
    numPages,
    loadFromFile,
    loadFromUrl,
    loadFromStorage,
    getPageData,
    getPageViewport,
    getPageText,
    closeDocument,
  }
}
