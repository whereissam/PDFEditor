import { useEffect, useRef, useCallback } from 'react'
import { useEditorStore } from '@/stores/editor-store'

interface TouchPoint {
  x: number
  y: number
  id: number
}

interface SwipeConfig {
  threshold?: number
  velocityThreshold?: number
}

/**
 * Hook for horizontal swipe navigation between pages
 */
export function useTouchSwipeNavigation(
  containerRef: React.RefObject<HTMLElement | null>,
  config: SwipeConfig = {}
) {
  const { threshold = 50, velocityThreshold = 0.3 } = config

  const setCurrentPage = useEditorStore((s) => s.setCurrentPage)
  const currentPage = useEditorStore((s) => s.currentPage)
  const document = useEditorStore((s) => s.document)

  const touchStartRef = useRef<TouchPoint | null>(null)
  const touchStartTimeRef = useRef<number>(0)
  const isSwipingRef = useRef(false)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only track single finger touches
    if (e.touches.length !== 1) {
      touchStartRef.current = null
      return
    }

    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      id: touch.identifier,
    }
    touchStartTimeRef.current = Date.now()
    isSwipingRef.current = false
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current || e.touches.length !== 1) return

    const touch = e.touches[0]
    if (touch.identifier !== touchStartRef.current.id) return

    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y

    // If horizontal movement is greater than vertical, it's a swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwipingRef.current = true
    }
  }, [])

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchStartRef.current || !isSwipingRef.current) {
        touchStartRef.current = null
        return
      }

      const touch = e.changedTouches[0]
      if (!touch || touch.identifier !== touchStartRef.current.id) return

      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaTime = Date.now() - touchStartTimeRef.current
      const velocity = Math.abs(deltaX) / deltaTime

      const totalPages = document?.pageOrder.length || 0

      // Check if swipe meets threshold
      if (Math.abs(deltaX) > threshold || velocity > velocityThreshold) {
        if (deltaX > 0 && currentPage > 1) {
          // Swipe right -> previous page
          setCurrentPage(currentPage - 1)
        } else if (deltaX < 0 && currentPage < totalPages) {
          // Swipe left -> next page
          setCurrentPage(currentPage + 1)
        }
      }

      touchStartRef.current = null
      isSwipingRef.current = false
    },
    [currentPage, document, threshold, velocityThreshold, setCurrentPage]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: true })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [containerRef, handleTouchStart, handleTouchMove, handleTouchEnd])
}

/**
 * Hook for pinch-to-zoom with touch events
 */
export function useTouchPinchZoom(containerRef: React.RefObject<HTMLElement | null>) {
  const scale = useEditorStore((s) => s.scale)
  const setScale = useEditorStore((s) => s.setScale)

  const initialDistanceRef = useRef<number | null>(null)
  const initialScaleRef = useRef<number>(1)

  const getDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialDistanceRef.current = getDistance(e.touches)
        initialScaleRef.current = scale
      }
    },
    [scale]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length !== 2 || !initialDistanceRef.current) return

      const currentDistance = getDistance(e.touches)
      const ratio = currentDistance / initialDistanceRef.current
      const newScale = Math.max(0.1, Math.min(5.0, initialScaleRef.current * ratio))

      setScale(newScale)
    },
    [setScale]
  )

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (e.touches.length < 2) {
      initialDistanceRef.current = null
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [containerRef, handleTouchStart, handleTouchMove, handleTouchEnd])
}
