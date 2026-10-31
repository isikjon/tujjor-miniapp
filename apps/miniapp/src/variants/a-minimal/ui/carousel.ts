import { useEffect, type RefObject } from 'react'

/**
 * Pagination dots for a CSS scroll-snap track. An IntersectionObserver marks the slide that is
 * ≥60 % visible and writes `data-active` on the matching dot — no scroll listeners, no React state.
 */
export function useSnapDots(track: RefObject<HTMLElement | null>, dots: RefObject<HTMLElement | null>, count: number, onIndex?: (i: number) => void) {
  useEffect(() => {
    const root = track.current
    const bar = dots.current
    if (!root || count < 2) return
    const slides = Array.from(root.children) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const i = slides.indexOf(e.target as HTMLElement)
          if (i < 0) continue
          if (bar) Array.from(bar.children).forEach((d, j) => d.setAttribute('data-active', String(i === j)))
          onIndex?.(i)
        }
      },
      { root, threshold: 0.6 },
    )
    slides.forEach((s) => io.observe(s))
    return () => io.disconnect()
    // onIndex is intentionally not a dependency (callers pass a ref-backed callback)
  }, [track, dots, count])
}
