import { Coins, Heart, Languages, LifeBuoy, MapPin, Package, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import '../styles/g3.css'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { formatPhone } from '../../../shared/demo/user'
import { useT } from '../../../shared/i18n'
import { Link } from '../../../shared/nav/Link'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { useAddresses, useMe, useOrders } from '../../../shared/query/hooks'
import { useFavorites } from '../../../shared/store/favorites'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { DemoBadge, ErrorState } from '../../../shared/ui/States'
import { TopBar } from '../ui/bits'
import { initials, statusGroup, type OrderFilter } from '../lib/util'
import { Kick, MenuRow } from '../ui/g3/parts'
import { AddressesSheet, HowSheet, LanguageSheet, SupportSheet } from '../ui/g3/Sheets'

type SheetId = 'lang' | 'support' | 'how' | 'addr' | null

const APP_VERSION = '0.9.0'

export default function Profile(_: ScreenProps) {
  const t = useT()
  const me = useMe()
  const orders = useOrders()
  const addresses = useAddresses()
  const favCount = useFavorites((s) => s.ids.length)
  const [sheet, setSheet] = useState<SheetId>(null)
  const close = () => setSheet(null)

  const counts = useMemo(() => {
    const c = { active: 0, transit: 0, done: 0, all: 0 }
    for (const o of orders.data ?? []) {
      const g = statusGroup(o.status)
      c.all++
      if (g === 'awaiting' || g === 'transit') c.active++
      if (g === 'transit') c.transit++
      if (g === 'delivered') c.done++
    }
    return c
  }, [orders.data])

  const stats: { f: OrderFilter; label: string; n: number }[] = [
    { f: 'active', label: t.t('orders.active'), n: counts.active },
    { f: 'transit', label: t.t('profile.inTransit'), n: counts.transit },
    { f: 'done', label: t.t('profile.delivered'), n: counts.done },
  ]
  const u = me.data

  return (
    <Screen className="c-g3" header={<TopBar title={t.t('profile.title')} right={<DemoBadge />} />}>
      <div className="px-4 pb-2">
        <h1 className="c-h1 mb-4 mt-1">{t.t('profile.title')}</h1>

        {/* ID card */}
        {me.isError && !u ? (
          <ErrorState compact error={me.error} onRetry={() => void me.refetch()} className="mb-3" />
        ) : (
          <div className="c-idcard c-g3-id">
            <div className="relative z-[1] flex items-center gap-3.5">
              {u ? <span className="c-avatar">{initials(u.firstName, u.lastName)}</span> : <Skeleton className="h-16 w-16 shrink-0" style={{ borderRadius: 22, opacity: 0.25 }} />}
              <div className="min-w-0 flex-1">
                {u ? (
                  <>
                    <p className="c-display truncate text-[21px] font-[700] leading-tight">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="c-mono mt-1 truncate text-[12px] opacity-60">
                      @{u.username} · {t.t('c.profile.memberId', { id: u.id })}
                    </p>
                  </>
                ) : (
                  <>
                    <Skeleton className="h-[22px] w-[70%]" style={{ opacity: 0.25 }} />
                    <Skeleton className="mt-2 h-[12px] w-[50%]" style={{ opacity: 0.25 }} />
                  </>
                )}
              </div>
            </div>
            <div className="c-g3-idfoot">
              <span className="c-mono">{u ? formatPhone(u.phone) : '+998 •• ••• •• ••'}</span>
              <span className="c-g3-idsince">{u ? t.t('profile.memberSince', { date: t.date(u.memberSince, true) }) : ' '}</span>
            </div>
          </div>
        )}

        {/* Order status shortcuts */}
        <div className="mt-6">
          <Kick>{t.t('c.profile.shortcuts')}</Kick>
          <div className="c-g3-stats">
            {stats.map((s, i) => (
              <Link key={s.f} to={paths.orders(s.f)} className="c-g3-stat c-soft" data-tone={i === 0 ? 'lime' : undefined}>
                <span className="c-g3-stat-n">{orders.isPending ? <Skeleton className="h-[26px] w-[28px]" /> : s.n}</span>
                <span className="c-g3-stat-l">{s.label}</span>
              </Link>
            ))}
          </div>
          {orders.isError && !orders.data ? <ErrorState compact error={orders.error} onRetry={() => void orders.refetch()} className="mt-2" /> : null}
        </div>

        <div className="c-menu mt-3">
          <MenuRow icon={Package} label={t.t('profile.orders')} value={orders.data ? counts.all : undefined} to={paths.orders()} tone="lime" />
          <MenuRow icon={Heart} label={t.t('profile.favorites')} value={favCount || undefined} to={paths.favorites()} />
          <MenuRow icon={MapPin} label={t.t('profile.addresses')} value={addresses.data ? addresses.data.length : undefined} onClick={() => setSheet('addr')} />
        </div>

        <div className="mt-6">
          <Kick>{t.t('c.profile.settings')}</Kick>
          <div className="c-menu">
            <MenuRow icon={Languages} label={t.t('profile.language')} value={t.t(`language.${t.locale}`)} onClick={() => setSheet('lang')} />
            <MenuRow icon={Coins} label={t.t('profile.currency')} value={t.t('profile.currencyValue')} />
          </div>
        </div>

        <div className="mt-6">
          <Kick>{t.t('c.profile.help')}</Kick>
          <div className="c-menu">
            <MenuRow icon={LifeBuoy} label={t.t('profile.support')} onClick={() => setSheet('support')} />
            <MenuRow icon={Sparkles} label={t.t('profile.howItWorks')} onClick={() => setSheet('how')} />
          </div>
        </div>

        <div className="c-g3-ver">
          <span className="c-g3-ver-mark">
            TUJJOR<i />
          </span>
          <span className="c-mono">{t.t('profile.version', { v: APP_VERSION })}</span>
          <span>{t.t('demo.note')}</span>
        </div>
      </div>

      <LanguageSheet open={sheet === 'lang'} onClose={close} />
      <SupportSheet open={sheet === 'support'} onClose={close} />
      <HowSheet open={sheet === 'how'} onClose={close} />
      <AddressesSheet open={sheet === 'addr'} onClose={close} />
    </Screen>
  )
}
