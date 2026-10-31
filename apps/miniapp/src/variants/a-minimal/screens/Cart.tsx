import { Heart, ShoppingBag, Trash2 } from 'lucide-react'
import { memo } from 'react'
import type { CartLine, QuoteLine } from '../../../shared/types'
import { useT } from '../../../shared/i18n'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { useNav } from '../../../shared/nav/context'
import { Link } from '../../../shared/nav/Link'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { prefetchProduct, useAddresses, useCartQuote, useFavoriteToggle, useRemoveFromCart } from '../../../shared/query/hooks'
import { useCart } from '../../../shared/store/cart'
import { useIsFavorite } from '../../../shared/store/favorites'
import { toast } from '../../../shared/store/toast'
import { Img } from '../../../shared/ui/Img'
import { QtyStepper } from '../../../shared/ui/QtyStepper'
import { EmptyState, ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { discountPct } from '../lib'
import { Btn, CheckMark } from '../ui/controls'
import { PageTitle } from '../ui/PageTitle'
import { Totals } from '../ui/Totals'
import '../styles/g2.css'

export default function Cart(_: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const lines = useCart((s) => s.lines)
  const setAll = useCart((s) => s.setAllSelected)
  const cq = useCartQuote()
  const addresses = useAddresses()
  const { quote } = cq

  const count = lines.reduce((n, l) => n + l.qty, 0)
  const selected = lines.filter((l) => l.selected)
  const allOn = lines.length > 0 && selected.length === lines.length
  const qLines = new Map<string, QuoteLine>((quote?.lines ?? []).map((l) => [l.key, l]))
  const noAddress = !addresses.isPending && !cq.address

  if (!lines.length) {
    return (
      <Screen>
        <div className="a2">
          <PageTitle title={t.t('cart.title')} />
          <EmptyState
            className="a2-state"
            icon={<ShoppingBag size={44} strokeWidth={1.25} aria-hidden="true" />}
            title={t.t('cart.empty')}
            text={t.t('cart.emptyHint')}
            action={
              <Btn size="md" onClick={() => nav.switchTab('catalog')}>
                {t.t('action.toCatalog')}
              </Btn>
            }
          />
        </div>
      </Screen>
    )
  }

  return (
    <Screen
      footer={
        <div className="a2-footer">
          <Btn block disabled={!selected.length} onClick={() => nav.push(paths.checkout())}>
            {selected.length ? (
              <span className="a2-ctalabel">
                <span>{t.t('action.checkout')}</span>
                {quote ? <span className="a2-ctalabel__sum">{t.money(quote.total)}</span> : null}
              </span>
            ) : (
              t.t('cart.nothingSelected')
            )}
          </Btn>
        </div>
      }
    >
      <div className="a2">
        <PageTitle title={t.t('cart.title')} subtitle={t.tp('cart.items', count)} />

        <Tap flat role="checkbox" aria-checked={allOn} className="a2-selectall" onClick={() => setAll(!allOn)}>
          <CheckMark on={allOn} />
          <span className="a2-selectall__label">{t.t('cart.selectAll')}</span>
          <span className="a2-muted">{t.t('cart.selected', { n: selected.length })}</span>
        </Tap>

        <ul className="a2-lines">
          {lines.map((l) => (
            <CartRow key={l.key} line={l} ql={qLines.get(l.key)} />
          ))}
        </ul>

        <section className="a2-sec">
          <h2 className="a2-h2">{t.t('cart.summary')}</h2>
          {!selected.length ? (
            <p className="a2-muted">{t.t('cart.nothingSelected')}</p>
          ) : noAddress ? (
            <p className="a2-muted">{t.t('a.g2.noAddrCart')}</p>
          ) : cq.isError && !quote ? (
            <ErrorState compact error={cq.error} onRetry={() => void cq.refetch()} />
          ) : (
            <>
              <Totals quote={quote} recalculating={cq.recalculating} />
              <p className="a2-calc" data-on={cq.recalculating || undefined}>
                {cq.recalculating ? t.t('cart.calculating') : t.t('cart.calcNote')}
              </p>
            </>
          )}
        </section>
      </div>
    </Screen>
  )
}

const CartRow = memo(function CartRow({ line, ql }: { line: CartLine; ql: QuoteLine | undefined }) {
  const t = useT()
  const toggle = useCart((s) => s.toggle)
  const setQty = useCart((s) => s.setQty)
  const remove = useRemoveFromCart()
  const favToggle = useFavoriteToggle()
  const fav = useIsFavorite(line.productId)
  const unavailable = ql ? !ql.available : false
  const pct = discountPct(line.unitPrice, line.oldUnitPrice)
  const to = paths.product(line.productId)
  const intent = () => prefetchProduct(line.productId)
  return (
    <li className="a2-line" data-off={!line.selected || undefined}>
      <Tap flat role="checkbox" aria-checked={line.selected} aria-label={t.l(line.title)} className="a2-line__check" onClick={() => toggle(line.key)}>
        <CheckMark on={line.selected} />
      </Tap>
      <Link to={to} onIntent={intent} className="a2-line__img">
        <Img image={line.image} alt={t.l(line.title)} sizes="88px" />
      </Link>
      <div className="a2-line__body">
        <Link to={to} onIntent={intent} className="a2-line__title">
          {t.l(line.title)}
        </Link>
        <p className="a2-line__sku">{t.l(line.selectionLabel)}</p>
        {unavailable ? <p className="a2-line__warn">{t.t('a.g2.lineUnavailable')}</p> : null}
        <p className="a2-line__price">
          <b>{t.money(ql?.lineTotal ?? line.unitPrice)}</b>
          {line.qty > 1 ? <span className="a2-muted">{t.t('a.g2.each', { price: t.money(ql?.unitPrice ?? line.unitPrice) })}</span> : null}
          {pct > 0 && line.qty === 1 ? (
            <>
              <s className="a2-muted">{t.money(line.oldUnitPrice!)}</s>
              <span className="a2-sale">−{pct}%</span>
            </>
          ) : null}
        </p>
        <div className="a2-line__actions">
          <QtyStepper
            value={line.qty}
            max={line.maxQty}
            onChange={(v) => setQty(line.key, v)}
            onLimit={() => toast({ text: t.t('cart.maxQty', { n: line.maxQty }) })}
            className="a2-qty a2-qty--sm"
            buttonClassName="a2-qty__btn"
            valueClassName="a2-qty__val"
            label={t.t('product.quantity')}
          />
          <span className="a2-line__icons">
            <Tap flat className="a2-iconbtn" data-on={fav} aria-pressed={fav} aria-label={fav ? t.t('a.g2.favRemove') : t.t('a.g2.favAdd')} onClick={() => favToggle(line.productId)}>
              <Heart size={20} strokeWidth={1.5} fill={fav ? 'currentColor' : 'none'} aria-hidden="true" />
            </Tap>
            <Tap flat className="a2-iconbtn" aria-label={t.t('action.delete')} onClick={() => remove(line.key)}>
              <Trash2 size={20} strokeWidth={1.5} aria-hidden="true" />
            </Tap>
          </span>
        </div>
      </div>
    </li>
  )
})
