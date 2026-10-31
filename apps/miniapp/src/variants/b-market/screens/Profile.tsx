import { CircleHelp, Coins, Globe, Heart, Info, MapPin, Package, PackageCheck, Sparkles, Truck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatPhone } from '../../../shared/demo/user'
import { useT } from '../../../shared/i18n'
import { useNav } from '../../../shared/nav/context'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { useAddresses, useMe, useOrders } from '../../../shared/query/hooks'
import { useFavorites } from '../../../shared/store/favorites'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { DemoBadge } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { countOrders } from '../lib'
import { AddressesSheet, HowSheet, LanguageSheet, MenuRow, SupportSheet } from '../ui/g3/parts'
import '../styles/g3.css'

type SheetId = null | 'lang' | 'support' | 'how' | 'addr'

export default function Profile(_: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const me = useMe()
  const orders = useOrders()
  const addresses = useAddresses()
  const favCount = useFavorites((s) => s.ids.length)
  const [sheet, setSheet] = useState<SheetId>(null)
  const close = () => setSheet(null)

  const counts = useMemo(() => countOrders(orders.data ?? []), [orders.data])
  const user = me.data
  const initials = user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() : ''
  const loadingCounts = orders.isPending

  const shortcuts = [
    { key: 'active', icon: <Truck size={20} strokeWidth={2.2} />, tone: 'accent', n: counts.active, label: t.t('profile.inTransit'), go: () => nav.push(paths.orders('active')) },
    { key: 'done', icon: <PackageCheck size={20} strokeWidth={2.2} />, tone: 'ok', n: counts.done, label: t.t('profile.delivered'), go: () => nav.push(paths.orders('done')) },
    { key: 'fav', icon: <Heart size={20} strokeWidth={2.2} />, tone: 'hot', n: favCount, label: t.t('profile.favorites'), go: () => nav.switchTab('favorites') },
  ] as const

  return (
    <Screen className="b3-screen">
      <header className="b3-hero">
        <div className="b3-hero__row">
          <div className="b3-avatar" aria-hidden="true">
            {user ? initials : null}
          </div>
          <div className="b3-hero__who">
            {user ? (
              <>
                <p className="b3-hero__name">
                  {user.firstName} {user.lastName}
                </p>
                <p className="b3-hero__meta">
                  @{user.username} · {formatPhone(user.phone)}
                </p>
                <p className="b3-hero__since">{t.t('profile.memberSince', { date: t.date(user.memberSince, true) })}</p>
              </>
            ) : (
              <>
                <Skeleton className="b3-sk-onaccent" style={{ height: 20, width: 150, borderRadius: 6 }} />
                <Skeleton className="b3-sk-onaccent" style={{ height: 14, width: 190, borderRadius: 6, marginTop: 8 }} />
                <Skeleton className="b3-sk-onaccent" style={{ height: 12, width: 110, borderRadius: 6, marginTop: 8 }} />
              </>
            )}
          </div>
          <DemoBadge className="b3-hero__demo" />
        </div>
      </header>

      <nav className="b3-stats" aria-label={t.t('profile.orders')}>
        {shortcuts.map((s) => (
          <Tap key={s.key} className="b3-stat" onClick={s.go}>
            <span className="b3-stat__icon" data-tone={s.tone}>
              {s.icon}
            </span>
            {loadingCounts && s.key !== 'fav' ? <Skeleton style={{ height: 22, width: 24, borderRadius: 6 }} /> : <span className="b3-stat__n b-num">{s.n}</span>}
            <span className="b3-stat__label">{s.label}</span>
          </Tap>
        ))}
      </nav>

      <p className="b3-group__title">{t.t('b.g3.shopping')}</p>
      <div className="b3-group">
        <MenuRow icon={<Package size={19} strokeWidth={2.2} />} title={t.t('profile.orders')} sub={orders.data ? t.tp('b.ordersCount', counts.all) : undefined} badge={counts.active ? `${t.t('orders.active')} · ${counts.active}` : undefined} onClick={() => nav.push(paths.orders())} />
        <MenuRow icon={<Heart size={19} strokeWidth={2.2} />} tone="hot" title={t.t('profile.favorites')} sub={t.tp('b.favCount', favCount)} onClick={() => nav.switchTab('favorites')} />
        <MenuRow icon={<MapPin size={19} strokeWidth={2.2} />} tone="flash" title={t.t('profile.addresses')} sub={addresses.data ? t.tp('b.addrCount', addresses.data.length) : undefined} onClick={() => setSheet('addr')} />
      </div>

      <p className="b3-group__title">{t.t('b.g3.settings')}</p>
      <div className="b3-group">
        <MenuRow icon={<Globe size={19} strokeWidth={2.2} />} tone="ok" title={t.t('profile.language')} value={t.t(`language.${t.locale}`)} onClick={() => setSheet('lang')} />
        <MenuRow icon={<Coins size={19} strokeWidth={2.2} />} tone="muted" title={t.t('profile.currency')} value={t.t('profile.currencyValue')} />
      </div>

      <p className="b3-group__title">{t.t('b.g3.help')}</p>
      <div className="b3-group">
        <MenuRow icon={<CircleHelp size={19} strokeWidth={2.2} />} title={t.t('profile.support')} sub={t.t('support.faq')} onClick={() => setSheet('support')} />
        <MenuRow icon={<Sparkles size={19} strokeWidth={2.2} />} tone="flash" title={t.t('profile.howItWorks')} sub={t.t('b.howSub')} onClick={() => setSheet('how')} />
      </div>

      <div className="b3-demo">
        <Info size={18} strokeWidth={2.3} aria-hidden="true" />
        <p>
          {t.t('demo.note')}
          <span className="b3-demo__ver">{t.t('profile.version', { v: '0.9' })}</span>
        </p>
      </div>

      <LanguageSheet open={sheet === 'lang'} onClose={close} />
      <SupportSheet open={sheet === 'support'} onClose={close} />
      <HowSheet open={sheet === 'how'} onClose={close} />
      <AddressesSheet open={sheet === 'addr'} onClose={close} />
    </Screen>
  )
}
