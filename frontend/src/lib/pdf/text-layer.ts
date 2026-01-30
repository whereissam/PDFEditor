import { TextLayer } from 'pdfjs-dist'
import type { PDFPageProxy } from 'pdfjs-dist'

type PageViewport = ReturnType<PDFPageProxy['getViewport']>
type TextContent = Awaited<ReturnType<PDFPageProxy['getTextContent']>>

export interface TextLayerOptions {
  textContent: TextContent
  container: HTMLElement
  viewport: PageViewport
}

export function renderTextLayer(options: TextLayerOptions): { cancel: () => void } {
  const { textContent, container, viewport } = options

  // Clear existing content
  container.innerHTML = ''

  // Set container styles for proper positioning
  container.style.position = 'absolute'
  container.style.left = '0'
  container.style.top = '0'
  container.style.right = '0'
  container.style.bottom = '0'
  container.style.overflow = 'hidden'
  container.style.opacity = '0.25'
  container.style.lineHeight = '1.0'
  container.style.pointerEvents = 'auto'

  // Use PDF.js text layer builder
  const textLayerDiv = document.createElement('div')
  textLayerDiv.className = 'textLayer'
  container.appendChild(textLayerDiv)

  // PDF.js v5 uses TextLayer class
  const textLayer = new TextLayer({
    textContentSource: textContent,
    container: textLayerDiv,
    viewport,
  })

  textLayer.render()

  return {
    cancel: () => {
      textLayer.cancel()
    },
  }
}

export interface TextSelection {
  text: string
  pageIndex: number
  rects: DOMRect[]
  quadPoints: number[][]
}

export function getTextSelection(
  selection: Selection,
  textLayerContainer: HTMLElement,
  pageIndex: number,
  viewport: PageViewport
): TextSelection | null {
  if (selection.rangeCount === 0) return null

  const range = selection.getRangeAt(0)

  // Check if selection is within the text layer
  if (!textLayerContainer.contains(range.commonAncestorContainer)) {
    return null
  }

  const text = selection.toString()
  if (!text.trim()) return null

  // Get all client rects for the selection
  const clientRects = Array.from(range.getClientRects())
  const containerRect = textLayerContainer.getBoundingClientRect()

  // Convert to quadpoints (relative to viewport)
  const quadPoints: number[][] = clientRects.map((rect) => {
    // Get rect relative to container
    const x1 = rect.left - containerRect.left
    const y1 = rect.top - containerRect.top
    const x2 = rect.right - containerRect.left
    const y2 = rect.bottom - containerRect.top

    // Convert to PDF coordinates
    const [pdfX1, pdfY1] = viewport.convertToPdfPoint(x1, y1)
    const [pdfX2, pdfY2] = viewport.convertToPdfPoint(x2, y2)

    // QuadPoints: bottom-left, bottom-right, top-right, top-left
    return [pdfX1, pdfY1, pdfX2, pdfY1, pdfX2, pdfY2, pdfX1, pdfY2]
  })

  return {
    text,
    pageIndex,
    rects: clientRects.map((r) => DOMRect.fromRect(r)),
    quadPoints,
  }
}

export interface SearchMatch {
  pageIndex: number
  matchIndex: number
  text: string
  quadPoints: number[]
}

export interface SearchResult {
  totalMatches: number
  matches: SearchMatch[]
}

export async function searchInTextContent(
  textContent: TextContent,
  query: string,
  pageIndex: number
): Promise<SearchMatch[]> {
  if (!query.trim()) return []

  const matches: SearchMatch[] = []
  const lowerQuery = query.toLowerCase()

  // Combine all text items into a single string with position tracking
  let fullText = ''
  const itemPositions: { start: number; end: number; item: TextContent['items'][0] }[] = []

  for (const item of textContent.items) {
    if ('str' in item) {
      const start = fullText.length
      fullText += item.str
      itemPositions.push({
        start,
        end: fullText.length,
        item,
      })
    }
  }

  // Find all matches
  const lowerFullText = fullText.toLowerCase()
  let searchStart = 0
  let matchIndex = 0

  while (true) {
    const foundIndex = lowerFullText.indexOf(lowerQuery, searchStart)
    if (foundIndex === -1) break

    matches.push({
      pageIndex,
      matchIndex: matchIndex++,
      text: fullText.slice(foundIndex, foundIndex + query.length),
      // QuadPoints would need to be calculated based on item positions and transforms
      // This is a simplified version - real implementation would need item transform data
      quadPoints: [],
    })

    searchStart = foundIndex + 1
  }

  return matches
}

// CSS for the text layer
export const textLayerStyles = `
.textLayer {
  position: absolute;
  text-align: initial;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  opacity: 0.25;
  line-height: 1.0;
  -webkit-text-size-adjust: none;
  -moz-text-size-adjust: none;
  text-size-adjust: none;
  forced-color-adjust: none;
  transform-origin: 0 0;
  z-index: 2;
}

.textLayer ::selection {
  background: rgba(0, 0, 255, 0.3);
}

.textLayer br {
  user-select: none;
}

.textLayer span {
  color: transparent;
  position: absolute;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
}

.textLayer span.markedContent {
  top: 0;
  height: 0;
}

.textLayer .highlight {
  margin: -1px;
  padding: 1px;
  background-color: rgba(180, 0, 170, 0.4);
  border-radius: 4px;
}

.textLayer .highlight.appended {
  position: initial;
}

.textLayer .highlight.begin {
  border-radius: 4px 0 0 4px;
}

.textLayer .highlight.end {
  border-radius: 0 4px 4px 0;
}

.textLayer .highlight.middle {
  border-radius: 0;
}

.textLayer .highlight.selected {
  background-color: rgba(0, 100, 0, 0.4);
}

.textLayer .endOfContent {
  display: block;
  position: absolute;
  left: 0;
  top: 100%;
  right: 0;
  bottom: 0;
  z-index: -1;
  cursor: default;
  user-select: none;
}

.textLayer .endOfContent.active {
  top: 0;
}
`
