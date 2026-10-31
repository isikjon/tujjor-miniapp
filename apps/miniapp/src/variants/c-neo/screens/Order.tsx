import { Check, Copy, CreditCard, MessageCircle, PackageSearch, RotateCcw, Store, Truck } from 'lucide-react'
import { useState } from 'react'
import '../styles/g3.css'
import type { Order as OrderT } from '../../../shared/types'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { formatPhone } from '../../../shared/demo/user'
import { isApiError } from '../../../shared/demo/errors'
import { formatNumber, formatTime, useT } from '../../../shared/i18n'
import { Link } from '../../../shared/nav/Link'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { prefetchProduct, useOrder, useRepeatOrder } from '../../../shared/query/hooks'
import { toast } from '../../../shared/store/toast'
import { tg } from '../../../shared/telegram/adapter'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { EmptyState, ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { Dash, Price, Spinner, Sticker, TopBar } from '../ui/bits'
import { glowStyle, orderProgress } from '../lib/util'
import { Segments, StatusPill } from '../ui/g3/parts'
import { SupportSheet } from '../ui/g3/Sheets'

export default function Order({ params }: ScreenProps) {
  const t = useT()
  const q = useOrder(params.id)
  const o = q.data
  const [support, setSupport] = useState(false)
  const repeat = useRepeatOrder()

  if (!o) {
    const notFound = isApiError(q.error) && q.error.code === 'not_found'
    return (
      <Screen className="c-g3" header={<TopBar title={t.t('orders.title')} />}>
        {q.isPending ? (
          <OrderSkeleton />
        ) : notFound ? (
          <EmptyState
            icon={<PackageSearch size={40} strokeWidth={1.6} />}
            title={t.t('order.notFound')}
            text={t.t('c.g3.notFoundText')}
            action={
              <Link to={paths.orders()} replace className="c-btn2">
                {t.t('orders.title')}
              </Link>
            }
          />
        ) : (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        )}
      </Screen>
    )
  }

  const footer = (
    <div className="c-footer flex gap-2">
      <Tap className="c-btn2 flex-none" style={{ width: 56, padding: 0 }} aria-label={t.t('order.support')} onClick={() => setSupport(true)}>
        <MessageCircle size={22} strokeWidth={2.1} />
      </Tap>
      <Tap className="c-cta flex-1" aria-disabled={repeat.isPending} onClick={() => !repeat.isPending && repeat.mutate(o)}>
        {repeat.isPending ? <Spinner /> : <RotateCcw size={19} strokeWidth={2.4} />}
        {t.t('order.repeat')}
      </Tap>
    </div>
  )

  return (
    <Screen className="c-g3" header={<TopBar title={t.t('order.title', { number: o.number })} />} footer={footer}>
      <div className="px-4 pb-6">
        <OrderHero o={o} />
        <Tracking o={o} />

        {/* timeline */}
        <section className="mt-7">
          <h2 className="c-h2 mb-4 px-1">{t.t('order.tracking')}</h2>
          <div className="c-g3-card pb-1">
            <Timeline o={o} />
          </div>
        </section>

        {/* items */}
        <section className="mt-7">
          <div className="mb-3 flex items-baseline justify-between px-1">
            <h2 className="c-h2">{t.t('order.items')}</h2>
            <span className="text-[13px] font-[600] text-ink-3">{t.tp('orders.itemsCount', o.items.reduce((s, i) => s + i.qty, 0))}</span>
          </div>
          <div className="c-menu">
            {o.items.map((it, i) => (
              <Link key={`${it.productId}-${i}`} to={paths.product(it.productId)} onIntent={() => prefetchProduct(it.productId)} className="c-g3-item">
                <span className="c-g3-item-img c-glow" style={glowStyle(it.image.tint)}>
                  <Img image={it.image} alt={t.l(it.title)} sizes="64px" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="c-clamp2 text-[14.5px] font-[600] leading-snug">{t.l(it.title)}</span>
                  {t.l(it.selectionLabel) ? <span className="mt-0.5 block truncate text-[12.5px] text-ink-2">{t.l(it.selectionLabel)}</span> : null}
                  <span className="mt-1.5 flex items-baseline justify-between gap-2">
                    <span className="c-mono text-[12px] text-ink-3">
                      {it.qty} × {formatNumber(it.unitPrice)}
                    </span>
                    <Price value={it.unitPrice * it.qty} size="s" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* delivery + payment */}
        <section className="mt-7">
          <h2 className="c-h2 mb-3 px-1">{t.t('order.address')}</h2>
          <div className="c-menu">
            <div className="c-row items-start">
              <span className="c-row-ico">{o.delivery === 'courier' ? <Truck size={20} /> : <Store size={20} />}</span>
              <span className="min-w-0 flex-1 py-0.5">
                <span className="block text-[15px] font-[650]">{t.t(o.delivery === 'courier' ? 'delivery.courier' : 'delivery.pickup')}</span>
                <span className="mt-0.5 block text-[13.5px] leading-snug text-ink-2">
                  {o.delivery === 'pickup' ? t.t('delivery.pickupDesc') : [t.l(o.address.region), o.address.city, o.address.street, o.address.apartment].filter(Boolean).join(', ')}
                </span>
                <span className="mt-1 block text-[13px] text-ink-3">
                  {o.address.recipient} · {formatPhone(o.address.phone)}
                </span>
              </span>
            </div>
            <div className="c-row">
              <span className="c-row-ico">
                <CreditCard size={20} />
              </span>
              <span className="min-w-0 flex-1 text-[15px] font-[650]">{t.t('order.paidWith', { method: t.t(`payment.${o.payment}`) })}</span>
            </div>
          </div>
        </section>

        {/* totals */}
        <section className="mt-7">
          <div className="c-receipt">
            <p className="c-kicker mb-2">{t.t('order.total')}</p>
            <div className="c-receipt-row">
              <span>{t.t('cart.itemsTotal', { n: o.quote.itemsCount })}</span>
              <b>{t.money(o.quote.itemsTotal)}</b>
            </div>
            {o.quote.promoDiscount > 0 ? (
              <div className="c-receipt-row">
                <span>
                  {t.t('cart.promo')} {o.quote.promoCode ? <span className="c-mono">{o.quote.promoCode}</span> : null}
                </span>
                <b className="c-g3-minus">−{t.money(o.quote.promoDiscount)}</b>
              </div>
            ) : null}
            <div className="c-receipt-row">
              <span>{t.t('cart.shippingChina')}</span>
              <b>{t.money(o.quote.internationalShipping)}</b>
            </div>
            <div className="c-receipt-row">
              <span>{t.t('cart.serviceFee')}</span>
              <b>{t.money(o.quote.serviceFee)}</b>
            </div>
            <div className="c-receipt-row">
              <span>{t.t('cart.localDelivery')}</span>
              <b>{o.quote.localDelivery ? t.money(o.quote.localDelivery) : t.t('cart.free')}</b>
            </div>
            <Dash />
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-[700]">{t.t('cart.total')}</span>
              <Price value={o.quote.total} size="l" />
            </div>
            {o.quote.savings > 0 ? (
              <div className="mt-3 flex justify-end">
                <Sticker tone="lime" tilt={-2}>
                  {t.t('c.cart.youSave', { amount: t.money(o.quote.savings) })}
                </Sticker>
              </div>
            ) : null}
          </div>
        </section>
      </div>
      <SupportSheet open={support} onClose={() => setSupport(false)} />
    </Screen>
  )
}

function OrderHero({ o }: { o: OrderT }) {
  const t = useT()
  const p = orderProgress(o)
  const delivered = o.status === 'delivered' ? o.timeline.at(-1)?.at : null
  return (
    <div className="c-idcard c-g3-ink">
      <div className="relative z-[1]">
        <StatusPill status={o.status} />
        <p className="c-display mt-4 break-all text-[26px] font-[750] leading-none">{o.number}</p>
        <p className="c-kicker mt-2.5" style={{ color: 'rgb(244 244 246 / 0.55)' }}>
          {t.t('c.order.placed', { date: t.date(o.createdAt) })}
        </p>
        {o.status !== 'cancelled' ? (
          <>
            <Segments done={p.done} total={p.total} className="mt-5" />
            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="text-[12.5px] font-[600] opacity-60">{t.t('c.orders.step', { i: p.done, n: p.total })}</span>
              {delivered || o.etaDate ? (
                <span className="text-right">
                  <span className="block text-[11px] font-[700] uppercase tracking-[0.1em] opacity-55">{delivered ? t.t('status.delivered') : t.t('order.eta')}</span>
                  <span className="c-display block text-[18px] font-[700] text-[var(--c-lime)]">{t.date((delivered ?? o.etaDate)!)}</span>
                </span>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function Tracking({ o }: { o: OrderT }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  if (o.status === 'cancelled') return null
  const copy = async () => {
    if (!o.trackingCode) return
    try {
      await navigator.clipboard.writeText(o.trackingCode)
      tg.haptic('success')
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
      toast({ text: t.t('action.copied'), tone: 'success' })
    } catch {
      toast({ text: t.t('c.g3.copyFail'), tone: 'error' })
    }
  }
  return (
    <div className="c-g3-track mt-3">
      <div className="min-w-0 flex-1">
        <p className="c-kicker">{t.t('order.trackCode')}</p>
        {o.trackingCode ? (
          <p className="c-mono mt-1 truncate text-[16px] font-[700]">{o.trackingCode}</p>
        ) : (
          <p className="mt-1 text-[13.5px] leading-snug text-ink-2">{t.t('c.g3.trackHint')}</p>
        )}
      </div>
      {o.trackingCode ? (
        <Tap haptic={false} className="c-ibtn c-g3-copy" data-on={copied} aria-label={t.t('c.g3.copyTrack')} onClick={() => void copy()}>
          {copied ? <Check size={20} strokeWidth={2.6} className="c-pop" /> : <Copy size={19} strokeWidth={2.2} />}
        </Tap>
      ) : null}
    </div>
  )
}

function Timeline({ o }: { o: OrderT }) {
  const t = useT()
  const currentIdx = o.timeline.reduce((acc, e, i) => (e.at ? i : acc), -1)
  return (
    <ol>
      {o.timeline.map((e, i) => {
        const done = !!e.at
        const current = i === currentIdx && o.status !== 'delivered'
        return (
          <li key={`${e.status}-${i}`} className="c-tl-item" data-done={done} data-current={current}>
            <span className="c-tl-dot">{done ? <Check size={15} strokeWidth={3} /> : <span className="c-mono text-[11px] font-[700]">{i + 1}</span>}</span>
            <div className="min-w-0 pt-[3px]">
              <div className="flex items-baseline justify-between gap-3">
                <p className="c-tl-title text-[15px] font-[650] leading-snug">{t.t(`status.${e.status}`)}</p>
                {current ? <span className="c-g3-now">{t.t('c.order.now')}</span> : null}
              </div>
              <p className="mt-0.5 text-[12.5px] text-ink-3">{e.at ? `${t.date(e.at)} · ${formatTime(e.at)}` : t.t('c.order.pending')}</p>
              {e.note && done ? <p className="mt-1 text-[13.5px] leading-snug text-ink-2">{t.l(e.note)}</p> : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function OrderSkeleton() {
  return (
    <div className="px-4" aria-hidden="true">
      <Skeleton className="h-[176px] w-full" style={{ borderRadius: 28 }} />
      <Skeleton className="mt-3 h-[76px] w-full" style={{ borderRadius: 22 }} />
      <Skeleton className="mt-7 h-[22px] w-[44%]" />
      <Skeleton className="mt-4 h-[320px] w-full" style={{ borderRadius: 24 }} />
    </div>
  )
}
