import { Check, CircleX, Copy, CreditCard, MapPin, MessageCircle, Package, PackageCheck, Truck, X } from 'lucide-react'
import { useState } from 'react'
import { useT } from '../../../shared/i18n'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { prefetchProduct, useOrder, useRepeatOrder } from '../../../shared/query/hooks'
import { isApiError } from '../../../shared/demo/errors'
import { formatPhone } from '../../../shared/demo/user'
import { toast } from '../../../shared/store/toast'
import { useMainButton } from '../../../shared/telegram/hooks'
import { tg } from '../../../shared/telegram/adapter'
import type { Order as OrderT, OrderEvent } from '../../../shared/types'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { ErrorState } from '../../../shared/ui/States'
import { Block, Cell, Group } from '../ui/Cell'
import { EmptyView, PageTitle, Squircle, type SquircleColor } from '../ui/controls'
import { addressLine, SupportSheet } from '../ui/g3/sheets'
import '../styles/g3.css'

type StepState = 'done' | 'current' | 'todo' | 'cancel'

function stepStates(order: OrderT): StepState[] {
  const last = order.timeline.reduce((acc, e, i) => (e.at ? i : acc), -1)
  return order.timeline.map((e, i) => {
    if (e.status === 'cancelled' && e.at) return 'cancel'
    if (i < last) return 'done'
    if (i === last) return order.status === 'delivered' ? 'done' : 'current'
    return 'todo'
  })
}

function statusLook(o: OrderT): { color: SquircleColor; Icon: typeof Package } {
  if (o.status === 'delivered') return { color: 'green', Icon: PackageCheck }
  if (o.status === 'cancelled') return { color: 'red', Icon: CircleX }
  if (o.status === 'pending_payment') return { color: 'orange', Icon: CreditCard }
  if (['in_transit', 'customs', 'arrived', 'out_for_delivery'].includes(o.status)) return { color: 'purple', Icon: Truck }
  return { color: 'accent', Icon: Package }
}

export default function Order({ params }: ScreenProps) {
  const t = useT()
  const q = useOrder(params.id)
  const repeat = useRepeatOrder()
  const [support, setSupport] = useState(false)
  const order = q.data

  useMainButton(
    order
      ? {
          text: t.t('order.repeat'),
          onClick: () => {
            if (!repeat.isPending) repeat.mutate(order)
          },
          progress: repeat.isPending,
        }
      : null,
  )

  if (!order) {
    if (q.isError) {
      return (
        <Screen>
          {isApiError(q.error) && q.error.code === 'not_found' ? (
            <EmptyView icon={<Package size={44} strokeWidth={1.6} />} title={t.t('order.notFound')} />
          ) : (
            <ErrorState error={q.error} onRetry={() => q.refetch()} />
          )}
        </Screen>
      )
    }
    return (
      <Screen>
        <div className="d-pad" aria-busy="true">
          <Skeleton style={{ width: '70%', height: 34, marginTop: 6 }} />
          <Skeleton style={{ width: '45%', height: 18, marginTop: 8 }} />
        </div>
        {[148, 320, 200].map((h, i) => (
          <div key={i} className="d-group">
            <div className="d-section">
              <Skeleton style={{ height: h, borderRadius: 0 }} />
            </div>
          </div>
        ))}
      </Screen>
    )
  }

  const states = stepStates(order)
  const look = statusLook(order)
  const deliveredAt = order.timeline.find((e) => e.status === 'delivered')?.at
  const statusNote =
    order.status === 'cancelled'
      ? t.t('d.order.cancelledNote')
      : order.status === 'delivered' && deliveredAt
        ? t.t('d.order.deliveredOn', { date: t.date(deliveredAt) })
        : order.etaDate
          ? t.t('d.order.etaShort', { date: t.date(order.etaDate) })
          : undefined
  const qty = order.items.reduce((s, i) => s + i.qty, 0)
  const qt = order.quote

  const copy = async () => {
    if (!order.trackingCode) return
    try {
      await navigator.clipboard.writeText(order.trackingCode)
      tg.haptic('success')
      toast({ text: t.t('d.g3.order.copied'), tone: 'success' })
    } catch {
      toast({ text: t.t('d.g3.order.copyFail'), tone: 'error' })
    }
  }

  return (
    <Screen>
      <div className="d-g3-titlewrap">
        <PageTitle sub={t.t('d.order.created', { date: t.date(order.createdAt, true) })}>{order.number}</PageTitle>
      </div>

      <Group>
        <Cell
          className="d-g3-tall"
          icon={
            <Squircle color={look.color} size="lg">
              <look.Icon size={22} strokeWidth={2.2} />
            </Squircle>
          }
          sep={68}
          title={
            <span className="d-g3-status" data-status={order.status}>
              {t.t(`status.${order.status}`)}
            </span>
          }
          subtitle={statusNote}
        />
        {order.trackingCode ? (
          <Cell
            title={t.t('order.trackCode')}
            subtitle={<span className="d-g3-mono">{order.trackingCode}</span>}
            after={<Copy size={20} strokeWidth={2.2} className="d-g3-copy" aria-hidden="true" />}
            onClick={copy}
            ariaLabel={t.t('d.order.copyCode')}
          />
        ) : null}
      </Group>

      <Group header={t.t('order.tracking')} footer={order.status === 'cancelled' ? undefined : t.t('d.g3.order.trackHint')}>
        <Block>
          <ol className="d-tl">
            {order.timeline.map((e: OrderEvent, i) => (
              <li key={`${e.status}-${i}`} className="d-tl-step" data-state={states[i]}>
                <span className="d-tl-dot" aria-hidden="true">
                  {states[i] === 'done' ? <Check size={13} strokeWidth={3.4} /> : states[i] === 'cancel' ? <X size={13} strokeWidth={3.4} /> : null}
                </span>
                <span className="min-w-0">
                  <span className="d-tl-title d-g3-tl-title">
                    <span>{t.t(`status.${e.status}`)}</span>
                    {e.at ? <span className="d-g3-tl-date">{t.date(e.at)}</span> : null}
                  </span>
                  {e.note ? <span className="d-tl-note d-g3-block">{t.l(e.note)}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </Block>
        {order.etaDate && order.status !== 'delivered' && order.status !== 'cancelled' ? <Cell title={t.t('order.eta')} value={t.date(order.etaDate, true)} valueTone="ink" /> : null}
      </Group>

      <Group header={t.t('d.order.itemsTitle', { n: qty })}>
        {order.items.map((i, k) => (
          <Cell
            key={`${i.productId}-${k}`}
            className="d-g3-item"
            to={paths.product(i.productId)}
            onIntent={() => prefetchProduct(i.productId)}
            icon={<Img image={i.image} alt="" sizes="56px" className="d-g3-itemimg" />}
            sep={88}
            title={t.l(i.title)}
            subtitle={
              <>
                {t.l(i.selectionLabel) ? <span className="d-g3-block truncate">{t.l(i.selectionLabel)}</span> : null}
                <span className="d-g3-itemrow tabular">
                  <span className="truncate">{t.t('d.g3.order.qty', { n: i.qty, price: t.money(i.unitPrice) })}</span>
                  <b>{t.money(i.qty * i.unitPrice)}</b>
                </span>
              </>
            }
            chevron
          />
        ))}
      </Group>

      <Group header={t.t('order.address')}>
        <Cell
          icon={
            <Squircle color={order.delivery === 'courier' ? 'blue' : 'orange'}>
              {order.delivery === 'courier' ? <Truck size={18} strokeWidth={2.3} /> : <Package size={18} strokeWidth={2.3} />}
            </Squircle>
          }
          title={t.t(`delivery.${order.delivery}`)}
          ariaLabel={`${t.t('d.order.method')}: ${t.t(`delivery.${order.delivery}`)}`}
        />
        <Cell
          icon={
            <Squircle color="green">
              <MapPin size={18} strokeWidth={2.3} />
            </Squircle>
          }
          className="d-g3-tall"
          title={order.address.recipient}
          subtitle={
            <>
              <span className="d-g3-block">{addressLine(t, order.address)}</span>
              <span className="d-g3-block tabular">{formatPhone(order.address.phone)}</span>
            </>
          }
          wrap
        />
        <Cell
          icon={
            <Squircle color="indigo">
              <CreditCard size={18} strokeWidth={2.3} />
            </Squircle>
          }
          title={t.t('d.order.payment')}
          value={t.t(`payment.${order.payment}`)}
        />
      </Group>

      <Group header={t.t('order.total')} footer={t.t('checkout.demoPayment')}>
        <Cell title={t.t('cart.itemsTotal', { n: qt.itemsCount })} value={t.money(qt.itemsTotal)} valueTone="ink" />
        {qt.savings > 0 ? <Cell title={t.t('cart.savings')} value={`−${t.money(qt.savings)}`} className="d-g3-good" /> : null}
        {qt.promoDiscount > 0 ? <Cell title={`${t.t('cart.promo')}${qt.promoCode ? ` ${qt.promoCode}` : ''}`} value={`−${t.money(qt.promoDiscount)}`} className="d-g3-good" /> : null}
        <Cell title={t.t('cart.shippingChina')} value={t.money(qt.internationalShipping)} valueTone="ink" />
        <Cell title={t.t('cart.serviceFee')} value={t.money(qt.serviceFee)} valueTone="ink" />
        <Cell title={t.t('cart.localDelivery')} value={qt.localDelivery ? t.money(qt.localDelivery) : t.t('cart.free')} valueTone="ink" />
        <Cell title={<b>{t.t('cart.total')}</b>} value={<b className="tabular">{t.money(qt.total)}</b>} valueTone="ink" />
      </Group>

      <Group header={t.t('d.order.actions')}>
        <Cell
          tone="link"
          icon={
            <Squircle color="teal">
              <MessageCircle size={18} strokeWidth={2.3} />
            </Squircle>
          }
          title={t.t('order.support')}
          onClick={() => setSupport(true)}
        />
      </Group>

      <SupportSheet open={support} onClose={() => setSupport(false)} orderNumber={order.number} />
    </Screen>
  )
}
