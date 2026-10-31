import { Bell, Camera, Check, Copy, PackageCheck, SearchX } from 'lucide-react'
import { useT } from '../../../shared/i18n'
import { useNav } from '../../../shared/nav/context'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { useOrder } from '../../../shared/query/hooks'
import { toast } from '../../../shared/store/toast'
import { tg } from '../../../shared/telegram/adapter'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { isApiError } from '../../../shared/demo/errors'
import { statusTone } from '../lib'
import { Button, EmptyView } from '../ui'
import { Card } from '../ui/g2/parts'
import '../styles/g2.css'

export default function CheckoutSuccess({ params }: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const id = params.orderId
  const q = useOrder(id)
  const order = q.data

  const footer = (
    <div className="b-g2-bar b-g2-bar--col">
      <Button block size="lg" disabled={!order} onClick={() => nav.push(paths.order(id))}>
        {t.t('action.openOrder')}
      </Button>
      <Button block size="lg" kind="ghost" onClick={() => nav.switchTab('home')}>
        {t.t('action.continueShopping')}
      </Button>
    </div>
  )

  if (!order) {
    if (q.isError) {
      return (
        <Screen footer={footer}>
          {isApiError(q.error) && q.error.code === 'not_found' ? (
            <EmptyView className="pt-24" icon={<SearchX size={30} strokeWidth={2} />} title={t.t('order.notFound')} />
          ) : (
            <ErrorState className="pt-24" error={q.error} onRetry={() => void q.refetch()} />
          )}
        </Screen>
      )
    }
    return (
      <Screen footer={footer}>
        <div className="b-ok-hero" aria-hidden="true">
          <Skeleton round style={{ width: 84, height: 84 }} />
          <Skeleton style={{ height: 26, width: '60%', marginTop: 18 }} />
          <Skeleton style={{ height: 14, width: '80%', marginTop: 10 }} />
        </div>
        <section className="b-g2-card">
          <Skeleton style={{ height: 18, width: '50%' }} />
          <Skeleton style={{ height: 14, width: '70%', marginTop: 10 }} />
          <Skeleton style={{ height: 14, width: '40%', marginTop: 10 }} />
        </section>
      </Screen>
    )
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(order.number)
      tg.haptic('success')
      toast({ text: t.t('b.g2.numberCopied'), tone: 'success' })
    } catch {
      toast({ text: t.t('b.copyFail'), tone: 'error' })
    }
  }
  const paid = order.status !== 'pending_payment' && order.status !== 'cancelled'
  const steps = [
    { icon: <PackageCheck size={18} strokeWidth={2.2} aria-hidden="true" />, text: t.t('b.next1') },
    { icon: <Camera size={18} strokeWidth={2.2} aria-hidden="true" />, text: t.t('b.next2') },
    { icon: <Bell size={18} strokeWidth={2.2} aria-hidden="true" />, text: t.t('b.next3') },
  ]

  return (
    <Screen footer={footer}>
      <div className="b-ok-hero">
        <span className="b-ok-hero__icon">
          <Check size={44} strokeWidth={3} aria-hidden="true" />
        </span>
        <h1 className="b-ok-hero__title">{t.t('success.title')}</h1>
        <p className="b-ok-hero__text">{t.t('success.text')}</p>
      </div>

      <section className="b-g2-card">
        <div className="b-ok-num">
          <div className="min-w-0">
            <p className="b-ok-num__lbl">{t.t('success.number')}</p>
            <p className="b-ok-num__val b-num">{order.number}</p>
          </div>
          <Tap className="b-ok-num__copy" aria-label={t.t('b.g2.copyNumber')} onClick={() => void copy()}>
            <Copy size={18} strokeWidth={2.2} aria-hidden="true" />
          </Tap>
        </div>
        <dl className="b-ok-rows">
          <div>
            <dt>{t.t('b.g2.status')}</dt>
            <dd>
              <span className="b-g2-status" data-tone={statusTone(order.status)}>
                {t.t(`status.${order.status}`)}
              </span>
            </dd>
          </div>
          {paid ? (
            <div>
              <dt>{t.t(`payment.${order.payment}`)}</dt>
              <dd className="b-ok-paid">
                <Check size={14} strokeWidth={3} aria-hidden="true" />
                {t.t('b.paidDemo')}
              </dd>
            </div>
          ) : null}
          {order.etaDate ? (
            <div>
              <dt>{t.t('order.eta')}</dt>
              <dd>{t.date(order.etaDate)}</dd>
            </div>
          ) : null}
          <div>
            <dt>{t.t('b.g2.orderTotal')}</dt>
            <dd className="b-ok-total b-num">{t.money(order.quote.total)}</dd>
          </div>
        </dl>
        <div className="b-ok-thumbs">
          {order.items.slice(0, 5).map((it, i) => (
            <span key={`${it.productId}-${i}`} className="b-ok-thumb">
              <Img image={it.image} alt={t.l(it.title)} sizes="52px" />
              {it.qty > 1 ? <span className="b-ok-thumb__qty b-num">×{it.qty}</span> : null}
            </span>
          ))}
          {order.items.length > 5 ? <span className="b-ok-thumb b-ok-thumb--more b-num">{t.t('b.g2.thumbsMore', { n: order.items.length - 5 })}</span> : null}
        </div>
      </section>

      <Card title={t.t('b.nextTitle')}>
        <ol className="b-ok-steps">
          {steps.map((s, i) => (
            <li key={i}>
              <span className="b-g2-ico" data-tone="accent">
                {s.icon}
              </span>
              <span className="b-ok-steps__text">{s.text}</span>
            </li>
          ))}
        </ol>
      </Card>
    </Screen>
  )
}
