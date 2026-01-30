import type { PDFPageProxy, RenderTask } from 'pdfjs-dist'

type PageViewport = ReturnType<PDFPageProxy['getViewport']>

export interface RenderOptions {
  page: PDFPageProxy
  canvas: HTMLCanvasElement
  viewport: PageViewport
  devicePixelRatio?: number
}

export interface RenderResult {
  task: RenderTask
  cancel: () => void
}

const renderTaskMap = new WeakMap<HTMLCanvasElement, RenderTask>()

export function renderPage(options: RenderOptions): RenderResult {
  const { page, canvas, viewport, devicePixelRatio = window.devicePixelRatio || 1 } = options

  // Cancel any existing render task for this canvas
  const existingTask = renderTaskMap.get(canvas)
  if (existingTask) {
    existingTask.cancel()
  }

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Failed to get 2D context from canvas')
  }

  // Set canvas dimensions accounting for device pixel ratio
  const outputScale = devicePixelRatio
  canvas.width = Math.floor(viewport.width * outputScale)
  canvas.height = Math.floor(viewport.height * outputScale)
  canvas.style.width = `${Math.floor(viewport.width)}px`
  canvas.style.height = `${Math.floor(viewport.height)}px`

  // Scale the context to account for device pixel ratio
  context.scale(outputScale, outputScale)

  // @ts-expect-error - render API accepts this in runtime
  const task = page.render({
    canvasContext: context,
    viewport,
  }) as RenderTask
  renderTaskMap.set(canvas, task)

  return {
    task,
    cancel: () => {
      task.cancel()
      renderTaskMap.delete(canvas)
    },
  }
}

export interface ThumbnailOptions {
  page: PDFPageProxy
  canvas: HTMLCanvasElement
  maxWidth?: number
  maxHeight?: number
}

export async function renderThumbnail(options: ThumbnailOptions): Promise<void> {
  const { page, canvas, maxWidth = 150, maxHeight = 200 } = options

  // Get page dimensions at scale 1
  const baseViewport = page.getViewport({ scale: 1 })

  // Calculate scale to fit within max dimensions
  const scaleX = maxWidth / baseViewport.width
  const scaleY = maxHeight / baseViewport.height
  const scale = Math.min(scaleX, scaleY)

  const viewport = page.getViewport({ scale })

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Failed to get 2D context from canvas')
  }

  canvas.width = viewport.width
  canvas.height = viewport.height
  canvas.style.width = `${viewport.width}px`
  canvas.style.height = `${viewport.height}px`

  // @ts-expect-error - render API accepts this in runtime
  await page.render({
    canvasContext: context,
    viewport,
  }).promise
}

// Bitmap caching for rendered pages
interface CachedBitmap {
  bitmap: ImageBitmap
  scale: number
  rotation: number
}

const bitmapCache = new Map<string, CachedBitmap>()

function getCacheKey(fingerprint: string, pageNumber: number): string {
  return `${fingerprint}-${pageNumber}`
}

export async function getCachedBitmap(
  fingerprint: string,
  pageNumber: number,
  scale: number,
  rotation: number
): Promise<ImageBitmap | null> {
  const key = getCacheKey(fingerprint, pageNumber)
  const cached = bitmapCache.get(key)

  if (cached && cached.scale === scale && cached.rotation === rotation) {
    return cached.bitmap
  }

  return null
}

export async function cacheBitmap(
  fingerprint: string,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number,
  rotation: number
): Promise<void> {
  const key = getCacheKey(fingerprint, pageNumber)

  // Clean up old bitmap if exists
  const existing = bitmapCache.get(key)
  if (existing) {
    existing.bitmap.close()
  }

  try {
    const bitmap = await createImageBitmap(canvas)
    bitmapCache.set(key, { bitmap, scale, rotation })
  } catch {
    // createImageBitmap may fail in some contexts, ignore
  }
}

export function clearBitmapCache(fingerprint?: string): void {
  if (fingerprint) {
    // Clear cache for specific document
    for (const [key, value] of bitmapCache.entries()) {
      if (key.startsWith(fingerprint)) {
        value.bitmap.close()
        bitmapCache.delete(key)
      }
    }
  } else {
    // Clear entire cache
    for (const value of bitmapCache.values()) {
      value.bitmap.close()
    }
    bitmapCache.clear()
  }
}

// Render queue for managing concurrent renders
interface QueuedRender {
  id: string
  priority: number
  render: () => Promise<void>
  resolve: () => void
  reject: (error: Error) => void
}

class RenderQueue {
  private queue: QueuedRender[] = []
  private activeCount = 0
  private maxConcurrent = 3

  async enqueue(
    id: string,
    priority: number,
    render: () => Promise<void>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Remove any existing render for the same id
      this.queue = this.queue.filter((item) => item.id !== id)

      this.queue.push({ id, priority, render, resolve, reject })
      this.queue.sort((a, b) => b.priority - a.priority) // Higher priority first

      this.processQueue()
    })
  }

  cancel(id: string): void {
    this.queue = this.queue.filter((item) => {
      if (item.id === id) {
        item.reject(new Error('Render cancelled'))
        return false
      }
      return true
    })
  }

  private async processQueue(): Promise<void> {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
      return
    }

    const item = this.queue.shift()
    if (!item) return

    this.activeCount++

    try {
      await item.render()
      item.resolve()
    } catch (error) {
      item.reject(error instanceof Error ? error : new Error('Render failed'))
    } finally {
      this.activeCount--
      this.processQueue()
    }
  }

  clear(): void {
    for (const item of this.queue) {
      item.reject(new Error('Queue cleared'))
    }
    this.queue = []
  }
}

export const renderQueue = new RenderQueue()
