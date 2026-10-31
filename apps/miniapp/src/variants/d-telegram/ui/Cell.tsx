import { Check, ChevronRight } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { cx } from '../../../shared/lib/cx'
import { Link } from '../../../shared/nav/Link'
import type { HapticKind } from '../../../shared/telegram/protocol'
import { Tap } from '../../../shared/ui/Tap'

/** Inset grouped section (Telegram Settings): uppercase header, rounded cells, hint footer. */
export function Group({
  header,
  headerRight,
  footer,
  children,
  className,
  sectionClassName,
  id,
}: {
  header?: ReactNode
  headerRight?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
  sectionClassName?: string
  id?: string
}) {
  return (
    <section className={cx('d-group', className)} id={id}>
      {header || headerRight ? (
        <div className="d-group-header">
          <span className="min-w-0 truncate">{header}</span>
          {headerRight}
        </div>
      ) : null}
      <div className={cx('d-section', sectionClassName)}>{children}</div>
      {footer ? <div className="d-group-footer">{footer}</div> : null}
    </section>
  )
}

export interface CellProps {
  /** Left element: squircle icon, thumbnail, checkbox… */
  icon?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  /** Right-aligned hint text (iOS "value1" cell). */
  value?: ReactNode
  valueTone?: 'hint' | 'ink'
  /** Custom right element (checkmark, switch, stepper). */
  after?: ReactNode
  chevron?: boolean
  to?: string
  onIntent?: () => void
  onClick?: () => void
  haptic?: HapticKind | false
  tone?: 'default' | 'link' | 'destructive' | 'hint'
  /** Separator inset from the left edge, px (defaults: 16, or 60 with an icon). */
  sep?: number
  wrap?: boolean
  disabled?: boolean
  className?: string
  bodyClassName?: string
  ariaLabel?: string
  ariaCurrent?: boolean
  style?: CSSProperties
}

/** One row of a grouped list. Renders a Link (to), a Tap button (onClick) or a static row. */
export function Cell({
  icon,
  title,
  subtitle,
  value,
  valueTone = 'hint',
  after,
  chevron,
  to,
  onIntent,
  onClick,
  haptic,
  tone = 'default',
  sep,
  wrap,
  disabled,
  className,
  bodyClassName,
  ariaLabel,
  ariaCurrent,
  style,
}: CellProps) {
  const sepPx = sep ?? (icon ? 60 : 16)
  const inner = (
    <>
      {icon ? <span className="d-cell-icon">{icon}</span> : null}
      <span className={cx('d-cell-body', bodyClassName)}>
        <span className="d-cell-title" data-wrap={wrap || undefined}>
          {title}
        </span>
        {subtitle ? <span className="d-cell-subtitle">{subtitle}</span> : null}
      </span>
      {value != null && value !== '' ? (
        <span className="d-cell-value" data-tone={valueTone}>
          {value}
        </span>
      ) : null}
      {after}
      {chevron ? <ChevronRight className="d-cell-chevron" size={20} strokeWidth={2.2} aria-hidden="true" /> : null}
    </>
  )
  const common = {
    className: cx('d-cell', className),
    'data-tone': tone === 'default' ? undefined : tone,
    style: { '--sep': `${sepPx}px`, ...style } as CSSProperties,
    'aria-label': ariaLabel,
  }
  if (to) {
    return (
      <Link to={to} onIntent={onIntent} haptic={haptic === false ? false : 'selection'} {...common} aria-current={ariaCurrent ? 'page' : undefined}>
        {inner}
      </Link>
    )
  }
  if (onClick) {
    return (
      <Tap flat haptic={haptic ?? 'selection'} onClick={onClick} disabled={disabled} aria-pressed={ariaCurrent} {...common}>
        {inner}
      </Tap>
    )
  }
  return <div {...common}>{inner}</div>
}

/** Selection row with a trailing checkmark (radio semantics). */
export function CheckCell({ checked, ...props }: Omit<CellProps, 'after' | 'chevron'> & { checked: boolean }) {
  return (
    <Cell
      {...props}
      ariaCurrent={checked}
      after={<Check className="d-check" size={22} strokeWidth={2.6} style={{ opacity: checked ? 1 : 0 }} aria-hidden="true" />}
    />
  )
}

/** Free-form block inside a section (keeps separators consistent with cells). */
export function Block({ children, className, sep, style }: { children: ReactNode; className?: string; sep?: number; style?: CSSProperties }) {
  return (
    <div className={cx('d-block', className)} style={{ '--sep': `${sep ?? 16}px`, ...style } as CSSProperties}>
      {children}
    </div>
  )
}
