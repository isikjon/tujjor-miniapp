import { AlertTriangle, ChevronRight, CreditCard, Lock, MapPin, ShoppingCart, Store, Tag, Truck, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { formatPhone } from '../../../shared/demo/user'
import { useT } from '../../../shared/i18n'
import { useNav } from '../../../shared/nav/context'
import { Screen } from '../../../shared/nav/Screen'
import { useCheckout } from '../../../shared/query/hooks'
import type { DeliveryMethod, PaymentMethod } from '../../../shared/types'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { Tap } from '../../../shared/ui/Tap'
import { Button, EmptyView } from '../ui'
import { AddressSheet } from '../ui/g2/AddressSheet'
import { Card, RadioRow, Totals, useEtaRange } from '../ui/g2/parts'
import '../styles/g2.css'

const DELIVERY: DeliveryMethod[] = ['courier', 'pickup']
const PAYMENT: PaymentMethod[] = ['payme', 'click', 'card']

export default function Checkout() {
  const t = useT()
  const nav = useNav()
  const c = useCheckout()
  const [addrOpen, setAddrOpen] = useState(false)
  const [promo, setPromo] = useState(c.draft.promoCode ?? '')
  const [allItems, setAllItems] = useState(false)
  const attempted = useRef(false)
  const lastLines = useRef(c.lines)
  if (c.lines.length) lastLines.current = c.lines
  const lines = c.lines.length ? c.lines : lastLines.current
  const quote = c.quote
  const eta = useEtaRange(quote?.etaDays)

  const header = (
    <div className="b-g2-top">
      <h1 className="b-g2-top__title">{t.t('checkout.title')}</h1>
    </div>
  )

  if (!c.lines.length && !attempted.current) {
    return (
      <Screen header={header}>
        <EmptyView
          className="pt-16"
          icon={<ShoppingCart size={30} strokeWidth={2} />}
          title={t.t('checkout.empty')}
          action={<Button onClick={() => nav.switchTab('cart')}>{t.t('cart.title')}</Button>}
        />
      </Screen>
    )
  }

  const applyPromo = () => {
    const code = promo.trim().toUpperCase()
    setPromo(code)
    c.setDraft({ promoCode: code || null })
  }
  const promoErr = quote?.promoError === 'invalid' ? t.t('b.promo.invalid') : quote?.promoError === 'min_total' ? t.t('b.g2.promoMin') : null
  const promoOk = quote?.promoCode && quote.promoDiscount > 0 ? quote : null

  const submit = () => {
    attempted.current = true
    c.submit()
  }

  const footer = (
    <div className="b-g2-bar b-g2-bar--col">
      {c.submitError ? (
        <div className="b-g2-err" role="alert">
          <AlertTriangle size={18} strokeWidth={2.4} aria-hidden="true" />
          <span className="flex-1">
            {c.submitError}
            <span className="b-g2-err__sub">{t.t('checkout.duplicateSafe')}</span>
          </span>
          <Button kind="ghost" size="sm" onClick={c.retry}>
            {t.t('action.retry')}
          </Button>
        </div>
      ) : null}
      {!c.address && !c.addressesLoading ? (
        <Button block size="lg" icon={<MapPin size={18} strokeWidth={2.4} aria-hidden="true" />} onClick={() => setAddrOpen(true)}>
          {t.t('checkout.noAddress')}
        </Button>
      ) : (
        <Button block size="lg" loading={c.submitting} disabled={!c.canSubmit} onClick={submit}>
          {c.submitting ? t.t('checkout.processing') : quote ? t.t('action.pay', { amount: t.money(quote.total) }) : t.t('action.placeOrder')}
        </Button>
      )}
      <p className="b-g2-note">
        <Lock size={12} strokeWidth={2.4} aria-hidden="true" />
        {t.t('checkout.demoPayment')}
      </p>
    </div>
  )

  const shown = allItems ? lines : lines.slice(0, 3)

  return (
    <Screen header={header} footer={footer}>
      {/* address */}
      <Card title={t.t('checkout.address')}>
        {c.addressesLoading ? (
          <div className="b-addr" aria-hidden="true">
            <Skeleton style={{ width: 40, height: 40, borderRadius: 12 }} />
            <div className="flex-1">
              <Skeleton style={{ height: 15, width: '50%' }} />
              <Skeleton style={{ height: 13, width: '80%', marginTop: 6 }} />
            </div>
          </div>
        ) : (
          <Tap flat className="b-addr" onClick={() => setAddrOpen(true)} data-empty={!c.address}>
            <span className="b-g2-ico" data-tone={c.address ? 'accent' : 'hot'}>
              <MapPin size={18} strokeWidth={2.2} aria-hidden="true" />
            </span>
            {c.address ? (
              <span className="min-w-0 flex-1 text-left">
                <span className="b-addr-row__label">
                  {t.l(c.address.label)} · {t.l(c.address.region)}
                </span>
                <span className="b-addr-row__line">
                  {c.address.city}, {c.address.street}
                  {c.address.apartment ? `, ${c.address.apartment}` : ''}
                </span>
                <span className="b-addr-row__sub">
                  {c.address.recipient} · {formatPhone(c.address.phone)}
                </span>
              </span>
            ) : (
              <span className="min-w-0 flex-1 text-left">
                <span className="b-addr-row__label" data-tone="hot">
                  {t.t('checkout.noAddress')}
                </span>
                <span className="b-addr-row__sub">{t.t('b.g2.addressEmpty')}</span>
              </span>
            )}
            <ChevronRight size={20} strokeWidth={2.2} className="text-ink-3" aria-hidden="true" />
          </Tap>
        )}
      </Card>

      {/* delivery */}
      <Card title={t.t('checkout.delivery')}>
        <div className="b-g2-radios" role="radiogroup">
          {DELIVERY.map((m) => {
            const on = c.draft.delivery === m
            const price = on && quote ? (quote.localDelivery === 0 ? t.t('b.g2.free') : t.money(quote.localDelivery)) : m === 'pickup' ? t.t('b.g2.free') : null
            return (
              <RadioRow
                key={m}
                on={on}
                icon={m === 'courier' ? <Truck size={18} strokeWidth={2.2} aria-hidden="true" /> : <Store size={18} strokeWidth={2.2} aria-hidden="true" />}
                title={t.t(`delivery.${m}`)}
                sub={m === 'pickup' ? t.t('delivery.pickupDesc') : eta ?? t.t('product.deliveryTo')}
                aside={price ? <span className="b-g2-radio__price b-num" data-free={price === t.t('b.g2.free')}>{price}</span> : null}
                onClick={() => c.setDraft({ delivery: m })}
              />
            )
          })}
        </div>
      </Card>

      {/* payment */}
      <Card title={t.t('checkout.payment')}>
        <div className="b-g2-radios" role="radiogroup">
          {PAYMENT.map((p) => (
            <RadioRow
              key={p}
              on={c.draft.payment === p}
              icon={
                p === 'card' ? (
                  <CreditCard size={18} strokeWidth={2.2} aria-hidden="true" />
                ) : (
                  <span className="b-pay-logo" data-pay={p}>
                    {p === 'payme' ? 'P' : 'C'}
                  </span>
                )
              }
              title={t.t(`payment.${p}`)}
              sub={t.t(`payment.${p}.desc`)}
              onClick={() => c.setDraft({ payment: p })}
            />
          ))}
        </div>
      </Card>

      {/* promo */}
      <Card title={t.t('checkout.promo')}>
        {promoOk ? (
          <div className="b-promo-ok">
            <Tag size={18} strokeWidth={2.4} aria-hidden="true" />
            <span className="flex-1">{t.t('b.g2.promoApplied', { code: promoOk.promoCode ?? '', amount: t.money(promoOk.promoDiscount) })}</span>
            <Tap
              className="b-promo-ok__x"
              aria-label={t.t('b.promo.remove')}
              onClick={() => {
                setPromo('')
                c.setDraft({ promoCode: null })
              }}
            >
              <X size={18} strokeWidth={2.4} aria-hidden="true" />
            </Tap>
          </div>
        ) : (
          <>
            <form
              className="b-promo"
              onSubmit={(e) => {
                e.preventDefault()
                applyPromo()
              }}
            >
              <input
                className="b-input"
                value={promo}
                onChange={(e) => setPromo(e.target.value)}
                placeholder={t.t('checkout.promoPlaceholder')}
                autoCapitalize="characters"
                autoComplete="off"
                enterKeyHint="done"
                data-err={!!promoErr}
                aria-invalid={!!promoErr}
              />
              <Button type="submit" kind="secondary" disabled={!promo.trim()}>
                {t.t('action.apply')}
              </Button>
            </form>
            {promoErr ? <p className="b-field__err mt-2">{promoErr}</p> : <p className="b-field__hint mt-2">{t.t('checkout.promoHint')}</p>}
          </>
        )}
      </Card>

      {/* comment */}
      <Card title={t.t('checkout.comment')}>
        <textarea
          className="b-input b-g2-textarea"
          rows={2}
          maxLength={300}
          value={c.draft.comment}
          onChange={(e) => c.setDraft({ comment: e.target.value })}
          placeholder={t.t('checkout.commentPlaceholder')}
        />
      </Card>

      {/* items */}
      <Card title={t.t('checkout.items')} aside={<span className="b-g2-card__aside b-num">{t.tp('cart.items', lines.reduce((n, l) => n + l.qty, 0))}</span>}>
        <ul className="b-co-items">
          {shown.map((l) => {
            const ql = quote?.lines.find((x) => x.key === l.key)
            return (
              <li key={l.key} className="b-co-item" data-na={ql ? !ql.available : false}>
                <span className="b-co-item__img">
                  <Img image={l.image} alt={t.l(l.title)} sizes="52px" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="b-co-item__title">{t.l(l.title)}</span>
                  <span className="b-co-item__sub">
                    {t.l(l.selectionLabel) ? `${t.l(l.selectionLabel)} · ` : ''}
                    {t.t('b.lineTotal', { qty: l.qty, price: t.money(ql?.unitPrice ?? l.unitPrice) })}
                  </span>
                  {ql && !ql.available ? <span className="b-cl__warn">{t.t('cart.unavailable')}</span> : null}
                </span>
                <span className="b-co-item__sum b-num">{t.money(ql?.lineTotal ?? l.unitPrice * l.qty)}</span>
              </li>
            )
          })}
        </ul>
        {lines.length > 3 ? (
          <Tap className="b-pdp__more" onClick={() => setAllItems((v) => !v)} aria-expanded={allItems}>
            {allItems ? t.t('product.showLess') : `${t.t('b.addMore')} ${lines.length - 3}`}
          </Tap>
        ) : null}
      </Card>

      {c.unavailable ? (
        <div className="b-g2-err b-g2-err--card" role="alert">
          <AlertTriangle size={18} strokeWidth={2.4} aria-hidden="true" />
          <span className="flex-1">{t.t('checkout.errorStock')}</span>
          <Button kind="ghost" size="sm" onClick={() => nav.switchTab('cart')}>
            {t.t('cart.title')}
          </Button>
        </div>
      ) : null}

      {/* totals */}
      <Card title={t.t('cart.summary')}>
        <Totals quote={quote} recalculating={c.recalculating} eta={eta} />
      </Card>

      <p className="b-g2-legal">
        {t.t('b.secureNote')}. {t.t('checkout.agree')}
      </p>

      <AddressSheet open={addrOpen} onClose={() => setAddrOpen(false)} addresses={c.addresses} currentId={c.address?.id ?? null} onPick={(id) => c.setDraft({ addressId: id })} />
    </Screen>
  )
}

