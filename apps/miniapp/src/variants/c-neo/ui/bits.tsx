import { ArrowRight, Check, Heart } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import type { Badge, SourceMarket } from '../../../shared/types'
import { formatNumber, useT } from '../../../shared/i18n'
import { cx } from '../../../shared/lib/cx'
import { Link } from '../../../shared/nav/Link'
import { useFavoriteToggle } from '../../../shared/query/hooks'
import { useIsFavorite } from '../../../shared/store/favorites'
import { Tap } from '../../../shared/ui/Tap'
import { badgeTone, type StickerTone } from '../lib/util'

/** Price: number in the display face, currency in the UI face (stays compact on 2-column cards). */
export function Price({ value, size = 'm', className, style }: { value: number; size?: 's' | 'm' | 'l' | 'xl'; className?: string; style?: CSSProperties }) {
  const t = useT()
  return (
    <span className={cx('c-price', className)} data-size={size} style={style}>
      <span>{formatNumber(value)}</span>
      <span className="c-price-cur">{t.t('currency.uzs')}</span>
    </span>
  )
}

export function Sticker({ tone, tilt = 0, big, children, className }: { tone: StickerTone; tilt?: number; big?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cx('c-sticker', className)} data-tone={tone} data-big={big || undefined} style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}>
      {children}
    </span>
  )
}

const TILTS: Partial<Record<Badge, number>> = { hit: 4, new: -4, original: -3, sale: -5, choice: 3 }

export function BadgeSticker({ badge, big, tilt }: { badge: Badge; big?: boolean; tilt?: number }) {
  const t = useT()
  return (
    <Sticker tone={badgeTone(badge)} tilt={tilt ?? TILTS[badge] ?? 0} big={big}>
      {t.t(`badge.${badge}`)}
    </Sticker>
  )
}

export const SOURCE_NAME: Record<SourceMarket, string> = { '1688': '1688', alibaba: 'Alibaba', poizon: 'POIZON' }

export function Kicker({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span className={cx('c-kicker', className)} style={style}>
      {children}
    </span>
  )
}

/** Editorial section header: mono index + kicker over a display title, optional "all" link. */
export function SectionHead({ index, kicker, title, to, right }: { index?: string; kicker?: string; title: string; to?: string; right?: ReactNode }) {
  const t = useT()
  return (
    <div className="c-sec">
      <div className="min-w-0 flex-1">
        {kicker ? (
          <div className="mb-1.5 flex items-center gap-2">
            {index ? <span className="c-sec-idx">{index}</span> : null}
            <Kicker>{kicker}</Kicker>
          </div>
        ) : null}
        <h2 className="c-h2 truncate">{title}</h2>
      </div>
      {right}
      {to ? (
        <Link to={to} className="c-more">
          {t.t('action.showAll')}
          <ArrowRight size={16} strokeWidth={2.2} />
        </Link>
      ) : null}
    </div>
  )
}

/** Favourite toggle with a pop when switched on by the user (not on mount). */
export function HeartButton({ id, className, size = 'm', label }: { id: string; className?: string; size?: 'm' | 'l'; label?: string }) {
  const on = useIsFavorite(id)
  const toggle = useFavoriteToggle()
  const t = useT()
  const [touched, setTouched] = useState(false)
  return (
    <Tap
      haptic={false}
      className={cx('c-heart', className)}
      data-on={on}
      data-size={size}
      aria-pressed={on}
      aria-label={label ?? t.t('tab.favorites')}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setTouched(true)
        toggle(id)
      }}
    >
      <Heart key={on ? 'on' : 'off'} className={on && touched ? 'c-pop' : undefined} size={size === 'l' ? 22 : 18} strokeWidth={2.2} />
    </Tap>
  )
}

export function Switch({ on }: { on: boolean }) {
  return <span className="c-switch" data-on={on} aria-hidden="true" />
}

export function CheckBox({ on }: { on: boolean }) {
  return (
    <span className="c-check" data-on={on} aria-hidden="true">
      <Check size={16} strokeWidth={3} />
    </span>
  )
}

export function Radio({ on }: { on: boolean }) {
  return <span className="c-radio" data-on={on} aria-hidden="true" />
}

/** Screen top bar: the compact title fades in once the content scrolls under it. */
export function TopBar({ title, right, pinned }: { title: string; right?: ReactNode; pinned?: boolean }) {
  return (
    <div className="c-topbar" data-pinned={pinned || undefined}>
      <span className="c-topbar-title">{title}</span>
      {right}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx('c-spin', className)} aria-hidden="true" />
}

export function Dash() {
  return <div className="c-dash" aria-hidden="true" />
}
