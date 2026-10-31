import { Star } from 'lucide-react'
import { memo, type ReactNode } from 'react'
import { useT, type Translator } from '../../../../shared/i18n'
import { Link } from '../../../../shared/nav/Link'
import { paths } from '../../../../shared/nav/routes'
import { prefetchProduct } from '../../../../shared/query/hooks'
import type { ProductOption, ProductSummary, Quote } from '../../../../shared/types'
import { Img } from '../../../../shared/ui/Img'
import { Cell } from '../Cell'
import { discountPct, fmtRating } from '../lib'

/** Compact product card for horizontal shelves (similar products). */
export const ShelfCard = memo(function ShelfCard({ p }: { p: ProductSummary }) {
  const t = useT()
  const pct = discountPct(p.price, p.oldPrice)
  return (
    <Link to={paths.product(p.id)} onIntent={() => prefetchProduct(p.id)} className="d-card d-card-shelf">
      {pct ? <span className="d-discount">−{pct}%</span> : null}
      <Img image={p.image} alt={t.l(p.title)} sizes="144px" />
      <span className="d-card-body">
        <span className="d-card-price">{t.money(p.price)}</span>
        <span className="d-card-title">{t.l(p.title)}</span>
        <span className="d-card-meta">
          <Star size={12} className="d-star" aria-hidden="true" />
          {fmtRating(p.rating)} · {t.compact(p.reviews)}
        </span>
      </span>
    </Link>
  )
})

/** Colour swatches / size chips. Sold-out values are disabled. */
export function OptionPicker({ option, value, onSelect }: { option: ProductOption; value: string | undefined; onSelect: (valueId: string) => void }) {
  const t = useT()
  const swatches = option.kind === 'color' && option.values.every((v) => v.hex)
  return (
    <div className="g2-opts" role="radiogroup" aria-label={t.l(option.name)}>
      {option.values.map((v) =>
        swatches ? (
          <button
            key={v.id}
            type="button"
            className="d-swatch tap"
            aria-pressed={value === v.id}
            aria-label={`${t.l(v.label)}${v.stock <= 0 ? ` — ${t.t('product.outOfStock')}` : ''}`}
            disabled={v.stock <= 0}
            onClick={() => onSelect(v.id)}
          >
            <span style={{ background: v.hex }} />
          </button>
        ) : (
          <button key={v.id} type="button" className="d-chip tap" aria-pressed={value === v.id} disabled={v.stock <= 0} onClick={() => onSelect(v.id)}>
            {t.l(v.label)}
            {v.priceDelta ? <small>+{t.compact(v.priceDelta)}</small> : null}
          </button>
        ),
      )}
    </div>
  )
}

function SkRow() {
  return (
    <div className="d-cell" aria-hidden="true">
      <span className="d-cell-body">
        <span className="skeleton g2-sk" style={{ width: '46%', height: 16 }} />
      </span>
      <span className="skeleton g2-sk" style={{ width: 84, height: 16 }} />
    </div>
  )
}

/** Server totals (cart + checkout show the same rows). */
export function Totals({ quote, loading, fallbackItems, t }: { quote?: Quote; loading: boolean; fallbackItems: { count: number; sum: number }; t: Translator }) {
  if (!quote) {
    if (loading)
      return (
        <>
          <SkRow />
          <SkRow />
          <SkRow />
          <SkRow />
        </>
      )
    return (
      <>
        <Cell title={t.t('cart.itemsTotal', { n: fallbackItems.count })} value={t.money(fallbackItems.sum)} valueTone="ink" />
        <Cell className="g2-total" title={t.t('cart.total')} value={t.money(fallbackItems.sum)} valueTone="ink" />
      </>
    )
  }
  return (
    <>
      <Cell title={t.t('cart.itemsTotal', { n: quote.itemsCount })} value={t.money(quote.itemsTotal + quote.savings)} valueTone="ink" />
      {quote.savings > 0 ? <Cell title={t.t('cart.savings')} value={<span className="g2-neg">−{t.money(quote.savings)}</span>} /> : null}
      {quote.promoDiscount > 0 ? <Cell title={`${t.t('cart.promo')} ${quote.promoCode ?? ''}`} value={<span className="g2-neg">−{t.money(quote.promoDiscount)}</span>} /> : null}
      <Cell title={t.t('cart.shippingChina')} value={t.money(quote.internationalShipping)} valueTone="ink" />
      <Cell title={t.t('cart.serviceFee')} value={t.money(quote.serviceFee)} valueTone="ink" />
      <Cell title={t.t('cart.localDelivery')} value={quote.localDelivery ? t.money(quote.localDelivery) : t.t('cart.free')} valueTone="ink" />
      <Cell title={t.t('cart.weight')} value={t.t('d.g2.kg', { n: String(Math.round(quote.weightKg * 10) / 10).replace('.', ',') })} />
      <Cell className="g2-total" title={t.t('cart.total')} value={t.money(quote.total)} valueTone="ink" />
    </>
  )
}

/** "+998 90 123 45 67" from "+998901234567". */
export function fmtPhone(p: string) {
  const d = p.replace(/\D/g, '').replace(/^998/, '')
  return `+998 ${[d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ')}`
}

/**
 * Sheet headers are drag handles (pointer capture), which would swallow the click of a button inside them.
 * Wrap header buttons so the press stays a normal tap.
 */
export function NoDrag({ children }: { children: ReactNode }) {
  return (
    <span className="contents" onPointerDown={(e) => e.stopPropagation()}>
      {children}
    </span>
  )
}
