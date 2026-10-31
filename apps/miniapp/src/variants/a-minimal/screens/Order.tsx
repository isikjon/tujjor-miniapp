import { Check, Copy, MessageCircle, PackageX, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import type { Order as OrderT, OrderEvent } from '../../../shared/types'
import { isApiError } from '../../../shared/demo/errors'
import { formatPhone } from '../../../shared/demo/user'
import { useT } from '../../../shared/i18n'
import { useNav } from '../../../shared/nav/context'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { Link } from '../../../shared/nav/Link'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { useOrder, useRepeatOrder } from '../../../shared/query/hooks'
import { toast } from '../../../shared/store/toast'
import { tg } from '../../../shared/telegram/adapter'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { EmptyState, ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { Btn, SectionHead } from '../ui/controls'
import { SupportSheet } from '../ui/InfoSheets'
import { PageTitle } from '../ui/PageTitle'
import { Totals } from '../ui/Totals'
import { StatusLine } from '../ui/g3/OrderCard'
import '../styles/g3.css'

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

export default function Order({ params }: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const q = useOrder(params.id)
  const order = q.data

  if (!order) {
    if (q.isError) {
      const notFound = isApiError(q.error) && q.error.code === 'not_found'
      return (
        <Screen>
          {notFound ? (
            <EmptyState
              className="a-g3-empty a-g3-empty--screen"
              icon={<PackageX size={40} strokeWidth={1.25} />}
              title={t.t('order.notFound')}
              action={
                <Btn size="md" onClick={() => nav.replace(paths.orders())}>
                  {t.t('orders.title')}
                </Btn>
              }
            />
          ) : (
            <ErrorState error={q.error} onRetry={() => void q.refetch()} className="a-g3-empty--screen" />
          )}
        </Screen>
      )
    }
    return (
      <Screen>
        <OrderSkeleton />
      </Screen>
    )
  }
  return <OrderView order={order} />
}

function OrderView({ order: o }: { order: OrderT }) {
  const t = useT()
  const repeat = useRepeatOrder()
  const [support, setSupport] = useState(false)

  const reached = o.timeline.filter((e) => e.at)
  const currentIdx = o.timeline.reduce((last, e, i) => (e.at ? i : last), -1)
  const delivered = o.status === 'delivered' ? (reached[reached.length - 1]?.at ?? null) : null
  const steps = o.timeline.filter((e) => e.status !== 'cancelled').length || 1
  const progress = o.status === 'cancelled' ? 0 : Math.min(1, Math.max(0, reached.filter((e) => e.status !== 'cancelled').length / steps))

  const copy = async () => {
    if (!o.trackingCode) return
    const ok = await copyText(o.trackingCode)
    tg.haptic(ok ? 'success' : 'error')
    toast(ok ? { text: t.t('action.copied'), tone: 'success' } : { text: t.t('a.g3.copyFailed'), tone: 'error' })
  }

  return (
    <Screen>
      <PageTitle eyebrow={t.t('a.g3.orderFrom', { date: t.date(o.createdAt) })} title={o.number} compactTitle={o.number} />

      {/* status hero */}
      <section className="a-gutter a-g3-hero" data-tone={o.status}>
        <StatusLine status={o.status} className="a-g3-hero__status" />
        <p className="a-g3-hero__eta">
          {delivered
            ? t.t('a.g3.deliveredOn', { date: t.date(delivered) })
            : o.etaDate && o.status !== 'cancelled'
              ? `${t.t('order.eta')}: ${t.date(o.etaDate)}`
              : null}
        </p>
        {o.status !== 'cancelled' ? (
          <>
            <div className="a-g3-progress" aria-hidden="true">
              <span className="a-g3-progress__fill" style={{ transform: `scaleX(${progress})` }} />
            </div>
            <p className="a-g3-hero__steps">{t.t('a.g3.steps', { done: Math.max(1, currentIdx + 1), total: o.timeline.length })}</p>
          </>
        ) : null}
      </section>

      {/* tracking */}
      <section className="a-gutter a-g3-block">
        <SectionHead title={t.t('order.tracking')} />
        {o.trackingCode ? (
          <div className="a-g3-track">
            <span className="a-g3-track__text">
              <span className="a-g3-track__label">{t.t('order.trackCode')}</span>
              <span className="a-g3-track__code">{o.trackingCode}</span>
            </span>
            <Tap className="a-g3-track__copy" onClick={() => void copy()} aria-label={t.t('action.copy')}>
              <Copy size={16} strokeWidth={1.75} aria-hidden="true" />
              {t.t('action.copy')}
            </Tap>
          </div>
        ) : null}
        <ol className="a-g3-timeline">
          {o.timeline.map((e, i) => (
            <TimelineStep key={`${e.status}-${i}`} event={e} state={i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'future'} last={i === o.timeline.length - 1} />
          ))}
        </ol>
      </section>

      {/* items */}
      <section className="a-gutter a-g3-block">
        <SectionHead title={t.t('order.items')} />
        <ul className="a-g3-items">
          {o.items.map((it, i) => (
            <li key={`${it.productId}-${i}`}>
              <Link to={paths.product(it.productId)} className="a-g3-item">
                <Img image={it.image} alt={t.l(it.title)} sizes="72px" className="a-g3-item__img" />
                <span className="a-g3-item__text">
                  <span className="a-g3-item__title">{t.l(it.title)}</span>
                  {t.l(it.selectionLabel) ? <span className="a-g3-item__sku">{t.l(it.selectionLabel)}</span> : null}
                  <span className="a-g3-item__price">
                    <span>{t.t('a.g3.qtyPrice', { qty: it.qty, price: t.money(it.unitPrice) })}</span>
                    <b>{t.money(it.unitPrice * it.qty)}</b>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* delivery + payment */}
      <section className="a-gutter a-g3-block">
        <SectionHead title={t.t('order.address')} />
        <dl className="a-g3-facts">
          <div>
            <dt>{t.t(`delivery.${o.delivery}`)}</dt>
            <dd>
              {o.delivery === 'pickup' ? (
                t.t('delivery.pickupDesc')
              ) : (
                <>
                  {[o.address.street, o.address.apartment].filter(Boolean).join(', ')}
                  <br />
                  {o.address.city}, {t.l(o.address.region)}
                </>
              )}
            </dd>
          </div>
          <div>
            <dt>{t.t('a.g3.recipient')}</dt>
            <dd>
              {o.address.recipient} · {formatPhone(o.address.phone)}
            </dd>
          </div>
          <div>
            <dt>{t.t('a.g3.payment')}</dt>
            <dd>{o.status === 'pending_payment' ? t.t(`payment.${o.payment}`) : t.t('order.paidWith', { method: t.t(`payment.${o.payment}`) })}</dd>
          </div>
        </dl>
      </section>

      {/* totals */}
      <section className="a-gutter a-g3-block">
        <Totals quote={o.quote} totalLabel={t.t('order.total')} />
      </section>

      <section className="a-gutter a-g3-actions">
        <Btn block loading={repeat.isPending} onClick={() => repeat.mutate(o)}>
          <RotateCcw size={18} strokeWidth={1.75} aria-hidden="true" />
          {t.t('order.repeat')}
        </Btn>
        <Btn block kind="secondary" onClick={() => setSupport(true)}>
          <MessageCircle size={18} strokeWidth={1.75} aria-hidden="true" />
          {t.t('order.support')}
        </Btn>
      </section>

      <SupportSheet open={support} onClose={() => setSupport(false)} />
    </Screen>
  )
}

function TimelineStep({ event: e, state, last }: { event: OrderEvent; state: 'done' | 'current' | 'future'; last: boolean }) {
  const t = useT()
  return (
    <li className="a-g3-step" data-state={state} data-last={last || undefined} data-cancelled={e.status === 'cancelled' || undefined}>
      <span className="a-g3-step__rail" aria-hidden="true">
        <span className="a-g3-step__dot">{state === 'done' ? <Check size={10} strokeWidth={3} /> : null}</span>
      </span>
      <span className="a-g3-step__body">
        <span className="a-g3-step__title">{t.t(`status.${e.status}`)}</span>
        <span className="a-g3-step__date">{e.at ? t.date(e.at) : t.t('a.g3.expected')}</span>
        {e.note ? <span className="a-g3-step__note">{t.l(e.note)}</span> : null}
      </span>
    </li>
  )
}

function OrderSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="a-gutter a-g3-skelhead">
        <Skeleton style={{ width: 140, height: 12 }} />
        <Skeleton style={{ width: 230, height: 32, marginTop: 10 }} />
      </div>
      <div className="a-gutter a-g3-hero">
        <Skeleton style={{ width: 170, height: 20 }} />
        <Skeleton style={{ width: 200, height: 14, marginTop: 10 }} />
        <Skeleton style={{ width: '100%', height: 4, marginTop: 18 }} />
      </div>
      <div className="a-gutter a-g3-block">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="a-g3-skelstep">
            <Skeleton round style={{ width: 14, height: 14 }} />
            <span>
              <Skeleton style={{ width: 160, height: 15 }} />
              <Skeleton style={{ width: 90, height: 12, marginTop: 6 }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
