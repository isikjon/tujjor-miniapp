import { BadgeCheck, ChevronDown, Heart, ShieldCheck, Star, Truck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Product as ProductT, ProductSummary } from '../../../shared/types'
import { isApiError } from '../../../shared/demo/errors'
import { useT } from '../../../shared/i18n'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { useNav } from '../../../shared/nav/context'
import { Screen } from '../../../shared/nav/Screen'
import { useAddToCart, useFavoriteToggle, useProduct, useProductSelection, useSimilar } from '../../../shared/query/hooks'
import { useIsFavorite } from '../../../shared/store/favorites'
import { toast } from '../../../shared/store/toast'
import { tg } from '../../../shared/telegram/adapter'
import { Img } from '../../../shared/ui/Img'
import { QtyStepper } from '../../../shared/ui/QtyStepper'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { EmptyState, ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { discountPct, inDays } from '../lib'
import { useSnapDots } from '../ui/carousel'
import { Btn, Stars } from '../ui/controls'
import { ShelfCard } from '../ui/ProductCard'
import '../styles/g2.css'

export default function Product({ params }: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const { product, summary, error, refetch, isPending } = useProduct(params.id)
  const sel = useProductSelection(product)
  const add = useAddToCart()
  const [qty, setQty] = useState(1)
  const [attention, setAttention] = useState(false)

  if (!summary) {
    if (error) {
      const notFound = isApiError(error) && error.code === 'not_found'
      return (
        <Screen>
          <div className="a2">
            {notFound ? (
              <EmptyState
                className="a2-state"
                title={t.t('product.notFound')}
                text={t.t('a.g2.notFoundHint')}
                action={
                  <Btn size="md" onClick={() => nav.switchTab('catalog')}>
                    {t.t('action.toCatalog')}
                  </Btn>
                }
              />
            ) : (
              <ErrorState className="a2-state" error={error} onRetry={() => void refetch()} />
            )}
          </div>
        </Screen>
      )
    }
    return (
      <Screen>
        <ProductSkeleton />
      </Screen>
    )
  }

  const maxQty = Math.max(1, Math.min(product ? sel.stock : summary.stock, 99))
  const q = Math.min(qty, maxQty)
  const unit = product ? sel.unitPrice : summary.price
  const old = product ? sel.oldPrice : summary.oldPrice
  const soldOut = !!product && sel.complete && sel.stock <= 0

  const onAdd = () => {
    if (!product) return
    if (!sel.complete) {
      setAttention(true)
      tg.haptic('warning')
      document.getElementById(`a2-opt-${sel.missing!.id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    if (soldOut) return
    add(product, sel.selection, q)
  }

  const label = !product
    ? t.t('a.g2.addToCart')
    : soldOut
      ? t.t('product.outOfStock')
      : sel.complete
        ? t.t('a.g2.addToCart')
        : t.t('product.selectOption', { option: t.l(sel.missing!.name).toLowerCase() })

  return (
    <Screen
      footer={
        <div className="a2-buybar">
          <div className="a2-buybar__price">
            <span className="a2-buybar__now">{t.money(unit * q)}</span>
            {q > 1 ? <span className="a2-buybar__sub">{t.t('a.g2.each', { price: t.money(unit) })}</span> : old && old > unit ? <s className="a2-buybar__sub">{t.money(old)}</s> : null}
          </div>
          <Btn className="a2-buybar__btn" disabled={!product || soldOut} loading={!product && isPending} onClick={onAdd}>
            {label}
          </Btn>
        </div>
      }
    >
      <div className="a2 a2-pd">
        <Gallery product={product} summary={summary} imageIndex={sel.imageIndex} />

        <section className="a2-pd__head">
          <p className="a2-eyebrow">{summary.brand ?? t.t(`source.${summary.source}`)}</p>
          <h1 className="a2-pd__title">{t.l(summary.title)}</h1>
          {t.l(summary.subtitle) ? <p className="a2-pd__subtitle">{t.l(summary.subtitle)}</p> : null}
          <div className="a2-pd__price">
            <span className="a2-pd__now">{t.money(unit)}</span>
            {old && old > unit ? (
              <>
                <s className="a2-pd__was">{t.money(old)}</s>
                <span className="a2-sale">−{discountPct(unit, old)}%</span>
              </>
            ) : null}
          </div>
          <p className="a2-pd__meta">
            <span className="a2-pd__rating">
              <Star size={13} strokeWidth={0} fill="currentColor" aria-hidden="true" />
              {summary.rating.toFixed(1).replace('.', ',')}
            </span>
            <span>{t.tp('product.reviewsCount', summary.reviews)}</span>
            <span>{t.tp('product.sold', summary.sold)}</span>
          </p>
          <p className="a2-pd__fresh">{t.t('product.priceUpdated', { time: t.ago(summary.syncedAt) })}</p>
        </section>

        {product ? (
          <Options product={product} sel={sel} attention={attention} />
        ) : (
          <div className="a2-pd__optskel" aria-hidden="true">
            <Skeleton style={{ width: 90, height: 14 }} />
            <Skeleton style={{ width: '70%', height: 44, borderRadius: 22 }} />
          </div>
        )}

        <section className="a2-pd__qty">
          <div>
            <p className="a2-label">{t.t('product.quantity')}</p>
            {product && sel.complete ? (
              <p className="a2-muted">{sel.stock <= 0 ? t.t('product.outOfStock') : sel.stock <= 10 ? t.t('product.lowStock', { n: sel.stock }) : t.t('product.inStock', { n: sel.stock })}</p>
            ) : null}
          </div>
          <QtyStepper
            value={q}
            max={maxQty}
            onChange={setQty}
            onLimit={() => toast({ text: t.t('cart.maxQty', { n: maxQty }) })}
            className="a2-qty"
            buttonClassName="a2-qty__btn"
            valueClassName="a2-qty__val"
            label={t.t('product.quantity')}
          />
        </section>

        <section className="a2-card a2-pd__delivery">
          <Truck size={20} strokeWidth={1.5} className="a2-card__icon" aria-hidden="true" />
          <div>
            <p className="a2-card__title">{t.t('product.deliveryTo')}</p>
            <p className="a2-card__text">
              {t.t('product.deliveryDate', { from: t.date(inDays(summary.deliveryDays[0])), to: t.date(inDays(summary.deliveryDays[1])) })}
              {' · '}
              {t.t('product.delivery', { from: summary.deliveryDays[0], to: summary.deliveryDays[1] })}
            </p>
            <p className="a2-card__note">{t.t('product.priceNote')}</p>
          </div>
        </section>

        {summary.badges.includes('original') || summary.source === 'poizon' ? (
          <section className="a2-card">
            <ShieldCheck size={20} strokeWidth={1.5} className="a2-card__icon" aria-hidden="true" />
            <div>
              <p className="a2-card__title">{t.t('product.authenticity')}</p>
              <p className="a2-card__text">{t.t('a.g2.authText')}</p>
            </div>
          </section>
        ) : null}

        {product ? <Details product={product} /> : <DetailsSkeleton />}

        <Similar id={summary.id} enabled={!!product} />
      </div>
    </Screen>
  )
}

// ── gallery ─────────────────────────────────────────────────────────────────

function Gallery({ product, summary, imageIndex }: { product: ProductT | undefined; summary: ProductSummary; imageIndex: number | undefined }) {
  const t = useT()
  const images = product?.images.length ? product.images : [summary.image]
  const track = useRef<HTMLDivElement>(null)
  const dots = useRef<HTMLDivElement>(null)
  useSnapDots(track, dots, images.length)

  useEffect(() => {
    const el = track.current
    if (!el || imageIndex == null) return
    el.scrollTo({ left: imageIndex * el.clientWidth, behavior: 'smooth' })
  }, [imageIndex])

  return (
    <div className="a2-gallery">
      <div ref={track} className="a2-gallery__track">
        {images.map((img, i) => (
          <div key={`${img.id}-${i}`} className="a2-gallery__slide">
            <Img image={img} alt={t.l(summary.title)} sizes="(max-width: 500px) 100vw, 480px" priority={i === 0} className="a2-gallery__img" />
          </div>
        ))}
      </div>
      {images.length > 1 ? (
        <div ref={dots} className="a2-dots" aria-hidden="true">
          {images.map((img, i) => (
            <span key={`${img.id}-${i}`} data-active={i === 0} />
          ))}
        </div>
      ) : null}
      <FavButton id={summary.id} />
    </div>
  )
}

function FavButton({ id }: { id: string }) {
  const t = useT()
  const on = useIsFavorite(id)
  const toggle = useFavoriteToggle()
  return (
    <Tap
      flat
      className="a2-fav"
      data-on={on}
      aria-pressed={on}
      aria-label={on ? t.t('a.g2.favRemove') : t.t('a.g2.favAdd')}
      onClick={() => {
        toggle(id)
        toast({ text: on ? t.t('product.favoriteRemoved') : t.t('product.favoriteAdded') })
      }}
    >
      <Heart size={22} strokeWidth={1.5} fill={on ? 'currentColor' : 'none'} aria-hidden="true" />
    </Tap>
  )
}

// ── SKU selectors ───────────────────────────────────────────────────────────

type Selection = ReturnType<typeof useProductSelection>

function Options({ product, sel, attention }: { product: ProductT; sel: Selection; attention: boolean }) {
  const t = useT()
  if (!product.options.length) return null
  return (
    <div className="a2-pd__opts">
      {product.options.map((o) => {
        const chosen = o.values.find((v) => sel.selection[o.id] === v.id)
        const guide = attention && sel.missing?.id === o.id
        const swatch = o.kind === 'color' && o.values.every((v) => v.hex)
        return (
          <section key={o.id} id={`a2-opt-${o.id}`} className="a2-opt" data-attn={guide || undefined}>
            <p className="a2-opt__head">
              <span className="a2-label">{t.l(o.name)}</span>
              {chosen ? <span className="a2-opt__val">{t.l(chosen.label)}</span> : null}
            </p>
            <div className={swatch ? 'a2-swatches' : 'a2-pills'} role="radiogroup" aria-label={t.l(o.name)}>
              {o.values.map((v) => {
                const on = sel.selection[o.id] === v.id
                const out = v.stock <= 0
                return swatch ? (
                  <Tap key={v.id} flat role="radio" aria-checked={on} aria-label={t.l(v.label)} disabled={out} data-on={on} data-out={out || undefined} className="a2-swatch" onClick={() => sel.select(o.id, v.id)}>
                    <span style={{ background: v.hex }} />
                  </Tap>
                ) : (
                  <Tap key={v.id} flat role="radio" aria-checked={on} disabled={out} data-on={on} data-out={out || undefined} className="a2-pill" onClick={() => sel.select(o.id, v.id)}>
                    {t.l(v.label)}
                    {v.priceDelta ? <small>+{t.compact(v.priceDelta)}</small> : null}
                  </Tap>
                )
              })}
            </div>
            {guide ? <p className="a2-opt__hint">{t.t('a.g2.pickHint', { option: t.l(o.name).toLowerCase() })}</p> : null}
          </section>
        )
      })}
    </div>
  )
}

// ── details ─────────────────────────────────────────────────────────────────

function Details({ product }: { product: ProductT }) {
  const t = useT()
  const [more, setMore] = useState(false)
  const desc = t.l(product.description)
  const long = desc.length > 180
  const s = product.supplier
  return (
    <>
      <section className="a2-sec">
        <h2 className="a2-h2">{t.t('product.description')}</h2>
        <p className="a2-desc" data-clamp={long && !more ? true : undefined}>
          {desc}
        </p>
        {long ? (
          <Tap flat className="a2-more" aria-expanded={more} onClick={() => setMore((v) => !v)}>
            {more ? t.t('product.showLess') : t.t('product.showMore')}
            <ChevronDown size={16} strokeWidth={1.75} data-up={more || undefined} aria-hidden="true" />
          </Tap>
        ) : null}
      </section>

      <section className="a2-sec">
        <h2 className="a2-h2">{t.t('product.specs')}</h2>
        <dl className="a2-specs">
          {product.specs.map((sp, i) => (
            <div key={i}>
              <dt>{t.l(sp.name)}</dt>
              <dd>{t.l(sp.value)}</dd>
            </div>
          ))}
          <div>
            <dt>{t.t('product.origin')}</dt>
            <dd>{t.t('product.china')}</dd>
          </div>
          <div>
            <dt>{t.t('product.weight')}</dt>
            <dd>{t.t('a.g2.kg', { n: String(product.weightKg).replace('.', ',') })}</dd>
          </div>
        </dl>
      </section>

      <section className="a2-sec">
        <h2 className="a2-h2">{t.t('product.supplier')}</h2>
        <div className="a2-supplier">
          <span className="a2-supplier__mono" aria-hidden="true">
            {s.name.trim()[0] ?? '·'}
          </span>
          <div className="a2-supplier__body">
            <p className="a2-supplier__name">
              {s.name}
              {s.verified ? <BadgeCheck size={16} strokeWidth={1.75} aria-label={t.t('product.verified')} /> : null}
            </p>
            <p className="a2-muted">
              {t.l(s.city)} · {t.tp('product.supplierYears', s.years)} · {t.t('a.g2.supplierRating', { n: s.rating.toFixed(1).replace('.', ',') })}
            </p>
            {s.verified ? <p className="a2-muted">{t.t('product.verified')}</p> : null}
          </div>
        </div>
      </section>

      <section className="a2-sec">
        <div className="a2-sec__row">
          <h2 className="a2-h2">{t.t('product.reviews')}</h2>
          <span className="a2-reviews__score">
            <b>{product.rating.toFixed(1).replace('.', ',')}</b>
            <span className="a2-muted">{t.tp('product.reviewsCount', product.reviews)}</span>
          </span>
        </div>
        {product.reviewsPreview.length ? (
          <ul className="a2-reviews">
            {product.reviewsPreview.map((r, i) => (
              <li key={i} className="a2-review">
                <div className="a2-review__head">
                  <b>{r.author}</b>
                  <span className="a2-muted">{t.date(r.date)}</span>
                </div>
                <Stars value={r.rating} />
                <p className="a2-review__text">{t.l(r.text)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="a2-muted">{t.t('a.g2.reviewsEmpty')}</p>
        )}
      </section>
    </>
  )
}

function DetailsSkeleton() {
  return (
    <section className="a2-sec" aria-hidden="true">
      <Skeleton style={{ width: 140, height: 22, marginBottom: 14 }} />
      <Skeleton style={{ width: '100%', height: 14, marginBottom: 8 }} />
      <Skeleton style={{ width: '92%', height: 14, marginBottom: 8 }} />
      <Skeleton style={{ width: '60%', height: 14 }} />
    </section>
  )
}

function Similar({ id, enabled }: { id: string; enabled: boolean }) {
  const t = useT()
  const q = useSimilar(id, enabled)
  if (q.isError || (q.data && !q.data.length)) return null
  return (
    <section className="a2-sec a2-sec--bleed">
      <h2 className="a2-h2 a2-pad">{t.t('product.similar')}</h2>
      <div className="a2-shelf">
        {q.data
          ? q.data.map((p) => <ShelfCard key={p.id} item={p} size="sm" />)
          : [0, 1, 2].map((i) => <Skeleton key={i} className="a2-shelf__skel" />)}
      </div>
    </section>
  )
}

function ProductSkeleton() {
  return (
    <div className="a2 a2-pd" aria-hidden="true">
      <Skeleton className="a2-gallery__skel" />
      <section className="a2-pd__head">
        <Skeleton style={{ width: 80, height: 11, marginBottom: 12 }} />
        <Skeleton style={{ width: '90%', height: 24, marginBottom: 8 }} />
        <Skeleton style={{ width: '60%', height: 24, marginBottom: 18 }} />
        <Skeleton style={{ width: 150, height: 28 }} />
      </section>
    </div>
  )
}
