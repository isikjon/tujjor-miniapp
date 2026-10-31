import { BadgePercent, Heart, ShoppingCart, Trash2 } from 'lucide-react'
import { memo, useMemo } from 'react'
import { useT } from '../../../shared/i18n'
import { useNav } from '../../../shared/nav/context'
import { Link } from '../../../shared/nav/Link'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { prefetchProduct, useCartQuote, useFavoriteToggle, useHome, useRemoveFromCart } from '../../../shared/query/hooks'
import { useCart } from '../../../shared/store/cart'
import { useIsFavorite } from '../../../shared/store/favorites'
import { toast } from '../../../shared/store/toast'
import type { CartLine } from '../../../shared/types'
import { Img } from '../../../shared/ui/Img'
import { QtyStepper } from '../../../shared/ui/QtyStepper'
import { ErrorState } from '../../../shared/ui/States'
import { Button, EmptyView, IconButton, Price, ProductCard, RailSkeleton, SectionHeader, SourceBadge } from '../ui'
import { Card, CheckBox, Totals } from '../ui/g2/parts'
import '../styles/g2.css'

export default function Cart() {
  const t = useT()
  const nav = useNav()
  const lines = useCart((s) => s.lines)
  const setAll = useCart((s) => s.setAllSelected)
  const { quote, recalculating, isError, error, refetch } = useCartQuote()
  const selected = lines.filter((l) => l.selected)
  const allOn = lines.length > 0 && selected.length === lines.length
  const units = lines.reduce((n, l) => n + l.qty, 0)
  const unavailable = useMemo(() => new Set(quote?.lines.filter((l) => !l.available).map((l) => l.key) ?? []), [quote])

  const header = (
    <div className="b-g2-top">
      <h1 className="b-g2-top__title">{t.t('cart.title')}</h1>
      {lines.length ? <span className="b-g2-top__count b-num">{t.tp('cart.items', units)}</span> : null}
    </div>
  )

  if (!lines.length) {
    return (
      <Screen header={header}>
        <EmptyView
          className="pt-10"
          icon={<ShoppingCart size={30} strokeWidth={2} />}
          title={t.t('cart.empty')}
          text={t.t('cart.emptyHint')}
          action={<Button onClick={() => nav.switchTab('catalog')}>{t.t('action.toCatalog')}</Button>}
        />
        <EmptyHits />
      </Screen>
    )
  }

  const footer = (
    <div className="b-g2-bar">
      <div className="b-g2-bar__sum">
        <span className="b-g2-bar__lbl">{selected.length ? t.tp('cart.items', quote?.itemsCount ?? selected.reduce((n, l) => n + l.qty, 0)) : t.t('cart.nothingSelected')}</span>
        <span className="b-g2-bar__total b-num" data-busy={recalculating}>
          {selected.length ? (quote ? t.money(quote.total) : '…') : '—'}
        </span>
      </div>
      <Button size="lg" className="b-g2-bar__btn" disabled={!selected.length} onClick={() => nav.push(paths.checkout())}>
        {t.t('b.toCheckout')}
      </Button>
    </div>
  )

  return (
    <Screen header={header} footer={footer}>
      <div className="b-g2-selall">
        <CheckBox on={allOn} label={t.t('cart.selectAll')} onClick={() => setAll(!allOn)} />
        <span className="b-g2-selall__text">{t.t('b.g2.selectAllN', { n: lines.length })}</span>
        <span className="b-g2-selall__meta">{t.t('b.selectedOf', { n: selected.length, total: lines.length })}</span>
      </div>

      <div className="b-g2-lines">
        {lines.map((l) => (
          <CartRow key={l.key} line={l} unavailable={unavailable.has(l.key)} />
        ))}
      </div>

      {quote && quote.savings > 0 ? (
        <div className="b-g2-savebar">
          <BadgePercent size={18} strokeWidth={2.4} aria-hidden="true" />
          <span>{t.t('b.cartSave', { amount: t.money(quote.savings) })}</span>
        </div>
      ) : null}

      {selected.length ? (
        <Card title={t.t('cart.summary')}>
          {isError && !quote ? <ErrorState compact error={error} onRetry={() => void refetch()} /> : <Totals quote={quote} recalculating={recalculating} />}
        </Card>
      ) : (
        <p className="b-g2-hint">{t.t('cart.nothingSelected')}</p>
      )}
    </Screen>
  )
}

const CartRow = memo(function CartRow({ line, unavailable }: { line: CartLine; unavailable: boolean }) {
  const t = useT()
  const toggle = useCart((s) => s.toggle)
  const setQty = useCart((s) => s.setQty)
  const remove = useRemoveFromCart()
  const fav = useIsFavorite(line.productId)
  const toggleFav = useFavoriteToggle()
  const title = t.l(line.title)
  const sku = t.l(line.selectionLabel)
  const to = paths.product(line.productId)
  return (
    <article className="b-cl" data-off={!line.selected} data-na={unavailable}>
      <CheckBox on={line.selected} label={title} className="b-cl__check" onClick={() => toggle(line.key)} />
      <Link to={to} onIntent={() => prefetchProduct(line.productId)} className="b-cl__img" aria-label={title}>
        <Img image={line.image} alt={title} sizes="88px" />
      </Link>
      <div className="b-cl__body">
        <Price price={line.unitPrice} old={line.oldUnitPrice} size="sm" />
        {line.qty > 1 ? <span className="b-cl__each b-num">{t.t('b.lineTotal', { qty: line.qty, price: t.money(line.unitPrice) })}</span> : null}
        <Link to={to} onIntent={() => prefetchProduct(line.productId)} className="b-cl__title">
          {title}
        </Link>
        <span className="b-cl__sku">
          <SourceBadge source={line.source} />
          {sku ? <span className="truncate">{sku}</span> : null}
        </span>
        {unavailable ? <span className="b-cl__warn">{t.t('b.g2.unavailableLine')}</span> : null}
        <div className="b-cl__foot">
          <QtyStepper
            value={line.qty}
            max={line.maxQty}
            onChange={(v) => setQty(line.key, v)}
            onLimit={() => toast({ text: t.t('cart.maxQty', { n: line.maxQty }) })}
            className="b-qty"
            buttonClassName="b-qty__btn"
            valueClassName="b-qty__val"
            label={t.t('product.quantity')}
          />
          <span className="flex-1" />
          <IconButton label={t.t(fav ? 'b.favRemove' : 'b.favAdd')} tone="none" haptic={false} className="b-cl__fav" data-on={fav} aria-pressed={fav} onClick={() => toggleFav(line.productId)}>
            <Heart size={19} strokeWidth={2.2} aria-hidden="true" />
          </IconButton>
          <IconButton label={t.t('action.delete')} tone="none" className="b-cl__del" onClick={() => remove(line.key)}>
            <Trash2 size={19} strokeWidth={2.2} aria-hidden="true" />
          </IconButton>
        </div>
      </div>
    </article>
  )
})

function EmptyHits() {
  const t = useT()
  const home = useHome()
  const hits = home.data?.sections.find((s) => s.kind === 'hits') ?? home.data?.sections[0]
  if (home.isError) return null
  return (
    <section className="mt-2">
      <SectionHeader title={t.t('b.emptyCartHits')} />
      {hits ? (
        <div className="b-rail">
          {hits.items.slice(0, 10).map((p) => (
            <ProductCard key={p.id} item={p} variant="rail" />
          ))}
        </div>
      ) : (
        <RailSkeleton count={3} />
      )}
    </section>
  )
}
