import { ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { OrderStatus } from '../../../../shared/types'
import { useT } from '../../../../shared/i18n'
import { cx } from '../../../../shared/lib/cx'
import { Link } from '../../../../shared/nav/Link'
import { Tap } from '../../../../shared/ui/Tap'
import { statusGroup } from '../../lib/util'

interface RowProps {
  icon: LucideIcon
  label: string
  value?: ReactNode
  to?: string
  onClick?: () => void
  tone?: 'lime' | 'violet' | 'ink'
}

/** Menu row: icon tile, label, trailing value + chevron. Link / button / static info row. */
export function MenuRow({ icon: Icon, label, value, to, onClick, tone }: RowProps) {
  const body = (
    <>
      <span className="c-row-ico" data-tone={tone}>
        <Icon size={20} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[15.5px] font-[600]">{label}</span>
      {value != null ? <span className="c-g3-rowval">{value}</span> : null}
      {to || onClick ? <ChevronRight size={18} strokeWidth={2.2} className="shrink-0 text-ink-3" /> : null}
    </>
  )
  if (to)
    return (
      <Link to={to} className="c-row tap-flat">
        {body}
      </Link>
    )
  if (onClick)
    return (
      <Tap flat className="c-row" onClick={onClick}>
        {body}
      </Tap>
    )
  return <div className="c-row">{body}</div>
}

export function StatusPill({ status, className }: { status: OrderStatus; className?: string }) {
  const t = useT()
  return (
    <span className={cx('c-status', className)} data-g={statusGroup(status)}>
      {t.t(`status.${status}`)}
    </span>
  )
}

/** Progress segments for an order timeline (one segment per step). */
export function Segments({ done, total, className }: { done: number; total: number; className?: string }) {
  return (
    <div className={cx('c-seg', className)} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} data-on={i < done} />
      ))}
    </div>
  )
}

export function Kick({ children }: { children: ReactNode }) {
  return <p className="c-kicker mb-2 px-1">{children}</p>
}
