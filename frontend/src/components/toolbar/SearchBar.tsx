import { useRef, useEffect, useCallback, useState, memo } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { useSearchContext } from '@/contexts/SearchContext'
import { Button } from '@/components/ui/button'
import { X, ChevronUp, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SearchResult } from '@/workers/search-worker'

export const SearchBar = memo(function SearchBar() {
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setSearchOpen = useEditorStore((s) => s.setSearchOpen)

  const {
    isIndexing,
    isSearching,
    results,
    currentIndex,
    totalResults,
    search,
    nextResult,
    prevResult,
    goToResult,
    clearSearch,
  } = useSearchContext()

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Handle search input change with debounce
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value
      setQuery(newQuery)

      // Clear previous debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      // Debounce search
      debounceRef.current = setTimeout(() => {
        search(newQuery)
        if (newQuery.trim()) {
          setShowResults(true)
        }
      }, 200)
    },
    [search]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showResults) {
          setShowResults(false)
        } else {
          clearSearch()
          setSearchOpen(false)
        }
      } else if (e.key === 'Enter') {
        if (e.shiftKey) {
          prevResult()
        } else {
          nextResult()
        }
      } else if (e.key === 'ArrowDown' && showResults && results.length > 0) {
        e.preventDefault()
        const next = (currentIndex + 1) % results.length
        goToResult(next)
      } else if (e.key === 'ArrowUp' && showResults && results.length > 0) {
        e.preventDefault()
        const prev = (currentIndex - 1 + results.length) % results.length
        goToResult(prev)
      }
    },
    [
      showResults,
      results.length,
      currentIndex,
      clearSearch,
      setSearchOpen,
      prevResult,
      nextResult,
      goToResult,
    ]
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Highlight match in snippet
  const highlightMatch = (snippet: string, matchText: string) => {
    const lowerSnippet = snippet.toLowerCase()
    const lowerMatch = matchText.toLowerCase()
    const index = lowerSnippet.indexOf(lowerMatch)

    if (index === -1) return snippet

    const before = snippet.slice(0, index)
    const match = snippet.slice(index, index + matchText.length)
    const after = snippet.slice(index + matchText.length)

    return (
      <>
        {before}
        <mark className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">{match}</mark>
        {after}
      </>
    )
  }

  const handleResultClick = (index: number) => {
    goToResult(index)
    setShowResults(false)
  }

  const handleClose = () => {
    clearSearch()
    setSearchOpen(false)
  }

  const isLoading = isIndexing || isSearching
  const hasResults = results.length > 0
  const resultText = isIndexing
    ? 'Indexing...'
    : isSearching
      ? 'Searching...'
      : totalResults === 0
        ? query.trim()
          ? 'No results'
          : ''
        : `${currentIndex + 1} of ${totalResults}`

  return (
    <div className="absolute top-full right-2 mt-1 z-50" ref={resultsRef}>
      {/* Search input bar */}
      <div className="flex items-center gap-2 p-2 bg-background border border-border rounded-lg shadow-lg">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => query.trim() && setShowResults(true)}
            placeholder="Search in document..."
            className="w-64 px-3 py-1.5 text-sm border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {isLoading && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {resultText && (
          <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[60px]">
            {resultText}
          </span>
        )}

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevResult}
            disabled={!hasResults}
            title="Previous result (Shift+Enter)"
            className="h-7 w-7"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={nextResult}
            disabled={!hasResults}
            title="Next result (Enter)"
            className="h-7 w-7"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          title="Close (Esc)"
          className="h-7 w-7"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Results dropdown with snippets */}
      {showResults && hasResults && (
        <div className="mt-1 max-h-80 overflow-y-auto bg-background border border-border rounded-lg shadow-lg">
          {results.slice(0, 50).map((result, index) => (
            <SearchResultItem
              key={`${result.pageIndex}-${result.matchIndex}`}
              result={result}
              index={index}
              isActive={index === currentIndex}
              query={query}
              onClick={() => handleResultClick(index)}
              highlightMatch={highlightMatch}
            />
          ))}
          {results.length > 50 && (
            <div className="px-3 py-2 text-xs text-muted-foreground text-center border-t">
              Showing 50 of {results.length} results
            </div>
          )}
        </div>
      )}
    </div>
  )
})

// Individual search result item
interface SearchResultItemProps {
  result: SearchResult
  index: number
  isActive: boolean
  query: string
  onClick: () => void
  highlightMatch: (snippet: string, matchText: string) => React.ReactNode
}

const SearchResultItem = memo(function SearchResultItem({
  result,
  isActive,
  query,
  onClick,
  highlightMatch,
}: SearchResultItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors',
        'border-b border-border/50 last:border-0',
        isActive && 'bg-muted'
      )}
    >
      <div className="flex items-start gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">
          Page {result.pageIndex + 1}
        </span>
        <p className="text-sm text-foreground/90 line-clamp-2">
          {highlightMatch(result.snippet, query)}
        </p>
      </div>
    </button>
  )
})
