import { Package } from 'lucide-react'
import { memo, useEffect, useMemo, useState } from 'react'
import '../styles/g3.css'
import type { Order } from '../../../shared/types'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { useT } from '../../../shared/i18n'
import { Link } from '../../../shared/nav/Link'
import { useNav } from '../../../shared/nav/context'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { useOrders } from '../../../shared/query/hooks'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { EmptyState, ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { Price, TopBar } from '../ui/bits'
import { glowStyle, isOrderFilter, matchesFilter, orderProgress, ORDER_FILTERS, type OrderFilter } from '../lib/util'
import { Segments, StatusPill } from '../ui/g3/parts'

const FILTER_LABEL: Record<OrderFilter, string> = { all: 'orders.all', active: 'orders.active', transit: 'c.orders.transit', done: 'orders.done' }

export default function Orders({ query }: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const q = useOrders()
  const fromQuery = isOrderFilter(query.status) ? query.status : 'all'
  const [filter, setFilter] = useState<OrderFilter>(fromQuery)
  useEffect(() => setFilter(fromQuery), [fromQuery])

  const all = q.data
  const list = useMemo(() => (all ?? []).filter((o) => matchesFilter(o, filter)), [all, filter])
  const counts = useMemo(() => Object.fromEntries(ORDER_FILTERS.map((f) => [f, (all ?? []).filter((o) => matchesFilter(o, f)).length])) as Record<OrderFilter, number>, [all])

  const header = (
    <div className="c-headbg c-g3-head">
      <TopBar title={t.t('orders.title')} pinned />
      <div className="c-g3-chips c-noscroll" role="tablist">
        {ORDER_FILTERS.map((f) => (
          <Tap key={f} role="tab" aria-selected={filter === f} className="c-chip" data-on={filter === f} onClick={() => setFilter(f)}>
            {t.t(FILTER_LABEL[f])}
            {all && counts[f] > 0 ? <span className="c-chip-count">{counts[f]}</span> : null}
          </Tap>
        ))}
      </div>
    </div>
  )

  return (
    <Screen className="c-g3" header={header}>
      <div className="px-4 pt-2">
        {q.isPending ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => (
              <OrderCardSkeleton key={i} />
            ))}
          </div>
        ) : q.isError && !all ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : !all?.length ? (
          <EmptyState
            icon={<Package size={40} strokeWidth={1.6} />}
            title={t.t('orders.empty')}
            text={t.t('orders.emptyHint')}
            action={
              <Tap className="c-cta px-6" style={{ width: 'auto' }} onClick={() => nav.switchTab('home')}>
                {t.t('action.continueShopping')}
              </Tap>
            }
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Package size={40} strokeWidth={1.6} />}
            title={t.t('c.g3.emptyFilter')}
            text={t.t('c.g3.emptyFilterHint')}
            action={
              <Tap className="c-btn2" onClick={() => setFilter('all')}>
                {t.t('c.g3.showAll')}
              </Tap>
            }
          />
        ) : (
          <div className="grid gap-3">
            {list.map((o, i) => (
              <OrderCard key={o.id} order={o} index={i} />
            ))}
          </div>
        )}
      </div>
    </Screen>
  )
}

const OrderCard = memo(function OrderCard({ order: o, index }: { order: Order; index: number }) {
  const t = useT()
  const p = orderProgress(o)
  const thumbs = o.items.slice(0, 4)
  const more = o.items.length - thumbs.length
  const qty = o.items.reduce((s, i) => s + i.qty, 0)
  return (
    <Link to={paths.order(o.id)} className="c-g3-ocard c-soft c-rise" style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="c-mono truncate text-[15px] font-[700]">{o.number}</p>
          <p className="mt-0.5 text-[13px] text-ink-2">{t.t('orders.from', { date: t.date(o.createdAt) })}</p>
        </div>
        <StatusPill status={o.status} />
      </div>
      {o.status !== 'cancelled' ? (
        <div className="mt-3.5">
          <Segments done={p.done} total={p.total} />
          <p className="mt-1.5 text-[12px] font-[600] text-ink-3">
            {o.status === 'delivered' && o.timeline.at(-1)?.at
              ? t.t('c.g3.deliveredOn', { date: t.date(o.timeline.at(-1)!.at!) })
              : o.etaDate
                ? t.t('c.g3.etaOn', { date: t.date(o.etaDate) })
                : t.t('c.orders.step', { i: p.done, n: p.total })}
          </p>
        </div>
      ) : null}
      <div className="mt-3.5 flex items-end gap-3">
        <div className="c-g3-thumbs">
          {thumbs.map((it, i) => (
            <span key={`${it.productId}-${i}`} className="c-thumb c-glow" style={glowStyle(it.image.tint)}>
              <Img image={it.image} alt={t.l(it.title)} sizes="52px" />
            </span>
          ))}
          {more > 0 ? <span className="c-thumb c-g3-more">+{more}</span> : null}
        </div>
        <div className="ml-auto text-right">
          <p className="text-[12px] font-[600] text-ink-3">{t.tp('orders.itemsCount', qty)}</p>
          <Price value={o.quote.total} size="s" />
        </div>
      </div>
    </Link>
  )
})

function OrderCardSkeleton() {
  return (
    <div className="c-g3-ocard" aria-hidden="true">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <Skeleton className="h-[16px] w-[52%]" />
          <Skeleton className="mt-2 h-[12px] w-[34%]" />
        </div>
        <Skeleton className="h-[26px] w-[96px]" style={{ borderRadius: 999 }} />
      </div>
      <Skeleton className="mt-4 h-[4px] w-full" />
      <Skeleton className="mt-2 h-[11px] w-[40%]" />
      <div className="mt-3.5 flex items-end gap-2">
        <Skeleton className="h-[52px] w-[52px]" style={{ borderRadius: 14 }} />
        <Skeleton className="h-[52px] w-[52px]" style={{ borderRadius: 14 }} />
        <Skeleton className="ml-auto h-[18px] w-[90px]" />
      </div>
    </div>
  )
}
