import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useVariant } from '../runtime/variant'
import { ScrollerContext, useScreenContext } from './context'

const savedScroll = new Map<string, number>()

export interface ScreenLayoutProps {
  /** Fixed area above the scroller (search bar, title bar…). */
  header?: ReactNode
  /** Fixed area below the scroller (sticky CTA). Sits above the tab bar when it is visible. */
  footer?: ReactNode
  children: ReactNode
  className?: string
  scrollClassName?: string
  style?: CSSProperties
  /** Adds bottom padding for the tab bar + safe area (default true). */
  padBottom?: boolean
}

/**
 * Standard screen scaffold: header / own scroll container / footer.
 * - each screen scrolls independently (state survives push/pop and tab switches)
 * - `data-scrolled` toggles on the root via an IntersectionObserver sentinel (no scroll listeners)
 * - re-tapping the active tab scrolls to top
 */
export function Screen({ header, footer, children, className, scrollClassName, style, padBottom = true }: ScreenLayoutProps) {
  const { screen, entryKey, path } = useScreenContext()
  const variant = useVariant()
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const withTabBar = variant.showTabBar(screen)
  const bottomPad = withTabBar ? 'calc(var(--tabbar-h) + var(--safe-bottom) + var(--main-btn-h, 0px))' : 'calc(var(--safe-bottom) + var(--main-btn-h, 0px))'

  useEffect(() => {
    const sentinel = sentinelRef.current
    const root = rootRef.current
    if (!sentinel || !root) return
    const io = new IntersectionObserver(([e]) => root.setAttribute('data-scrolled', String(!e.isIntersecting)), { root: scrollRef.current, threshold: 0 })
    io.observe(sentinel)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const onTop = (e: Event) => {
      if ((e as CustomEvent<string>).detail === entryKey) scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('tj:scrolltop', onTop)
    return () => window.removeEventListener('tj:scrolltop', onTop)
  }, [entryKey])

  // Restore scroll for a remounted screen (e.g. after reload); retry while content is still growing.
  useLayoutEffect(() => {
    const el = scrollRef.current
    const target = savedScroll.get(path)
    if (!el || !target) return
    let tries = 0
    const tryRestore = () => {
      el.scrollTop = target
      if (Math.abs(el.scrollTop - target) > 2 && tries++ < 20) requestAnimationFrame(tryRestore)
    }
    tryRestore()
    return () => {
      savedScroll.set(path, el.scrollTop)
    }
  }, [path])

  return (
    <div ref={rootRef} className={cx('screen', className)} style={style} data-scrolled="false">
      {header ? <div className="screen-header">{header}</div> : null}
      <div ref={scrollRef} className={cx('screen-scroll', scrollClassName)} data-screen-scroller="">
        <div ref={sentinelRef} aria-hidden="true" style={{ height: 1, marginBottom: -1 }} />
        <ScrollerContext.Provider value={scrollRef}>{children}</ScrollerContext.Provider>
        {!footer && padBottom ? <div aria-hidden="true" style={{ height: bottomPad }} /> : null}
      </div>
      {footer ? (
        <div className="screen-footer" style={{ paddingBottom: bottomPad }}>
          {footer}
        </div>
      ) : null}
    </div>
  )
}
