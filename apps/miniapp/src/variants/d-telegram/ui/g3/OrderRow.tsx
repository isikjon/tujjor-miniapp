import { ChevronRight } from 'lucide-react'
import { memo } from 'react'
import { useT } from '../../../../shared/i18n'
import { Link } from '../../../../shared/nav/Link'
import { paths } from '../../../../shared/nav/routes'
import type { Order } from '../../../../shared/types'
import { Img } from '../../../../shared/ui/Img'
import { Skeleton } from '../../../../shared/ui/Skeleton'

const MAX_THUMBS = 4

/** One order in an inset grouped list: number + total, status, date · count, product thumbnails. */
export const OrderRow = memo(function OrderRow({ order }: { order: Order }) {
  const t = useT()
  const qty = order.items.reduce((s, i) => s + i.qty, 0)
  const extra = order.items.length - MAX_THUMBS
  return (
    <Link to={paths.order(order.id)} className="d-cell tap d-g3-orow">
      <span className="d-g3-orow-body">
        <span className="d-g3-orow-top">
          <span className="d-g3-orow-num">{order.number}</span>
          <span className="d-g3-orow-total tabular">{t.money(order.quote.total)}</span>
        </span>
        <span className="d-g3-orow-status" data-status={order.status}>
          {t.t(`status.${order.status}`)}
        </span>
        <span className="d-g3-orow-meta">
          {t.date(order.createdAt)} · {t.tp('orders.itemsCount', qty)}
        </span>
        <span className="d-g3-thumbs">
          {order.items.slice(0, MAX_THUMBS).map((i, k) => (
            <Img key={`${i.productId}-${k}`} image={i.image} alt={t.l(i.title)} sizes="44px" className="d-g3-thumb" />
          ))}
          {extra > 0 ? <span className="d-g3-thumb d-g3-thumb-more">+{extra}</span> : null}
        </span>
      </span>
      <ChevronRight className="d-cell-chevron" size={20} strokeWidth={2.2} aria-hidden="true" />
    </Link>
  )
})

export function OrderRowSkeleton() {
  return (
    <div className="d-cell d-g3-orow" aria-hidden="true">
      <span className="d-g3-orow-body">
        <span className="d-g3-orow-top">
          <Skeleton style={{ width: 132, height: 18, margin: '1px 0' }} />
          <Skeleton style={{ width: 90, height: 18, margin: '1px 0' }} />
        </span>
        <Skeleton style={{ width: 150, height: 15, margin: '3px 0 2px' }} />
        <Skeleton style={{ width: 120, height: 14, margin: '2px 0' }} />
        <span className="d-g3-thumbs">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="d-g3-thumb" />
          ))}
        </span>
      </span>
    </div>
  )
}
