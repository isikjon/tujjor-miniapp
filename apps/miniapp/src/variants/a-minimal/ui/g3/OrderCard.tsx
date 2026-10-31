import { memo } from 'react'
import type { Order, OrderStatus } from '../../../../shared/types'
import { useT } from '../../../../shared/i18n'
import { cx } from '../../../../shared/lib/cx'
import { Link } from '../../../../shared/nav/Link'
import { paths } from '../../../../shared/nav/routes'
import { Img } from '../../../../shared/ui/Img'
import { Skeleton } from '../../../../shared/ui/Skeleton'
import { statusTone } from '../../lib'

/** Status text with a small tone dot (monochrome: ink for live orders, ink-3 for closed ones). */
export function StatusLine({ status, className }: { status: OrderStatus; className?: string }) {
  const t = useT()
  return (
    <span className={cx('a-g3-status', className)} data-tone={statusTone(status)}>
      <span className="a-g3-status__dot" aria-hidden="true" />
      {t.t(`status.${status}`)}
    </span>
  )
}

const MAX_THUMBS = 4

/** Order row card: number + date, status, product thumbnails, item count and server total. */
export const OrderCard = memo(function OrderCard({ order }: { order: Order }) {
  const t = useT()
  const qty = order.items.reduce((n, i) => n + i.qty, 0)
  const extra = order.items.length - MAX_THUMBS
  return (
    <Link to={paths.order(order.id)} className="a-g3-ocard">
      <span className="a-g3-ocard__top">
        <span className="a-g3-ocard__num">{order.number}</span>
        <span className="a-g3-ocard__date">{t.date(order.createdAt)}</span>
      </span>
      <StatusLine status={order.status} />
      <span className="a-g3-ocard__thumbs">
        {order.items.slice(0, extra > 0 ? MAX_THUMBS - 1 : MAX_THUMBS).map((it, i) => (
          <Img key={`${it.productId}-${i}`} image={it.image} alt={t.l(it.title)} sizes="64px" className="a-g3-thumb" />
        ))}
        {extra > 0 ? <span className="a-g3-thumb a-g3-thumb--more">+{extra + 1}</span> : null}
      </span>
      <span className="a-g3-ocard__foot">
        <span className="a-g3-ocard__count">{t.tp('orders.itemsCount', qty)}</span>
        <span className="a-g3-ocard__total">{t.money(order.quote.total)}</span>
      </span>
    </Link>
  )
})

export function OrderCardSkeleton() {
  return (
    <div className="a-g3-ocard" aria-hidden="true">
      <span className="a-g3-ocard__top">
        <Skeleton style={{ width: 132, height: 16 }} />
        <Skeleton style={{ width: 64, height: 13 }} />
      </span>
      <Skeleton style={{ width: 150, height: 14, marginTop: 4 }} />
      <span className="a-g3-ocard__thumbs">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="a-g3-thumb" />
        ))}
      </span>
      <span className="a-g3-ocard__foot">
        <Skeleton style={{ width: 70, height: 13 }} />
        <Skeleton style={{ width: 110, height: 16 }} />
      </span>
    </div>
  )
}
