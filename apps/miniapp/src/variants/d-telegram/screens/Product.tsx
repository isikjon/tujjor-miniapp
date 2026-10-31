import { BadgeCheck, Heart, Package, PackageX, ShieldCheck, ShoppingCart, Star, Store, Truck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { isApiError } from '../../../shared/demo/errors'
import { useT, type Translator } from '../../../shared/i18n'
import { cx } from '../../../shared/lib/cx'
import { useNav } from '../../../shared/nav/context'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { Screen } from '../../../shared/nav/Screen'
import { useAddToCart, useFavoriteToggle, useProduct, useProductSelection, useSimilar } from '../../../shared/query/hooks'
import { lineKey, useCart } from '../../../shared/store/cart'
import { useIsFavorite } from '../../../shared/store/favorites'
import { toast } from '../../../shared/store/toast'
import { tg } from '../../../shared/telegram/adapter'
import { useMainButton } from '../../../shared/telegram/hooks'
import type { ImageRef, Product, ProductSummary } from '../../../shared/types'
import { Img } from '../../../shared/ui/Img'
import { QtyStepper } from '../../../shared/ui/QtyStepper'
import { Sheet } from '../../../shared/ui/Sheet'
import { ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { Block, Cell, Group } from '../ui/Cell'
import { EmptyView, SheetBar, SheetClose, Squircle } from '../ui/controls'
import { NoDrag, OptionPicker, ShelfCard } from '../ui/g2/parts'
import { dateRange, discountPct, fmtRating, SOURCE_COLOR } from '../ui/lib'
import '../styles/g2.css'

type Selection = ReturnType<typeof useProductSelection>

export default function ProductScreen({ params }: ScreenProps) {
  const id = params.id
  const t = useT()
  const nav = useNav()
  const q = useProduct(id)
  const { product, summary } = q
  const sel = useProductSelection(product)
  const [qty, setQty] = useState(1)
  const [skuOpen, setSkuOpen] = useState(false)
  const [attn, setAttn] = useState(0)
  const add = useAddToCart()
  const toggleFav = useFavoriteToggle()
  const fav = useIsFavorite(id)
  const key = product && sel.complete ? lineKey(product.id, sel.selection) : null
  const inCart = useCart((s) => (key ? (s.lines.find((l) => l.key === key)?.qty ?? 0) : 0))

  const price = product ? sel.unitPrice : (summary?.price ?? 0)
  const old = product ? sel.oldPrice : (summary?.oldPrice ?? null)
  const stock = product ? sel.stock : (summary?.stock ?? 0)
  const soldOut = !!product && stock <= 0

  const doAdd = () => {
    if (!product) return
    if (sel.missing) {
      tg.haptic('warning')
      setAttn((n) => n + 1)
      setSkuOpen(true)
      return
    }
    add(product, sel.selection, qty, { silent: true })
    toast({ text: inCart ? t.t('d.g2.addMoreDone', { n: qty }) : t.t('product.addedToCart'), tone: 'success' })
    setSkuOpen(false)
    setQty(1)
  }

  useMainButton(
    !product
      ? null
      : soldOut
        ? { text: t.t('product.outOfStock'), onClick: () => tg.haptic('warning'), active: false }
        : inCart > 0 && !skuOpen
          ? { text: t.t('action.goToCart'), onClick: () => nav.switchTab('cart') }
          : { text: `${t.t('action.addToCart')} · ${t.money(price * qty)}`, onClick: doAdd },
  )

  if (!summary) {
    if (q.isError) {
      const notFound = isApiError(q.error) && q.error.code === 'not_found'
      return (
        <Screen>
          {notFound ? (
            <EmptyView
              icon={<PackageX size={44} strokeWidth={1.6} />}
              title={t.t('product.notFound')}
              action={
                <Tap className="d-btn" onClick={() => nav.switchTab('catalog')}>
                  {t.t('action.toCatalog')}
                </Tap>
              }
            />
          ) : (
            <ErrorState error={q.error} onRetry={() => void q.refetch()} />
          )}
        </Screen>
      )
    }
    return (
      <Screen>
        <ProductSkeleton />
      </Screen>
    )
  }

  const images: ImageRef[] = product?.images.length ? product.images : [summary.image]
  const pct = discountPct(price, old)
  const title = t.l(summary.title)

  return (
    <Screen>
      <Gallery images={images} title={title} index={sel.imageIndex} fav={fav} onFav={() => toggleFav(id)} t={t} />

      <Group className="g2-first">
        <Block className="d-pad">
          {summary.brand ? <div className="g2-brand">{summary.brand}</div> : null}
          <div className="g2-price-row">
            <span className="g2-price">{t.money(price)}</span>
            {old && old > price ? <span className="g2-old">{t.money(old)}</span> : null}
            {pct ? (
              <span className="d-badge" data-tone="sale">
                −{pct}%
              </span>
            ) : null}
          </div>
          <h1 className="g2-title">{title}</h1>
          <div className="g2-meta">
            <Star size={14} className="d-star" aria-hidden="true" />
            <span className="g2-ink">{fmtRating(summary.rating)}</span>
            <span>· {t.tp('product.reviewsCount', summary.reviews)}</span>
            <span>· {t.tp('product.sold', summary.sold)}</span>
          </div>
          {summary.badges.length ? (
            <div className="g2-badges">
              {summary.badges.slice(0, 3).map((b) => (
                <span key={b} className="d-badge" data-tone={b === 'sale' ? 'sale' : b === 'fast' ? 'green' : b === 'hit' ? 'orange' : undefined}>
                  {t.t(`badge.${b}`)}
                </span>
              ))}
            </div>
          ) : null}
        </Block>
      </Group>

      {product ? (
        <ProductDetails
          product={product}
          sel={sel}
          qty={qty}
          setQty={setQty}
          stock={stock}
          attn={attn}
          inCart={inCart}
          onAddMore={doAdd}
          t={t}
        />
      ) : q.isError ? (
        <div className="g2-pad-x">
          <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />
        </div>
      ) : (
        <DetailsSkeleton />
      )}

      {product ? (
        <Sheet
          open={skuOpen}
          onClose={() => setSkuOpen(false)}
          title={t.t('d.sku.title')}
          header={
            <SheetBar
              title={t.t('d.sku.title')}
              right={
                <NoDrag>
                  <SheetClose onClose={() => setSkuOpen(false)} />
                </NoDrag>
              }
            />
          }
        >
          <div className="g2-sku-head">
            <Img image={product.images[sel.imageIndex ?? 0] ?? product.image} alt={title} sizes="72px" className="g2-sku-thumb" />
            <div className="min-w-0">
              <div className="g2-price-md">{t.money(price)}</div>
              <div className="g2-hint">{stock <= 5 ? t.t('product.lowStock', { n: stock }) : t.t('d.sku.stock', { n: stock })}</div>
              {sel.label && t.l(sel.label) ? <div className="g2-hint truncate">{t.l(sel.label)}</div> : null}
            </div>
          </div>
          <Group className="g2-first">
            <Options product={product} sel={sel} attn={attn} t={t} />
          </Group>
          <Group>
            <Cell
              title={t.t('product.quantity')}
              after={
                <QtyStepper
                  className="d-stepper"
                  value={qty}
                  max={Math.max(1, stock)}
                  onChange={setQty}
                  onLimit={() => toast({ text: t.t('cart.maxQty', { n: stock }) })}
                  label={t.t('product.quantity')}
                />
              }
            />
          </Group>
        </Sheet>
      ) : null}
    </Screen>
  )
}

function Gallery({ images, title, index, fav, onFav, t }: { images: ImageRef[]; title: string; index: number | undefined; fav: boolean; onFav: () => void; t: Translator }) {
  const ref = useRef<HTMLDivElement>(null)
  const [cur, setCur] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (index == null || !el) return
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' })
  }, [index])
  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
    if (i !== cur) setCur(i)
  }
  return (
    <div className="g2-gal">
      <div ref={ref} className="d-gallery" onScroll={onScroll}>
        {images.map((im, i) => (
          <Img key={`${im.id}-${i}`} image={im} alt={`${title} — ${i + 1}`} sizes="(max-width: 480px) 100vw, 480px" priority={i === 0} className="g2-gal-img" />
        ))}
      </div>
      {images.length > 1 ? (
        <>
          <div className="d-dots" aria-hidden="true">
            {images.map((im, i) => (
              <span key={`${im.id}-${i}`} data-on={i === cur} />
            ))}
          </div>
          <span className="g2-gal-count">{t.t('d.product.ofTotal', { i: cur + 1, n: images.length })}</span>
        </>
      ) : null}
      <Tap className="d-float-btn g2-gal-fav" data-on={fav} haptic={false} onClick={onFav} aria-pressed={fav} aria-label={t.t('d.product.favorite')}>
        <Heart size={20} strokeWidth={2.2} fill={fav ? 'currentColor' : 'none'} />
      </Tap>
    </div>
  )
}

function Options({ product, sel, attn, t }: { product: Product; sel: Selection; attn: number; t: Translator }) {
  return (
    <>
      {product.options.map((o) => {
        const v = o.values.find((x) => x.id === sel.selection[o.id])
        const need = attn > 0 && sel.missing?.id === o.id
        return (
          <Block key={o.id} className="g2-opt">
            <div className={cx('g2-opt-label', need && 'd-need')}>
              <span>{t.l(o.name)}</span>
              <span className="g2-opt-value">{v ? t.l(v.label) : t.t('d.product.chooseShort')}</span>
            </div>
            <div key={need ? attn : 0} className={need ? 'd-attn' : undefined}>
              <OptionPicker option={o} value={sel.selection[o.id]} onSelect={(vid) => sel.select(o.id, vid)} />
            </div>
          </Block>
        )
      })}
    </>
  )
}

function ProductDetails({
  product,
  sel,
  qty,
  setQty,
  stock,
  attn,
  inCart,
  onAddMore,
  t,
}: {
  product: Product
  sel: Selection
  qty: number
  setQty: (n: number) => void
  stock: number
  attn: number
  inCart: number
  onAddMore: () => void
  t: Translator
}) {
  const [descOpen, setDescOpen] = useState(false)
  const similar = useSimilar(product.id)
  const range = dateRange(t, product.deliveryDays)
  const desc = t.l(product.description)
  const original = product.badges.includes('original') || product.source === 'poizon'
  const s = product.supplier

  return (
    <>
      {product.options.length || stock > 0 ? (
        <Group
          header={product.options.length ? t.t('d.product.variant') : undefined}
          footer={sel.missing ? <span className={attn > 0 ? 'd-need' : undefined}>{t.t('product.selectOption', { option: t.l(sel.missing.name).toLowerCase() })}</span> : undefined}
        >
          <Options product={product} sel={sel} attn={attn} t={t} />
          {stock > 0 ? (
            <Cell
              title={t.t('product.quantity')}
              subtitle={stock <= 5 ? t.t('product.lowStock', { n: stock }) : t.t('product.inStock', { n: stock })}
              after={
                <QtyStepper
                  className="d-stepper"
                  value={qty}
                  max={Math.max(1, stock)}
                  onChange={setQty}
                  onLimit={() => toast({ text: t.t('cart.maxQty', { n: stock }) })}
                  label={t.t('product.quantity')}
                />
              }
            />
          ) : (
            <Cell title={t.t('product.outOfStock')} tone="destructive" />
          )}
          {inCart > 0 ? (
            <Cell
              icon={
                <Squircle color="green">
                  <ShoppingCart size={17} strokeWidth={2.2} />
                </Squircle>
              }
              title={t.t('d.product.inCartQty', { n: inCart })}
              after={<span className="g2-after-link">{t.t('d.product.addMore')}</span>}
              onClick={onAddMore}
              haptic={false}
            />
          ) : null}
        </Group>
      ) : null}

      <Group
        header={t.t('product.deliveryTo')}
        footer={
          <>
            <p>{t.t('product.priceNote')}</p>
            <p>{t.t('product.priceUpdated', { time: t.ago(product.syncedAt) })}</p>
          </>
        }
      >
        <Cell
          icon={
            <Squircle color="blue">
              <Truck size={17} strokeWidth={2.2} />
            </Squircle>
          }
          title={t.t('product.deliveryDate', range)}
          subtitle={t.t('product.delivery', { from: product.deliveryDays[0], to: product.deliveryDays[1] })}
          wrap
        />
        {original ? (
          <Cell
            icon={
              <Squircle color="teal">
                <ShieldCheck size={17} strokeWidth={2.2} />
              </Squircle>
            }
            title={t.t('product.authenticity')}
            subtitle={t.t('d.product.authText')}
            wrap
          />
        ) : null}
      </Group>

      <Group header={t.t('product.supplier')}>
        <Cell
          icon={
            <Squircle color="orange">
              <Store size={17} strokeWidth={2.2} />
            </Squircle>
          }
          title={s.name}
          subtitle={`${t.l(s.city)} · ${t.tp('product.supplierYears', s.years)}`}
          value={
            <span className="g2-inline">
              <Star size={14} className="d-star" aria-hidden="true" />
              {fmtRating(s.rating)}
            </span>
          }
        />
        {s.verified ? (
          <Cell
            icon={
              <Squircle color="green">
                <BadgeCheck size={17} strokeWidth={2.2} />
              </Squircle>
            }
            title={t.t('product.verified')}
          />
        ) : null}
        <Cell
          icon={
            <Squircle color={SOURCE_COLOR[product.source]}>
              <Package size={17} strokeWidth={2.2} />
            </Squircle>
          }
          title={t.t('d.product.source', { source: t.t(`source.${product.source}`) })}
          subtitle={t.t(`source.${product.source}.desc`)}
          wrap
        />
      </Group>

      {desc ? (
        <Group header={t.t('product.description')}>
          <Block className="d-pad">
            <p className="g2-desc" data-open={descOpen || desc.length < 220}>
              {desc}
            </p>
            {desc.length >= 220 ? (
              <Tap flat className="g2-more" onClick={() => setDescOpen((v) => !v)} aria-expanded={descOpen}>
                {descOpen ? t.t('product.showLess') : t.t('product.showMore')}
              </Tap>
            ) : null}
          </Block>
        </Group>
      ) : null}

      <Group header={t.t('product.specs')}>
        {product.specs.map((sp, i) => (
          <div key={i} className="d-block g2-spec">
            <span>{t.l(sp.name)}</span>
            <span>{t.l(sp.value)}</span>
          </div>
        ))}
        {product.specs.some((sp) => t.l(sp.value) === t.t('product.china')) ? null : (
          <div className="d-block g2-spec">
            <span>{t.t('product.origin')}</span>
            <span>{t.t('product.china')}</span>
          </div>
        )}
        <div className="d-block g2-spec">
          <span>{t.t('product.weight')}</span>
          <span>{t.t('d.g2.kg', { n: String(product.weightKg).replace('.', ',') })}</span>
        </div>
      </Group>

      {product.reviewsPreview.length ? (
        <Group header={t.t('d.g2.reviewsTitle', { n: t.compact(product.reviews) })}>
          {product.reviewsPreview.map((r, i) => (
            <Block key={i} className="g2-review">
              <div className="g2-review-head">
                <span className="g2-review-author">{r.author}</span>
                <span className="g2-stars" aria-label={t.t('d.product.rating', { r: r.rating })}>
                  {[0, 1, 2, 3, 4].map((k) => (
                    <Star key={k} size={12} strokeWidth={2} fill={k < Math.round(r.rating) ? 'currentColor' : 'none'} aria-hidden="true" />
                  ))}
                </span>
                <span className="g2-review-date">{t.date(r.date)}</span>
              </div>
              <p className="g2-review-text">{t.l(r.text)}</p>
            </Block>
          ))}
        </Group>
      ) : null}

      {similar.data?.length ? (
        <section className="g2-similar">
          <div className="d-shelf-head">
            <h2 className="d-shelf-title">{t.t('product.similar')}</h2>
          </div>
          <div className="d-shelf">
            {similar.data.map((p: ProductSummary) => (
              <ShelfCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      ) : similar.isPending ? (
        <section className="g2-similar" aria-hidden="true">
          <div className="d-shelf-head">
            <span className="skeleton g2-sk" style={{ width: 160, height: 22 }} />
          </div>
          <div className="d-shelf">
            {[0, 1, 2].map((i) => (
              <span key={i} className="skeleton g2-sk" style={{ height: 232 }} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}

function DetailsSkeleton() {
  return (
    <div aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="d-group">
          <div className="d-group-header">
            <span className="skeleton g2-sk" style={{ width: 90, height: 12 }} />
          </div>
          <div className="d-section">
            <div className="skeleton g2-sk-block" style={{ height: i === 0 ? 132 : 88 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ProductSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton g2-sk-gallery" />
      <div className="d-group g2-first">
        <div className="d-section d-pad">
          <span className="skeleton g2-sk" style={{ width: '42%', height: 28 }} />
          <span className="skeleton g2-sk" style={{ width: '88%', height: 16, marginTop: 10 }} />
          <span className="skeleton g2-sk" style={{ width: '60%', height: 14, marginTop: 10 }} />
        </div>
      </div>
      <DetailsSkeleton />
    </div>
  )
}
