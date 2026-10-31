import { useVirtualizer } from '@tanstack/react-virtual'
import { memo, useEffect, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { useScroller } from '../nav/context'

export interface VirtualGridProps<T> {
  items: T[]
  /** Card component — pass a stable component (not an inline function) so rows can bail out of re-renders. */
  Item: ComponentType<{ item: T; index: number }>
  getKey: (item: T) => string
  columns?: number
  /** Gap between cells, px. */
  gap?: number
  /** Estimated row height without gap, px (measured precisely after render). */
  estimateHeight: number
  overscan?: number
  hasMore?: boolean
  loadingMore?: boolean
  onEndReached?: () => void
  /** Rendered after the last row (spinner, "you've seen everything"…). */
  footer?: ReactNode
  className?: string
}

/**
 * Row-virtualised grid that scrolls with the screen's own scroller (useScroller), so it can sit
 * below any amount of content (banners, chips). Only visible rows + overscan are in the DOM.
 */
export function VirtualGrid<T>({ items, Item, getKey, columns = 2, gap = 12, estimateHeight, overscan = 3, hasMore, loadingMore, onEndReached, footer, className }: VirtualGridProps<T>) {
  const scrollerRef = useScroller()
  const parentRef = useRef<HTMLDivElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  const rows = Math.ceil(items.length / columns)

  useLayoutEffect(() => {
    const parent = parentRef.current
    const scroller = scrollerRef.current
    if (!parent || !scroller) return
    const measure = () => {
      const m = parent.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
      setScrollMargin((prev) => (Math.abs(prev - m) > 0.5 ? m : prev))
    }
    measure()
    const ro = new ResizeObserver(measure)
    let sib = parent.previousElementSibling
    while (sib) {
      ro.observe(sib)
      sib = sib.previousElementSibling
    }
    if (parent.parentElement && parent.parentElement !== scroller) ro.observe(parent.parentElement)
    return () => ro.disconnect()
  }, [scrollerRef, items.length > 0])

  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => estimateHeight + gap,
    overscan,
    scrollMargin,
  })
  const virtualRows = virtualizer.getVirtualItems()
  const lastIndex = virtualRows[virtualRows.length - 1]?.index ?? -1

  useEffect(() => {
    if (hasMore && !loadingMore && rows > 0 && lastIndex >= rows - 3) onEndReached?.()
  }, [lastIndex, rows, hasMore, loadingMore, onEndReached])

  return (
    <div className={className}>
      <div ref={parentRef} style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualRows.map((vr) => (
          <div
            key={vr.key}
            data-index={vr.index}
            ref={virtualizer.measureElement}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translate3d(0, ${vr.start - scrollMargin}px, 0)`, paddingBottom: gap }}
          >
            <Row items={items} start={vr.index * columns} columns={columns} gap={gap} Item={Item as ComponentType<{ item: unknown; index: number }>} getKey={getKey as (i: unknown) => string} />
          </div>
        ))}
      </div>
      {footer}
    </div>
  )
}

const Row = memo(function Row({ items, start, columns, gap, Item, getKey }: { items: unknown[]; start: number; columns: number; gap: number; Item: ComponentType<{ item: unknown; index: number }>; getKey: (i: unknown) => string }) {
  const cells = items.slice(start, start + columns)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, columnGap: gap }}>
      {cells.map((it, i) => (
        <Item key={getKey(it)} item={it} index={start + i} />
      ))}
    </div>
  )
})
