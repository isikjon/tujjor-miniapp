import { Check } from 'lucide-react'
import { memo, useEffect, useRef, useState, type ReactNode } from 'react'
import { useT } from '../../../../shared/i18n'
import { cx } from '../../../../shared/lib/cx'
import type { ImageRef, Quote } from '../../../../shared/types'
import { Img } from '../../../../shared/ui/Img'
import { Skeleton } from '../../../../shared/ui/Skeleton'
import { Tap, type TapProps } from '../../../../shared/ui/Tap'

const DAY = 86_400_000
/** Date `n` days from now (ETA ranges). */
export const inDays = (n: number) => new Date(Date.now() + n * DAY)

/** "12 ноября – 18 ноября" style range from a [from, to] days pair. */
export function useEtaRange(days: [number, number] | undefined) {
  const t = useT()
  if (!days) return null
  return t.t('b.g2.eta', { from: t.date(inDays(days[0])), to: t.date(inDays(days[1])) })
}

/** White card section with optional title row. */
export function Card({ title, aside, children, className }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('b-g2-card', className)}>
      {title ? (
        <div className="b-g2-card__head">
          <h2 className="b-g2-card__title">{title}</h2>
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  )
}

/** 44px round checkbox (violet when on). */
export function CheckBox({ on, label, className, ...rest }: TapProps & { on: boolean; label: string }) {
  return (
    <Tap {...rest} role="checkbox" aria-checked={on} aria-label={label} className={cx('b-g2-check', className)} data-on={on}>
      <span className="b-g2-check__box">{on ? <Check size={14} strokeWidth={3.2} aria-hidden="true" /> : null}</span>
    </Tap>
  )
}

/** Radio card row (delivery / payment). */
export function RadioRow({ on, icon, title, sub, aside, onClick }: { on: boolean; icon?: ReactNode; title: string; sub?: ReactNode; aside?: ReactNode; onClick: () => void }) {
  return (
    <Tap flat role="radio" aria-checked={on} className="b-g2-radio" data-on={on} onClick={onClick}>
      {icon ? <span className="b-g2-radio__icon">{icon}</span> : null}
      <span className="b-g2-radio__text">
        <span className="b-g2-radio__title">{title}</span>
        {sub ? <span className="b-g2-radio__sub">{sub}</span> : null}
      </span>
      {aside ? <span className="b-g2-radio__aside">{aside}</span> : null}
      <span className="b-g2-radio__dot" aria-hidden="true" />
    </Tap>
  )
}

/** Server totals (quote). Items are shown at old prices, the discount as a separate pink line (marketplace convention). */
export const Totals = memo(function Totals({ quote, recalculating, eta }: { quote?: Quote; recalculating?: boolean; eta?: string | null }) {
  const t = useT()
  if (!quote) {
    return (
      <div className="b-g2-totals" aria-busy="true">
        {[70, 52, 60, 48].map((w, i) => (
          <div key={i} className="b-g2-trow">
            <Skeleton style={{ height: 14, width: `${w}%` }} />
            <Skeleton style={{ height: 14, width: 72 }} />
          </div>
        ))}
        <div className="b-g2-trow b-g2-trow--total">
          <Skeleton style={{ height: 20, width: '30%' }} />
          <Skeleton style={{ height: 22, width: 120 }} />
        </div>
      </div>
    )
  }
  const free = (n: number) => (n === 0 ? <span className="b-g2-free">{t.t('b.g2.free')}</span> : t.money(n))
  return (
    <div className="b-g2-totals" data-busy={!!recalculating}>
      <div className="b-g2-trow">
        <span>{t.t('cart.itemsTotal', { n: quote.itemsCount })}</span>
        <span className="b-num">{t.money(quote.itemsTotal + quote.savings)}</span>
      </div>
      {quote.savings > 0 ? (
        <div className="b-g2-trow" data-tone="hot">
          <span>{t.t('cart.savings')}</span>
          <span className="b-num">−{t.money(quote.savings)}</span>
        </div>
      ) : null}
      {quote.promoDiscount > 0 ? (
        <div className="b-g2-trow" data-tone="hot">
          <span>
            {t.t('cart.promo')} {quote.promoCode}
          </span>
          <span className="b-num">−{t.money(quote.promoDiscount)}</span>
        </div>
      ) : null}
      <div className="b-g2-trow">
        <span>{t.t('cart.shippingChina')}</span>
        <span className="b-num">{free(quote.internationalShipping)}</span>
      </div>
      <div className="b-g2-trow">
        <span>{t.t('cart.serviceFee')}</span>
        <span className="b-num">{free(quote.serviceFee)}</span>
      </div>
      <div className="b-g2-trow">
        <span>{t.t('cart.localDelivery')}</span>
        <span className="b-num">{free(quote.localDelivery)}</span>
      </div>
      <div className="b-g2-trow" data-tone="muted">
        <span>{t.t('cart.weight')}</span>
        <span className="b-num">{t.t('b.weightKg', { n: quote.weightKg.toFixed(1).replace('.', t.locale === 'ru' ? ',' : '.') })}</span>
      </div>
      {eta ? (
        <div className="b-g2-trow" data-tone="muted">
          <span>{t.t('order.eta')}</span>
          <span>{eta}</span>
        </div>
      ) : null}
      <div className="b-g2-trow b-g2-trow--total">
        <span>{t.t('cart.total')}</span>
        <span className="b-num">{t.money(quote.total)}</span>
      </div>
      <p className="b-g2-calc">{recalculating ? t.t('cart.calculating') : t.t('cart.calcNote')}</p>
    </div>
  )
})

/** Full-bleed scroll-snap gallery with "1/3" counter + dots. Jumps to `target` (colour image) when it changes. */
export function Gallery({ images, alt, target, overlay }: { images: ImageRef[]; alt: string; target?: number; overlay?: ReactNode }) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const cur = useRef(0)
  const [i, setI] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (target == null || !el || target >= images.length) return
    el.scrollTo({ left: target * el.clientWidth, behavior: 'smooth' })
  }, [target, images.length])
  const onScroll = () => {
    const el = ref.current
    if (!el || !el.clientWidth) return
    const n = Math.round(el.scrollLeft / el.clientWidth)
    if (n !== cur.current) {
      cur.current = n
      setI(n)
    }
  }
  const n = images.length
  return (
    <div className="b-gal">
      <div ref={ref} className="b-gal__track" onScroll={onScroll}>
        {images.map((im, k) => (
          <div className="b-gal__slide" key={`${im.id}-${k}`}>
            <Img image={im} alt={alt} sizes="(max-width: 520px) 100vw, 520px" priority={k === 0} />
          </div>
        ))}
      </div>
      {n > 1 ? (
        <>
          <span className="b-gal__count b-num">{t.t('b.galleryCounter', { i: Math.min(i + 1, n), n })}</span>
          <span className="b-gal__dots" aria-hidden="true">
            {images.map((im, k) => (
              <span key={`${im.id}-${k}`} data-on={k === i} />
            ))}
          </span>
        </>
      ) : null}
      {overlay}
    </div>
  )
}
