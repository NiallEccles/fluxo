import { useState, useRef, useCallback } from 'react'

interface UseResizableOptions {
  defaultWidth: number
  minWidth: number
  maxWidth: number
  storageKey?: string
}

interface UseResizableReturn {
  width: number
  isDragging: boolean
  handlePointerDown: (e: React.PointerEvent<HTMLElement>) => void
  resetWidth: () => void
}

export function useResizable({
  defaultWidth,
  minWidth,
  maxWidth,
  storageKey,
}: UseResizableOptions): UseResizableReturn {
  const [width, setWidth] = useState<number>(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey)
      if (stored !== null) {
        const parsed = Number(stored)
        if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) return parsed
      }
    }
    return defaultWidth
  })

  const [isDragging, setIsDragging] = useState(false)

  // Always up-to-date ref so the stable handlePointerDown closure can read
  // the current width at drag-start without being in the deps array.
  const widthRef = useRef(width)
  widthRef.current = width

  const startXRef = useRef(0)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault()
      startXRef.current = e.clientX
      const startWidth = widthRef.current
      setIsDragging(true)
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'

      const el = e.currentTarget
      el.setPointerCapture(e.pointerId)

      const onMove = (ev: PointerEvent) => {
        const delta = ev.clientX - startXRef.current
        const next = Math.min(maxWidth, Math.max(minWidth, startWidth + delta))
        setWidth(next)
        if (storageKey) localStorage.setItem(storageKey, String(Math.round(next)))
      }

      const onUp = () => {
        setIsDragging(false)
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerup', onUp)
        el.removeEventListener('pointercancel', onUp)
      }

      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerup', onUp)
      el.addEventListener('pointercancel', onUp)
    },
    [minWidth, maxWidth, storageKey]
  )

  const resetWidth = useCallback(() => {
    setWidth(defaultWidth)
    if (storageKey) localStorage.setItem(storageKey, String(defaultWidth))
  }, [defaultWidth, storageKey])

  return { width, isDragging, handlePointerDown, resetWidth }
}
