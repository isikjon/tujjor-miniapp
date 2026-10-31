import { memo } from 'react'
import type { ProductSummary } from '../../../shared/types'
import { useT, type Translator } from '../../../shared/i18n'
import { cx } from '../../../shared/lib/cx'
import { Link } from '../../../shared/nav/Link'
import { paths } from '../../../shared/nav/routes'
import { prefetchProduct } from '../../../shared/query/hooks'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { Price } from './controls'

/** One quiet line above the title: "Новинка" (sale colour) or the brand / marketplace in small caps. */
export function eyebrowOf(item: Pick<ProductSummary, 'badges' | 'brand' | 'source'>, t: Translator): { text: string; isNew: boolean } {
  if (item.badges.includes('new')) return { text: t.t('badge.new'), isNew: true }
  return { text: item.brand ?? t.t(`source.${item.source}`), isNew: false }
}

const GRID_SIZES = '(max-width: 500px) 46vw, 220px'

/** 2-column grid card (memoised; used by every VirtualGrid). */
export const GridCard = memo(function GridCard({ item }: { item: ProductSummary; index: number }) {
  const t = useT()
  const eb = eyebrowOf(item, t)
  return (
    <Link to={paths.product(item.id)} onIntent={() => prefetchProduct(item.id)} className="a-card">
      <Img image={item.image} alt={t.l(item.title)} sizes={GRID_SIZES} className="a-card__tile" />
      <div className="a-card__body">
        <p className={cx('a-card__eyebrow', eb.isNew && 'is-new')}>{eb.text}</p>
        <p className="a-card__title">{t.l(item.title)}</p>
        <Price value={item.price} old={item.oldPrice} size="sm" stacked />
      </div>
    </Link>
  )
})

/** Large shelf card (horizontal carousels). `size` controls the width class. */
export const ShelfCard = memo(function ShelfCard({ item, size = 'lg' }: { item: ProductSummary; size?: 'lg' | 'sm' }) {
  const t = useT()
  const eb = eyebrowOf(item, t)
  return (
    <Link to={paths.product(item.id)} onIntent={() => prefetchProduct(item.id)} className={cx('a-shelfcard', `a-shelfcard--${size}`)}>
      <Img image={item.image} alt={t.l(item.title)} sizes={size === 'lg' ? '(max-width: 500px) 72vw, 340px' : '(max-width: 500px) 44vw, 200px'} className="a-card__tile" />
      <div className="a-card__body">
        <p className={cx('a-card__eyebrow', eb.isNew && 'is-new')}>{eb.text}</p>
        <p className="a-card__title">{t.l(item.title)}</p>
        <Price value={item.price} old={item.oldPrice} size={size === 'lg' ? 'md' : 'sm'} stacked={size === 'sm'} />
      </div>
    </Link>
  )
})

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cx('a-card', className)} aria-hidden="true">
      <Skeleton className="a-card__tile a-skel-tile" />
      <div className="a-card__body">
        <Skeleton className="a-skel-line" style={{ width: '34%', height: 10, marginTop: 3, marginBottom: 7 }} />
        <Skeleton className="a-skel-line" style={{ width: '92%', height: 12, marginBottom: 7 }} />
        <Skeleton className="a-skel-line" style={{ width: '64%', height: 12, marginBottom: 12 }} />
        <Skeleton className="a-skel-line" style={{ width: '48%', height: 14 }} />
      </div>
    </div>
  )
}

/** Grid placeholder with the real grid's geometry (2 columns, same gaps). */
export function GridSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="a-gridskel">
      {Array.from({ length: rows * 2 }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
