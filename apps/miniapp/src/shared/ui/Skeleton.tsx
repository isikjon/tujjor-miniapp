import type { CSSProperties } from 'react'
import { cx } from '../lib/cx'

/** Placeholder block with the exact size of the content it replaces (no layout shift). */
export function Skeleton({ className, style, round }: { className?: string; style?: CSSProperties; round?: boolean }) {
  return <span aria-hidden="true" className={cx('skeleton block', className)} style={{ ...(round ? { borderRadius: 999 } : null), ...style }} />
}
