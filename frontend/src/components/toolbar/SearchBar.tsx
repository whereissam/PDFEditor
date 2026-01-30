import { useRef, useEffect, useCallback, memo } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { Button } from '@/components/ui/button'
import { X, ChevronUp, ChevronDown } from 'lucide-react'

export const SearchBar = memo(function SearchBar() {
  const inputRef = useRef<HTMLInputElement>(null)

  const searchQuery = useEditorStore((s) => s.searchQuery)
  const searchResults = useEditorStore((s) => s.searchResults)
  const currentSearchIndex = useEditorStore((s) => s.currentSearchIndex)

  const setSearchQuery = useEditorStore((s) => s.setSearchQuery)
  const setSearchResults = useEditorStore((s) => s.setSearchResults)
  const navigateSearchResult = useEditorStore((s) => s.navigateSearchResult)
  const setSearchOpen = useEditorStore((s) => s.setSearchOpen)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Handle search input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value
      setSearchQuery(query)

      // In a real implementation, we would search through the PDF text content
      // For now, just clear results when query changes
      if (!query.trim()) {
        setSearchResults([])
      }
    },
    [setSearchQuery, setSearchResults]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false)
      } else if (e.key === 'Enter') {
        if (e.shiftKey) {
          navigateSearchResult('prev')
        } else {
          navigateSearchResult('next')
        }
      }
    },
    [setSearchOpen, navigateSearchResult]
  )

  const hasResults = searchResults.length > 0
  const resultText =
    searchResults.length === 0
      ? searchQuery.trim()
        ? 'No results'
        : ''
      : `${currentSearchIndex + 1} of ${searchResults.length}`

  return (
    <div className="absolute top-full right-2 mt-1 z-50 flex items-center gap-2 p-2 bg-background border border-border rounded-lg shadow-lg">
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Search in document..."
        className="w-64 px-3 py-1.5 text-sm border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
      />

      {resultText && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {resultText}
        </span>
      )}

      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateSearchResult('prev')}
          disabled={!hasResults}
          title="Previous result (Shift+Enter)"
          className="h-7 w-7"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateSearchResult('next')}
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
        onClick={() => setSearchOpen(false)}
        title="Close (Esc)"
        className="h-7 w-7"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
})
