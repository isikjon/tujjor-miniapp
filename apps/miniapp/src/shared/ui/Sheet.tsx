import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../lib/cx'
import { useBackHandler } from '../nav/back'

export interface SheetProps {
  open: boolean
  onClose: () => void
  /** Accessible name; rendered as the default header when `header` is not provided. */
  title: string
  header?: ReactNode
  /** Hide the default header entirely (custom layouts). */
  bare?: boolean
  children: ReactNode
  /** Sticky area at the bottom of the sheet (e.g. "Apply" button). */
  footer?: ReactNode
  className?: string
  headerClassName?: string
  bodyClassName?: string
  footerClassName?: string
  /** Called after the close animation finished. */
  onClosed?: () => void
}

const CLOSE_MS = 340

/**
 * Bottom sheet: transform-only slide, drag-to-dismiss on the handle/header (velocity aware),
 * closes on backdrop tap, Telegram BackButton and Escape (via the back-handler stack).
 */
export function Sheet({ open, onClose, title, header, bare, children, footer, className, headerClassName, bodyClassName, footerClassName, onClosed }: SheetProps) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef<HTMLElement | null>(null)
  const drag = useRef<{ y: number; t: number; dy: number; v: number; id: number } | null>(null)

  if (open && !mounted) setMounted(true)

  useLayoutEffect(() => {
    if (!open || !mounted) return
    restoreFocus.current = document.activeElement as HTMLElement | null
    void panelRef.current?.offsetHeight
    setShown(true)
    panelRef.current?.focus({ preventScroll: true })
  }, [open, mounted])

  useEffect(() => {
    if (open || !mounted) return
    setShown(false)
    const t = setTimeout(() => {
      setMounted(false)
      onClosed?.()
      restoreFocus.current?.focus?.({ preventScroll: true })
    }, CLOSE_MS)
    return () => clearTimeout(t)
  }, [open, mounted, onClosed])

  useBackHandler(open, onClose)

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    // Never start a drag from interactive controls in the header — pointer capture would swallow their click.
    if ((e.target as Element).closest('button, a, input, select, textarea, label, [data-no-drag]')) return
    drag.current = { y: e.clientY, t: performance.now(), dy: 0, v: 0, id: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    const panel = panelRef.current
    if (!d || !panel || d.id !== e.pointerId) return
    const now = performance.now()
    const dy = Math.max(0, e.clientY - d.y)
    d.v = (dy - d.dy) / Math.max(1, now - d.t)
    d.dy = dy
    d.t = now
    panel.dataset.dragging = 'true'
    panel.style.setProperty('--sheet-drag', `${dy}px`)
  }
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    const panel = panelRef.current
    drag.current = null
    if (!d || !panel || d.id !== e.pointerId) return
    panel.dataset.dragging = 'false'
    const dismiss = d.dy > Math.min(160, panel.offsetHeight * 0.3) || (d.v > 0.6 && d.dy > 24)
    if (dismiss) onClose()
    requestAnimationFrame(() => panel.style.setProperty('--sheet-drag', '0px'))
  }
  const dragProps = { onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp }

  if (!mounted) return null
  const target = document.getElementById('app-root') ?? document.body
  return createPortal(
    <>
      <div className="sheet-backdrop" data-open={shown} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={cx('sheet-panel', className)}
        data-open={shown}
        data-has-footer={footer ? 'true' : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="sheet-handle" {...dragProps} />
        {bare ? null : (
          <div className={cx('sheet-header', headerClassName)} {...dragProps}>
            {header ?? <h2 className="sheet-title">{title}</h2>}
          </div>
        )}
        <div className={cx('sheet-body', bodyClassName)}>{children}</div>
        {footer ? <div className={cx('sheet-footer', footerClassName)}>{footer}</div> : null}
      </div>
    </>,
    target,
  )
}
