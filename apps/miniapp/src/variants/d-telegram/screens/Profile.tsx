import { CircleHelp, Coins, Globe, Heart, MapPin, MessageCircle, Package } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useT } from '../../../shared/i18n'
import { Link } from '../../../shared/nav/Link'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { useAddresses, useMe, useOrders } from '../../../shared/query/hooks'
import { useFavorites } from '../../../shared/store/favorites'
import { formatPhone } from '../../../shared/demo/user'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { DemoBadge } from '../../../shared/ui/States'
import { Cell, Group } from '../ui/Cell'
import { Squircle } from '../ui/controls'
import { AWAITING, TRANSIT, avatarGradient, initials } from '../ui/lib'
import { AddressesSheet, HowSheet, LanguageSheet, SupportSheet } from '../ui/g3/sheets'
import '../styles/g3.css'

type SheetId = 'addresses' | 'language' | 'support' | 'how' | null

export default function Profile(_: ScreenProps) {
  const t = useT()
  const me = useMe()
  const orders = useOrders()
  const addresses = useAddresses()
  const favCount = useFavorites((s) => s.ids.length)
  const [sheet, setSheet] = useState<SheetId>(null)
  const close = () => setSheet(null)

  const counts = useMemo(() => {
    const list = orders.data ?? []
    return {
      all: list.length,
      awaiting: list.filter((o) => AWAITING.includes(o.status)).length,
      transit: list.filter((o) => TRANSIT.includes(o.status)).length,
      delivered: list.filter((o) => o.status === 'delivered').length,
    }
  }, [orders.data])

  const u = me.data
  const stats = [
    { key: 'awaiting', label: t.t('profile.awaiting'), n: counts.awaiting, to: paths.orders('awaiting') },
    { key: 'transit', label: t.t('profile.inTransit'), n: counts.transit, to: paths.orders('transit') },
    { key: 'done', label: t.t('profile.delivered'), n: counts.delivered, to: paths.orders('done') },
  ]

  return (
    <Screen>
      <div className="d-g3-hero">
        {u ? (
          <>
            <span className="d-avatar d-g3-avatar" data-g={avatarGradient(u.id)} aria-hidden="true">
              {initials(u.firstName, u.lastName)}
            </span>
            <h1 className="d-g3-name">
              {u.firstName} {u.lastName}
            </h1>
            <p className="d-g3-handle">
              {formatPhone(u.phone)} · @{u.username}
            </p>
          </>
        ) : (
          <>
            <Skeleton round className="d-g3-avatar" />
            <Skeleton style={{ width: 168, height: 26, marginTop: 12 }} />
            <Skeleton style={{ width: 210, height: 16, marginTop: 8 }} />
          </>
        )}
        <DemoBadge className="d-g3-demo" />
      </div>

      <Group
        header={t.t('d.profile.orderStatuses')}
        headerRight={
          <Link to={paths.orders()} className="d-hlink" haptic="selection">
            {t.t('d.g3.profile.allOrders')}
          </Link>
        }
      >
        <div className="d-stats">
          {stats.map((s) => (
            <Link key={s.key} to={s.to} className="d-stat tap" haptic="selection">
              {orders.isPending ? <Skeleton style={{ width: 22, height: 24, margin: '2px 0' }} /> : <b>{s.n}</b>}
              <span>{s.label}</span>
            </Link>
          ))}
        </div>
      </Group>

      <Group header={t.t('d.profile.menu')}>
        <Cell
          icon={
            <Squircle color="blue">
              <Package size={18} strokeWidth={2.3} />
            </Squircle>
          }
          title={t.t('profile.orders')}
          value={orders.data ? String(counts.all) : undefined}
          chevron
          to={paths.orders()}
        />
        <Cell
          icon={
            <Squircle color="red">
              <Heart size={18} strokeWidth={2.3} fill="currentColor" />
            </Squircle>
          }
          title={t.t('profile.favorites')}
          value={favCount ? String(favCount) : undefined}
          chevron
          to={paths.favorites()}
        />
        <Cell
          icon={
            <Squircle color="green">
              <MapPin size={18} strokeWidth={2.3} />
            </Squircle>
          }
          title={t.t('profile.addresses')}
          value={addresses.data ? String(addresses.data.length) : undefined}
          chevron
          onClick={() => setSheet('addresses')}
        />
      </Group>

      <Group header={t.t('d.profile.settings')}>
        <Cell
          icon={
            <Squircle color="indigo">
              <Globe size={18} strokeWidth={2.3} />
            </Squircle>
          }
          title={t.t('profile.language')}
          value={t.t(`language.${t.locale}`)}
          chevron
          onClick={() => setSheet('language')}
        />
        <Cell
          icon={
            <Squircle color="orange">
              <Coins size={18} strokeWidth={2.3} />
            </Squircle>
          }
          title={t.t('profile.currency')}
          value={t.t('profile.currencyValue')}
        />
      </Group>

      <Group
        header={t.t('d.profile.help')}
        footer={
          <>
            <p>{t.t('d.g3.demoNote')}</p>
            <p>{t.t('profile.version', { v: '0.9' })}</p>
          </>
        }
      >
        <Cell
          icon={
            <Squircle color="teal">
              <MessageCircle size={18} strokeWidth={2.3} />
            </Squircle>
          }
          title={t.t('profile.support')}
          chevron
          onClick={() => setSheet('support')}
        />
        <Cell
          icon={
            <Squircle color="purple">
              <CircleHelp size={18} strokeWidth={2.3} />
            </Squircle>
          }
          title={t.t('profile.howItWorks')}
          chevron
          onClick={() => setSheet('how')}
        />
      </Group>

      <AddressesSheet open={sheet === 'addresses'} onClose={close} />
      <LanguageSheet open={sheet === 'language'} onClose={close} />
      <SupportSheet open={sheet === 'support'} onClose={close} />
      <HowSheet open={sheet === 'how'} onClose={close} />
    </Screen>
  )
}
