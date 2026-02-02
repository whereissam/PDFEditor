import MiniSearch from 'minisearch'

// Types for communication with main thread
export interface PageTextData {
  pageIndex: number
  text: string
  // Position mapping: array of { startOffset, endOffset, itemIndex }
  // Used to map search results back to text items for highlighting
  items: Array<{
    startOffset: number
    endOffset: number
    text: string
  }>
}

export interface SearchResult {
  pageIndex: number
  matchIndex: number
  text: string // The matched text
  snippet: string // Context around the match (3-4 words before/after)
  startOffset: number // Character offset in page text
  endOffset: number
}

export interface WorkerMessage {
  type: 'index' | 'search' | 'clear'
  payload?: {
    pages?: PageTextData[]
    query?: string
  }
}

export interface WorkerResponse {
  type: 'indexed' | 'results' | 'cleared' | 'error' | 'progress'
  payload?: {
    totalPages?: number
    indexedPages?: number
    results?: SearchResult[]
    error?: string
  }
}

// MiniSearch instance
let searchIndex: MiniSearch<{ id: string; pageIndex: number; text: string }> | null = null
let pageTexts: Map<number, PageTextData> = new Map()

// Initialize MiniSearch index
function createIndex() {
  return new MiniSearch<{ id: string; pageIndex: number; text: string }>({
    fields: ['text'],
    storeFields: ['pageIndex', 'text'],
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      boost: { text: 1 },
    },
  })
}

// Build index from page data
function indexPages(pages: PageTextData[]): void {
  searchIndex = createIndex()
  pageTexts.clear()

  const documents = pages.map((page) => {
    pageTexts.set(page.pageIndex, page)
    return {
      id: `page-${page.pageIndex}`,
      pageIndex: page.pageIndex,
      text: page.text,
    }
  })

  searchIndex.addAll(documents)
}

// Extract snippet with context around match
function extractSnippet(
  text: string,
  matchStart: number,
  matchEnd: number,
  contextWords: number = 4
): string {
  // Find word boundaries before match
  let snippetStart = matchStart
  let wordCount = 0
  while (snippetStart > 0 && wordCount < contextWords) {
    snippetStart--
    if (text[snippetStart] === ' ' || text[snippetStart] === '\n') {
      wordCount++
    }
  }
  // Move past the space
  if (snippetStart > 0) snippetStart++

  // Find word boundaries after match
  let snippetEnd = matchEnd
  wordCount = 0
  while (snippetEnd < text.length && wordCount < contextWords) {
    if (text[snippetEnd] === ' ' || text[snippetEnd] === '\n') {
      wordCount++
    }
    snippetEnd++
  }

  const prefix = snippetStart > 0 ? '...' : ''
  const suffix = snippetEnd < text.length ? '...' : ''

  return prefix + text.slice(snippetStart, snippetEnd).trim() + suffix
}

// Find all occurrences of query in text with positions
function findAllMatches(text: string, query: string): Array<{ start: number; end: number }> {
  const matches: Array<{ start: number; end: number }> = []
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase().trim()

  if (!lowerQuery) return matches

  let startIndex = 0
  while (true) {
    const index = lowerText.indexOf(lowerQuery, startIndex)
    if (index === -1) break
    matches.push({ start: index, end: index + lowerQuery.length })
    startIndex = index + 1
  }

  return matches
}

// Perform search
function search(query: string): SearchResult[] {
  if (!searchIndex || !query.trim()) {
    return []
  }

  const results: SearchResult[] = []
  const queryLower = query.toLowerCase().trim()

  // Use MiniSearch to find relevant pages
  const searchResults = searchIndex.search(query, {
    prefix: true,
    fuzzy: 0.2,
  })

  // For each matching page, find exact positions
  let globalMatchIndex = 0
  for (const result of searchResults) {
    const pageData = pageTexts.get(result.pageIndex)
    if (!pageData) continue

    // Find all occurrences in this page
    const matches = findAllMatches(pageData.text, queryLower)

    for (const match of matches) {
      const matchedText = pageData.text.slice(match.start, match.end)
      const snippet = extractSnippet(pageData.text, match.start, match.end, 4)

      results.push({
        pageIndex: result.pageIndex,
        matchIndex: globalMatchIndex++,
        text: matchedText,
        snippet,
        startOffset: match.start,
        endOffset: match.end,
      })
    }
  }

  // Also search in pages that MiniSearch might have missed (exact match fallback)
  const searchedPages = new Set(searchResults.map((r) => r.pageIndex))
  for (const [pageIndex, pageData] of pageTexts) {
    if (searchedPages.has(pageIndex)) continue

    const matches = findAllMatches(pageData.text, queryLower)
    for (const match of matches) {
      const matchedText = pageData.text.slice(match.start, match.end)
      const snippet = extractSnippet(pageData.text, match.start, match.end, 4)

      results.push({
        pageIndex,
        matchIndex: globalMatchIndex++,
        text: matchedText,
        snippet,
        startOffset: match.start,
        endOffset: match.end,
      })
    }
  }

  // Sort by page index, then by position within page
  results.sort((a, b) => {
    if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex
    return a.startOffset - b.startOffset
  })

  // Re-assign matchIndex after sorting
  results.forEach((r, i) => (r.matchIndex = i))

  return results
}

// Worker message handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data

  try {
    switch (type) {
      case 'index':
        if (payload?.pages) {
          indexPages(payload.pages)
          const response: WorkerResponse = {
            type: 'indexed',
            payload: { totalPages: payload.pages.length },
          }
          self.postMessage(response)
        }
        break

      case 'search':
        if (payload?.query !== undefined) {
          const results = search(payload.query)
          const response: WorkerResponse = {
            type: 'results',
            payload: { results },
          }
          self.postMessage(response)
        }
        break

      case 'clear':
        searchIndex = null
        pageTexts.clear()
        const response: WorkerResponse = { type: 'cleared' }
        self.postMessage(response)
        break

      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error) {
    const response: WorkerResponse = {
      type: 'error',
      payload: { error: error instanceof Error ? error.message : 'Unknown error' },
    }
    self.postMessage(response)
  }
}

export {}
