import { Heart, ShoppingCart, Trash2 } from 'lucide-react'
import { memo, type CSSProperties } from 'react'
import { useT } from '../../../shared/i18n'
import { useNav } from '../../../shared/nav/context'
import { Link } from '../../../shared/nav/Link'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { prefetchProduct, useCartQuote, useFavoriteToggle, useRemoveFromCart } from '../../../shared/query/hooks'
import { useCart } from '../../../shared/store/cart'
import { useIsFavorite } from '../../../shared/store/favorites'
import { toast } from '../../../shared/store/toast'
import { useMainButton } from '../../../shared/telegram/hooks'
import type { CartLine } from '../../../shared/types'
import { Img } from '../../../shared/ui/Img'
import { QtyStepper } from '../../../shared/ui/QtyStepper'
import { Tap } from '../../../shared/ui/Tap'
import { Cell, Group } from '../ui/Cell'
import { Checkbox, EmptyView, PageTitle, Spinner } from '../ui/controls'
import { Totals } from '../ui/g2/parts'
import '../styles/g2.css'

export default function CartScreen() {
  const t = useT()
  const nav = useNav()
  const lines = useCart((s) => s.lines)
  const setAll = useCart((s) => s.setAllSelected)
  const { quote, recalculating } = useCartQuote()

  const selected = lines.filter((l) => l.selected)
  const allSelected = lines.length > 0 && selected.length === lines.length
  const units = selected.reduce((n, l) => n + l.qty, 0)
  const localSum = selected.reduce((n, l) => n + l.unitPrice * l.qty, 0)
  const total = quote?.total ?? localSum
  const unavailable = new Set(quote?.lines.filter((l) => !l.available).map((l) => l.key) ?? [])

  useMainButton(
    !lines.length
      ? null
      : selected.length
        ? { text: `${t.t('action.checkout')} · ${t.money(total)}`, onClick: () => nav.push(paths.checkout()) }
        : { text: t.t('cart.nothingSelected'), onClick: () => toast({ text: t.t('cart.nothingSelected') }), active: false },
  )

  if (!lines.length) {
    return (
      <Screen>
        <PageTitle>{t.t('cart.title')}</PageTitle>
        <EmptyView
          icon={<ShoppingCart size={44} strokeWidth={1.6} />}
          title={t.t('cart.empty')}
          text={t.t('cart.emptyHint')}
          action={
            <Tap className="d-btn" onClick={() => nav.switchTab('catalog')}>
              {t.t('action.toCatalog')}
            </Tap>
          }
        />
      </Screen>
    )
  }

  return (
    <Screen>
      <PageTitle sub={t.tp('d.cart.subtitle', lines.reduce((n, l) => n + l.qty, 0))}>{t.t('cart.title')}</PageTitle>

      <Group className="g2-first">
        <Cell
          icon={<Checkbox checked={allSelected} />}
          title={t.t('cart.selectAll')}
          value={t.t('d.cart.selectedCount', { n: selected.length, total: lines.length })}
          onClick={() => setAll(!allSelected)}
          ariaCurrent={allSelected}
          sep={53}
        />
      </Group>

      <Group>
        {lines.map((l) => (
          <CartRow key={l.key} line={l} unavailable={unavailable.has(l.key)} />
        ))}
      </Group>

      {selected.length ? (
        <Group
          header={t.t('cart.summary')}
          headerRight={
            recalculating && quote ? (
              <span className="g2-recalc">
                <Spinner size="sm" /> {t.t('d.cart.recalc')}
              </span>
            ) : null
          }
          footer={
            <>
              {quote && quote.savings > 0 ? <p className="g2-save">{t.t('d.g2.youSave', { amount: t.money(quote.savings) })}</p> : null}
              <p>{t.t('cart.calcNote')}</p>
            </>
          }
        >
          <Totals quote={quote} loading={recalculating && !quote} fallbackItems={{ count: units, sum: localSum }} t={t} />
        </Group>
      ) : (
        <Group footer={t.t('cart.nothingSelected')}>
          <Cell title={t.t('cart.total')} value={t.money(0)} />
        </Group>
      )}
    </Screen>
  )
}

const CartRow = memo(function CartRow({ line, unavailable }: { line: CartLine; unavailable: boolean }) {
  const t = useT()
  const toggle = useCart((s) => s.toggle)
  const setQty = useCart((s) => s.setQty)
  const remove = useRemoveFromCart()
  const favToggle = useFavoriteToggle()
  const fav = useIsFavorite(line.productId)
  const title = t.l(line.title)
  const sku = t.l(line.selectionLabel)
  const to = paths.product(line.productId)
  const intent = () => prefetchProduct(line.productId)
  return (
    <div className="d-block g2-line" data-off={!line.selected} style={{ '--sep': '52px' } as CSSProperties}>
      <Tap flat className="g2-line-check" onClick={() => toggle(line.key)} aria-pressed={line.selected} aria-label={title}>
        <Checkbox checked={line.selected} />
      </Tap>
      <Link to={to} onIntent={intent} className="g2-line-thumb" aria-label={title}>
        <Img image={line.image} alt={title} sizes="76px" />
      </Link>
      <div className="g2-line-body">
        <Link to={to} onIntent={intent} className="g2-line-title">
          {title}
        </Link>
        {sku ? <div className="g2-line-sku">{sku}</div> : null}
        <div className="g2-line-price">
          <b>{t.money(line.unitPrice * line.qty)}</b>
          {line.oldUnitPrice && line.oldUnitPrice > line.unitPrice ? <s>{t.money(line.oldUnitPrice * line.qty)}</s> : null}
        </div>
        {line.qty > 1 ? <div className="g2-line-sku">{t.t('d.checkout.qtyPrice', { qty: line.qty, price: t.money(line.unitPrice) })}</div> : null}
        {unavailable ? <div className="g2-line-na">{t.t('cart.unavailable')}</div> : null}
        <div className="g2-line-actions">
          <QtyStepper
            className="d-stepper"
            value={line.qty}
            max={line.maxQty}
            onChange={(v) => setQty(line.key, v)}
            onLimit={() => toast({ text: t.t('cart.maxQty', { n: line.maxQty }) })}
            label={t.t('product.quantity')}
          />
          <span className="flex-1" />
          <Tap className="g2-icon-btn" data-on={fav} haptic={false} onClick={() => favToggle(line.productId)} aria-pressed={fav} aria-label={t.t('d.cart.favorite')}>
            <Heart size={21} strokeWidth={2} fill={fav ? 'currentColor' : 'none'} />
          </Tap>
          <Tap className="g2-icon-btn" haptic={false} onClick={() => remove(line.key)} aria-label={t.t('d.cart.remove')}>
            <Trash2 size={21} strokeWidth={2} />
          </Tap>
        </div>
      </div>
    </div>
  )
})
