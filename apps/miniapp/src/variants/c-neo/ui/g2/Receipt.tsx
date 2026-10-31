import type { ReactNode } from 'react'
import type { Quote } from '../../../../shared/types'
import { useT } from '../../../../shared/i18n'
import { Skeleton } from '../../../../shared/ui/Skeleton'
import { Dash, Kicker, Price, Sticker } from '../bits'

/** Receipt card with dashed dividers — server totals only (cart and checkout show the same numbers). */
export function Receipt({ quote, busy, title, extra, error }: { quote: Quote | undefined; busy: boolean; title?: string; extra?: ReactNode; error?: ReactNode }) {
  const t = useT()
  return (
    <div className="c-receipt g2-receipt">
      <div className="flex items-center justify-between gap-3">
        <Kicker>{title ?? t.t('c.cart.receipt')}</Kicker>
        {quote && quote.savings + quote.promoDiscount > 0 ? (
          <Sticker tone="lime" tilt={-3}>
            {t.t('c.cart.youSave', { amount: t.money(quote.savings + quote.promoDiscount) })}
          </Sticker>
        ) : null}
      </div>
      {error ? <div className="mt-3">{error}</div> : null}
      {!quote ? (
        error ? null : (
          <div className="mt-3 flex flex-col gap-3" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-[44%]" />
                <Skeleton className="h-4 w-[24%]" />
              </div>
            ))}
            <Skeleton className="mt-2 h-9 w-[60%]" />
          </div>
        )
      ) : (
        <div className="c-recalc mt-2" data-busy={busy}>
          <div className="c-receipt-row">
            <span>{t.t('cart.itemsTotal', { n: quote.itemsCount })}</span>
            <b>{t.money(quote.itemsTotal + quote.savings)}</b>
          </div>
          {quote.savings > 0 ? (
            <div className="c-receipt-row g2-minus">
              <span>{t.t('cart.savings')}</span>
              <b>−{t.money(quote.savings)}</b>
            </div>
          ) : null}
          {quote.promoDiscount > 0 ? (
            <div className="c-receipt-row g2-minus">
              <span>
                {t.t('cart.promo')} {quote.promoCode ? <span className="c-mono">{quote.promoCode}</span> : null}
              </span>
              <b>−{t.money(quote.promoDiscount)}</b>
            </div>
          ) : null}
          <div className="c-receipt-row">
            <span>{t.t('cart.shippingChina')}</span>
            <b>{t.money(quote.internationalShipping)}</b>
          </div>
          <div className="c-receipt-row">
            <span>{t.t('cart.serviceFee')}</span>
            <b>{t.money(quote.serviceFee)}</b>
          </div>
          <div className="c-receipt-row">
            <span>{t.t('cart.localDelivery')}</span>
            <b className={quote.localDelivery === 0 ? 'g2-free' : undefined}>{quote.localDelivery === 0 ? t.t('cart.free') : t.money(quote.localDelivery)}</b>
          </div>
          {extra}
          <Dash />
          <div className="flex items-end justify-between gap-3">
            <span className="pb-1 text-[14px] font-semibold text-ink-2">{t.t('cart.total')}</span>
            <Price value={quote.total} size="xl" className="g2-total" />
          </div>
          <div className="g2-calc">
            <span className="c-live" />
            <span>{busy ? t.t('cart.calculating') : t.t('cart.calcNote')}</span>
            <span className="c-mono ml-auto">{t.t('c.cart.tariff', { v: quote.rulesVersion })}</span>
          </div>
        </div>
      )}
    </div>
  )
}
