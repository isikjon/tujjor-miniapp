import { ChevronRight, Star, Truck, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { useT } from '../../../shared/i18n'
import { Link } from '../../../shared/nav/Link'
import { cx } from '../../../shared/lib/cx'
import type { SourceMarket } from '../../../shared/types'
import { useCountdown } from '../../../shared/ui/Countdown'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { Tap, type TapProps } from '../../../shared/ui/Tap'
import { discountPct, FAST_DAYS } from '../lib'

/** Price + struck old price (+ optional inline discount badge). Sale price turns hot pink. */
export function Price({ price, old, size = 'sm', showDiscount, className }: { price: number; old?: number | null; size?: 'sm' | 'md' | 'lg'; showDiscount?: boolean; className?: string }) {
  const t = useT()
  const pct = discountPct(price, old)
  return (
    <span className={cx('b-price', className)} data-size={size} data-sale={pct != null}>
      <span className="b-price__now">{t.money(price)}</span>
      {pct != null && old ? <span className="b-price__old">{t.money(old)}</span> : null}
      {showDiscount && pct != null ? <DiscountBadge price={price} old={old} size={size === 'lg' ? 'lg' : 'sm'} /> : null}
    </span>
  )
}

/** "−23%" pill; renders nothing without a real discount. Pass `pct` directly or price/old. */
export function DiscountBadge({ price, old, pct, size = 'sm', className }: { price?: number; old?: number | null; pct?: number | null; size?: 'sm' | 'lg'; className?: string }) {
  const v = pct ?? (price != null ? discountPct(price, old) : null)
  if (v == null) return null
  return (
    <span className={cx('b-disc', className)} data-size={size}>
      −{v}%
    </span>
  )
}

/** Small marketplace badge (1688 / Alibaba / POIZON). */
export function SourceBadge({ source, className }: { source: SourceMarket; className?: string }) {
  const t = useT()
  return (
    <span className={cx('b-src', className)} data-src={source}>
      {t.t(`source.${source}`)}
    </span>
  )
}

/** ★ 4.8 · 1 234 (reviews optional; `long` → "1 234 отзыва"). */
export function Rating({ value, reviews, long, className }: { value: number; reviews?: number; long?: boolean; className?: string }) {
  const t = useT()
  return (
    <span className={cx('b-rating', className)}>
      <Star size={12} strokeWidth={0} aria-hidden="true" />
      <span className="b-rating__val">{value.toFixed(1).replace('.', t.locale === 'ru' ? ',' : '.')}</span>
      {reviews != null ? <span>· {long ? t.tp('product.reviewsCount', reviews) : t.compact(reviews)}</span> : null}
    </span>
  )
}

/** "12–18 дн" chip, or green "Быстро" when deliveryDays[1] ≤ FAST_DAYS. */
export function DeliveryChip({ days, className }: { days: [number, number]; className?: string }) {
  const t = useT()
  const fast = days[1] <= FAST_DAYS
  return (
    <span className={cx('b-deliv', className)} data-fast={fast}>
      {fast ? <Zap size={11} strokeWidth={2.6} aria-hidden="true" /> : <Truck size={11} strokeWidth={2.4} aria-hidden="true" />}
      {fast ? t.t('b.fast') : t.t('b.days', { from: days[0], to: days[1] })}
    </span>
  )
}

/** Orange HH:MM:SS cells (flash sale). */
export function CountdownCells({ endsAt }: { endsAt?: string }) {
  const c = useCountdown(endsAt)
  if (!endsAt) return null
  return (
    <span className="b-timer" aria-label={`${c.h}:${c.m}:${c.s}`}>
      <span className="b-timer__cell">{c.h}</span>:<span className="b-timer__cell">{c.m}</span>:<span className="b-timer__cell">{c.s}</span>
    </span>
  )
}

/** Section title + optional subtitle, countdown and "Все" link (to = path). */
export function SectionHeader({ title, sub, to, endsAt, action, className }: { title: string; sub?: string; to?: string; endsAt?: string; action?: ReactNode; className?: string }) {
  const t = useT()
  return (
    <div className={cx('b-sec', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="b-sec__title">{title}</h2>
          {endsAt ? <CountdownCells endsAt={endsAt} /> : null}
        </div>
        {sub ? <p className="b-sec__sub">{sub}</p> : null}
      </div>
      {action ??
        (to ? (
          <Link to={to} className="b-sec__all">
            {t.t('action.showAll')}
            <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" />
          </Link>
        ) : null)}
    </div>
  )
}

/** Pill chip (toggle/filter). `on` = selected (violet), `count` = pink counter, tone 'tile' = grey fill. */
export function Chip({ on, count, icon, tone, className, children, ...rest }: TapProps & { on?: boolean; count?: number; icon?: ReactNode; tone?: 'surface' | 'tile' }) {
  return (
    <Tap {...rest} className={cx('b-chip', className)} data-on={!!on} data-tone={tone ?? 'surface'} aria-pressed={on}>
      {icon}
      {children}
      {count ? <span className="b-chip__count">{count}</span> : null}
    </Tap>
  )
}

/** Button: kind primary(violet)/secondary(soft violet)/ghost/hot(pink)/success, size sm 36/md 44/lg 52, block, loading spinner. */
export function Button({ kind = 'primary', size = 'md', block, loading, icon, className, children, disabled, ...rest }: TapProps & { kind?: 'primary' | 'secondary' | 'ghost' | 'hot' | 'success'; size?: 'sm' | 'md' | 'lg'; block?: boolean; loading?: boolean; icon?: ReactNode }) {
  return (
    <Tap {...rest} disabled={disabled || loading} className={cx('b-btn', className)} data-kind={kind} data-size={size} data-block={!!block} data-loading={!!loading} aria-busy={loading || undefined}>
      <span className="b-btn__label inline-flex items-center gap-2">
        {icon}
        {children}
      </span>
      {loading ? <span className="b-btn__spin" aria-hidden="true" /> : null}
    </Tap>
  )
}

/** Square 44px (sm 36px) icon button. tone: surface | tile | onaccent (white on violet header). `label` = aria-label (required). */
export function IconButton({ label, tone = 'tile', size = 'md', round, className, children, ...rest }: TapProps & { label: string; tone?: 'surface' | 'tile' | 'onaccent' | 'none'; size?: 'sm' | 'md'; round?: boolean }) {
  return (
    <Tap {...rest} aria-label={label} title={label} className={cx('b-iconbtn', className)} data-tone={tone} data-size={size} data-round={!!round}>
      {children}
    </Tap>
  )
}

/** Empty state: violet icon tile, title, text, optional action (e.g. <Button>). */
export function EmptyView({ icon, title, text, action, className }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('b-empty', className)}>
      {icon ? <div className="b-empty__icon">{icon}</div> : null}
      <p className="b-empty__title">{title}</p>
      {text ? <p className="b-empty__text">{text}</p> : null}
      {action ? <div className="b-empty__action">{action}</div> : null}
    </div>
  )
}

/** Card-shaped skeleton with the exact ProductCard layout (no layout shift). */
export function CardSkeleton({ variant = 'grid' }: { variant?: 'grid' | 'rail' }) {
  return (
    <div className="b-card" data-variant={variant} aria-hidden="true">
      <Skeleton className="aspect-square w-full" style={{ borderRadius: 0 }} />
      <div className="b-card__body">
        <Skeleton style={{ height: 13, width: '92%' }} />
        <Skeleton style={{ height: 13, width: '60%' }} />
        <Skeleton style={{ height: 18, width: '55%', marginTop: 4 }} />
        <div className="b-card__foot">
          <Skeleton style={{ height: 20, width: '58%' }} />
          <Skeleton style={{ height: 36, width: 36, borderRadius: 11, marginLeft: 'auto' }} />
        </div>
      </div>
    </div>
  )
}

/** 2-column grid of CardSkeleton (default 6), with the same gutters as .b-grid. */
export function GridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cx('b-grid', className)}>
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

/** Horizontal rail skeleton (n rail cards). */
export function RailSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="b-rail">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} variant="rail" />
      ))}
    </div>
  )
}
