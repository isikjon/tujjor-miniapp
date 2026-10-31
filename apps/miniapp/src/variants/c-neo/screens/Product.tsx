import { BadgeCheck, Check, PackageX, Plane, ShieldCheck, Star, Store } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import type { ImageRef, Product, ProductSummary } from '../../../shared/types'
import { formatNumber, useT } from '../../../shared/i18n'
import { isApiError } from '../../../shared/demo/errors'
import { cx } from '../../../shared/lib/cx'
import { Screen } from '../../../shared/nav/Screen'
import { useNav } from '../../../shared/nav/context'
import { useAddToCart, useProduct, useProductSelection, useSimilar } from '../../../shared/query/hooks'
import { lineKey, useCart } from '../../../shared/store/cart'
import { toast } from '../../../shared/store/toast'
import { Img } from '../../../shared/ui/Img'
import { QtyStepper } from '../../../shared/ui/QtyStepper'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { EmptyState, ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { daysFromNow, discountPct, glowStyle } from '../lib/util'
import { BadgeSticker, HeartButton, Kicker, Price, SectionHead, SOURCE_NAME, Sticker, TopBar } from '../ui/bits'
import { ProductCard, ProductCardSkeleton } from '../ui/ProductCard'
import { Accordion } from '../ui/g2/Accordion'
import '../styles/g2.css'

const pad2 = (n: number) => String(n).padStart(2, '0')

export default function ProductScreen({ params }: ScreenProps) {
  const id = params.id
  const t = useT()
  const nav = useNav()
  const q = useProduct(id)
  const { product, summary } = q

  if (!summary) {
    if (q.isError) {
      const notFound = isApiError(q.error) && q.error.code === 'not_found'
      return (
        <Screen header={<TopBar title="" />}>
          {notFound ? (
            <EmptyState
              className="pt-20"
              icon={
                <span className="g2-empty-ico">
                  <PackageX size={34} strokeWidth={2} />
                </span>
              }
              title={t.t('product.notFound')}
              text={t.t('c.g2.notFoundHint')}
              action={
                <Tap className="c-cta px-6" onClick={() => nav.switchTab('catalog')}>
                  {t.t('action.toCatalog')}
                </Tap>
              }
            />
          ) : (
            <ErrorState className="pt-20" error={q.error} onRetry={() => void q.refetch()} />
          )}
        </Screen>
      )
    }
    return (
      <Screen header={<TopBar title="" />}>
        <div className="c-stage" aria-hidden="true" />
        <div className="flex flex-col gap-3 px-4 pt-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-[85%]" />
          <Skeleton className="h-7 w-[60%]" />
          <Skeleton className="mt-2 h-11 w-[55%]" />
          <Skeleton className="mt-4 h-28 w-full" style={{ borderRadius: 24 }} />
        </div>
      </Screen>
    )
  }

  return <ProductView key={id} summary={summary} product={product} q={q} />
}

function ProductView({ summary, product, q }: { summary: ProductSummary; product: Product | undefined; q: ReturnType<typeof useProduct> }) {
  const t = useT()
  const nav = useNav()
  const sel = useProductSelection(product)
  const addToCart = useAddToCart()
  const [qty, setQty] = useState(1)
  const [attention, setAttention] = useState<{ id: string; n: number } | null>(null)
  const optRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const title = t.l(summary.title)
  const unit = product ? sel.unitPrice : summary.price
  const old = product ? sel.oldPrice : summary.oldPrice
  const pct = discountPct({ price: unit, oldPrice: old })
  const stock = product ? sel.stock : summary.stock
  const soldOut = !!product && (product.stock <= 0 || (sel.complete && stock <= 0))
  const maxQty = Math.max(1, stock)
  const q2 = Math.min(qty, maxQty)
  const key = product ? lineKey(product.id, sel.selection) : ''
  const inCart = useCart((s) => !!key && s.lines.some((l) => l.key === key))
  const images: ImageRef[] = product?.images.length ? product.images : [summary.image]
  const stickers = summary.badges.filter((b) => b === 'original' || b === 'hit' || b === 'new' || b === 'choice').slice(0, 2)
  const [d0, d1] = summary.deliveryDays

  const pickValue = (optionId: string, valueId: string) => {
    sel.select(optionId, valueId)
    if (attention?.id === optionId) setAttention(null)
  }

  const onCta = () => {
    if (!product) return
    if (inCart) {
      nav.switchTab('cart')
      return
    }
    if (sel.missing) {
      const m = sel.missing
      setAttention((a) => ({ id: m.id, n: (a?.n ?? 0) + 1 }))
      optRefs.current[m.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      toast({ text: t.t('product.selectOption', { option: t.l(m.name).toLowerCase() }), tone: 'error' })
      return
    }
    if (soldOut) return
    addToCart(product, sel.selection, q2)
  }

  const ctaLabel = soldOut ? t.t('product.outOfStock') : sel.missing && product ? t.t('c.product.chooseFirst', { option: t.l(sel.missing.name).toLowerCase() }) : t.t('action.addToCart')

  return (
    <Screen
      className="g2-product"
      header={<TopBar title={title} right={<HeartButton id={summary.id} size="l" className="g2-topheart" />} />}
      footer={
        <div className="c-footer">
          <Tap
            haptic={inCart ? 'light' : false}
            className="c-cta g2-pcta"
            data-state={inCart ? 'added' : 'idle'}
            aria-disabled={!product || (soldOut && !inCart) || undefined}
            onClick={onCta}
          >
            <span className="c-cta-layer c-cta-a" aria-hidden={inCart}>
              <span className="g2-cta-label">{ctaLabel}</span>
              {soldOut ? null : (
                <span className="c-cta-pill">
                  {formatNumber(unit * q2)}&nbsp;<small className="g2-pill-cur">{t.t('currency.uzs')}</small>
                </span>
              )}
            </span>
            <span className="c-cta-layer c-cta-b" aria-hidden={!inCart}>
              <Check size={20} strokeWidth={3} />
              {t.t('c.product.goToCart')}
            </span>
          </Tap>
        </div>
      }
    >
      <Gallery images={images} title={title} jumpTo={sel.imageIndex} tint={summary.image.tint}>
        <div className="g2-stickers">
          {pct >= 5 ? (
            <Sticker tone="sale" tilt={-6} big>
              −{pct}%
            </Sticker>
          ) : null}
          {stickers.map((b, i) => (
            <BadgeSticker key={b} badge={b} big tilt={i % 2 ? -4 : 5} />
          ))}
        </div>
      </Gallery>

      <section className="px-4 pt-5">
        <div className="flex items-center gap-2">
          <Kicker>{summary.brand ?? SOURCE_NAME[summary.source]}</Kicker>
          <span className="c-src">{SOURCE_NAME[summary.source]}</span>
        </div>
        <h1 className="g2-title mt-2">{title}</h1>
        {t.l(summary.subtitle) ? <p className="g2-sub mt-1.5">{t.l(summary.subtitle)}</p> : null}
        <div className="g2-stats mt-3">
          <span className="g2-rate">
            <Star size={14} strokeWidth={0} fill="currentColor" />
            {summary.rating.toFixed(1).replace('.', ',')}
          </span>
          <a
            href="#reviews"
            className="tap underline-offset-2"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            {t.tp('product.reviewsCount', summary.reviews)}
          </a>
          <span aria-hidden="true">·</span>
          <span>{t.tp('product.sold', summary.sold)}</span>
        </div>

        <div className="g2-pricebox mt-4">
          <Price value={unit} size="xl" className="g2-bigprice" />
          {old && old > unit ? (
            <div className="flex items-center gap-2">
              <s className="c-old g2-old">{formatNumber(old)}</s>
              <Sticker tone="sale" tilt={-4}>
                −{pct}%
              </Sticker>
            </div>
          ) : null}
        </div>
        <p className="g2-fresh mt-2">
          <span className="c-live" />
          {t.t('product.priceUpdated', { time: t.ago(summary.syncedAt) })}
        </p>
      </section>

      {!product ? (
        q.isError ? (
          <div className="px-4 pt-6">
            <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-4 pt-6" aria-busy="true">
            <Skeleton className="h-4 w-28" />
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-14" style={{ borderRadius: 16 }} />
              ))}
            </div>
            <Skeleton className="mt-3 h-36 w-full" style={{ borderRadius: 24 }} />
          </div>
        )
      ) : (
        <>
          {product.options.length ? (
            <section className="g2-opts-wrap mt-6 px-4">
              {product.options.map((o) => {
                const cur = o.values.find((v) => v.id === sel.selection[o.id])
                const shake = attention?.id === o.id
                return (
                  <div
                    key={o.id + (shake ? attention!.n : '')}
                    ref={(el) => {
                      optRefs.current[o.id] = el
                    }}
                    className="c-optblock"
                    data-attention={shake || undefined}
                  >
                    <div className="c-optname g2-optname">
                      <span>{t.l(o.name)}</span>
                      {cur ? <b>{t.l(cur.label)}</b> : <i>{t.t('c.product.chooseFirst', { option: t.l(o.name).toLowerCase() })}</i>}
                    </div>
                    <div className="g2-optvals">
                      {o.values.map((v) =>
                        o.kind === 'color' ? (
                          <Tap
                            key={v.id}
                            className="c-swatch"
                            data-on={sel.selection[o.id] === v.id}
                            disabled={v.stock <= 0}
                            aria-label={t.l(v.label)}
                            aria-pressed={sel.selection[o.id] === v.id}
                            onClick={() => pickValue(o.id, v.id)}
                          >
                            <span className="c-swatch-dot" style={{ background: v.hex ?? 'var(--color-surface-2)' }} />
                          </Tap>
                        ) : (
                          <Tap
                            key={v.id}
                            className="c-opt"
                            data-kind={o.kind}
                            data-on={sel.selection[o.id] === v.id}
                            disabled={v.stock <= 0}
                            aria-pressed={sel.selection[o.id] === v.id}
                            onClick={() => pickValue(o.id, v.id)}
                          >
                            {t.l(v.label)}
                            {v.priceDelta ? <small>+{formatNumber(v.priceDelta)}</small> : null}
                          </Tap>
                        ),
                      )}
                    </div>
                  </div>
                )
              })}
            </section>
          ) : null}

          <section className="g2-qtyrow mx-4 mt-5">
            <div className="min-w-0">
              <div className="text-[15px] font-semibold">{t.t('product.quantity')}</div>
              <div className={cx('g2-stock', stock > 0 && stock <= 10 && 'g2-low')}>
                {soldOut ? t.t('product.outOfStock') : stock <= 10 ? t.t('product.lowStock', { n: stock }) : t.t('product.inStock', { n: formatNumber(stock) })}
              </div>
            </div>
            <QtyStepper
              className="c-qty"
              value={q2}
              max={maxQty}
              onChange={setQty}
              onLimit={() => toast({ text: t.t('cart.maxQty', { n: maxQty }) })}
              label={t.t('product.quantity')}
            />
          </section>

          <section className="g2-card mx-4 mt-4">
            <div className="flex items-center justify-between gap-2">
              <Kicker>{t.t('c.product.route')}</Kicker>
              <span className="g2-days">{t.t('c.product.days', { from: d0, to: d1 })}</span>
            </div>
            <div className="c-route mt-4">
              <div className="c-route-end">
                <span className="c-route-code">CAN</span>
                <span className="g2-muted">{t.t('c.g2.cnCity')}</span>
              </div>
              <div className="c-route-line">
                <span className="c-route-plane">
                  <Plane size={16} strokeWidth={2.4} />
                </span>
              </div>
              <div className="c-route-end items-end text-right">
                <span className="c-route-code">TAS</span>
                <span className="g2-muted">{t.t('c.product.to')}</span>
              </div>
            </div>
            <p className="g2-route-date mt-4">{t.t('product.deliveryDate', { from: t.date(daysFromNow(d0)), to: t.date(daysFromNow(d1)) })}</p>
            <p className="g2-note mt-1">{t.t('product.priceNote')}</p>
          </section>

          {product.badges.includes('original') ? (
            <section className="g2-auth mx-4 mt-3">
              <span className="g2-auth-ico">
                <ShieldCheck size={22} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <p className="g2-auth-title">{t.t('product.authenticity')}</p>
                <p className="g2-auth-text">{t.t('c.product.authText')}</p>
              </div>
            </section>
          ) : null}

          <SupplierCard product={product} />

          <section className="mt-6 px-4">
            <Accordion title={t.t('product.description')} defaultOpen>
              <Description text={t.l(product.description)} />
            </Accordion>
            <Accordion title={t.t('product.specs')} meta={<span className="c-mono">{product.specs.length + 2}</span>}>
              <dl className="g2-specs">
                {product.specs.map((s, i) => (
                  <div key={i}>
                    <dt>{t.l(s.name)}</dt>
                    <dd>{t.l(s.value)}</dd>
                  </div>
                ))}
                <div>
                  <dt>{t.t('product.origin')}</dt>
                  <dd>{t.t('product.china')}</dd>
                </div>
                <div>
                  <dt>{t.t('product.weight')}</dt>
                  <dd>
                    {String(product.weightKg).replace('.', ',')} {t.t('units.kg')}
                  </dd>
                </div>
              </dl>
            </Accordion>
            <Accordion
              id="reviews"
              title={t.t('product.reviews')}
              meta={
                <span className="g2-rate">
                  <Star size={13} strokeWidth={0} fill="currentColor" />
                  {product.rating.toFixed(1).replace('.', ',')} · {formatNumber(product.reviews)}
                </span>
              }
            >
              {product.reviewsPreview.length ? (
                <div className="flex flex-col gap-2.5">
                  {product.reviewsPreview.map((r, i) => (
                    <article key={i} className="g2-review">
                      <div className="flex items-center gap-2.5">
                        <span className="g2-review-ava">{r.author.charAt(0)}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold">{r.author}</p>
                          <p className="text-[12px] text-ink-3">{t.date(r.date)}</p>
                        </div>
                        <span className="g2-stars" aria-label={`${r.rating}/5`}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={12} strokeWidth={0} fill="currentColor" data-on={s <= r.rating} />
                          ))}
                        </span>
                      </div>
                      <p className="mt-2 text-[14px] leading-snug text-ink-2">{t.l(r.text)}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="py-2 text-[14px] text-ink-2">{t.t('c.g2.noReviews')}</p>
              )}
            </Accordion>
          </section>

          <Similar id={product.id} />
        </>
      )}
      <div className="h-6" />
    </Screen>
  )
}

function Gallery({ images, title, jumpTo, tint, children }: { images: ImageRef[]; title: string; jumpTo: number | undefined; tint: string; children?: ReactNode }) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const idxRef = useRef(0)
  const [idx, setIdx] = useState(0)
  const first = useRef(true)

  useEffect(() => {
    const el = ref.current
    if (!el || jumpTo == null || jumpTo >= images.length) return
    el.scrollTo({ left: jumpTo * el.clientWidth, behavior: first.current ? 'auto' : 'smooth' })
    first.current = false
  }, [jumpTo, images.length])

  const onScroll = () => {
    const el = ref.current
    if (!el || !el.clientWidth) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== idxRef.current) {
      idxRef.current = i
      setIdx(i)
    }
  }

  return (
    <div className="c-stage" style={glowStyle(images[idx]?.tint ?? tint)}>
      <div ref={ref} className="c-gallery" onScroll={onScroll} aria-roledescription="carousel">
        {images.map((im, i) => (
          <div className="c-slide" key={im.id + i} aria-label={t.t('c.product.photo', { i: i + 1, n: images.length })}>
            <Img image={im} alt={title} sizes="(max-width: 500px) 82vw, 300px" priority={i === 0} />
          </div>
        ))}
      </div>
      {images.length > 1 ? (
        <>
          <span className="c-counter">
            {pad2(idx + 1)}/{pad2(images.length)}
          </span>
          <div className="c-dots" aria-hidden="true">
            {images.map((_, i) => (
              <i key={i} data-on={i === idx} />
            ))}
          </div>
        </>
      ) : null}
      {children}
    </div>
  )
}

function Description({ text }: { text: string }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const long = text.length > 160
  return (
    <div>
      <p className={cx('g2-desc', long && !open && 'c-clamp3')}>{text}</p>
      {long ? (
        <Tap flat className="g2-more" onClick={() => setOpen((o) => !o)}>
          {open ? t.t('product.showLess') : t.t('product.showMore')}
        </Tap>
      ) : null}
    </div>
  )
}

function SupplierCard({ product }: { product: Product }) {
  const t = useT()
  const s = product.supplier
  const score = Math.max(1, Math.min(10, Math.round(s.rating * 2)))
  const level = s.rating >= 4.7 ? t.t('c.product.trustHigh') : s.rating >= 4.3 ? t.t('c.product.trustMid') : t.t('c.product.trustLow')
  return (
    <section className="g2-card mx-4 mt-3">
      <div className="flex items-center gap-3">
        <span className="g2-sup-ico">
          <Store size={20} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <Kicker>{t.t('product.supplier')}</Kicker>
          <p className="truncate text-[15px] font-semibold">{s.name}</p>
          <p className="truncate text-[12.5px] text-ink-3">
            {t.l(s.city)} · {t.tp('product.supplierYears', s.years)}
          </p>
        </div>
        {s.verified ? (
          <Sticker tone="lime" tilt={4}>
            <BadgeCheck size={12} strokeWidth={2.6} />
            {t.t('c.g2.verified')}
          </Sticker>
        ) : null}
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold text-ink-2">{t.t('c.product.trust')}</span>
        <span className="g2-trust-val">
          {level} · <span className="c-mono">{s.rating.toFixed(1)}</span>
        </span>
      </div>
      <div className="c-meter mt-2" role="meter" aria-valuemin={0} aria-valuemax={5} aria-valuenow={s.rating} aria-label={t.t('c.product.supplierRating')}>
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} data-on={i < score} />
        ))}
      </div>
    </section>
  )
}

function Similar({ id }: { id: string }) {
  const t = useT()
  const q = useSimilar(id)
  if (q.isError || (q.data && !q.data.length)) return null
  return (
    <section className="mt-8">
      <div className="px-4">
        <SectionHead kicker={t.t('c.home.recoKicker')} title={t.t('product.similar')} />
      </div>
      <div className="c-rail mt-3">
        {q.data
          ? q.data.map((p) => (
              <div key={p.id} className="g2-rail-item">
                <ProductCard item={p} sizes="160px" />
              </div>
            ))
          : [0, 1, 2].map((i) => (
              <div key={i} className="g2-rail-item">
                <ProductCardSkeleton />
              </div>
            ))}
      </div>
    </section>
  )
}
