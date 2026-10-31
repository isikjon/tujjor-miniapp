import type { Quote } from '../../../shared/types'
import { useT } from '../../../shared/i18n'
import { cx } from '../../../shared/lib/cx'
import { Skeleton } from '../../../shared/ui/Skeleton'

/**
 * Server totals. The client never sums money — every number comes from the quote.
 * While a new quote is calculated the previous numbers stay, gently dimmed.
 */
export function Totals({ quote, recalculating, totalLabel, className }: { quote: Quote | undefined; recalculating?: boolean; totalLabel?: string; className?: string }) {
  const t = useT()
  if (!quote) return <TotalsSkeleton className={className} />
  const money = (n: number) => (n === 0 ? t.t('cart.free') : t.money(n))
  return (
    <dl className={cx('a-totals', className)} data-busy={recalculating || undefined} aria-busy={recalculating || undefined}>
      <Row label={t.t('cart.itemsTotal', { n: quote.itemsCount })} value={t.money(quote.itemsTotal)} />
      {quote.promoDiscount > 0 ? <Row label={`${t.t('cart.promo')} ${quote.promoCode ?? ''}`.trim()} value={`−${t.money(quote.promoDiscount)}`} tone="sale" /> : null}
      <Row label={t.t('cart.shippingChina')} value={t.money(quote.internationalShipping)} />
      <Row label={t.t('cart.serviceFee')} value={t.money(quote.serviceFee)} />
      <Row label={t.t('cart.localDelivery')} value={money(quote.localDelivery)} />
      <div className="a-totals__total">
        <dt>{totalLabel ?? t.t('cart.total')}</dt>
        <dd>{t.money(quote.total)}</dd>
      </div>
      {quote.savings > 0 ? (
        <div className="a-totals__savings">
          <dt>{t.t('a.savings')}</dt>
          <dd>{t.money(quote.savings)}</dd>
        </div>
      ) : null}
    </dl>
  )
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'sale' }) {
  return (
    <div className="a-totals__row" data-tone={tone}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function TotalsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cx('a-totals', className)} aria-hidden="true">
      {[62, 48, 54, 40].map((w, i) => (
        <div key={i} className="a-totals__row">
          <Skeleton style={{ width: `${w}%`, height: 13 }} />
          <Skeleton style={{ width: 84, height: 13 }} />
        </div>
      ))}
      <div className="a-totals__total">
        <Skeleton style={{ width: 70, height: 17 }} />
        <Skeleton style={{ width: 120, height: 17 }} />
      </div>
    </div>
  )
}
