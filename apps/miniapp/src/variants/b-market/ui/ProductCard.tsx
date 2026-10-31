import { Check, Heart, Plus, ShoppingCart } from 'lucide-react'
import { memo, useEffect, useState } from 'react'
import { useT } from '../../../shared/i18n'
import { Link } from '../../../shared/nav/Link'
import { paths } from '../../../shared/nav/routes'
import { prefetchProduct, useAddToCart, useFavoriteToggle, useProduct, useProductSelection } from '../../../shared/query/hooks'
import { useCart } from '../../../shared/store/cart'
import { useIsFavorite } from '../../../shared/store/favorites'
import { toast } from '../../../shared/store/toast'
import type { ProductSummary } from '../../../shared/types'
import { Img } from '../../../shared/ui/Img'
import { Sheet } from '../../../shared/ui/Sheet'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { Tap } from '../../../shared/ui/Tap'
import { discountPct } from '../lib'
import { Button, DeliveryChip, DiscountBadge, Price, Rating, SourceBadge } from './kit'

export interface ProductCardProps {
  item: ProductSummary
  index?: number
  /** grid = 2-column catalog card (default); rail = 148px compact card for horizontal carousels. */
  variant?: 'grid' | 'rail'
  /** Override the Img `sizes` (defaults: grid "(max-width: 480px) 46vw, 220px", rail "148px"). */
  sizes?: string
}

/** Core marketplace card: image + −% badge + heart, price/old, 2-line title, rating, delivery chip, source badge, quick-add. */
export const ProductCard = memo(function ProductCard({ item, variant = 'grid', sizes }: ProductCardProps) {
  const t = useT()
  const fav = useIsFavorite(item.id)
  const toggleFav = useFavoriteToggle()
  const inCart = useCart((s) => s.lines.some((l) => l.productId === item.id))
  const [quick, setQuick] = useState(false)
  const pct = discountPct(item.price, item.oldPrice)
  const title = t.l(item.title)
  const rail = variant === 'rail'
  const soldOut = item.stock <= 0
  return (
    <div className="b-card" data-variant={variant}>
      <Link to={paths.product(item.id)} onIntent={() => prefetchProduct(item.id)} className="b-card__link" aria-label={title}>
        <span className="b-card__media">
          <Img image={item.image} alt={title} sizes={sizes ?? (rail ? '148px' : '(max-width: 480px) 46vw, 220px')} />
          {pct != null ? (
            <span className="b-card__tl">
              <DiscountBadge pct={pct} />
            </span>
          ) : null}
          {!rail ? (
            <span className="b-card__src">
              <SourceBadge source={item.source} />
            </span>
          ) : null}
          {soldOut ? <span className="b-card__oos">{t.t('product.outOfStock')}</span> : null}
        </span>
        <span className="b-card__body">
          <Price price={item.price} old={item.oldPrice} size="sm" />
          <span className="b-card__title">{title}</span>
          {!rail ? (
            <span className="b-card__meta">
              {item.reviews > 0 ? <Rating value={item.rating} reviews={item.reviews} /> : null}
            </span>
          ) : null}
          <span className="b-card__foot">
            <DeliveryChip days={item.deliveryDays} />
          </span>
        </span>
      </Link>
      <Tap className="b-card__fav" data-on={fav} haptic={false} aria-label={t.t(fav ? 'b.favRemove' : 'b.favAdd')} aria-pressed={fav} onClick={() => toggleFav(item.id)}>
        <span>
          <Heart size={17} strokeWidth={2.2} aria-hidden="true" />
        </span>
      </Tap>
      <Tap
        className="b-card__add"
        data-in={inCart}
        disabled={soldOut}
        aria-label={t.t('b.quickAdd')}
        onPointerDown={() => prefetchProduct(item.id)}
        onClick={() => setQuick(true)}
      >
        {inCart ? <Check size={18} strokeWidth={2.8} aria-hidden="true" /> : <ShoppingCart size={17} strokeWidth={2.4} aria-hidden="true" />}
      </Tap>
      {quick ? <QuickAddSheet productId={item.id} onDone={() => setQuick(false)} /> : null}
    </div>
  )
})

/** VirtualGrid-ready item ({ item, index }) — pass as `Item={ProductGridItem}`. */
export const ProductGridItem = memo(function ProductGridItem({ item }: { item: ProductSummary; index: number }) {
  return <ProductCard item={item} />
})

/**
 * Quick add: loads the product (usually prefetched on pointerdown). No options → adds immediately
 * (toast with "В корзину"); with options → bottom sheet with SKU chips. `onDone` fires after it closes.
 */
export function QuickAddSheet({ productId, onDone }: { productId: string; onDone: () => void }) {
  const t = useT()
  const { product, summary, isError } = useProduct(productId)
  const sel = useProductSelection(product)
  const add = useAddToCart()
  const [open, setOpen] = useState(false)
  const [handled, setHandled] = useState(false)

  useEffect(() => {
    if (handled) return
    if (isError) {
      setHandled(true)
      toast({ text: t.t('state.errorTitle'), tone: 'error' })
      onDone()
      return
    }
    if (!product) return
    setHandled(true)
    if (product.options.length === 0) {
      add(product, {}, 1)
      onDone()
    } else setOpen(true)
  }, [product, isError, handled, add, onDone, t])

  if (!product) return null
  const image = product.images[sel.imageIndex ?? 0] ?? product.image
  const missingName = sel.missing ? t.l(sel.missing.name) : ''
  return (
    <Sheet
      open={open}
      onClose={() => setOpen(false)}
      onClosed={onDone}
      title={t.t('b.pickOptions')}
      footer={
        <Button
          block
          size="lg"
          disabled={sel.stock <= 0}
          icon={<Plus size={18} strokeWidth={2.6} aria-hidden="true" />}
          onClick={() => {
            if (sel.missing) {
              toast({ text: t.t('product.selectOption', { option: missingName }) })
              return
            }
            add(product, sel.selection, 1)
            setOpen(false)
          }}
        >
          {sel.stock <= 0 ? t.t('product.outOfStock') : t.t('action.addToCart')}
        </Button>
      }
    >
      <div className="b-qa__head">
        <span className="b-qa__img">
          <Img image={image} alt={t.l(product.title)} sizes="76px" />
        </span>
        <div className="min-w-0">
          <Price price={sel.unitPrice || (summary?.price ?? 0)} old={sel.oldPrice} size="md" showDiscount />
          <p className="b-qa__title">{t.l(product.title)}</p>
          {sel.label ? <p className="mt-1 text-[12.5px] font-semibold text-ink-2">{t.l(sel.label)}</p> : null}
        </div>
      </div>
      {product.options.map((o) => (
        <div key={o.id} className="b-opt">
          <p className="b-opt__name">
            {t.l(o.name)}
            {sel.selection[o.id] ? <span> · {t.l(o.values.find((v) => v.id === sel.selection[o.id])!.label)}</span> : null}
          </p>
          <div className="b-opt__vals">
            {o.values.map((v) => (
              <Tap key={v.id} className="b-optchip" data-on={sel.selection[o.id] === v.id} disabled={v.stock <= 0} onClick={() => sel.select(o.id, v.id)}>
                {o.kind === 'color' && v.hex ? <span className="b-optchip__sw" style={{ background: v.hex }} /> : null}
                {t.l(v.label)}
                {v.priceDelta ? <span className="b-opt__delta">+{t.compact(v.priceDelta)}</span> : null}
              </Tap>
            ))}
          </div>
        </div>
      ))}
      {sel.missing ? <p className="b-missing">{t.t('product.selectOption', { option: missingName })}</p> : null}
    </Sheet>
  )
}

/** Inline skeleton for the quick-add header (exported for screens that reuse the layout). */
export function QuickAddSkeleton() {
  return (
    <div className="b-qa__head">
      <Skeleton style={{ width: 76, height: 76, borderRadius: 12 }} />
      <div className="flex-1">
        <Skeleton style={{ height: 22, width: '50%' }} />
        <Skeleton style={{ height: 14, width: '90%', marginTop: 8 }} />
      </div>
    </div>
  )
}
