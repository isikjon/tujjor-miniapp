import { BadgeCheck, Check, ChevronDown, Clock, Heart, PackageX, Share2, ShieldCheck, ShoppingCart, Star, Store, Truck } from 'lucide-react'
import { withBase } from '../../../shared/lib/base'
import { useEffect, useMemo, useRef, useState } from 'react'
import { isApiError } from '../../../shared/demo/errors'
import { useT } from '../../../shared/i18n'
import { useNav } from '../../../shared/nav/context'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { useAddToCart, useFavoriteToggle, useProduct, useProductSelection, useSimilar } from '../../../shared/query/hooks'
import { lineKey, useCart } from '../../../shared/store/cart'
import { useIsFavorite } from '../../../shared/store/favorites'
import { toast } from '../../../shared/store/toast'
import { tg } from '../../../shared/telegram/adapter'
import type { Product as ProductT } from '../../../shared/types'
import { QtyStepper } from '../../../shared/ui/QtyStepper'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { Button, DiscountBadge, EmptyView, IconButton, Price, ProductCard, Rating, RailSkeleton, SectionHeader, SourceBadge } from '../ui'
import { Card, Gallery, useEtaRange } from '../ui/g2/parts'
import '../styles/g2.css'

export default function Product({ params }: ScreenProps) {
  const id = params.id
  const t = useT()
  const nav = useNav()
  const q = useProduct(id)
  const { product, summary } = q
  const sel = useProductSelection(product)
  const add = useAddToCart()
  const fav = useIsFavorite(id)
  const toggleFav = useFavoriteToggle()
  const [qty, setQty] = useState(1)
  const [flash, setFlash] = useState<string | null>(null)
  const optRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const key = product ? lineKey(product.id, sel.selection) : null
  const line = useCart((s) => (key ? s.lines.find((l) => l.key === key) : undefined))
  const setLineQty = useCart((s) => s.setQty)
  const eta = useEtaRange(summary?.deliveryDays)

  useEffect(() => {
    if (!flash) return
    const tm = setTimeout(() => setFlash(null), 1400)
    return () => clearTimeout(tm)
  }, [flash])

  useEffect(() => setQty(1), [key])

  if (!summary) {
    if (q.isError) {
      const notFound = isApiError(q.error) && q.error.code === 'not_found'
      return (
        <Screen>
          {notFound ? (
            <EmptyView
              className="pt-24"
              icon={<PackageX size={30} strokeWidth={2} />}
              title={t.t('product.notFound')}
              action={<Button onClick={() => nav.switchTab('catalog')}>{t.t('action.toCatalog')}</Button>}
            />
          ) : (
            <ErrorState className="pt-24" error={q.error} onRetry={() => void q.refetch()} />
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

  const title = t.l(summary.title)
  const images = product?.images.length ? product.images : [summary.image]
  const unit = product ? sel.unitPrice : summary.price
  const old = product ? sel.oldPrice : summary.oldPrice
  const stock = product ? sel.stock : summary.stock
  const saving = old && old > unit ? old - unit : 0
  const soldOut = stock <= 0
  const missingName = sel.missing ? t.l(sel.missing.name) : ''

  const share = async () => {
    const url = `${location.origin}${withBase(`app/b${paths.product(id)}`)}`
    try {
      await navigator.clipboard.writeText(url)
      tg.haptic('success')
      toast({ text: t.t('b.linkCopied'), tone: 'success' })
    } catch {
      toast({ text: t.t('b.copyFail'), tone: 'error' })
    }
  }

  const onAdd = () => {
    if (!product) return
    if (sel.missing) {
      const m = sel.missing
      tg.haptic('warning')
      toast({ text: t.t('product.selectOption', { option: t.l(m.name) }) })
      optRefs.current[m.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setFlash(m.id)
      return
    }
    add(product, sel.selection, qty)
  }

  const footer = (
    <div className="b-pbar">
      {line ? (
        <QtyStepper
          value={line.qty}
          max={line.maxQty}
          onChange={(v) => setLineQty(line.key, v)}
          onLimit={() => toast({ text: t.t('cart.maxQty', { n: line.maxQty }) })}
          className="b-qty b-qty--lg"
          buttonClassName="b-qty__btn"
          valueClassName="b-qty__val"
          label={t.t('product.quantity')}
        />
      ) : (
        <div className="b-pbar__price">
          <Price price={unit} old={old} size="md" />
          {saving > 0 ? <span className="b-pbar__save">{t.t('b.save', { amount: t.money(saving) })}</span> : null}
        </div>
      )}
      {line ? (
        <Button kind="secondary" size="lg" className="b-pbar__btn" icon={<Check size={18} strokeWidth={2.8} aria-hidden="true" />} onClick={() => nav.switchTab('cart')}>
          {t.t('b.inCartN', { n: line.qty })}
        </Button>
      ) : (
        <Button size="lg" className="b-pbar__btn" disabled={!product || soldOut} icon={soldOut ? undefined : <ShoppingCart size={18} strokeWidth={2.4} aria-hidden="true" />} onClick={onAdd}>
          {soldOut ? t.t('product.outOfStock') : t.t('action.addToCart')}
        </Button>
      )}
    </div>
  )

  return (
    <Screen footer={footer} className="b-pdp">
      <Gallery
        images={images}
        alt={title}
        target={sel.imageIndex}
        overlay={
          <div className="b-gal__actions">
            <IconButton label={t.t('action.share')} tone="surface" round onClick={() => void share()}>
              <Share2 size={19} strokeWidth={2.2} aria-hidden="true" />
            </IconButton>
            <IconButton label={t.t(fav ? 'b.favRemove' : 'b.favAdd')} tone="surface" round haptic={false} className="b-pdp__fav" data-on={fav} aria-pressed={fav} onClick={() => toggleFav(id)}>
              <Heart size={19} strokeWidth={2.2} aria-hidden="true" />
            </IconButton>
          </div>
        }
      />

      {/* price + title */}
      <section className="b-g2-card b-pdp__main">
        <div className="b-pdp__pricerow">
          <Price price={unit} old={old} size="lg" />
          <DiscountBadge price={unit} old={old} size="lg" />
        </div>
        {saving > 0 ? <p className="b-pdp__save">{t.t('b.save', { amount: t.money(saving) })}</p> : null}
        {summary.brand ? <p className="b-pdp__brand">{summary.brand}</p> : null}
        <h1 className="b-pdp__title">{title}</h1>
        <div className="b-pdp__meta">
          {summary.reviews > 0 ? <Rating value={summary.rating} reviews={summary.reviews} long /> : null}
          {summary.sold > 0 ? <span className="b-pdp__sold">{t.tp('product.sold', summary.sold)}</span> : null}
        </div>
        <div className="b-pdp__tags">
          <SourceBadge source={summary.source} />
          <span className="b-pdp__fresh">
            <Clock size={12} strokeWidth={2.4} aria-hidden="true" />
            {t.t('product.priceUpdated', { time: t.ago(summary.syncedAt) })}
          </span>
        </div>
      </section>

      {product ? (
        <Details
          product={product}
          sel={sel}
          optRefs={optRefs}
          flash={flash}
          missingName={missingName}
          qty={qty}
          setQty={setQty}
          inCart={!!line}
          stock={stock}
        />
      ) : q.isError ? (
        <div className="px-3 pt-2">
          <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />
        </div>
      ) : (
        <DetailsSkeleton />
      )}

      {/* delivery */}
      <Card title={t.t('b.deliverTo')}>
        <div className="b-pdp__dl">
          <span className="b-g2-ico" data-tone="ok">
            <Truck size={18} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="b-pdp__dl-title">{t.t('product.deliveryTo')}</p>
            <p className="b-pdp__dl-sub">{eta}</p>
          </div>
          <span className="b-pdp__dl-days b-num">{t.t('b.days', { from: summary.deliveryDays[0], to: summary.deliveryDays[1] })}</span>
        </div>
        <div className="b-pdp__dl">
          <span className="b-g2-ico" data-tone="accent">
            <Store size={18} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="b-pdp__dl-title">{t.t('b.buyout')}</p>
            <p className="b-pdp__dl-sub">{t.t('b.buyoutSub')}</p>
          </div>
        </div>
        <div className="b-pdp__dl">
          <span className="b-g2-ico" data-tone="flash">
            <ShoppingCart size={18} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="b-pdp__dl-title">
              {t.t('b.g2.marketplace')}: {t.t(`source.${summary.source}`)}
            </p>
            <p className="b-pdp__dl-sub">{t.t(`source.${summary.source}.desc`)}</p>
          </div>
        </div>
        <p className="b-pdp__note">{t.t('product.priceNote')}</p>
      </Card>

      {product ? <Info product={product} /> : null}

      <Similar id={id} enabled={!!product} />
    </Screen>
  )
}

type Sel = ReturnType<typeof useProductSelection>

function Details({
  product,
  sel,
  optRefs,
  flash,
  missingName,
  qty,
  setQty,
  inCart,
  stock,
}: {
  product: ProductT
  sel: Sel
  optRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>
  flash: string | null
  missingName: string
  qty: number
  setQty: (n: number) => void
  inCart: boolean
  stock: number
}) {
  const t = useT()
  const original = product.badges.includes('original')
  return (
    <>
      {product.options.length ? (
        <section className="b-g2-card b-pdp__opts">
          {product.options.map((o) => {
            const cur = sel.selection[o.id]
            const curLabel = cur ? o.values.find((v) => v.id === cur)?.label : null
            return (
              <div
                key={o.id}
                ref={(el) => {
                  optRefs.current[o.id] = el
                }}
                className="b-pdp__opt"
                data-flash={flash === o.id}
              >
                <p className="b-opt__name">
                  {t.l(o.name)}
                  {curLabel ? <span> · {t.l(curLabel)}</span> : null}
                </p>
                <div className={o.kind === 'size' ? 'b-pdp__sizes' : 'b-opt__vals'}>
                  {o.values.map((v) => (
                    <Tap
                      key={v.id}
                      className={o.kind === 'size' ? 'b-pdp__size' : 'b-optchip'}
                      data-on={cur === v.id}
                      disabled={v.stock <= 0}
                      aria-pressed={cur === v.id}
                      onClick={() => sel.select(o.id, v.id)}
                    >
                      {o.kind === 'color' && v.hex ? <span className="b-optchip__sw" style={{ background: v.hex }} /> : null}
                      <span>{t.l(v.label)}</span>
                      {v.priceDelta ? <span className="b-opt__delta">+{t.compact(v.priceDelta)}</span> : null}
                    </Tap>
                  ))}
                </div>
              </div>
            )
          })}
          {sel.missing ? (
            <p className="b-missing" data-soft={!flash}>
              {t.t('product.selectOption', { option: missingName })}
            </p>
          ) : null}
        </section>
      ) : null}

      {!inCart && stock > 0 ? (
        <section className="b-g2-card b-pdp__qtyrow">
          <div className="min-w-0">
            <p className="b-pdp__dl-title">{t.t('product.quantity')}</p>
            <p className={stock <= 10 ? 'b-pdp__left' : 'b-pdp__dl-sub'}>{stock <= 10 ? t.t('b.g2.leftQty', { n: stock }) : t.t('product.inStock', { n: stock })}</p>
          </div>
          <QtyStepper
            value={qty}
            max={Math.min(stock, 99)}
            onChange={setQty}
            onLimit={() => toast({ text: t.t('cart.maxQty', { n: Math.min(stock, 99) }) })}
            className="b-qty"
            buttonClassName="b-qty__btn"
            valueClassName="b-qty__val"
            label={t.t('product.quantity')}
          />
        </section>
      ) : null}

      {original ? (
        <section className="b-g2-card b-pdp__auth">
          <span className="b-pdp__auth-ico">
            <ShieldCheck size={22} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="b-pdp__auth-title">{t.t('product.authenticity')}</p>
            <p className="b-pdp__auth-text">{t.t('b.authText')}</p>
          </div>
        </section>
      ) : null}
    </>
  )
}

function Info({ product }: { product: ProductT }) {
  const t = useT()
  const [more, setMore] = useState(false)
  const desc = t.l(product.description)
  const long = desc.length > 180
  const s = product.supplier
  const reviews = product.reviewsPreview
  return (
    <>
      <Card title={t.t('product.supplier')}>
        <div className="b-pdp__sup">
          <span className="b-pdp__sup-logo">{s.name.slice(0, 1)}</span>
          <div className="min-w-0 flex-1">
            <p className="b-pdp__sup-name">
              <span className="truncate">{s.name}</span>
              {s.verified ? <BadgeCheck size={16} strokeWidth={2.4} className="b-pdp__verified" aria-label={t.t('product.verified')} /> : null}
            </p>
            <p className="b-pdp__dl-sub">
              {t.l(s.city)} · {t.tp('product.supplierYears', s.years)}
            </p>
          </div>
        </div>
        <div className="b-pdp__sup-stats">
          <div>
            <span className="b-pdp__sup-val b-num">
              <Star size={14} strokeWidth={0} aria-hidden="true" />
              {s.rating.toFixed(1)}
            </span>
            <span className="b-pdp__sup-lbl">{t.t('b.supplierRating')}</span>
          </div>
          {s.verified ? (
            <div>
              <span className="b-pdp__sup-val" data-ok="true">
                <BadgeCheck size={16} strokeWidth={2.4} aria-hidden="true" />
              </span>
              <span className="b-pdp__sup-lbl">{t.t('product.verified')}</span>
            </div>
          ) : null}
        </div>
      </Card>

      {desc ? (
        <Card title={t.t('product.description')}>
          <p className="b-pdp__desc" data-open={more || !long}>
            {desc}
          </p>
          {long ? (
            <Tap className="b-pdp__more" onClick={() => setMore((v) => !v)} aria-expanded={more}>
              {t.t(more ? 'product.showLess' : 'product.showMore')}
              <ChevronDown size={16} strokeWidth={2.4} aria-hidden="true" style={{ transform: more ? 'rotate(180deg)' : undefined }} />
            </Tap>
          ) : null}
        </Card>
      ) : null}

      <Card title={t.t('product.specs')}>
        <dl className="b-pdp__specs">
          {product.specs.map((sp, i) => (
            <div key={i}>
              <dt>{t.l(sp.name)}</dt>
              <dd>{t.l(sp.value)}</dd>
            </div>
          ))}
          <div>
            <dt>{t.t('product.weight')}</dt>
            <dd>{t.t('b.weightKg', { n: String(product.weightKg).replace('.', t.locale === 'ru' ? ',' : '.') })}</dd>
          </div>
          <div>
            <dt>{t.t('product.origin')}</dt>
            <dd>{t.t('product.china')}</dd>
          </div>
        </dl>
      </Card>

      <Card
        title={t.t('b.reviewsTitle')}
        aside={product.reviews > 0 ? <span className="b-pdp__revcount b-num">{t.compact(product.reviews)}</span> : null}
      >
        {product.reviews > 0 ? (
          <div className="b-pdp__revsum">
            <span className="b-pdp__revbig b-num">{product.rating.toFixed(1).replace('.', t.locale === 'ru' ? ',' : '.')}</span>
            <div>
              <Stars value={product.rating} />
              <p className="b-pdp__dl-sub">
                {t.t('b.g2.ofFive')} · {t.tp('product.reviewsCount', product.reviews)}
              </p>
            </div>
          </div>
        ) : null}
        {reviews.length ? (
          <ul className="b-pdp__revs">
            {reviews.map((r, i) => (
              <li key={i} className="b-pdp__rev">
                <div className="b-pdp__rev-head">
                  <span className="b-pdp__rev-ava">{r.author.slice(0, 1)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="b-pdp__rev-name">{r.author}</span>
                    <span className="b-pdp__rev-date">{t.date(r.date)}</span>
                  </span>
                  <Stars value={r.rating} />
                </div>
                <p className="b-pdp__rev-text">{t.l(r.text)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="b-pdp__dl-sub">{t.t('b.g2.reviewsEmpty')}</p>
        )}
      </Card>
    </>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <span className="b-stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={13} strokeWidth={0} data-on={value >= n - 0.25} />
      ))}
    </span>
  )
}

function Similar({ id, enabled }: { id: string; enabled: boolean }) {
  const t = useT()
  const q = useSimilar(id, enabled)
  const items = useMemo(() => q.data ?? [], [q.data])
  if (q.isError || (q.isSuccess && !items.length)) return null
  return (
    <section className="b-pdp__similar">
      <SectionHeader title={t.t('product.similar')} />
      {items.length ? (
        <div className="b-rail">
          {items.map((p) => (
            <ProductCard key={p.id} item={p} variant="rail" />
          ))}
        </div>
      ) : (
        <RailSkeleton count={3} />
      )}
    </section>
  )
}

function DetailsSkeleton() {
  return (
    <section className="b-g2-card" aria-hidden="true">
      <Skeleton style={{ height: 16, width: '30%' }} />
      <div className="mt-3 flex gap-2">
        {[64, 64, 64, 64].map((w, i) => (
          <Skeleton key={i} style={{ height: 40, width: w, borderRadius: 12 }} />
        ))}
      </div>
    </section>
  )
}

function ProductSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="aspect-square w-full" style={{ borderRadius: 0 }} />
      <section className="b-g2-card b-pdp__main">
        <Skeleton style={{ height: 28, width: '45%' }} />
        <Skeleton style={{ height: 18, width: '92%', marginTop: 12 }} />
        <Skeleton style={{ height: 18, width: '70%', marginTop: 6 }} />
        <Skeleton style={{ height: 14, width: '50%', marginTop: 12 }} />
      </section>
      <DetailsSkeleton />
    </div>
  )
}
