import { Package, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useT } from '../../../shared/i18n'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { useNav } from '../../../shared/nav/context'
import { Screen } from '../../../shared/nav/Screen'
import { useOrders } from '../../../shared/query/hooks'
import { EmptyState, ErrorState } from '../../../shared/ui/States'
import { GROUP_PARENT, isOrderFilter, isOrderGroup, orderMatches, type OrderFilter, type OrderGroup } from '../lib'
import { Btn, Chip, Segmented } from '../ui/controls'
import { PageTitle } from '../ui/PageTitle'
import { OrderCard, OrderCardSkeleton } from '../ui/g3/OrderCard'
import '../styles/g3.css'

const GROUP_LABEL: Record<OrderGroup, string> = { awaiting: 'profile.awaiting', transit: 'profile.inTransit', delivered: 'profile.delivered' }

/** `status` query: all | active | done, or a profile shortcut group (awaiting | transit | delivered). */
function parseStatus(v: string | undefined): { filter: OrderFilter; group: OrderGroup | null } {
  if (isOrderGroup(v)) return { filter: GROUP_PARENT[v], group: v }
  return { filter: isOrderFilter(v) ? v : 'all', group: null }
}

export default function Orders({ query }: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const orders = useOrders()
  const [state, setState] = useState(() => parseStatus(query.status))
  const [seenQuery, setSeenQuery] = useState(query.status)
  if (query.status !== seenQuery) {
    setSeenQuery(query.status)
    setState(parseStatus(query.status))
  }
  const { filter, group } = state

  const list = useMemo(
    () => [...(orders.data ?? [])].filter((o) => orderMatches(o, filter, group)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [orders.data, filter, group],
  )

  const options: Array<{ value: OrderFilter; label: string }> = [
    { value: 'all', label: t.t('orders.all') },
    { value: 'active', label: t.t('orders.active') },
    { value: 'done', label: t.t('orders.done') },
  ]

  let body
  if (orders.isPending) {
    body = (
      <div className="a-g3-olist">
        {[0, 1, 2].map((i) => (
          <OrderCardSkeleton key={i} />
        ))}
      </div>
    )
  } else if (orders.isError && !orders.data) {
    body = <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
  } else if (!orders.data?.length) {
    body = (
      <EmptyState
        className="a-g3-empty"
        icon={<Package size={40} strokeWidth={1.25} />}
        title={t.t('orders.empty')}
        text={t.t('orders.emptyHint')}
        action={
          <Btn size="md" onClick={() => nav.switchTab('home')}>
            {t.t('action.continueShopping')}
          </Btn>
        }
      />
    )
  } else if (!list.length) {
    body = (
      <EmptyState
        className="a-g3-empty"
        icon={<Package size={40} strokeWidth={1.25} />}
        title={t.t('a.g3.emptyFiltered')}
        text={t.t('a.g3.emptyFilteredHint')}
        action={
          <Btn size="md" kind="secondary" onClick={() => setState({ filter: 'all', group: null })}>
            {t.t('a.g3.showAllOrders')}
          </Btn>
        }
      />
    )
  } else {
    body = (
      <div className="a-g3-olist">
        {list.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
      </div>
    )
  }

  return (
    <Screen>
      <PageTitle title={t.t('orders.title')}>
        <div className="a-g3-filter">
          <Segmented value={filter} options={options} label={t.t('a.g3.filterLabel')} onChange={(v) => setState({ filter: v, group: null })} />
          {group ? (
            <div className="a-g3-filter__group">
              <Chip on onClick={() => setState({ filter, group: null })} aria-label={t.t('action.reset')}>
                {t.t(GROUP_LABEL[group])}
                <X size={14} strokeWidth={2} aria-hidden="true" />
              </Chip>
            </div>
          ) : null}
        </div>
      </PageTitle>
      <div className="a-gutter">{body}</div>
    </Screen>
  )
}
