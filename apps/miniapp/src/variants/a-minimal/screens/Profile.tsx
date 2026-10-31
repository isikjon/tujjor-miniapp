import { Banknote, CircleHelp, Globe, Heart, MapPin, MessageCircle, Package } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useT } from '../../../shared/i18n'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { Link } from '../../../shared/nav/Link'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { isActiveOrder, useAddresses, useMe, useOrders } from '../../../shared/query/hooks'
import { useFavorites } from '../../../shared/store/favorites'
import { useSettings } from '../../../shared/store/settings'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { DemoBadge, ErrorState } from '../../../shared/ui/States'
import { initials, ORDER_GROUPS, type OrderGroup } from '../lib'
import { AddressSheet } from '../ui/AddressSheet'
import { SectionHead } from '../ui/controls'
import { HowSheet, LanguageSheet, SupportSheet } from '../ui/InfoSheets'
import { PageTitle } from '../ui/PageTitle'
import { MenuRow } from '../ui/g3/MenuRow'
import { OrderCard } from '../ui/g3/OrderCard'
import '../styles/g3.css'

const VERSION = '1.0.0'

const GROUPS: Array<{ id: OrderGroup; label: 'profile.awaiting' | 'profile.inTransit' | 'profile.delivered' }> = [
  { id: 'awaiting', label: 'profile.awaiting' },
  { id: 'transit', label: 'profile.inTransit' },
  { id: 'delivered', label: 'profile.delivered' },
]

type SheetId = 'addresses' | 'language' | 'support' | 'how' | null

export default function Profile(_: ScreenProps) {
  const t = useT()
  const me = useMe()
  const orders = useOrders()
  const addresses = useAddresses()
  const favCount = useFavorites((s) => s.ids.length)
  const locale = useSettings((s) => s.locale)
  const [sheet, setSheet] = useState<SheetId>(null)
  const close = () => setSheet(null)

  const counts = useMemo(() => {
    const list = orders.data ?? []
    return Object.fromEntries(GROUPS.map((g) => [g.id, list.filter((o) => ORDER_GROUPS[g.id].includes(o.status)).length])) as Record<OrderGroup, number>
  }, [orders.data])
  const latestActive = useMemo(
    () => [...(orders.data ?? [])].filter(isActiveOrder).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
    [orders.data],
  )
  const defaultAddress = addresses.data?.find((a) => a.isDefault) ?? addresses.data?.[0]

  return (
    <Screen>
      <PageTitle title={t.t('profile.title')} aside={<DemoBadge />} />

      {/* identity */}
      <section className="a-gutter a-g3-me">
        {me.data ? (
          <>
            <span className="a-g3-avatar" aria-hidden="true">
              {initials(me.data.firstName, me.data.lastName)}
            </span>
            <span className="a-g3-me__text">
              <span className="a-g3-me__name">
                {me.data.firstName} {me.data.lastName}
              </span>
              <span className="a-g3-me__meta">
                @{me.data.username} · {t.t('profile.memberSince', { date: t.date(me.data.memberSince, true) })}
              </span>
            </span>
          </>
        ) : me.isError ? (
          <ErrorState compact error={me.error} onRetry={() => void me.refetch()} className="a-g3-wide" />
        ) : (
          <>
            <Skeleton className="a-g3-avatar" round />
            <span className="a-g3-me__text">
              <Skeleton style={{ width: 160, height: 20 }} />
              <Skeleton style={{ width: 210, height: 13, marginTop: 8 }} />
            </span>
          </>
        )}
      </section>

      {/* order status shortcuts */}
      <section className="a-gutter a-g3-block">
        <SectionHead title={t.t('profile.orders')} link={{ label: t.t('action.showAll'), to: paths.orders() }} />
        {orders.isError && !orders.data ? (
          <ErrorState compact error={orders.error} onRetry={() => void orders.refetch()} />
        ) : (
          <div className="a-g3-stats">
            {GROUPS.map((g) => (
              <Link key={g.id} to={paths.orders(g.id)} className="a-g3-stat">
                {orders.data ? <span className="a-g3-stat__n">{counts[g.id]}</span> : <Skeleton style={{ width: 24, height: 28 }} />}
                <span className="a-g3-stat__label">{t.t(g.label)}</span>
              </Link>
            ))}
          </div>
        )}
        {latestActive ? (
          <div className="a-g3-latest">
            <p className="a-g3-cap">{t.t('a.g3.latest')}</p>
            <OrderCard order={latestActive} />
          </div>
        ) : null}
      </section>

      {/* menu */}
      <section className="a-gutter a-g3-block">
        <h2 className="a-g3-cap">{t.t('a.g3.shopping')}</h2>
        <div className="a-g3-list">
          <MenuRow icon={Package} label={t.t('profile.orders')} value={orders.data ? orders.data.length || null : null} to={paths.orders()} />
          <MenuRow icon={Heart} label={t.t('profile.favorites')} value={favCount || null} to={paths.favorites()} />
          <MenuRow
            icon={MapPin}
            label={t.t('profile.addresses')}
            value={defaultAddress ? t.l(defaultAddress.label) : addresses.isPending ? null : t.t('a.g3.noAddress')}
            onClick={() => setSheet('addresses')}
          />
        </div>
      </section>

      <section className="a-gutter a-g3-block">
        <h2 className="a-g3-cap">{t.t('a.g3.settings')}</h2>
        <div className="a-g3-list">
          <MenuRow icon={Globe} label={t.t('profile.language')} value={t.t(`language.${locale}`)} onClick={() => setSheet('language')} />
          <MenuRow icon={Banknote} label={t.t('profile.currency')} hint={t.t('a.g3.currencyNote')} value={t.t('profile.currencyValue')} />
        </div>
      </section>

      <section className="a-gutter a-g3-block">
        <h2 className="a-g3-cap">{t.t('a.g3.help')}</h2>
        <div className="a-g3-list">
          <MenuRow icon={MessageCircle} label={t.t('profile.support')} onClick={() => setSheet('support')} />
          <MenuRow icon={CircleHelp} label={t.t('profile.howItWorks')} onClick={() => setSheet('how')} />
        </div>
      </section>

      <footer className="a-gutter a-g3-foot">
        <p>{t.t('profile.version', { v: VERSION })}</p>
        <p>{t.t('demo.note')}</p>
      </footer>

      <AddressSheet open={sheet === 'addresses'} onClose={close} mode="manage" />
      <LanguageSheet open={sheet === 'language'} onClose={close} />
      <SupportSheet open={sheet === 'support'} onClose={close} />
      <HowSheet open={sheet === 'how'} onClose={close} />
    </Screen>
  )
}
