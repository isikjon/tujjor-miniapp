import { Star, Zap } from 'lucide-react'
import { memo } from 'react'
import type { ProductSummary } from '../../../shared/types'
import { formatNumber, useT } from '../../../shared/i18n'
import { cx } from '../../../shared/lib/cx'
import { Link } from '../../../shared/nav/Link'
import { paths } from '../../../shared/nav/routes'
import { prefetchProduct } from '../../../shared/query/hooks'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { cardBadge, glowStyle } from '../lib/util'
import { BadgeSticker, HeartButton, Price, SOURCE_NAME, Sticker } from './bits'

export const GRID_SIZES = '(max-width: 500px) 46vw, 220px'

interface CardProps {
  item: ProductSummary
  index?: number
  /** CSS sizes for the image (grid default). */
  sizes?: string
  /** Big outlined rank numeral (hits rail). */
  rank?: number
  className?: string
}

/**
 * Neo product card: the transparent render floats on a halo tinted with its own colour,
 * one rotated sticker, price in the display face. Fixed text block height → rows never jump.
 */
export const ProductCard = memo(function ProductCard({ item, sizes = GRID_SIZES, rank, className }: CardProps) {
  const t = useT()
  const badge = cardBadge(item)
  const fast = item.badges.includes('fast')
  const showOld = item.oldPrice != null && item.oldPrice > item.price && item.price < 10_000_000
  return (
    <div className={cx('c-card', className)}>
      <Link to={paths.product(item.id)} onIntent={() => prefetchProduct(item.id)} className="c-card-link">
        <div className="c-card-tile c-glow" style={glowStyle(item.image.tint)}>
          <Img image={item.image} alt={t.l(item.title)} sizes={sizes} />
          {badge ? (
            <span className="c-card-sticker">
              {badge.kind === 'pct' ? (
                <Sticker tone="sale" tilt={-5}>
                  −{badge.pct}%
                </Sticker>
              ) : (
                <BadgeSticker badge={badge.badge} />
              )}
            </span>
          ) : null}
          {rank ? <span className="c-rank">{String(rank).padStart(2, '0')}</span> : null}
        </div>
        <div className="c-card-body">
          <div className="c-card-pricerow">
            <Price value={item.price} size="m" />
            {showOld ? <s className="c-old">{formatNumber(item.oldPrice!)}</s> : null}
          </div>
          <p className="c-card-title c-clamp2">{t.l(item.title)}</p>
          <div className="c-card-meta">
            <Star size={12} strokeWidth={0} fill="currentColor" className="text-ink" />
            <span className="text-ink">{item.rating.toFixed(1).replace('.', ',')}</span>
            <span aria-hidden="true">·</span>
            {fast ? <Zap size={12} strokeWidth={2.4} className="text-ink" /> : null}
            <span>
              {item.deliveryDays[0]}–{item.deliveryDays[1]} {t.t('units.days')}
            </span>
            <span className="c-src">{SOURCE_NAME[item.source]}</span>
          </div>
        </div>
      </Link>
      <HeartButton id={item.id} className="c-card-heart" />
    </div>
  )
})

/** Same footprint as ProductCard (no layout shift when data arrives). */
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cx('c-card', className)} aria-hidden="true">
      <Skeleton className="aspect-square w-full" style={{ borderRadius: 'var(--radius-tile)' }} />
      <div className="c-card-body">
        <div className="c-card-pricerow items-center">
          <Skeleton className="h-[16px] w-[64%]" />
        </div>
        <div className="c-card-title flex flex-col justify-center gap-[6px]">
          <Skeleton className="h-[12px] w-[92%]" />
          <Skeleton className="h-[12px] w-[58%]" />
        </div>
        <div className="c-card-meta">
          <Skeleton className="h-[11px] w-[70%]" />
        </div>
      </div>
    </div>
  )
}

/** Fixed-width card for rails. */
export function RailCard({ item, width = 156, rank }: { item: ProductSummary; width?: number; rank?: number }) {
  return (
    <div style={{ width }}>
      <ProductCard item={item} sizes={`${width}px`} rank={rank} />
    </div>
  )
}
