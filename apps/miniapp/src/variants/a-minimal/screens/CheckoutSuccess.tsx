import { Check, Copy } from 'lucide-react'
import { useT } from '../../../shared/i18n'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { useNav } from '../../../shared/nav/context'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { useOrder } from '../../../shared/query/hooks'
import { toast } from '../../../shared/store/toast'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { Btn } from '../ui/controls'
import '../styles/g2.css'

const SPARKS = Array.from({ length: 12 }, (_, i) => i)
const STEPS = [1, 2, 3] as const

export default function CheckoutSuccess({ params }: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const q = useOrder(params.orderId)
  const o = q.data

  const copy = (text: string) => {
    void navigator.clipboard
      ?.writeText(text)
      .then(() => toast({ text: t.t('action.copied'), tone: 'success' }))
      .catch(() => toast({ text: t.t('error.generic'), tone: 'error' }))
  }

  return (
    <Screen
      footer={
        <div className="a2-footer a2-footer--stack">
          <Btn block onClick={() => nav.push(paths.order(params.orderId))}>
            {t.t('action.openOrder')}
          </Btn>
          <Btn block kind="plain" onClick={() => nav.switchTab('home')}>
            {t.t('action.continueShopping')}
          </Btn>
        </div>
      }
    >
      <div className="a2 a2-ok">
        <div className="a2-burst" aria-hidden="true">
          {SPARKS.map((i) => (
            <span key={i} className="a2-burst__spark" style={{ ['--i' as string]: i }} />
          ))}
          <span className="a2-burst__ring" />
          <span className="a2-burst__disc">
            <Check size={40} strokeWidth={2} />
          </span>
        </div>
        <h1 className="a2-ok__title">{t.t('success.title')}</h1>
        <p className="a2-ok__text">{t.t('success.text')}</p>

        {o ? (
          <dl className="a2-okcard">
            <div>
              <dt>{t.t('success.number')}</dt>
              <dd>
                <Tap flat className="a2-copy" aria-label={`${t.t('action.copy')} ${o.number}`} onClick={() => copy(o.number)}>
                  <b>{o.number}</b>
                  <Copy size={16} strokeWidth={1.5} aria-hidden="true" />
                </Tap>
              </dd>
            </div>
            <div>
              <dt>{t.t('a.g2.status')}</dt>
              <dd>{t.t(`status.${o.status}`)}</dd>
            </div>
            <div>
              <dt>{t.t('a.g2.payment')}</dt>
              <dd>
                {t.t(`payment.${o.payment}`)} · {t.t('success.paid')}
              </dd>
            </div>
            {o.etaDate ? (
              <div>
                <dt>{t.t('order.eta')}</dt>
                <dd>{t.date(o.etaDate)}</dd>
              </div>
            ) : null}
            <div className="a2-okcard__total">
              <dt>{t.t('order.total')}</dt>
              <dd>{t.money(o.quote.total)}</dd>
            </div>
          </dl>
        ) : q.isError ? (
          <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />
        ) : (
          <div className="a2-okcard" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton style={{ width: 110, height: 14 }} />
                <Skeleton style={{ width: 120, height: 14 }} />
              </div>
            ))}
          </div>
        )}

        <section className="a2-next">
          <h2 className="a2-h2">{t.t('a.g2.nextSteps')}</h2>
          <ol className="a2-next__list">
            {STEPS.map((i) => (
              <li key={i}>
                <span className="a2-next__n">{String(i).padStart(2, '0')}</span>
                <span>{t.t(`a.g2.step${i}`)}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Screen>
  )
}
