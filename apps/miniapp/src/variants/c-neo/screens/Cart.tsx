import { ArrowRight, ShoppingBag, Trash2 } from 'lucide-react'
import { memo } from 'react'
import type { CartLine } from '../../../shared/types'
import { formatNumber, useT } from '../../../shared/i18n'
import { Link } from '../../../shared/nav/Link'
import { Screen } from '../../../shared/nav/Screen'
import { useNav } from '../../../shared/nav/context'
import { paths } from '../../../shared/nav/routes'
import { prefetchProduct, useCartQuote, useRemoveFromCart } from '../../../shared/query/hooks'
import { useCart } from '../../../shared/store/cart'
import { toast } from '../../../shared/store/toast'
import { Img } from '../../../shared/ui/Img'
import { QtyStepper } from '../../../shared/ui/QtyStepper'
import { EmptyState, ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { glowStyle } from '../lib/util'
import { CheckBox, HeartButton, Kicker, Price, Sticker } from '../ui/bits'
import { Receipt } from '../ui/g2/Receipt'
import '../styles/g2.css'

export default function CartScreen() {
  const t = useT()
  const nav = useNav()
  const lines = useCart((s) => s.lines)
  const setAll = useCart((s) => s.setAllSelected)
  const quoteQ = useCartQuote()
  const { quote, recalculating } = quoteQ
  const selected = lines.filter((l) => l.selected)
  const allOn = lines.length > 0 && selected.length === lines.length
  const count = lines.reduce((n, l) => n + l.qty, 0)
  const unavailable = new Set((quote?.lines ?? []).filter((l) => !l.available).map((l) => l.key))

  const header = (
    <div className="c-headbg g2-cart-head">
      <div className="min-w-0">
        <Kicker>{lines.length ? t.tp('cart.items', count) : t.t('c.cart.receipt')}</Kicker>
        <h1 className="c-h1 mt-1">{t.t('cart.title')}</h1>
      </div>
    </div>
  )

  if (!lines.length) {
    return (
      <Screen header={header}>
        <EmptyState
          className="pt-14"
          icon={
            <span className="g2-empty-ico">
              <ShoppingBag size={34} strokeWidth={2} />
            </span>
          }
          title={t.t('cart.empty')}
          text={t.t('cart.emptyHint')}
          action={
            <Tap className="c-cta px-6" onClick={() => nav.switchTab('catalog')}>
              {t.t('action.toCatalog')}
              <ArrowRight size={18} strokeWidth={2.4} />
            </Tap>
          }
        />
      </Screen>
    )
  }

  const canCheckout = selected.length > 0 && unavailable.size === 0
  return (
    <Screen
      header={header}
      footer={
        <div className="c-footer">
          <Tap className="c-cta g2-cta-split" aria-disabled={!canCheckout || undefined} onClick={() => (canCheckout ? nav.push(paths.checkout()) : toast({ text: selected.length ? t.t('checkout.errorStock') : t.t('cart.nothingSelected') }))}>
            <span className="g2-cta-label">{selected.length ? t.t('action.checkout') : t.t('cart.nothingSelected')}</span>
            {selected.length && quote ? (
              <span className="c-cta-pill c-recalc" data-busy={recalculating}>
                {formatNumber(quote.total)}&nbsp;<small className="g2-pill-cur">{t.t('currency.uzs')}</small>
              </span>
            ) : null}
          </Tap>
        </div>
      }
    >
      <div className="px-4 pt-1">
        <Tap flat className="g2-selall" aria-pressed={allOn} onClick={() => setAll(!allOn)}>
          <CheckBox on={allOn} />
          <span className="flex-1 text-left text-[15px] font-semibold">{t.t('cart.selectAll')}</span>
          <span className="c-mono text-[12px] text-ink-3">{t.t('cart.selected', { n: selected.length })}</span>
        </Tap>

        <div className="mt-2 flex flex-col gap-2.5">
          {lines.map((l) => (
            <CartRow key={l.key} line={l} unavailable={unavailable.has(l.key)} />
          ))}
        </div>

        <div className="mt-5">
          {selected.length ? (
            <Receipt
              quote={quote}
              busy={recalculating}
              error={quoteQ.isError && !quote ? <ErrorState compact error={quoteQ.error} onRetry={() => void quoteQ.refetch()} /> : null}
            />
          ) : (
            <p className="g2-hint">{t.t('c.g2.selectHint')}</p>
          )}
        </div>
      </div>
    </Screen>
  )
}

const CartRow = memo(function CartRow({ line, unavailable }: { line: CartLine; unavailable: boolean }) {
  const t = useT()
  const toggle = useCart((s) => s.toggle)
  const setQty = useCart((s) => s.setQty)
  const remove = useRemoveFromCart()
  const title = t.l(line.title)
  const hasOld = line.oldUnitPrice != null && line.oldUnitPrice > line.unitPrice
  return (
    <div className="g2-line" data-off={!line.selected || undefined}>
      <Tap flat className="g2-line-check" aria-pressed={line.selected} aria-label={t.t('action.select')} onClick={() => toggle(line.key)}>
        <CheckBox on={line.selected} />
      </Tap>
      <Link to={paths.product(line.productId)} onIntent={() => prefetchProduct(line.productId)} className="g2-line-img c-glow" style={glowStyle(line.image.tint)} aria-label={title}>
        <Img image={line.image} alt={title} sizes="92px" />
      </Link>
      <div className="g2-line-body">
        <Link to={paths.product(line.productId)} className="g2-line-title c-clamp2">
          {title}
        </Link>
        {t.l(line.selectionLabel) ? <p className="g2-line-sku">{t.l(line.selectionLabel)}</p> : null}
        {unavailable ? (
          <div className="mt-1">
            <Sticker tone="sale">{t.t('cart.unavailable')}</Sticker>
          </div>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <Price value={line.unitPrice * line.qty} size="l" />
          {hasOld ? <s className="c-old">{formatNumber(line.oldUnitPrice! * line.qty)}</s> : null}
        </div>
        {line.qty > 1 ? <p className="c-mono text-[11.5px] text-ink-3">{t.t('c.g2.perUnit', { price: formatNumber(line.unitPrice), n: line.qty })}</p> : null}
        <div className="g2-line-actions">
          <QtyStepper
            className="c-qty g2-qty-s"
            value={line.qty}
            max={line.maxQty}
            onChange={(v) => setQty(line.key, v)}
            onLimit={() => toast({ text: t.t('cart.maxQty', { n: line.maxQty }) })}
            label={t.t('product.quantity')}
            iconSize={15}
          />
          <span className="flex-1" />
          <HeartButton id={line.productId} className="g2-line-heart" />
          <Tap className="g2-line-del" aria-label={t.t('action.delete')} haptic={false} onClick={() => remove(line.key)}>
            <Trash2 size={18} strokeWidth={2.1} />
          </Tap>
        </div>
      </div>
    </div>
  )
})
