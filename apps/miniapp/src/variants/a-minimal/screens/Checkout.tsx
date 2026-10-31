import { ChevronRight, CreditCard, MapPin, Plus, Smartphone, Store, Truck, Wallet, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import type { DeliveryMethod, PaymentMethod } from '../../../shared/types'
import { formatPhone } from '../../../shared/demo/user'
import { useT } from '../../../shared/i18n'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { useNav } from '../../../shared/nav/context'
import { Screen } from '../../../shared/nav/Screen'
import { useCheckout } from '../../../shared/query/hooks'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { EmptyState, ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { inDays } from '../lib'
import { AddressSheet } from '../ui/AddressSheet'
import { Btn, RadioMark } from '../ui/controls'
import { PageTitle } from '../ui/PageTitle'
import { Totals } from '../ui/Totals'
import '../styles/g2.css'

const DELIVERY: Array<{ id: DeliveryMethod; icon: LucideIcon }> = [
  { id: 'courier', icon: Truck },
  { id: 'pickup', icon: Store },
]
const PAYMENT: Array<{ id: PaymentMethod; icon: LucideIcon }> = [
  { id: 'payme', icon: Wallet },
  { id: 'click', icon: Smartphone },
  { id: 'card', icon: CreditCard },
]

export default function Checkout(_: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const c = useCheckout()
  const [addrOpen, setAddrOpen] = useState(false)
  const [promo, setPromo] = useState(c.draft.promoCode ?? '')
  const quote = c.quote

  if (!c.lines.length) {
    return (
      <Screen>
        <div className="a2">
          <PageTitle title={t.t('checkout.title')} />
          <EmptyState
            className="a2-state"
            title={t.t('checkout.empty')}
            action={
              <Btn size="md" onClick={() => nav.switchTab('cart')}>
                {t.t('cart.title')}
              </Btn>
            }
          />
        </div>
      </Screen>
    )
  }

  const eta = quote ? { from: t.date(inDays(quote.etaDays[0])), to: t.date(inDays(quote.etaDays[1])) } : null
  const promoStatus = c.draft.promoCode && quote && !c.quoteQuery.isPlaceholderData ? (quote.promoError ? 'error' : quote.promoCode ? 'ok' : null) : null
  const promoErrorText = quote?.promoError === 'min_total' ? t.t('a.g2.promoMinTotal') : t.t('a.g2.promoInvalid')
  const applyPromo = () => {
    const code = promo.trim().toUpperCase()
    c.setDraft({ promoCode: code || null })
  }
  const clearPromo = () => {
    setPromo('')
    c.setDraft({ promoCode: null })
  }

  const cta = !c.address ? (
    <Btn block onClick={() => setAddrOpen(true)}>
      {t.t('checkout.noAddress')}
    </Btn>
  ) : c.submitError ? (
    <Btn block loading={c.submitting} onClick={c.retry}>
      {t.t('action.retry')}
    </Btn>
  ) : (
    <Btn block loading={c.submitting} disabled={!c.canSubmit} onClick={c.submit}>
      {quote ? t.t('action.pay', { amount: t.money(quote.total) }) : t.t('cart.calculating')}
    </Btn>
  )

  return (
    <Screen
      footer={
        <div className="a2-footer">
          {c.submitError ? (
            <p className="a2-footer__err" role="alert">
              {c.submitError}
            </p>
          ) : c.submitting ? (
            <p className="a2-footer__note">{t.t('checkout.processing')}</p>
          ) : null}
          {cta}
          <p className="a2-footer__fine">{t.t('checkout.agree')}</p>
        </div>
      }
    >
      <div className="a2 a2-co">
        <PageTitle title={t.t('checkout.title')} subtitle={t.tp('cart.items', c.lines.reduce((n, l) => n + l.qty, 0))} />

        {/* address */}
        <section className="a2-sec">
          <h2 className="a2-h2">{t.t('checkout.address')}</h2>
          {c.addressesLoading ? (
            <Skeleton style={{ height: 76, borderRadius: 18 }} />
          ) : (
            <Tap flat className="a2-row a2-row--card" onClick={() => setAddrOpen(true)}>
              <span className="a2-row__icon">{c.address ? <MapPin size={20} strokeWidth={1.5} aria-hidden="true" /> : <Plus size={20} strokeWidth={1.5} aria-hidden="true" />}</span>
              {c.address ? (
                <span className="a2-row__text">
                  <span className="a2-row__title">
                    {t.l(c.address.label)} · {c.address.city}
                  </span>
                  <span className="a2-row__sub">{[c.address.street, c.address.apartment].filter(Boolean).join(', ')}</span>
                  <span className="a2-row__sub">
                    {c.address.recipient} · {formatPhone(c.address.phone)}
                  </span>
                </span>
              ) : (
                <span className="a2-row__text">
                  <span className="a2-row__title">{t.t('checkout.noAddress')}</span>
                </span>
              )}
              <ChevronRight size={18} strokeWidth={1.5} className="a2-row__chev" aria-hidden="true" />
            </Tap>
          )}
        </section>

        {/* delivery */}
        <section className="a2-sec">
          <h2 className="a2-h2">{t.t('checkout.delivery')}</h2>
          <div className="a2-group" role="radiogroup" aria-label={t.t('checkout.delivery')}>
            {DELIVERY.map(({ id, icon: Icon }) => {
              const on = c.draft.delivery === id
              const price = on && quote ? (quote.localDelivery === 0 ? t.t('cart.free') : t.money(quote.localDelivery)) : id === 'pickup' ? t.t('cart.free') : null
              return (
                <Tap key={id} flat role="radio" aria-checked={on} className="a2-row" onClick={() => c.setDraft({ delivery: id })}>
                  <span className="a2-row__icon">
                    <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <span className="a2-row__text">
                    <span className="a2-row__title">{t.t(`delivery.${id}`)}</span>
                    <span className="a2-row__sub">{id === 'pickup' ? t.t('delivery.pickupDesc') : on && eta ? t.t('product.deliveryDate', eta) : t.t('a.g2.courierDesc')}</span>
                  </span>
                  {price ? <span className="a2-row__aside" data-busy={(on && c.recalculating) || undefined}>{price}</span> : null}
                  <RadioMark on={on} />
                </Tap>
              )
            })}
          </div>
        </section>

        {/* payment */}
        <section className="a2-sec">
          <h2 className="a2-h2">{t.t('checkout.payment')}</h2>
          <div className="a2-group" role="radiogroup" aria-label={t.t('checkout.payment')}>
            {PAYMENT.map(({ id, icon: Icon }) => {
              const on = c.draft.payment === id
              return (
                <Tap key={id} flat role="radio" aria-checked={on} className="a2-row" onClick={() => c.setDraft({ payment: id })}>
                  <span className="a2-row__icon">
                    <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <span className="a2-row__text">
                    <span className="a2-row__title">{t.t(`payment.${id}`)}</span>
                    <span className="a2-row__sub">{t.t(`payment.${id}.desc`)}</span>
                  </span>
                  <RadioMark on={on} />
                </Tap>
              )
            })}
          </div>
          <p className="a2-note">{t.t('checkout.demoPayment')}</p>
        </section>

        {/* promo */}
        <section className="a2-sec">
          <h2 className="a2-h2">{t.t('checkout.promo')}</h2>
          {promoStatus === 'ok' ? (
            <div className="a2-promo a2-promo--ok">
              <span>{t.t('checkout.promoApplied', { code: quote!.promoCode! })}</span>
              <Tap flat className="a2-textbtn" onClick={clearPromo}>
                {t.t('a.g2.promoRemove')}
              </Tap>
            </div>
          ) : (
            <form
              className="a2-promo"
              onSubmit={(e) => {
                e.preventDefault()
                applyPromo()
              }}
            >
              <input
                className="a2-input"
                value={promo}
                onChange={(e) => {
                  setPromo(e.target.value.toUpperCase())
                  if (promoStatus === 'error') c.setDraft({ promoCode: null })
                }}
                placeholder={t.t('checkout.promoPlaceholder')}
                autoCapitalize="characters"
                autoComplete="off"
                enterKeyHint="done"
                data-invalid={promoStatus === 'error' || undefined}
                aria-label={t.t('checkout.promo')}
              />
              <Btn type="submit" kind="secondary" size="md" disabled={!promo.trim()} loading={!!c.draft.promoCode && c.recalculating && promoStatus === null}>
                {t.t('action.apply')}
              </Btn>
            </form>
          )}
          {promoStatus === 'error' ? <p className="a2-error">{promoErrorText}</p> : promoStatus !== 'ok' ? <p className="a2-note">{t.t('checkout.promoHint')}</p> : null}
        </section>

        {/* comment */}
        <section className="a2-sec">
          <h2 className="a2-h2">{t.t('checkout.comment')}</h2>
          <textarea
            className="a2-input a2-textarea"
            rows={3}
            maxLength={300}
            value={c.draft.comment}
            onChange={(e) => c.setDraft({ comment: e.target.value })}
            placeholder={t.t('checkout.commentPlaceholder')}
            aria-label={t.t('checkout.comment')}
          />
        </section>

        {/* items */}
        <section className="a2-sec">
          <h2 className="a2-h2">{t.t('checkout.items')}</h2>
          <ul className="a2-items">
            {c.lines.map((l) => {
              const ql = quote?.lines.find((x) => x.key === l.key)
              return (
                <li key={l.key} className="a2-item" data-off={ql && !ql.available ? true : undefined}>
                  <Img image={l.image} alt={t.l(l.title)} sizes="56px" className="a2-item__img" />
                  <span className="a2-item__body">
                    <span className="a2-item__title">{t.l(l.title)}</span>
                    <span className="a2-muted">{[t.l(l.selectionLabel), t.t('a.g2.qty', { n: l.qty })].filter(Boolean).join(' · ')}</span>
                    {ql && !ql.available ? <span className="a2-error">{t.t('cart.unavailable')}</span> : null}
                  </span>
                  <span className="a2-item__sum">{t.money(ql?.lineTotal ?? l.unitPrice)}</span>
                </li>
              )
            })}
          </ul>
          {c.unavailable ? (
            <p className="a2-error">
              {t.t('checkout.errorStock')}{' '}
              <Tap flat className="a2-textbtn" onClick={() => nav.switchTab('cart')}>
                {t.t('cart.title')}
              </Tap>
            </p>
          ) : null}
        </section>

        {/* totals */}
        <section className="a2-sec">
          <h2 className="a2-h2">{t.t('cart.summary')}</h2>
          {c.quoteQuery.isError && !quote ? (
            <ErrorState compact error={c.quoteQuery.error} onRetry={() => void c.quoteQuery.refetch()} />
          ) : !c.address ? (
            <p className="a2-muted">{t.t('a.g2.noAddrCart')}</p>
          ) : (
            <Totals quote={quote} recalculating={c.recalculating} totalLabel={t.t('cart.total')} />
          )}
          {eta ? <p className="a2-eta">{t.t('checkout.eta', eta)}</p> : null}
          <p className="a2-note">
            {t.t('cart.calcNote')} · {t.t('checkout.duplicateSafe')}
          </p>
        </section>
      </div>

      <AddressSheet
        open={addrOpen}
        onClose={() => setAddrOpen(false)}
        mode="pick"
        selectedId={c.address?.id ?? null}
        onPick={(id) => c.setDraft({ addressId: id })}
        startWithForm={!c.addressesLoading && !c.addresses.length}
      />
    </Screen>
  )
}
