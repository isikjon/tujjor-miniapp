import { Check } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useT } from '../../../shared/i18n'
import { useNav } from '../../../shared/nav/context'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { useOrder } from '../../../shared/query/hooks'
import { toast } from '../../../shared/store/toast'
import { useMainButton } from '../../../shared/telegram/hooks'
import { ErrorState } from '../../../shared/ui/States'
import { Cell, Group } from '../ui/Cell'
import { Spinner, Squircle, type SquircleColor } from '../ui/controls'
import { dateRange } from '../ui/lib'
import '../styles/g2.css'

const COLORS = ['var(--d-c-blue)', 'var(--d-c-orange)', 'var(--d-c-green)', 'var(--d-c-pink)', 'var(--d-c-purple)', 'var(--d-c-yellow)']
const CONFETTI = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2
  const d = 74 + (i % 3) * 20
  return { x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d - 18), r: (i * 67) % 360, c: COLORS[i % COLORS.length] }
})
const STEP_COLORS: SquircleColor[] = ['blue', 'orange', 'green']

export default function CheckoutSuccess({ params }: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const q = useOrder(params.orderId)
  const o = q.data

  useMainButton(o ? { text: t.t('action.openOrder'), onClick: () => nav.replace(paths.order(o.id)) } : null)

  if (!o) {
    return (
      <Screen>
        {q.isError ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : (
          <div className="g2-center" role="status">
            <Spinner />
            <span>{t.t('d.success.loading')}</span>
          </div>
        )}
      </Screen>
    )
  }

  const copy = () => {
    void navigator.clipboard
      ?.writeText(o.number)
      .then(() => toast({ text: t.t('action.copied'), tone: 'success' }))
      .catch(() => toast({ text: t.t('error.generic'), tone: 'error' }))
  }
  const range = dateRange(t, o.quote.etaDays, new Date(o.createdAt).getTime())

  return (
    <Screen>
      <div className="g2-success">
        <div className="d-success-mark">
          <Check size={46} strokeWidth={3} aria-hidden="true" />
          <span className="d-confetti" aria-hidden="true">
            {CONFETTI.map((p, i) => (
              <i key={i} style={{ '--x': `${p.x}px`, '--y': `${p.y}px`, '--r': `${p.r}deg`, background: p.c } as CSSProperties} />
            ))}
          </span>
        </div>
        <h1 className="g2-success-title d-rise">{t.t('success.title')}</h1>
        <p className="g2-success-text d-rise">{t.t('success.text')}</p>
      </div>

      <Group>
        <Cell title={t.t('success.number')} value={o.number} valueTone="ink" onClick={copy} ariaLabel={`${t.t('success.number')} ${o.number}. ${t.t('action.copy')}`} />
        <Cell title={t.t('d.success.status')} value={t.t(`status.${o.status}`)} />
        <Cell title={t.t('d.success.total')} value={t.money(o.quote.total)} valueTone="ink" />
        <Cell title={t.t('checkout.payment')} subtitle={t.t('success.paid')} value={t.t(`payment.${o.payment}`)} />
        <Cell title={t.t('d.success.eta')} value={o.etaDate ? t.date(o.etaDate) : t.t('d.checkout.etaDates', range)} />
      </Group>

      <Group header={t.t('d.success.next')}>
        {[1, 2, 3].map((n) => (
          <Cell
            key={n}
            icon={
              <Squircle color={STEP_COLORS[n - 1]}>
                <span className="g2-num" aria-label={t.t('d.g2.stepLabel', { n })}>
                  {n}
                </span>
              </Squircle>
            }
            title={t.t(`d.success.step${n}`)}
            wrap
          />
        ))}
      </Group>

      <Group>
        <Cell title={t.t('action.continueShopping')} tone="link" onClick={() => nav.switchTab('home')} />
      </Group>
    </Screen>
  )
}
