import { Check, Search, X } from 'lucide-react'
import { forwardRef, type CSSProperties, type ReactNode } from 'react'
import { useT } from '../../../shared/i18n'
import { cx } from '../../../shared/lib/cx'
import { Link } from '../../../shared/nav/Link'
import { tg } from '../../../shared/telegram/adapter'
import { Tap } from '../../../shared/ui/Tap'

export type SquircleColor = 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'indigo' | 'purple' | 'pink' | 'gray' | 'accent'

/** Telegram Settings icon: white glyph on a coloured squircle. */
export function Squircle({ color, children, size, className, style }: { color: SquircleColor; children: ReactNode; size?: 'lg'; className?: string; style?: CSSProperties }) {
  return (
    <span className={cx('d-sq', size === 'lg' && 'd-sq-lg', className)} data-c={color} style={style} aria-hidden="true">
      {children}
    </span>
  )
}

/** Large page title (scrolls with content — the Telegram header stays on top). */
export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="pb-1">
      <h1 className="d-title">{children}</h1>
      {sub ? <p className="d-title-sub">{sub}</p> : null}
    </div>
  )
}

/** UISegmentedControl with a sliding thumb (transform only). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  label,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
  className?: string
  label?: string
}) {
  const i = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div className={cx('d-seg', className)} role="group" aria-label={label} style={{ '--n': options.length, '--i': i } as CSSProperties}>
      <span className="d-seg-thumb" aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => {
            if (o.value === value) return
            tg.haptic('selection')
            onChange(o.value)
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="d-switch"
      onClick={(e) => {
        e.stopPropagation()
        tg.haptic('selection')
        onChange(!checked)
      }}
    />
  )
}

export function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span className="d-checkbox" data-on={checked} aria-hidden="true">
      <Check size={14} strokeWidth={3.2} />
    </span>
  )
}

export function Spinner({ size }: { size?: 'sm' }) {
  return <span className="d-spinner" data-size={size} role="progressbar" aria-busy="true" />
}

/** Home header search entry: looks like UISearchBar, opens the search screen. */
export function SearchEntry({ to, placeholder }: { to: string; placeholder: string }) {
  return (
    <Link to={to} className="d-search flex-1" haptic="selection" aria-label={placeholder}>
      <Search size={17} strokeWidth={2.4} aria-hidden="true" />
      <span className="d-search-ph">{placeholder}</span>
    </Link>
  )
}

export const SearchInput = forwardRef<
  HTMLInputElement,
  { value: string; onChange: (v: string) => void; onSubmit: () => void; onClear: () => void; placeholder: string; autoFocus?: boolean }
>(function SearchInput({ value, onChange, onSubmit, onClear, placeholder, autoFocus }, ref) {
  const t = useT()
  return (
    <form
      role="search"
      className="d-search"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <Search size={17} strokeWidth={2.4} aria-hidden="true" />
      <input
        ref={ref}
        type="search"
        enterKeyHint="search"
        inputMode="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
      />
      {value ? (
        <Tap className="d-search-clear" haptic="light" onClick={onClear} aria-label={t.t('action.reset')}>
          <span>
            <X size={11} strokeWidth={3.4} />
          </span>
        </Tap>
      ) : null}
    </form>
  )
})

/** Sheet navigation bar: [left] Title [right]. */
export function SheetBar({ title, left, right }: { title: string; left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="d-sheetbar">
      <div>{left}</div>
      <h2 className="sheet-title truncate">{title}</h2>
      <div>{right}</div>
    </div>
  )
}

export function SheetClose({ onClose }: { onClose: () => void }) {
  const t = useT()
  return (
    <Tap className="d-close" haptic="light" onClick={onClose} aria-label={t.t('action.close')}>
      <X size={16} strokeWidth={2.8} />
    </Tap>
  )
}

/** Centered empty / info state with a tinted icon disc. */
export function EmptyView({ icon, title, text, action, className }: { icon: ReactNode; title: string; text?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('d-empty', className)}>
      <div className="d-empty-icon">{icon}</div>
      <p className="d-empty-title">{title}</p>
      {text ? <p className="d-empty-text">{text}</p> : null}
      {action ? <div className="d-empty-action">{action}</div> : null}
    </div>
  )
}
