import { Check, ChevronRight, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { useT } from '../../../shared/i18n'
import { cx } from '../../../shared/lib/cx'
import { Link } from '../../../shared/nav/Link'
import { Tap, type TapProps } from '../../../shared/ui/Tap'
import { discountPct } from '../lib'

/** Thin-stroke icon defaults for the whole variant. */
export const ICON = { size: 20, strokeWidth: 1.5 } as const

// ── typography blocks ──────────────────────────────────────────────────────

export function SectionHead({ title, link, aside, className }: { title: string; link?: { label: string; to: string }; aside?: ReactNode; className?: string }) {
  return (
    <div className={cx('a-sechead', className)}>
      <h2 className="a-h2">{title}</h2>
      {aside}
      {link ? (
        <Link to={link.to} className="a-textlink">
          {link.label}
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  )
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('a-eyebrow', className)}>{children}</p>
}

// ── buttons ────────────────────────────────────────────────────────────────

export interface BtnProps extends TapProps {
  kind?: 'primary' | 'secondary' | 'outline' | 'plain'
  size?: 'lg' | 'md' | 'sm'
  block?: boolean
  loading?: boolean
}

/** Pill button. Loading keeps the width and shows a spinner (no layout shift). */
export function Btn({ kind = 'primary', size = 'lg', block, loading, className, children, disabled, ...rest }: BtnProps) {
  return (
    <Tap
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx('a-btn', `a-btn--${kind}`, `a-btn--${size}`, block && 'a-btn--block', className)}
      data-loading={loading || undefined}
    >
      <span className="a-btn__label">{children}</span>
      {loading ? <Spinner className="a-btn__spinner" /> : null}
    </Tap>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx('a-spinner', className)} aria-hidden="true" />
}

// ── selection controls (visual only — the row is the button) ───────────────

export function CheckMark({ on, className }: { on: boolean; className?: string }) {
  return (
    <span className={cx('a-check', className)} data-on={on} aria-hidden="true">
      <Check size={14} strokeWidth={2.5} />
    </span>
  )
}

export function RadioMark({ on }: { on: boolean }) {
  return <span className="a-radio" data-on={on} aria-hidden="true" />
}

export function SwitchMark({ on }: { on: boolean }) {
  return (
    <span className="a-switch" data-on={on} aria-hidden="true">
      <span className="a-switch__knob" />
    </span>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void; label: string }) {
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div className="a-seg" role="tablist" aria-label={label} style={{ ['--seg-n' as string]: options.length, ['--seg-i' as string]: index }}>
      <span className="a-seg__thumb" aria-hidden="true" />
      {options.map((o) => (
        <Tap key={o.value} role="tab" aria-selected={o.value === value} flat className="a-seg__item" data-on={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </Tap>
      ))}
    </div>
  )
}

export function Chip({ on, children, className, ...rest }: TapProps & { on?: boolean }) {
  return (
    <Tap {...rest} className={cx('a-chip', className)} data-on={on || undefined} aria-pressed={on}>
      {children}
    </Tap>
  )
}

// ── commerce atoms ─────────────────────────────────────────────────────────

/** Price + struck old price (ink-3) + discount text (sale colour). */
export function Price({ value, old, size = 'md', className, stacked }: { value: number; old?: number | null; size?: 'sm' | 'md' | 'lg'; className?: string; stacked?: boolean }) {
  const t = useT()
  const pct = discountPct(value, old)
  return (
    <div className={cx('a-price', `a-price--${size}`, stacked && 'a-price--stacked', className)}>
      <span className="a-price__now">{t.money(value)}</span>
      {pct > 0 ? (
        <span className="a-price__was">
          <s>{t.money(old!)}</s>
          <span className="a-price__pct">−{pct}%</span>
        </span>
      ) : null}
    </div>
  )
}

export function Stars({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <span className="a-stars" aria-label={value.toFixed(1)}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={size} strokeWidth={1.5} data-on={value >= i + 0.75 ? 'full' : value >= i + 0.25 ? 'half' : 'none'} aria-hidden="true" />
      ))}
    </span>
  )
}

export function Rating({ value, count }: { value: number; count?: string }) {
  return (
    <span className="a-rating">
      <Star size={13} strokeWidth={0} fill="currentColor" aria-hidden="true" />
      <b>{value.toFixed(1).replace('.', ',')}</b>
      {count ? <span>· {count}</span> : null}
    </span>
  )
}
