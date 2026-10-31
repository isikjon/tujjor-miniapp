import { ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from '../../../../shared/nav/Link'
import { Tap } from '../../../../shared/ui/Tap'

interface MenuRowProps {
  icon: LucideIcon
  label: string
  /** Secondary text on the right (current language, count…). */
  value?: ReactNode
  /** Second line under the label. */
  hint?: string
  to?: string
  onClick?: () => void
}

/** Inset-list row: thin icon, label, quiet value, chevron. Static (info) when neither `to` nor `onClick` is given. */
export function MenuRow({ icon: Icon, label, value, hint, to, onClick }: MenuRowProps) {
  const body = (
    <>
      <span className="a-g3-row__icon" aria-hidden="true">
        <Icon size={20} strokeWidth={1.5} />
      </span>
      <span className="a-g3-row__text">
        <span className="a-g3-row__label">{label}</span>
        {hint ? <span className="a-g3-row__hint">{hint}</span> : null}
      </span>
      {value != null ? <span className="a-g3-row__value">{value}</span> : null}
      {to || onClick ? <ChevronRight size={18} strokeWidth={1.5} className="a-g3-row__chev" aria-hidden="true" /> : null}
    </>
  )
  if (to)
    return (
      <Link to={to} className="a-g3-row">
        {body}
      </Link>
    )
  if (onClick)
    return (
      <Tap flat className="a-g3-row" onClick={onClick}>
        {body}
      </Tap>
    )
  return <div className="a-g3-row a-g3-row--static">{body}</div>
}
