import type { PDFPageProxy } from 'pdfjs-dist'
import type { Point, Rect } from '@/stores/editor-store'

type PageViewport = ReturnType<PDFPageProxy['getViewport']>

// Convert a point from viewport (screen) coordinates to PDF coordinates
export function viewportToPdf(
  viewportPoint: Point,
  viewport: PageViewport
): Point {
  const [x, y] = viewport.convertToPdfPoint(viewportPoint.x, viewportPoint.y)
  return { x, y }
}

// Convert a point from PDF coordinates to viewport (screen) coordinates
export function pdfToViewport(pdfPoint: Point, viewport: PageViewport): Point {
  const [x, y] = viewport.convertToViewportPoint(pdfPoint.x, pdfPoint.y)
  return { x, y }
}

// Convert a rectangle from viewport to PDF coordinates
export function rectViewportToPdf(rect: Rect, viewport: PageViewport): Rect {
  const topLeft = viewportToPdf({ x: rect.x, y: rect.y }, viewport)
  const bottomRight = viewportToPdf(
    { x: rect.x + rect.width, y: rect.y + rect.height },
    viewport
  )

  return {
    x: Math.min(topLeft.x, bottomRight.x),
    y: Math.min(topLeft.y, bottomRight.y),
    width: Math.abs(bottomRight.x - topLeft.x),
    height: Math.abs(bottomRight.y - topLeft.y),
  }
}

// Convert a rectangle from PDF to viewport coordinates
export function rectPdfToViewport(rect: Rect, viewport: PageViewport): Rect {
  const topLeft = pdfToViewport({ x: rect.x, y: rect.y }, viewport)
  const bottomRight = pdfToViewport(
    { x: rect.x + rect.width, y: rect.y + rect.height },
    viewport
  )

  return {
    x: Math.min(topLeft.x, bottomRight.x),
    y: Math.min(topLeft.y, bottomRight.y),
    width: Math.abs(bottomRight.x - topLeft.x),
    height: Math.abs(bottomRight.y - topLeft.y),
  }
}

// Convert quadpoints from PDF to viewport coordinates
export function quadPointsPdfToViewport(
  quadPoints: number[][],
  viewport: PageViewport
): number[][] {
  return quadPoints.map((quad) => {
    const result: number[] = []
    for (let i = 0; i < quad.length; i += 2) {
      const [vx, vy] = viewport.convertToViewportPoint(quad[i], quad[i + 1])
      result.push(vx, vy)
    }
    return result
  })
}

// Convert quadpoints from viewport to PDF coordinates
export function quadPointsViewportToPdf(
  quadPoints: number[][],
  viewport: PageViewport
): number[][] {
  return quadPoints.map((quad) => {
    const result: number[] = []
    for (let i = 0; i < quad.length; i += 2) {
      const [px, py] = viewport.convertToPdfPoint(quad[i], quad[i + 1])
      result.push(px, py)
    }
    return result
  })
}

// Get bounding box from quadpoints
export function getBoundingBoxFromQuadPoints(quadPoints: number[][]): Rect {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const quad of quadPoints) {
    for (let i = 0; i < quad.length; i += 2) {
      minX = Math.min(minX, quad[i])
      maxX = Math.max(maxX, quad[i])
      minY = Math.min(minY, quad[i + 1])
      maxY = Math.max(maxY, quad[i + 1])
    }
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

// Convert DOMRect array to quadpoints in viewport coordinates
export function domRectsToQuadPoints(rects: DOMRect[], containerRect: DOMRect): number[][] {
  return rects.map((rect) => {
    const x1 = rect.left - containerRect.left
    const y1 = rect.top - containerRect.top
    const x2 = rect.right - containerRect.left
    const y2 = rect.bottom - containerRect.top

    // QuadPoints format: bottom-left, bottom-right, top-right, top-left
    return [x1, y2, x2, y2, x2, y1, x1, y1]
  })
}

// Check if a point is inside a rectangle
export function isPointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

// Check if a point is inside a quadrilateral (defined by 4 corner points)
export function isPointInQuad(point: Point, quad: number[]): boolean {
  // quad is [x1, y1, x2, y2, x3, y3, x4, y4]
  const corners = [
    { x: quad[0], y: quad[1] },
    { x: quad[2], y: quad[3] },
    { x: quad[4], y: quad[5] },
    { x: quad[6], y: quad[7] },
  ]

  // Use ray casting algorithm
  let inside = false
  for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
    const xi = corners[i].x
    const yi = corners[i].y
    const xj = corners[j].x
    const yj = corners[j].y

    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside
    }
  }

  return inside
}

// Check if a point is near an annotation's quadpoints
export function isPointNearQuadPoints(
  point: Point,
  quadPoints: number[][],
  threshold: number = 5
): boolean {
  for (const quad of quadPoints) {
    // Expand the quad by the threshold
    const bbox = getBoundingBoxFromQuadPoints([quad])
    const expandedBbox = {
      x: bbox.x - threshold,
      y: bbox.y - threshold,
      width: bbox.width + threshold * 2,
      height: bbox.height + threshold * 2,
    }

    if (isPointInRect(point, expandedBbox)) {
      return true
    }
  }
  return false
}

// Calculate distance between two points
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
}

// Calculate the angle between two points (in radians)
export function angle(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x)
}

// Get resize handles for a rectangle
export interface ResizeHandle {
  position: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
  x: number
  y: number
  cursor: string
}

export function getResizeHandles(rect: Rect, handleSize: number = 8): ResizeHandle[] {
  const half = handleSize / 2
  return [
    {
      position: 'nw',
      x: rect.x - half,
      y: rect.y - half,
      cursor: 'nwse-resize',
    },
    {
      position: 'n',
      x: rect.x + rect.width / 2 - half,
      y: rect.y - half,
      cursor: 'ns-resize',
    },
    {
      position: 'ne',
      x: rect.x + rect.width - half,
      y: rect.y - half,
      cursor: 'nesw-resize',
    },
    {
      position: 'e',
      x: rect.x + rect.width - half,
      y: rect.y + rect.height / 2 - half,
      cursor: 'ew-resize',
    },
    {
      position: 'se',
      x: rect.x + rect.width - half,
      y: rect.y + rect.height - half,
      cursor: 'nwse-resize',
    },
    {
      position: 's',
      x: rect.x + rect.width / 2 - half,
      y: rect.y + rect.height - half,
      cursor: 'ns-resize',
    },
    {
      position: 'sw',
      x: rect.x - half,
      y: rect.y + rect.height - half,
      cursor: 'nesw-resize',
    },
    {
      position: 'w',
      x: rect.x - half,
      y: rect.y + rect.height / 2 - half,
      cursor: 'ew-resize',
    },
  ]
}

// Apply resize to rectangle
export function applyResize(
  rect: Rect,
  handle: ResizeHandle['position'],
  dx: number,
  dy: number,
  minSize: number = 10
): Rect {
  let { x, y, width, height } = rect

  switch (handle) {
    case 'nw':
      x += dx
      y += dy
      width -= dx
      height -= dy
      break
    case 'n':
      y += dy
      height -= dy
      break
    case 'ne':
      y += dy
      width += dx
      height -= dy
      break
    case 'e':
      width += dx
      break
    case 'se':
      width += dx
      height += dy
      break
    case 's':
      height += dy
      break
    case 'sw':
      x += dx
      width -= dx
      height += dy
      break
    case 'w':
      x += dx
      width -= dx
      break
  }

  // Ensure minimum size
  if (width < minSize) {
    if (handle.includes('w')) {
      x = rect.x + rect.width - minSize
    }
    width = minSize
  }
  if (height < minSize) {
    if (handle.includes('n')) {
      y = rect.y + rect.height - minSize
    }
    height = minSize
  }

  return { x, y, width, height }
}

// Simplify a path using the Ramer-Douglas-Peucker algorithm
export function simplifyPath(points: Point[], epsilon: number = 2): Point[] {
  if (points.length <= 2) return points

  // Find the point with the maximum distance from the line between first and last
  let maxDistance = 0
  let maxIndex = 0

  const first = points[0]
  const last = points[points.length - 1]

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last)
    if (d > maxDistance) {
      maxDistance = d
      maxIndex = i
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    const left = simplifyPath(points.slice(0, maxIndex + 1), epsilon)
    const right = simplifyPath(points.slice(maxIndex), epsilon)

    return [...left.slice(0, -1), ...right]
  }

  return [first, last]
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y

  if (dx === 0 && dy === 0) {
    return distance(point, lineStart)
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
        (dx * dx + dy * dy)
    )
  )

  const projection = {
    x: lineStart.x + t * dx,
    y: lineStart.y + t * dy,
  }

  return distance(point, projection)
}
