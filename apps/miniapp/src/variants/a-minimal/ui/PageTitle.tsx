import { useEffect, useRef, type ReactNode } from 'react'
import { cx } from '../../../shared/lib/cx'
import { useScroller } from '../../../shared/nav/context'

interface PageTitleProps {
  title: string
  /** Text of the compact bar that fades in once the large title scrolls away (defaults to title). */
  compactTitle?: string
  eyebrow?: ReactNode
  subtitle?: ReactNode
  /** Right side of the title row (badge, avatar, action). */
  aside?: ReactNode
  /** No hairline under the compact bar (a sticky toolbar draws its own). */
  seamless?: boolean
  className?: string
  children?: ReactNode
}

/**
 * iOS-style large title that collapses into a compact bar. Must be rendered inside <Screen> content:
 * the bar is a zero-height sticky element, its visibility is driven by an IntersectionObserver on the
 * title (attribute write, no React state, no scroll listeners).
 */
export function PageTitle({ title, compactTitle, eyebrow, subtitle, aside, seamless, className, children }: PageTitleProps) {
  const scroller = useScroller()
  const barRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const root = scroller.current
    const el = titleRef.current
    const bar = barRef.current
    if (!root || !el || !bar) return
    const io = new IntersectionObserver(([e]) => bar.setAttribute('data-show', String(!e.isIntersecting)), { root, rootMargin: '-44px 0px 0px 0px', threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [scroller])

  return (
    <>
      <div className="a-bar" aria-hidden="true">
        <div ref={barRef} className="a-bar__inner" data-show="false" data-seamless={seamless || undefined}>
          <span className="a-bar__title">{compactTitle ?? title}</span>
        </div>
      </div>
      <header className={cx('a-head', className)}>
        {eyebrow ? <div className="a-head__eyebrow">{eyebrow}</div> : null}
        <div className="a-head__row">
          <h1 ref={titleRef} className="a-title">
            {title}
          </h1>
          {aside ? <div className="a-head__aside">{aside}</div> : null}
        </div>
        {subtitle ? <p className="a-head__sub">{subtitle}</p> : null}
        {children}
      </header>
    </>
  )
}
