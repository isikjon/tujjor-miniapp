import { CalendarClock, Check, ChevronRight, CreditCard, Info, MapPin, Plus, ShieldCheck, Store, Truck, X } from 'lucide-react'
import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import type { PaymentMethod } from '../../../shared/types'
import { formatNumber, useT } from '../../../shared/i18n'
import { formatPhone } from '../../../shared/demo/user'
import { Screen } from '../../../shared/nav/Screen'
import { useNav, useScroller } from '../../../shared/nav/context'
import { useCheckout } from '../../../shared/query/hooks'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { EmptyState, ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { daysFromNow, glowStyle } from '../lib/util'
import { Radio, Spinner, Sticker } from '../ui/bits'
import { AddressSheet, addressLine } from '../ui/g2/AddressSheet'
import { Receipt } from '../ui/g2/Receipt'
import '../styles/g2.css'

const PAYMENTS: PaymentMethod[] = ['payme', 'click', 'card']

export default function CheckoutScreen() {
  const t = useT()
  const nav = useNav()
  const co = useCheckout()
  const { draft, setDraft, address, quote } = co
  const [sheet, setSheet] = useState(false)
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLElement | null)[]>([])

  const steps = [t.t('c.checkout.stepAddress'), t.t('c.checkout.stepDelivery'), t.t('c.checkout.stepPayment')]
  const stepState = (i: number) => (i === 0 && !address && !co.addressesLoading ? 'current' : i < active ? 'done' : i === active ? 'current' : 'todo')

  const header = (
    <div className="c-headbg">
      <div className="g2-co-head">
        <h1 className="g2-co-title">{t.t('checkout.title')}</h1>
        {co.lines.length ? <span className="c-mono text-[12px] text-ink-3">{t.tp('cart.items', co.lines.reduce((n, l) => n + l.qty, 0))}</span> : null}
      </div>
      <div className="c-steps">
        {steps.map((s, i) => (
          <Tap key={i} flat className="c-step" data-state={stepState(i)} onClick={() => refs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            <span className="c-step-bar" />
            <span className="c-step-label">
              {stepState(i) === 'done' ? <Check size={12} strokeWidth={3.2} /> : <span className="c-mono">{String(i + 1).padStart(2, '0')}</span>}
              {s}
            </span>
          </Tap>
        ))}
      </div>
    </div>
  )

  if (!co.lines.length) {
    return (
      <Screen header={header}>
        <EmptyState
          className="pt-14"
          title={t.t('checkout.empty')}
          text={t.t('cart.nothingSelected')}
          action={
            <Tap className="c-cta px-6" onClick={() => nav.switchTab('cart')}>
              {t.t('action.goToCart')}
            </Tap>
          }
        />
      </Screen>
    )
  }

  const promoErr = quote?.promoError ? (quote.promoError === 'min_total' ? t.t('c.promo.min_total') : t.t('c.promo.invalid')) : null
  const eta = quote ? { from: t.date(daysFromNow(quote.etaDays[0])), to: t.date(daysFromNow(quote.etaDays[1])) } : null
  const needAddress = !address && !co.addressesLoading

  return (
    <Screen
      header={header}
      footer={
        <div className="c-footer">
          {co.submitError ? (
            <div className="g2-submit-err" role="alert">
              <span className="flex-1">{co.submitError}</span>
              <Tap className="g2-retry" onClick={co.retry}>
                {t.t('action.retry')}
              </Tap>
            </div>
          ) : co.unavailable ? (
            <p className="c-err mb-2 mt-0">{t.t('checkout.errorStock')}</p>
          ) : null}
          <Tap
            className="c-cta g2-cta-split"
            haptic={needAddress ? 'light' : false}
            aria-disabled={(!needAddress && !co.canSubmit) || co.submitting || undefined}
            aria-busy={co.submitting || undefined}
            onClick={() => (needAddress ? setSheet(true) : co.submit())}
          >
            {co.submitting ? (
              <span className="flex w-full items-center justify-center gap-2.5">
                <Spinner />
                {t.t('checkout.processing')}
              </span>
            ) : needAddress ? (
              <span className="g2-cta-label w-full text-center">{t.t('checkout.noAddress')}</span>
            ) : (
              <>
                <span className="g2-cta-label">{t.t('c.g2.pay')}</span>
                {quote ? (
                  <span className="c-cta-pill c-recalc" data-busy={co.recalculating}>
                    {formatNumber(quote.total)}&nbsp;<small className="g2-pill-cur">{t.t('currency.uzs')}</small>
                  </span>
                ) : (
                  <Spinner />
                )}
              </>
            )}
          </Tap>
        </div>
      }
    >
      <StepSpy refs={refs} onChange={setActive} />
      <div className="flex flex-col gap-7 px-4 pb-4 pt-2">
        {/* 01 — address */}
        <section ref={(el) => void (refs.current[0] = el)} className="g2-co-sec">
          <SecHead n={1} title={t.t('checkout.address')} />
          {co.addressesLoading ? (
            <Skeleton className="h-[84px] w-full" style={{ borderRadius: 20 }} />
          ) : address ? (
            <Tap flat className="c-pick" data-on="true" onClick={() => setSheet(true)}>
              <span className="c-pick-ico">
                <MapPin size={20} strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[15px] font-semibold">
                  {t.l(address.label)}
                  <span className="g2-tag">{t.t('c.address.current')}</span>
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">{addressLine(address, t.l)}</span>
                <span className="c-mono mt-0.5 block text-[12px] text-ink-3">
                  {address.recipient} · <span className="whitespace-nowrap">{formatPhone(address.phone)}</span>
                </span>
              </span>
              <ChevronRight size={20} className="shrink-0 text-ink-3" />
            </Tap>
          ) : (
            <Tap flat className="c-pick g2-pick-dashed" onClick={() => setSheet(true)}>
              <span className="c-pick-ico">
                <Plus size={20} strokeWidth={2.4} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{t.t('checkout.noAddress')}</span>
                <span className="block text-[13px] text-ink-2">{t.t('c.g2.tapToFix')}</span>
              </span>
            </Tap>
          )}
        </section>

        {/* 02 — delivery */}
        <section ref={(el) => void (refs.current[1] = el)} className="g2-co-sec">
          <SecHead n={2} title={t.t('checkout.delivery')} />
          <div className="flex flex-col gap-2.5">
            <Tap flat className="c-pick" data-on={draft.delivery === 'courier'} aria-pressed={draft.delivery === 'courier'} onClick={() => setDraft({ delivery: 'courier' })}>
              <span className="c-pick-ico">
                <Truck size={20} strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{t.t('delivery.courier')}</span>
                <span className="block text-[13px] leading-snug text-ink-2">{t.t('c.delivery.courierDesc')}</span>
              </span>
              {draft.delivery === 'courier' && quote ? (
                <span className="g2-pick-price c-recalc" data-busy={co.recalculating}>
                  {quote.localDelivery === 0 ? t.t('cart.free') : t.money(quote.localDelivery)}
                </span>
              ) : null}
              <Radio on={draft.delivery === 'courier'} />
            </Tap>
            <Tap flat className="c-pick" data-on={draft.delivery === 'pickup'} aria-pressed={draft.delivery === 'pickup'} onClick={() => setDraft({ delivery: 'pickup' })}>
              <span className="c-pick-ico">
                <Store size={20} strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{t.t('delivery.pickup')}</span>
                <span className="block text-[13px] leading-snug text-ink-2">{t.t('delivery.pickupDesc')}</span>
              </span>
              <Radio on={draft.delivery === 'pickup'} />
            </Tap>
          </div>
          {eta ? (
            <div className="g2-eta mt-2.5">
              <CalendarClock size={18} strokeWidth={2.2} />
              <span className="flex-1">{t.t('c.g2.etaTitle')}</span>
              <b>{t.t('c.checkout.etaShort', eta)}</b>
            </div>
          ) : null}
        </section>

        {/* 03 — payment */}
        <section ref={(el) => void (refs.current[2] = el)} className="g2-co-sec">
          <SecHead n={3} title={t.t('checkout.payment')} />
          <div className="flex flex-col gap-2.5">
            {PAYMENTS.map((p) => (
              <Tap key={p} flat className="c-pick" data-on={draft.payment === p} aria-pressed={draft.payment === p} onClick={() => setDraft({ payment: p })}>
                <span className="g2-pay-logo" data-p={p}>
                  {p === 'card' ? <CreditCard size={20} strokeWidth={2.2} /> : p === 'payme' ? 'P' : 'C'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">{t.t(`payment.${p}`)}</span>
                  <span className="block text-[13px] leading-snug text-ink-2">{t.t(`payment.${p}.desc`)}</span>
                </span>
                <Radio on={draft.payment === p} />
              </Tap>
            ))}
          </div>
          <p className="g2-note mt-2.5 flex items-center gap-2">
            <Info size={14} strokeWidth={2.4} className="shrink-0" />
            {t.t('checkout.demoPayment')}
          </p>
        </section>

        {/* summary */}
        <section ref={(el) => void (refs.current[3] = el)} className="g2-co-sec flex flex-col gap-5">
          <Promo
            code={draft.promoCode}
            applied={quote?.promoCode ?? null}
            error={draft.promoCode ? promoErr : null}
            busy={co.recalculating}
            onApply={(c) => setDraft({ promoCode: c || null })}
          />

          <div>
            <label className="c-label" htmlFor="g2-comment">
              {t.t('checkout.comment')}
            </label>
            <div className="c-field">
              <textarea id="g2-comment" rows={2} maxLength={300} value={draft.comment} placeholder={t.t('checkout.commentPlaceholder')} onChange={(e) => setDraft({ comment: e.target.value })} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <span className="c-kicker">{t.t('c.g2.orderItems')}</span>
              <span className="c-mono text-[12px] text-ink-3">{t.tp('cart.items', co.lines.reduce((n, l) => n + l.qty, 0))}</span>
            </div>
            <div className="c-menu">
              {co.lines.map((l) => (
                <div key={l.key} className="c-row g2-co-item">
                  <span className="g2-co-thumb c-glow" style={glowStyle(l.image.tint)}>
                    <Img image={l.image} alt={t.l(l.title)} sizes="48px" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold">{t.l(l.title)}</span>
                    <span className="block truncate text-[12.5px] text-ink-3">
                      {[t.l(l.selectionLabel), t.t('c.g2.qty', { n: l.qty })].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="c-display shrink-0 text-[14px] font-semibold">{formatNumber(l.unitPrice * l.qty)}</span>
                </div>
              ))}
            </div>
          </div>

          <Receipt
            quote={quote}
            busy={co.recalculating}
            title={t.t('cart.summary')}
            error={co.quoteQuery.isError && !quote ? <ErrorState compact error={co.quoteQuery.error} onRetry={() => void co.quoteQuery.refetch()} /> : null}
            extra={
              quote ? (
                <div className="c-receipt-row">
                  <span>{t.t('cart.weight')}</span>
                  <b>
                    {String(Math.round(quote.weightKg * 10) / 10).replace('.', ',')} {t.t('units.kg')}
                  </b>
                </div>
              ) : null
            }
          />
          {eta ? <p className="g2-note -mt-2 text-center">{t.t('checkout.eta', eta)}</p> : null}

          <div className="g2-safe">
            <ShieldCheck size={18} strokeWidth={2.2} className="shrink-0" />
            <div>
              <p>{t.t('checkout.duplicateSafe')}</p>
              <p className="mt-1 text-ink-3">{t.t('checkout.agree')}</p>
            </div>
          </div>
        </section>
      </div>

      <AddressSheet open={sheet} onClose={() => setSheet(false)} addresses={co.addresses} currentId={address?.id ?? null} startInForm={!co.addresses.length} />
    </Screen>
  )
}

function SecHead({ n, title, right }: { n: number; title: string; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="c-secnum">{String(n).padStart(2, '0')}</span>
      <h2 className="c-h2 min-w-0 flex-1 truncate text-[18px]">{title}</h2>
      {right}
    </div>
  )
}

function Promo({ code, applied, error, busy, onApply }: { code: string | null; applied: string | null; error: string | null; busy: boolean; onApply: (c: string) => void }) {
  const t = useT()
  const [value, setValue] = useState(code ?? '')
  useEffect(() => setValue(code ?? ''), [code])
  const pending = !!code && busy && code !== applied && !error

  if (applied && code === applied) {
    return (
      <div>
        <span className="c-label">{t.t('checkout.promo')}</span>
        <div className="g2-promo-on">
          <Sticker tone="lime" tilt={-3} big>
            {applied}
          </Sticker>
          <span className="min-w-0 flex-1 text-[13.5px] font-semibold">{t.t('checkout.promoApplied', { code: applied })}</span>
          <Tap className="g2-x" aria-label={t.t('c.promo.remove')} onClick={() => onApply('')}>
            <X size={18} strokeWidth={2.4} />
          </Tap>
        </div>
      </div>
    )
  }
  return (
    <div>
      <label className="c-label" htmlFor="g2-promo">
        {t.t('checkout.promo')}
      </label>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          onApply(value.trim().toUpperCase())
        }}
      >
        <div className="c-field flex-1" data-invalid={!!error || undefined}>
          <input
            id="g2-promo"
            value={value}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder={t.t('checkout.promoPlaceholder')}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            className="uppercase"
          />
          {code && error ? (
            <Tap className="g2-x" aria-label={t.t('c.promo.remove')} onClick={() => onApply('')}>
              <X size={16} strokeWidth={2.4} />
            </Tap>
          ) : null}
        </div>
        <Tap type="submit" className="c-btn2 g2-apply" aria-disabled={!value.trim() || undefined}>
          {pending ? <Spinner /> : t.t('action.apply')}
        </Tap>
      </form>
      {error ? <p className="c-err">{error}</p> : <p className="g2-note ml-1 mt-1.5">{t.t('checkout.promoHint')}</p>}
    </div>
  )
}

/** Scroll-spy for the progress header: the last section whose top passed ~45% of the viewport is current. */
function StepSpy({ refs, onChange }: { refs: MutableRefObject<(HTMLElement | null)[]>; onChange: (i: number) => void }) {
  const scroller = useScroller()
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    let raf = 0
    const calc = () => {
      raf = 0
      const top = el.getBoundingClientRect().top
      let a = 0
      refs.current.forEach((s, i) => {
        if (s && s.getBoundingClientRect().top - top < el.clientHeight * 0.45) a = i
      })
      if (el.scrollTop > 8 && el.scrollTop + el.clientHeight >= el.scrollHeight - 8) a = refs.current.length - 1
      onChange(a)
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(calc)
    }
    el.addEventListener('scroll', on, { passive: true })
    calc()
    return () => {
      el.removeEventListener('scroll', on)
      cancelAnimationFrame(raf)
    }
  }, [scroller, refs, onChange])
  return null
}
