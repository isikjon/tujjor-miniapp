import { Package, X } from 'lucide-react'
import { useMemo } from 'react'
import { useT } from '../../../shared/i18n'
import { useNav } from '../../../shared/nav/context'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { useOrders } from '../../../shared/query/hooks'
import { ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { Group } from '../ui/Cell'
import { EmptyView, PageTitle, Segmented } from '../ui/controls'
import { matchesOrderFilter, type OrderFilter } from '../ui/lib'
import { OrderRow, OrderRowSkeleton } from '../ui/g3/OrderRow'
import '../styles/g3.css'

const FILTERS: OrderFilter[] = ['all', 'active', 'done', 'awaiting', 'transit']
type Seg = 'all' | 'active' | 'done'

export default function Orders({ query }: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const filter: OrderFilter = (FILTERS as string[]).includes(query.status ?? '') ? (query.status as OrderFilter) : 'all'
  const seg: Seg = filter === 'awaiting' || filter === 'transit' ? 'active' : filter
  const sub = filter === 'awaiting' || filter === 'transit' ? filter : null
  const q = useOrders()

  const list = useMemo(
    () => (q.data ?? []).filter((o) => matchesOrderFilter(o, filter)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [q.data, filter],
  )
  const setFilter = (f: OrderFilter) => nav.replace(paths.orders(f === 'all' ? undefined : f))

  return (
    <Screen>
      <div className="d-g3-titlewrap">
        <PageTitle sub={q.data ? t.tp('d.orders.count', list.length) : undefined}>{t.t('orders.title')}</PageTitle>
        {sub ? (
          <Tap className="d-pill d-g3-subfilter" data-on="true" haptic="selection" onClick={() => setFilter('active')} aria-label={t.t('d.orders.reset')}>
            {t.t(`d.orders.filter.${sub}`)}
            <X size={14} strokeWidth={2.8} aria-hidden="true" />
          </Tap>
        ) : null}
      </div>
      <div className="d-sticky d-g3-bar">
        <Segmented<Seg>
          value={seg}
          label={t.t('orders.title')}
          onChange={setFilter}
          options={[
            { value: 'all', label: t.t('orders.all') },
            { value: 'active', label: t.t('orders.active') },
            { value: 'done', label: t.t('orders.done') },
          ]}
        />
      </div>

      {q.isPending ? (
        <Group>
          {[0, 1, 2].map((i) => (
            <OrderRowSkeleton key={i} />
          ))}
        </Group>
      ) : q.isError && !q.data ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : list.length === 0 ? (
        (q.data?.length ?? 0) === 0 ? (
          <EmptyView
            icon={<Package size={44} strokeWidth={1.6} />}
            title={t.t('orders.empty')}
            text={t.t('orders.emptyHint')}
            action={
              <Tap className="d-btn d-btn-tinted" haptic="light" onClick={() => nav.switchTab('catalog')}>
                {t.t('action.toCatalog')}
              </Tap>
            }
          />
        ) : (
          <EmptyView
            icon={<Package size={44} strokeWidth={1.6} />}
            title={t.t('d.g3.orders.emptyFilter')}
            action={
              <Tap className="d-btn d-btn-tinted" haptic="light" onClick={() => setFilter('all')}>
                {t.t('d.orders.reset')}
              </Tap>
            }
          />
        )
      ) : (
        <Group footer={t.t('orders.emptyHint')}>
          {list.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </Group>
      )}
    </Screen>
  )
}
