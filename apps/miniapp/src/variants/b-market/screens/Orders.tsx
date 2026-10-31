import { ChevronRight, Package } from 'lucide-react'
import { memo, useMemo, useState } from 'react'
import { useT } from '../../../shared/i18n'
import { Link } from '../../../shared/nav/Link'
import { useNav } from '../../../shared/nav/context'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { isActiveOrder, useOrders } from '../../../shared/query/hooks'
import type { Order } from '../../../shared/types'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { countOrders, filterOrders, ORDER_GROUPS, parseOrderGroup, type OrderGroup } from '../lib'
import { Button, EmptyView } from '../ui'
import { orderProgress, OrderThumbs, ProgressBar, StatusPill } from '../ui/g3/parts'
import '../styles/g3.css'

const GROUP_LABEL: Record<OrderGroup, string> = { all: 'orders.all', active: 'orders.active', done: 'orders.done' }

export default function Orders({ query }: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const q = useOrders()
  const [group, setGroup] = useState<OrderGroup>(() => parseOrderGroup(query?.status))
  const all = useMemo(() => q.data ?? [], [q.data])
  const counts = useMemo(() => countOrders(all), [all])
  const list = useMemo(() => filterOrders(all, group), [all, group])

  const header = (
    <div className="b3-ohead">
      <h1 className="b3-title">{t.t('orders.title')}</h1>
      <div className="b3-seg" role="tablist" aria-label={t.t('orders.title')}>
        {ORDER_GROUPS.map((g) => (
          <Tap key={g} role="tab" aria-selected={g === group} className="b3-seg__btn" data-on={g === group} onClick={() => setGroup(g)}>
            {t.t(GROUP_LABEL[g])}
            {q.data ? <span className="b3-seg__n b-num">{counts[g]}</span> : null}
          </Tap>
        ))}
      </div>
    </div>
  )

  return (
    <Screen header={header} className="b3-screen">
      <div className="b3-olist">
        {q.isPending ? (
          [0, 1, 2].map((i) => <OrderCardSkeleton key={i} />)
        ) : q.isError && !q.data ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : !all.length ? (
          <EmptyView
            icon={<Package size={34} strokeWidth={2} />}
            title={t.t('orders.empty')}
            text={t.t('orders.emptyHint')}
            action={
              <Button onClick={() => nav.switchTab('catalog')} size="lg">
                {t.t('action.toCatalog')}
              </Button>
            }
          />
        ) : !list.length ? (
          <EmptyView
            icon={<Package size={34} strokeWidth={2} />}
            title={t.t('b.ordersEmptyFilter')}
            text={t.t('b.ordersEmptyFilterHint')}
            action={
              <Button kind="secondary" onClick={() => setGroup('all')}>
                {t.t('b.allOrders')}
              </Button>
            }
          />
        ) : (
          list.map((o) => <OrderCard key={o.id} order={o} />)
        )}
      </div>
    </Screen>
  )
}

const OrderCard = memo(function OrderCard({ order }: { order: Order }) {
  const t = useT()
  const active = isActiveOrder(order)
  const p = orderProgress(order)
  const delivered = order.status === 'delivered'
  const deliveredAt = delivered ? order.timeline.find((e) => e.status === 'delivered')?.at : null
  return (
    <Link to={paths.order(order.id)} className="b3-oc">
      <div className="b3-oc__top">
        <span className="b3-oc__num b-num">{order.number}</span>
        <StatusPill status={order.status} />
      </div>
      <p className="b3-oc__meta">
        {t.t('orders.from', { date: t.date(order.createdAt) })} · {t.tp('orders.itemsCount', order.items.reduce((n, i) => n + i.qty, 0))}
      </p>
      <OrderThumbs order={order} />
      {active ? (
        <div className="b3-oc__prog">
          <ProgressBar ratio={p.ratio} />
          <span className="b3-oc__step b-num">{t.t('b.step', { n: p.done, total: p.total })}</span>
        </div>
      ) : null}
      <div className="b3-oc__foot">
        <span className="b3-oc__total b-num">{t.money(order.quote.total)}</span>
        <span className="b3-oc__eta">
          {active && order.etaDate ? t.t('b.etaDates', { range: t.date(order.etaDate) }) : deliveredAt ? t.t('b.g3.deliveredOn', { date: t.date(deliveredAt) }) : null}
          <ChevronRight size={18} strokeWidth={2.2} aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
})

function OrderCardSkeleton() {
  return (
    <div className="b3-oc" aria-hidden="true">
      <div className="b3-oc__top">
        <Skeleton style={{ height: 18, width: 130, borderRadius: 6 }} />
        <Skeleton style={{ height: 24, width: 96, borderRadius: 999 }} />
      </div>
      <Skeleton style={{ height: 13, width: 170, borderRadius: 6, marginTop: 8 }} />
      <div className="b3-thumbs">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="b3-thumb" />
        ))}
      </div>
      <div className="b3-oc__foot">
        <Skeleton style={{ height: 20, width: 120, borderRadius: 6 }} />
        <Skeleton style={{ height: 14, width: 90, borderRadius: 6 }} />
      </div>
    </div>
  )
}
