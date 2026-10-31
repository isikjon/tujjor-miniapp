import { ArrowRight, Check, Copy, PackageCheck, Plane, ShoppingBag } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { useT } from '../../../shared/i18n'
import { Screen } from '../../../shared/nav/Screen'
import { useNav } from '../../../shared/nav/context'
import { paths } from '../../../shared/nav/routes'
import { useOrder } from '../../../shared/query/hooks'
import { toast } from '../../../shared/store/toast'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { glowStyle, statusGroup } from '../lib/util'
import { Kicker, Price, Sticker } from '../ui/bits'
import '../styles/g2.css'

/** Confetti pieces: direction, rotation, delay, colour (CSS-only burst, transform/opacity). */
const BITS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 + (i % 2 ? 0.2 : -0.1)
  const r = 92 + (i % 3) * 26
  return {
    '--dx': `${Math.round(Math.cos(a) * r)}px`,
    '--dy': `${Math.round(Math.sin(a) * r)}px`,
    '--r': `${(i % 2 ? 1 : -1) * (120 + i * 17)}deg`,
    '--d': `${160 + (i % 4) * 40}ms`,
    background: ['#c8ff2e', '#7b61ff', '#2ee6ff', '#ff4d6d'][i % 4],
    borderRadius: i % 3 === 0 ? '50%' : 3,
  } as CSSProperties
})

export default function CheckoutSuccessScreen({ params }: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const q = useOrder(params.orderId)
  const order = q.data

  const copy = (text: string) => {
    void navigator.clipboard
      ?.writeText(text)
      .then(() => toast({ text: t.t('action.copied'), tone: 'success' }))
      .catch(() => toast({ text: text }))
  }

  return (
    <Screen
      className="g2-success"
      footer={
        <div className="c-footer flex flex-col gap-2">
          <Tap className="c-cta g2-cta-split" aria-disabled={!order || undefined} onClick={() => order && nav.push(paths.order(order.id))}>
            <span className="g2-cta-label">{t.t('action.openOrder')}</span>
            <ArrowRight size={20} strokeWidth={2.4} />
          </Tap>
          <Tap className="c-btn2 w-full" onClick={() => nav.switchTab('home')}>
            <ShoppingBag size={18} strokeWidth={2.2} />
            {t.t('action.continueShopping')}
          </Tap>
        </div>
      }
    >
      <div className="flex flex-col items-center px-5 pt-10 text-center">
        <div className="c-success-mark">
          <span className="c-ring" />
          <span className="c-ring" />
          <span className="c-ring" />
          <span className="c-confetti" aria-hidden="true">
            {BITS.map((s, i) => (
              <i key={i} style={s} />
            ))}
          </span>
          <span className="c-success-core">
            <Check size={54} strokeWidth={3.2} />
          </span>
        </div>
        <Kicker className="mt-7">{t.t('c.success.kicker')}</Kicker>
        <h1 className="c-h1 g2-success-title mt-2">{t.t('success.title')}</h1>
        <p className="mt-3 max-w-[320px] text-[15px] leading-snug text-ink-2">{t.t('success.text')}</p>
      </div>

      <div className="mt-7 px-4">
        {q.isPending && !order ? (
          <Skeleton className="h-[188px] w-full" style={{ borderRadius: 24 }} />
        ) : !order ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : (
          <div className="g2-ticket">
            <span className="g2-ticket-stk">
              <Sticker tone="lime" tilt={5} big>
                {t.t('success.paid')}
              </Sticker>
            </span>
            <Kicker>{t.t('success.number')}</Kicker>
            <Tap flat className="g2-ordno" aria-label={t.t('action.copy')} onClick={() => copy(order.number)}>
              <span className="truncate">{order.number}</span>
              <Copy size={16} strokeWidth={2.2} className="shrink-0 opacity-60" />
            </Tap>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="c-status" data-g={statusGroup(order.status)}>
                {t.t(`status.${order.status}`)}
              </span>
              {order.etaDate ? (
                <span className="g2-eta-chip">
                  <Plane size={13} strokeWidth={2.4} />
                  {t.t('order.eta')}: {t.date(order.etaDate)}
                </span>
              ) : null}
            </div>
            <div className="c-dash" />
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                {order.items.slice(0, 4).map((it, i) => (
                  <span key={i} className="c-thumb c-glow" style={glowStyle(it.image.tint)}>
                    <Img image={it.image} alt={t.l(it.title)} sizes="52px" />
                  </span>
                ))}
              </div>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-[12px] font-semibold text-ink-3">{t.tp('orders.itemsCount', order.items.reduce((n, i) => n + i.qty, 0))}</p>
                <Price value={order.quote.total} size="l" />
              </div>
            </div>
          </div>
        )}
      </div>

      <section className="mt-6 px-4">
        <Kicker className="px-1">{t.t('c.success.next')}</Kicker>
        <ol className="g2-next mt-3">
          {(['c.success.n1', 'c.success.n2', 'c.success.n3'] as const).map((k, i) => (
            <li key={k} className="c-rise" style={{ animationDelay: `${380 + i * 90}ms` }}>
              <span className="g2-next-n">{i === 2 ? <PackageCheck size={16} strokeWidth={2.4} /> : String(i + 1).padStart(2, '0')}</span>
              <span>{t.t(k)}</span>
            </li>
          ))}
        </ol>
      </section>
      <div className="h-4" />
    </Screen>
  )
}
