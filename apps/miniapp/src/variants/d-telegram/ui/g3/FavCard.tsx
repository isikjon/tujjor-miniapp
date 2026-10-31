import { Heart, Star } from 'lucide-react'
import { createContext, memo, useContext } from 'react'
import { useT } from '../../../../shared/i18n'
import { Link } from '../../../../shared/nav/Link'
import { paths } from '../../../../shared/nav/routes'
import { prefetchProduct, useProduct } from '../../../../shared/query/hooks'
import { Img } from '../../../../shared/ui/Img'
import { Skeleton } from '../../../../shared/ui/Skeleton'
import { Tap } from '../../../../shared/ui/Tap'
import { discountPct, fmtRating } from '../lib'

/** Screen-level remove handler (with undo) — keeps the memoised card props stable. */
export const FavRemoveContext = createContext<(id: string) => void>(() => undefined)

export const FAV_SIZES = '(max-width: 480px) 46vw, 220px'

/** Favourite product card: loads its own summary (instant from any cached list), heart removes it. */
export const FavCard = memo(function FavCard({ item: id }: { item: string; index: number }) {
  const t = useT()
  const remove = useContext(FavRemoveContext)
  const { summary, isError } = useProduct(id)

  if (!summary) {
    if (isError) return null
    return (
      <div className="d-card" aria-busy="true">
        <Skeleton className="d-g3-sk-img" style={{ aspectRatio: '1 / 1', borderRadius: 0 }} />
        <div className="d-card-body">
          <Skeleton style={{ width: '62%', height: 18, marginTop: 2 }} />
          <Skeleton style={{ width: '100%', height: 14, marginTop: 8 }} />
          <Skeleton style={{ width: '70%', height: 14, marginTop: 6 }} />
          <Skeleton style={{ width: '44%', height: 12, marginTop: 9 }} />
        </div>
      </div>
    )
  }

  const p = summary
  const title = t.l(p.title)
  const off = discountPct(p.price, p.oldPrice)
  return (
    <div className="d-g3-favwrap">
      <Link to={paths.product(p.id)} onIntent={() => prefetchProduct(p.id)} className="d-card tap" aria-label={title}>
        <Img image={p.image} alt={title} sizes={FAV_SIZES} className="d-g3-cardimg" />
        {off > 0 ? <span className="d-discount">−{off}%</span> : null}
        <span className="d-card-body">
          <span className="d-card-price">
            {t.money(p.price)}
            {p.oldPrice && p.oldPrice > p.price ? <span className="d-card-old">{t.money(p.oldPrice)}</span> : null}
          </span>
          <span className="d-card-title">{title}</span>
          <span className="d-card-meta">
            <Star size={12} className="d-star" aria-hidden="true" />
            {fmtRating(p.rating)}
            <span aria-hidden="true">·</span>
            <span className="truncate">{t.tp('product.reviewsCount', p.reviews)}</span>
          </span>
        </span>
      </Link>
      <Tap className="d-fav-btn" haptic={false} onClick={() => remove(p.id)} aria-label={t.t('d.g3.fav.remove')}>
        <span>
          <Heart size={17} strokeWidth={2.4} fill="currentColor" />
        </span>
      </Tap>
    </div>
  )
})
