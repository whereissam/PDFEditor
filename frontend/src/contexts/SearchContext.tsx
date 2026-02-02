import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type {
  PageTextData,
  SearchResult,
  WorkerMessage,
  WorkerResponse,
} from '@/workers/search-worker'
import { useEditorStore } from '@/stores/editor-store'

// Import worker using Vite's worker import syntax
import SearchWorker from '@/workers/search-worker?worker'

interface SearchContextType {
  // State
  isIndexing: boolean
  isIndexed: boolean
  isSearching: boolean
  results: SearchResult[]
  currentResult: SearchResult | null
  totalResults: number
  currentIndex: number

  // Actions
  search: (query: string) => void
  nextResult: () => void
  prevResult: () => void
  goToResult: (index: number) => void
  clearSearch: () => void
}

const SearchContext = createContext<SearchContextType | null>(null)

interface SearchProviderProps {
  children: ReactNode
  pdfDocument: PDFDocumentProxy | null
}

export function SearchProvider({ children, pdfDocument }: SearchProviderProps) {
  const workerRef = useRef<Worker | null>(null)
  const [isIndexing, setIsIndexing] = useState(false)
  const [isIndexed, setIsIndexed] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const lastQueryRef = useRef<string>('')

  const setCurrentPage = useEditorStore((s) => s.setCurrentPage)

  // Initialize worker
  useEffect(() => {
    workerRef.current = new SearchWorker()

    workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, payload } = event.data

      switch (type) {
        case 'indexed':
          setIsIndexing(false)
          setIsIndexed(true)
          // If there was a pending search, execute it
          if (lastQueryRef.current) {
            const message: WorkerMessage = {
              type: 'search',
              payload: { query: lastQueryRef.current },
            }
            workerRef.current?.postMessage(message)
          }
          break
        case 'results':
          setResults(payload?.results || [])
          setCurrentIndex(payload?.results?.length ? 0 : -1)
          setIsSearching(false)
          // Navigate to first result
          if (payload?.results?.length) {
            setCurrentPage(payload.results[0].pageIndex + 1)
          }
          break
        case 'cleared':
          setResults([])
          setCurrentIndex(-1)
          setIsIndexed(false)
          break
        case 'error':
          console.error('Search worker error:', payload?.error)
          setIsIndexing(false)
          setIsSearching(false)
          break
      }
    }

    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [setCurrentPage])

  // Index document when it loads
  useEffect(() => {
    if (!pdfDocument || !workerRef.current) return

    const indexDocument = async () => {
      setIsIndexing(true)
      setIsIndexed(false)
      const pages: PageTextData[] = []

      // Extract text from all pages
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        try {
          const page = await pdfDocument.getPage(i)
          const textContent = await page.getTextContent()

          // Combine text items into a single string
          let text = ''
          const items: PageTextData['items'] = []

          for (const item of textContent.items) {
            if ('str' in item && item.str) {
              const startOffset = text.length
              text += item.str
              items.push({
                startOffset,
                endOffset: text.length,
                text: item.str,
              })
            }
          }

          pages.push({
            pageIndex: i - 1, // Convert to 0-indexed
            text,
            items,
          })
        } catch (error) {
          console.error(`Failed to extract text from page ${i}:`, error)
          pages.push({ pageIndex: i - 1, text: '', items: [] })
        }
      }

      // Send to worker for indexing
      const message: WorkerMessage = {
        type: 'index',
        payload: { pages },
      }
      workerRef.current?.postMessage(message)
    }

    indexDocument()
  }, [pdfDocument])

  // Perform search
  const search = useCallback((query: string) => {
    lastQueryRef.current = query

    if (!workerRef.current) return

    if (!query.trim()) {
      setResults([])
      setCurrentIndex(-1)
      setIsSearching(false)
      return
    }

    // If still indexing, wait for it to complete
    if (!isIndexed) {
      setIsSearching(true)
      return
    }

    setIsSearching(true)
    const message: WorkerMessage = {
      type: 'search',
      payload: { query },
    }
    workerRef.current.postMessage(message)
  }, [isIndexed])

  // Navigate to next result
  const nextResult = useCallback(() => {
    if (results.length === 0) return
    const newIndex = (currentIndex + 1) % results.length
    setCurrentIndex(newIndex)
    setCurrentPage(results[newIndex].pageIndex + 1)
  }, [results, currentIndex, setCurrentPage])

  // Navigate to previous result
  const prevResult = useCallback(() => {
    if (results.length === 0) return
    const newIndex = (currentIndex - 1 + results.length) % results.length
    setCurrentIndex(newIndex)
    setCurrentPage(results[newIndex].pageIndex + 1)
  }, [results, currentIndex, setCurrentPage])

  // Go to specific result
  const goToResult = useCallback(
    (index: number) => {
      if (index < 0 || index >= results.length) return
      setCurrentIndex(index)
      setCurrentPage(results[index].pageIndex + 1)
    },
    [results, setCurrentPage]
  )

  // Clear search
  const clearSearch = useCallback(() => {
    lastQueryRef.current = ''
    setResults([])
    setCurrentIndex(-1)
  }, [])

  // Current result
  const currentResult =
    currentIndex >= 0 && currentIndex < results.length ? results[currentIndex] : null

  const value: SearchContextType = {
    isIndexing,
    isIndexed,
    isSearching,
    results,
    currentResult,
    totalResults: results.length,
    currentIndex,
    search,
    nextResult,
    prevResult,
    goToResult,
    clearSearch,
  }

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

export function useSearchContext() {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearchContext must be used within a SearchProvider')
  }
  return context
}
