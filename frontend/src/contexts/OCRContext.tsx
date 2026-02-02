import {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  type ReactNode,
} from 'react'
import { createWorker, type Worker } from 'tesseract.js'
import type { PDFDocumentProxy } from 'pdfjs-dist'

export interface OCRPageResult {
  pageIndex: number
  text: string
  confidence: number
  status: 'pending' | 'processing' | 'completed' | 'error'
  error?: string
}

interface OCRContextType {
  // State
  isInitialized: boolean
  isProcessing: boolean
  progress: number // 0-100
  currentPage: number | null
  results: Map<number, OCRPageResult>

  // Actions
  initializeOCR: () => Promise<void>
  runOCROnPage: (
    pdfDocument: PDFDocumentProxy,
    pageNumber: number,
    scale?: number
  ) => Promise<OCRPageResult>
  runOCROnAllPages: (
    pdfDocument: PDFDocumentProxy,
    pagesWithoutText: number[],
    scale?: number
  ) => Promise<void>
  cancelOCR: () => void
  getPageOCRText: (pageIndex: number) => string | null
  terminateOCR: () => Promise<void>
}

const OCRContext = createContext<OCRContextType | null>(null)

interface OCRProviderProps {
  children: ReactNode
}

export function OCRProvider({ children }: OCRProviderProps) {
  const workerRef = useRef<Worker | null>(null)
  const cancelledRef = useRef(false)

  const [isInitialized, setIsInitialized] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentPage, setCurrentPage] = useState<number | null>(null)
  const [results, setResults] = useState<Map<number, OCRPageResult>>(new Map())

  // Initialize Tesseract worker
  const initializeOCR = useCallback(async () => {
    if (workerRef.current) return

    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100))
          }
        },
      })

      workerRef.current = worker
      setIsInitialized(true)
    } catch (error) {
      console.error('Failed to initialize OCR:', error)
      throw error
    }
  }, [])

  // Convert PDF page to image data
  const pageToImageData = useCallback(
    async (
      pdfDocument: PDFDocumentProxy,
      pageNumber: number,
      scale: number = 2
    ): Promise<string> => {
      const page = await pdfDocument.getPage(pageNumber)
      const viewport = page.getViewport({ scale })

      // Create canvas
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!
      canvas.width = viewport.width
      canvas.height = viewport.height

      // Render page to canvas
      await page.render({
        canvasContext: context,
        viewport,
        canvas,
      }).promise

      // Convert to data URL
      return canvas.toDataURL('image/png')
    },
    []
  )

  // Run OCR on a single page
  const runOCROnPage = useCallback(
    async (
      pdfDocument: PDFDocumentProxy,
      pageNumber: number,
      scale: number = 2
    ): Promise<OCRPageResult> => {
      const pageIndex = pageNumber - 1

      // Update status
      setResults((prev) => {
        const newResults = new Map(prev)
        newResults.set(pageIndex, {
          pageIndex,
          text: '',
          confidence: 0,
          status: 'processing',
        })
        return newResults
      })

      setCurrentPage(pageNumber)
      setProgress(0)

      try {
        // Initialize if needed
        if (!workerRef.current) {
          await initializeOCR()
        }

        // Convert page to image
        const imageData = await pageToImageData(pdfDocument, pageNumber, scale)

        // Run OCR
        const result = await workerRef.current!.recognize(imageData)

        const ocrResult: OCRPageResult = {
          pageIndex,
          text: result.data.text,
          confidence: result.data.confidence,
          status: 'completed',
        }

        // Update results
        setResults((prev) => {
          const newResults = new Map(prev)
          newResults.set(pageIndex, ocrResult)
          return newResults
        })

        return ocrResult
      } catch (error) {
        const errorResult: OCRPageResult = {
          pageIndex,
          text: '',
          confidence: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'OCR failed',
        }

        setResults((prev) => {
          const newResults = new Map(prev)
          newResults.set(pageIndex, errorResult)
          return newResults
        })

        return errorResult
      } finally {
        setProgress(100)
      }
    },
    [initializeOCR, pageToImageData]
  )

  // Run OCR on multiple pages
  const runOCROnAllPages = useCallback(
    async (
      pdfDocument: PDFDocumentProxy,
      pagesWithoutText: number[],
      scale: number = 2
    ) => {
      if (pagesWithoutText.length === 0) return

      setIsProcessing(true)
      cancelledRef.current = false

      try {
        // Initialize if needed
        if (!workerRef.current) {
          await initializeOCR()
        }

        for (let i = 0; i < pagesWithoutText.length; i++) {
          if (cancelledRef.current) break

          const pageNumber = pagesWithoutText[i]
          await runOCROnPage(pdfDocument, pageNumber, scale)

          // Overall progress
          setProgress(Math.round(((i + 1) / pagesWithoutText.length) * 100))
        }
      } finally {
        setIsProcessing(false)
        setCurrentPage(null)
      }
    },
    [initializeOCR, runOCROnPage]
  )

  // Cancel ongoing OCR
  const cancelOCR = useCallback(() => {
    cancelledRef.current = true
    setIsProcessing(false)
    setCurrentPage(null)
  }, [])

  // Get OCR text for a page
  const getPageOCRText = useCallback(
    (pageIndex: number): string | null => {
      const result = results.get(pageIndex)
      if (result?.status === 'completed') {
        return result.text
      }
      return null
    },
    [results]
  )

  // Terminate worker
  const terminateOCR = useCallback(async () => {
    if (workerRef.current) {
      await workerRef.current.terminate()
      workerRef.current = null
      setIsInitialized(false)
    }
  }, [])

  const value: OCRContextType = {
    isInitialized,
    isProcessing,
    progress,
    currentPage,
    results,
    initializeOCR,
    runOCROnPage,
    runOCROnAllPages,
    cancelOCR,
    getPageOCRText,
    terminateOCR,
  }

  return <OCRContext.Provider value={value}>{children}</OCRContext.Provider>
}

export function useOCRContext() {
  const context = useContext(OCRContext)
  if (!context) {
    throw new Error('useOCRContext must be used within an OCRProvider')
  }
  return context
}
