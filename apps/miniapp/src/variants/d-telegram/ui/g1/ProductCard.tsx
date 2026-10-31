import { Heart, Star } from 'lucide-react'
import { memo } from 'react'
import { useT } from '../../../../shared/i18n'
import { cx } from '../../../../shared/lib/cx'
import { Link } from '../../../../shared/nav/Link'
import { paths } from '../../../../shared/nav/routes'
import { prefetchProduct, useFavoriteToggle } from '../../../../shared/query/hooks'
import { useIsFavorite } from '../../../../shared/store/favorites'
import type { ProductSummary } from '../../../../shared/types'
import { Img } from '../../../../shared/ui/Img'
import { Skeleton } from '../../../../shared/ui/Skeleton'
import { Tap } from '../../../../shared/ui/Tap'
import { discountPct, fmtRating } from '../lib'

/** Two-column grid card ≈ 46vw on phones; shelf cards are a fixed 144 px column. */
export const GRID_SIZES = '(max-width: 480px) 46vw, 220px'

/** Favourite toggle (optimistic, haptics inside useFavoriteToggle). */
export const FavButton = memo(function FavButton({ id }: { id: string }) {
  const t = useT()
  const on = useIsFavorite(id)
  const toggle = useFavoriteToggle()
  return (
    <Tap className="d-fav-btn g1-fav" haptic={false} aria-pressed={on} aria-label={t.t('favorites.title')} onClick={() => toggle(id)}>
      <span>
        <Heart size={16} strokeWidth={2.4} fill={on ? 'currentColor' : 'none'} />
      </span>
    </Tap>
  )
})

/** Product card (grid or shelf). Memoised: lists re-render only the cards whose data changed. */
export const ProductCard = memo(function ProductCard({ p, shelf, priority, fav = !shelf }: { p: ProductSummary; shelf?: boolean; priority?: boolean; fav?: boolean }) {
  const t = useT()
  const off = discountPct(p.price, p.oldPrice)
  return (
    <div className="g1-card">
      <Link to={paths.product(p.id)} onIntent={() => prefetchProduct(p.id)} className={cx('d-card', shelf && 'd-card-shelf')}>
        <Img image={p.image} alt="" sizes={shelf ? '144px' : GRID_SIZES} priority={priority} />
        {off ? <span className="d-discount">−{off}%</span> : null}
        <span className="d-card-body">
          <span className="d-card-price">
            {t.money(p.price)}
            {off && p.oldPrice ? <span className="d-card-old">{t.money(p.oldPrice)}</span> : null}
          </span>
          <span className="d-card-title">{t.l(p.title)}</span>
          <span className="d-card-meta">
            <Star size={12} className="d-star" aria-hidden="true" />
            <span>{fmtRating(p.rating)}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{t.t('d.g1.days', { from: p.deliveryDays[0], to: p.deliveryDays[1] })}</span>
          </span>
        </span>
      </Link>
      {fav ? <FavButton id={p.id} /> : null}
    </div>
  )
})

/** Stable item component for VirtualGrid. */
export const GridItem = memo(function GridItem({ item }: { item: ProductSummary; index: number }) {
  return <ProductCard p={item} />
})

export const productKey = (p: ProductSummary) => p.id

/** Same box model as ProductCard (no layout shift when data arrives). */
export function CardSkeleton({ shelf }: { shelf?: boolean }) {
  return (
    <div className={cx('d-card', shelf && 'd-card-shelf')} aria-hidden="true">
      <Skeleton style={{ aspectRatio: '1 / 1', borderRadius: 0 }} />
      <span className="d-card-body">
        <Skeleton style={{ height: 16, width: '62%', margin: '3px 0' }} />
        <Skeleton style={{ height: 13, width: '92%', marginTop: 6 }} />
        <Skeleton style={{ height: 13, width: '70%', marginTop: 5 }} />
        <Skeleton style={{ height: 12, width: '48%', marginTop: 9, marginBottom: 1 }} />
      </span>
    </div>
  )
}

export function GridSkeleton({ n = 6 }: { n?: number }) {
  return (
    <div className="g1-grid g1-grid-static" aria-busy="true">
      {Array.from({ length: n }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
