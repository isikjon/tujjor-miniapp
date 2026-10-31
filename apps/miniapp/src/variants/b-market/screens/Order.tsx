import { Copy, CreditCard, MapPin, MessageCircle, PackageX, RotateCcw, Store, Truck } from 'lucide-react'
import { useState } from 'react'
import { formatPhone } from '../../../shared/demo/user'
import { isApiError } from '../../../shared/demo/errors'
import { formatTime, useT } from '../../../shared/i18n'
import { Link } from '../../../shared/nav/Link'
import { useNav } from '../../../shared/nav/context'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { isActiveOrder, prefetchProduct, useOrder, useRepeatOrder } from '../../../shared/query/hooks'
import type { Order as OrderT } from '../../../shared/types'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { ErrorState } from '../../../shared/ui/States'
import { Button, EmptyView, IconButton } from '../ui'
import { copyText, orderProgress, ProgressBar, StatusPill, SupportSheet } from '../ui/g3/parts'
import '../styles/g3.css'

export default function Order({ params }: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const id = params.id ?? ''
  const q = useOrder(id)
  const repeat = useRepeatOrder()
  const [support, setSupport] = useState(false)
  const order = q.data

  if (!order) {
    const notFound = q.isError && isApiError(q.error) && q.error.code === 'not_found'
    return (
      <Screen className="b3-screen">
        {q.isPending ? (
          <OrderSkeleton />
        ) : notFound ? (
          <EmptyView
            icon={<PackageX size={34} strokeWidth={2} />}
            title={t.t('order.notFound')}
            text={t.t('b.g3.notFoundHint')}
            action={
              <Button size="lg" onClick={() => nav.replace(paths.orders())}>
                {t.t('b.g3.toOrders')}
              </Button>
            }
          />
        ) : (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        )}
      </Screen>
    )
  }

  const footer = (
    <div className="b3-foot">
      <IconButton label={t.t('order.support')} tone="tile" onClick={() => setSupport(true)}>
        <MessageCircle size={21} strokeWidth={2.2} />
      </IconButton>
      <Button block size="lg" loading={repeat.isPending} icon={<RotateCcw size={18} strokeWidth={2.4} aria-hidden="true" />} onClick={() => repeat.mutate(order)}>
        {t.t('order.repeat')}
      </Button>
    </div>
  )

  return (
    <Screen className="b3-screen" footer={footer}>
      <StatusCard order={order} />
      <Timeline order={order} />
      <Items order={order} />
      <Delivery order={order} />
      <Totals order={order} />
      <div className="b3-help">
        <Button kind="ghost" block icon={<MessageCircle size={18} strokeWidth={2.3} aria-hidden="true" />} onClick={() => setSupport(true)}>
          {t.t('order.support')}
        </Button>
      </div>
      <SupportSheet open={support} onClose={() => setSupport(false)} orderNumber={order.number} />
    </Screen>
  )
}

function StatusCard({ order }: { order: OrderT }) {
  const t = useT()
  const p = orderProgress(order)
  const active = isActiveOrder(order)
  return (
    <section className="b3-card b3-status">
      <div className="b3-status__top">
        <h1 className="b3-status__num b-num">{t.t('order.title', { number: order.number })}</h1>
        <div className="b3-status__sub">
          <StatusPill status={order.status} />
          <span className="b3-status__date">{t.t('orders.from', { date: t.date(order.createdAt, true) })}</span>
        </div>
      </div>
      {order.status !== 'cancelled' ? (
        <>
          <ProgressBar ratio={p.ratio} tone={order.status === 'delivered' ? 'ok' : 'accent'} />
          <div className="b3-status__row">
            <span className="b-num">{t.t('b.step', { n: p.done, total: p.total })}</span>
            {active && order.etaDate ? (
              <span className="b3-status__eta">
                {t.t('order.eta')}: <b>{t.date(order.etaDate)}</b>
              </span>
            ) : null}
          </div>
        </>
      ) : null}
      {order.trackingCode ? (
        <div className="b3-track">
          <span className="min-w-0">
            <span className="b3-track__label">{t.t('order.trackCode')}</span>
            <span className="b3-track__code b-num">{order.trackingCode}</span>
          </span>
          <IconButton label={t.t('b.g3.copyTrack')} tone="surface" onClick={() => copyText(order.trackingCode!, t.t('b.trackCopied'), t.t('b.copyFail'))}>
            <Copy size={19} strokeWidth={2.2} />
          </IconButton>
        </div>
      ) : null}
    </section>
  )
}

function Timeline({ order }: { order: OrderT }) {
  const t = useT()
  const lastReached = order.timeline.reduce((acc, e, i) => (e.at ? i : acc), -1)
  return (
    <section className="b3-card">
      <h2 className="b3-card__title">{t.t('order.tracking')}</h2>
      <ol className="b3-tl">
        {order.timeline.map((e, i) => {
          const state = i === lastReached ? 'now' : e.at ? 'done' : 'next'
          return (
            <li key={e.status + i} className="b3-tl__item" data-state={state} data-last={i === order.timeline.length - 1}>
              <span className="b3-tl__dot" aria-hidden="true" />
              <div className="min-w-0">
                <p className="b3-tl__title">
                  {t.t(`status.${e.status}`)}
                  {state === 'now' && order.status !== 'delivered' && order.status !== 'cancelled' ? <span className="b3-tl__now">{t.t('b.now')}</span> : null}
                </p>
                {e.note ? <p className="b3-tl__note">{t.l(e.note)}</p> : null}
                <p className="b3-tl__date b-num">{e.at ? `${t.date(e.at)}, ${formatTime(e.at)}` : t.t('b.expected')}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Items({ order }: { order: OrderT }) {
  const t = useT()
  const n = order.items.reduce((s, i) => s + i.qty, 0)
  return (
    <section className="b3-card">
      <h2 className="b3-card__title">
        {t.t('b.g3.items')} <span className="b3-card__count b-num">{n}</span>
      </h2>
      <div className="b3-items">
        {order.items.map((it) => (
          <Link key={it.productId + it.selectionLabel.ru} to={paths.product(it.productId)} onIntent={() => prefetchProduct(it.productId)} className="b3-item">
            <span className="b3-item__img">
              <Img image={it.image} alt={t.l(it.title)} sizes="64px" />
            </span>
            <span className="b3-item__main">
              <span className="b3-item__title">{t.l(it.title)}</span>
              {t.l(it.selectionLabel) ? <span className="b3-item__sel">{t.l(it.selectionLabel)}</span> : null}
              <span className="b3-item__price b-num">
                <b>{t.money(it.unitPrice * it.qty)}</b>
                {it.qty > 1 ? <span>{t.t('b.lineTotal', { qty: it.qty, price: t.money(it.unitPrice) })}</span> : null}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function Delivery({ order }: { order: OrderT }) {
  const t = useT()
  const a = order.address
  const courier = order.delivery === 'courier'
  return (
    <section className="b3-card">
      <h2 className="b3-card__title">{t.t('order.address')}</h2>
      <div className="b3-info">
        <span className="b3-info__icon" data-tone="accent">
          {courier ? <Truck size={19} strokeWidth={2.2} /> : <Store size={19} strokeWidth={2.2} />}
        </span>
        <span className="min-w-0">
          <span className="b3-info__title">{t.t(courier ? 'delivery.courier' : 'delivery.pickup')}</span>
          <span className="b3-info__text">{courier ? `${t.l(a.region)}, ${a.city}, ${a.street}${a.apartment ? `, ${a.apartment}` : ''}` : t.t('delivery.pickupDesc')}</span>
        </span>
      </div>
      <div className="b3-info">
        <span className="b3-info__icon" data-tone="flash">
          <MapPin size={19} strokeWidth={2.2} />
        </span>
        <span className="min-w-0">
          <span className="b3-info__title">{a.recipient}</span>
          <span className="b3-info__text b-num">{formatPhone(a.phone)}</span>
        </span>
      </div>
      <div className="b3-info">
        <span className="b3-info__icon" data-tone="ok">
          <CreditCard size={19} strokeWidth={2.2} />
        </span>
        <span className="min-w-0">
          <span className="b3-info__title">{t.t('b.g3.payment')}</span>
          <span className="b3-info__text">{t.t('order.paidWith', { method: t.t(`payment.${order.payment}`) })}</span>
        </span>
      </div>
    </section>
  )
}

function Totals({ order }: { order: OrderT }) {
  const t = useT()
  const q = order.quote
  const money = (v: number) => (v > 0 ? t.money(v) : t.t('cart.free'))
  return (
    <section className="b3-card">
      <h2 className="b3-card__title">{t.t('order.total')}</h2>
      <div className="b3-sum">
        <div className="b3-sum__row">
          <span>{t.t('cart.itemsTotal', { n: q.itemsCount })}</span>
          <span className="b-num">{t.money(q.itemsTotal + q.savings)}</span>
        </div>
        {q.savings > 0 ? (
          <div className="b3-sum__row" data-tone="hot">
            <span>{t.t('cart.savings')}</span>
            <span className="b-num">−{t.money(q.savings)}</span>
          </div>
        ) : null}
        {q.promoDiscount > 0 ? (
          <div className="b3-sum__row" data-tone="hot">
            <span>{q.promoCode ? t.t('b.g3.promo', { code: q.promoCode }) : t.t('cart.promo')}</span>
            <span className="b-num">−{t.money(q.promoDiscount)}</span>
          </div>
        ) : null}
        <div className="b3-sum__row">
          <span>{t.t('cart.shippingChina')}</span>
          <span className="b-num">{money(q.internationalShipping)}</span>
        </div>
        <div className="b3-sum__row">
          <span>{t.t('cart.serviceFee')}</span>
          <span className="b-num">{money(q.serviceFee)}</span>
        </div>
        <div className="b3-sum__row">
          <span>{t.t('cart.localDelivery')}</span>
          <span className="b-num">{money(q.localDelivery)}</span>
        </div>
        <div className="b3-sum__row b3-sum__row--total">
          <span>{t.t('cart.total')}</span>
          <span className="b-num">{t.money(q.total)}</span>
        </div>
      </div>
    </section>
  )
}

function OrderSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="b3-card">
        <Skeleton style={{ height: 22, width: '60%', borderRadius: 6 }} />
        <Skeleton style={{ height: 14, width: '40%', borderRadius: 6, marginTop: 8 }} />
        <Skeleton style={{ height: 6, width: '100%', borderRadius: 3, marginTop: 16 }} />
        <Skeleton style={{ height: 58, width: '100%', borderRadius: 12, marginTop: 14 }} />
      </div>
      <div className="b3-card">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} style={{ height: 40, width: '100%', borderRadius: 8, marginTop: i ? 12 : 0 }} />
        ))}
      </div>
    </div>
  )
}
