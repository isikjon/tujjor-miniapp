import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { cx } from '../lib/cx'
import { withBase } from '../lib/base'
import { useVariant } from '../runtime/variant'
import { tg } from '../telegram/adapter'
import { useNav } from './context'

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string
  replace?: boolean
  /** Extra work on intent (pointer down / hover / focus), e.g. data prefetch. */
  onIntent?: () => void
  /** Haptic tick on activation (default: selection). Pass false to disable. */
  haptic?: false | 'selection' | 'light'
  children: ReactNode
}

/**
 * Navigation link: real <a href> (accessible, works with middle-click on desktop), stack push on tap,
 * screen-chunk + data preloading on intent (pointerdown fires ~100 ms before click).
 */
export function Link({ to, replace, onIntent, haptic = 'selection', className, onClick, children, ...rest }: LinkProps) {
  const nav = useNav()
  const variant = useVariant()
  const intent = () => {
    nav.preload(to)
    onIntent?.()
  }
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    if (haptic) tg.haptic(haptic)
    if (replace) nav.replace(to)
    else nav.push(to)
  }
  const href = withBase(`app/${variant.id}${to}`)
  return (
    <a {...rest} href={href} className={cx('tap', className)} onPointerDown={intent} onMouseEnter={intent} onFocus={intent} onClick={handle} draggable={false}>
      {children}
    </a>
  )
}
