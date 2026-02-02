import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditorStore } from '@/stores/editor-store'

export interface ViewportDimensions {
  width: number
  height: number
}

export interface UseViewportReturn {
  containerRef: React.RefObject<HTMLDivElement | null>
  dimensions: ViewportDimensions
  scale: number
  scaleMode: 'fit-width' | 'fit-page' | 'custom'
  setScale: (scale: number) => void
  zoomIn: () => void
  zoomOut: () => void
  fitWidth: () => void
  fitPage: () => void
  calculateFitWidthScale: (pageWidth: number, padding?: number) => number
  calculateFitPageScale: (pageWidth: number, pageHeight: number, padding?: number) => number
}

export function useViewport(): UseViewportReturn {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState<ViewportDimensions>({
    width: 0,
    height: 0,
  })

  const scale = useEditorStore((s) => s.scale)
  const scaleMode = useEditorStore((s) => s.scaleMode)
  const setScaleStore = useEditorStore((s) => s.setScale)
  const zoomInStore = useEditorStore((s) => s.zoomIn)
  const zoomOutStore = useEditorStore((s) => s.zoomOut)
  const fitWidthStore = useEditorStore((s) => s.fitWidth)
  const fitPageStore = useEditorStore((s) => s.fitPage)

  // Update dimensions on resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateDimensions = () => {
      setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      })
    }

    updateDimensions()

    const observer = new ResizeObserver(updateDimensions)
    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [])

  const calculateFitWidthScale = useCallback(
    (pageWidth: number, padding: number = 40): number => {
      if (dimensions.width === 0) return 1
      return (dimensions.width - padding) / pageWidth
    },
    [dimensions.width]
  )

  const calculateFitPageScale = useCallback(
    (pageWidth: number, pageHeight: number, padding: number = 40): number => {
      if (dimensions.width === 0 || dimensions.height === 0) return 1
      const scaleX = (dimensions.width - padding) / pageWidth
      const scaleY = (dimensions.height - padding) / pageHeight
      return Math.min(scaleX, scaleY)
    },
    [dimensions.width, dimensions.height]
  )

  return {
    containerRef,
    dimensions,
    scale,
    scaleMode,
    setScale: setScaleStore,
    zoomIn: zoomInStore,
    zoomOut: zoomOutStore,
    fitWidth: fitWidthStore,
    fitPage: fitPageStore,
    calculateFitWidthScale,
    calculateFitPageScale,
  }
}

// Hook for scroll synchronization
export function useScrollToPage() {
  const currentPage = useEditorStore((s) => s.currentPage)
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage)
  const pageRefs = useRef<Map<number, HTMLElement>>(new Map())

  const registerPage = useCallback((pageNumber: number, element: HTMLElement | null) => {
    if (element) {
      pageRefs.current.set(pageNumber, element)
    } else {
      pageRefs.current.delete(pageNumber)
    }
  }, [])

  const scrollToPage = useCallback((pageNumber: number) => {
    const element = pageRefs.current.get(pageNumber)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setCurrentPage(pageNumber)
  }, [setCurrentPage])

  // Scroll to page when currentPage changes externally
  useEffect(() => {
    const element = pageRefs.current.get(currentPage)
    if (element) {
      // Check if the element is not already visible
      const rect = element.getBoundingClientRect()
      const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
      if (!isVisible) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [currentPage])

  return {
    currentPage,
    scrollToPage,
    registerPage,
  }
}

// Hook for handling scroll and detecting visible page
export function usePageVisibility(containerRef: React.RefObject<HTMLElement | null>) {
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage)
  const pageElementsRef = useRef<Map<number, HTMLElement>>(new Map())
  const scrollTimeoutRef = useRef<number | null>(null)

  const registerPage = useCallback((pageNumber: number, element: HTMLElement | null) => {
    if (element) {
      pageElementsRef.current.set(pageNumber, element)
    } else {
      pageElementsRef.current.delete(pageNumber)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      // Debounce the scroll handler
      if (scrollTimeoutRef.current) {
        window.cancelAnimationFrame(scrollTimeoutRef.current)
      }

      scrollTimeoutRef.current = window.requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect()
        const containerCenter = containerRect.top + containerRect.height / 2

        let closestPage = 1
        let closestDistance = Infinity

        pageElementsRef.current.forEach((element, pageNumber) => {
          const rect = element.getBoundingClientRect()
          const pageCenter = rect.top + rect.height / 2
          const distance = Math.abs(pageCenter - containerCenter)

          if (distance < closestDistance) {
            closestDistance = distance
            closestPage = pageNumber
          }
        })

        setCurrentPage(closestPage)
      })
    }

    container.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        window.cancelAnimationFrame(scrollTimeoutRef.current)
      }
    }
  }, [containerRef, setCurrentPage])

  return { registerPage }
}

// Pinch-to-zoom hook (trackpad + touch support)
export function usePinchZoom(containerRef: React.RefObject<HTMLElement | null>) {
  const scale = useEditorStore((s) => s.scale)
  const setScale = useEditorStore((s) => s.setScale)

  // Refs for touch pinch zoom
  const initialTouchDistanceRef = useRef<number | null>(null)
  const initialTouchScaleRef = useRef<number>(1)

  const getDistance = useCallback((touches: TouchList): number => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Trackpad pinch-to-zoom via wheel events
    const handleWheel = (e: WheelEvent) => {
      // Pinch-to-zoom on trackpad sends wheel events with ctrlKey
      if (e.ctrlKey) {
        e.preventDefault()

        // Calculate zoom factor based on wheel delta
        // Smaller delta = finer control
        const delta = -e.deltaY * 0.01
        const zoomFactor = Math.pow(1.5, delta)

        // Calculate new scale with bounds
        const newScale = Math.max(0.1, Math.min(5.0, scale * zoomFactor))

        // Apply new scale
        setScale(newScale)
      }
    }

    // Touch pinch-to-zoom handlers
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialTouchDistanceRef.current = getDistance(e.touches)
        initialTouchScaleRef.current = scale
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || initialTouchDistanceRef.current === null) return

      // Prevent default to stop page scrolling during pinch
      e.preventDefault()

      const currentDistance = getDistance(e.touches)
      const ratio = currentDistance / initialTouchDistanceRef.current
      const newScale = Math.max(0.1, Math.min(5.0, initialTouchScaleRef.current * ratio))

      setScale(newScale)
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialTouchDistanceRef.current = null
      }
    }

    // Use passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false })
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('wheel', handleWheel)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [containerRef, scale, setScale, getDistance])
}

// Keyboard navigation hook
export function useKeyboardNavigation() {
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage)
  const currentPage = useEditorStore((s) => s.currentPage)
  const document = useEditorStore((s) => s.document)
  const zoomIn = useEditorStore((s) => s.zoomIn)
  const zoomOut = useEditorStore((s) => s.zoomOut)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const setActiveTool = useEditorStore((s) => s.setActiveTool)
  const setSearchOpen = useEditorStore((s) => s.setSearchOpen)
  const deleteAnnotation = useEditorStore((s) => s.deleteAnnotation)
  const selectedAnnotationIds = useEditorStore((s) => s.selectedAnnotationIds)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      const isMod = e.metaKey || e.ctrlKey

      // Navigation
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        if (document) {
          setCurrentPage(Math.min(currentPage + 1, document.pageOrder.length))
        }
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        setCurrentPage(Math.max(currentPage - 1, 1))
      } else if (e.key === 'Home') {
        e.preventDefault()
        setCurrentPage(1)
      } else if (e.key === 'End' && document) {
        e.preventDefault()
        setCurrentPage(document.pageOrder.length)
      }

      // Zoom
      else if (isMod && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        zoomIn()
      } else if (isMod && e.key === '-') {
        e.preventDefault()
        zoomOut()
      }

      // Undo/Redo
      else if (isMod && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        undo()
      } else if (isMod && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        redo()
      }

      // Search
      else if (isMod && e.key === 'f') {
        e.preventDefault()
        setSearchOpen(true)
      }

      // Tool shortcuts
      else if (e.key === 'v' || e.key === 'Escape') {
        setActiveTool('select')
      } else if (e.key === 'h') {
        setActiveTool('highlight')
      } else if (e.key === 'u') {
        setActiveTool('underline')
      } else if (e.key === 's') {
        setActiveTool('strikethrough')
      } else if (e.key === 'n') {
        setActiveTool('note')
      } else if (e.key === 'r') {
        setActiveTool('rectangle')
      } else if (e.key === 'o') {
        setActiveTool('ellipse')
      } else if (e.key === 'a') {
        setActiveTool('arrow')
      } else if (e.key === 'l') {
        setActiveTool('line')
      } else if (e.key === 'p') {
        setActiveTool('ink')
      } else if (e.key === 't') {
        setActiveTool('text')
      }

      // Delete selected annotations
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotationIds.size > 0) {
        e.preventDefault()
        selectedAnnotationIds.forEach((id) => deleteAnnotation(id))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    currentPage,
    document,
    setCurrentPage,
    zoomIn,
    zoomOut,
    undo,
    redo,
    setActiveTool,
    setSearchOpen,
    deleteAnnotation,
    selectedAnnotationIds,
  ])
}
