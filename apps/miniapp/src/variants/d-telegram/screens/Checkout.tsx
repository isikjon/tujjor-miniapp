import { AlertTriangle, CreditCard, MapPin, Percent, Plus, ShoppingCart, Smartphone, Store, Truck, Wallet } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useT } from '../../../shared/i18n'
import { useNav } from '../../../shared/nav/context'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { useCheckout } from '../../../shared/query/hooks'
import { toast } from '../../../shared/store/toast'
import { useMainButton } from '../../../shared/telegram/hooks'
import type { PaymentMethod } from '../../../shared/types'
import { Img } from '../../../shared/ui/Img'
import { Tap } from '../../../shared/ui/Tap'
import { Block, Cell, CheckCell, Group } from '../ui/Cell'
import { EmptyView, PageTitle, Spinner, Squircle, type SquircleColor } from '../ui/controls'
import { AddressSheet } from '../ui/g2/AddressSheet'
import { fmtPhone, Totals } from '../ui/g2/parts'
import { dateRange } from '../ui/lib'
import '../styles/g2.css'

const PAYMENTS: Array<{ id: PaymentMethod; color: SquircleColor; Icon: typeof Wallet }> = [
  { id: 'payme', color: 'teal', Icon: Wallet },
  { id: 'click', color: 'blue', Icon: Smartphone },
  { id: 'card', color: 'indigo', Icon: CreditCard },
]

export default function CheckoutScreen() {
  const t = useT()
  const nav = useNav()
  const c = useCheckout()
  const q = c.quote
  const [sheet, setSheet] = useState<null | 'list' | 'form'>(null)
  const [promo, setPromo] = useState('')
  const errRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!c.submitError) return
    toast({ text: c.submitError, tone: 'error' })
    errRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [c.submitError])

  const noAddress = !c.address && !c.addressesLoading
  useMainButton(
    sheet || !c.lines.length
      ? null
      : noAddress
        ? { text: t.t('d.checkout.addAddressFirst'), onClick: () => setSheet('form') }
        : {
            text: q ? t.t('action.pay', { amount: t.money(q.total) }) : t.t('cart.calculating'),
            onClick: c.submit,
            active: c.canSubmit,
            progress: c.submitting || (!q && c.recalculating),
          },
  )

  if (!c.lines.length) {
    return (
      <Screen>
        <PageTitle>{t.t('checkout.title')}</PageTitle>
        <EmptyView
          icon={<ShoppingCart size={44} strokeWidth={1.6} />}
          title={t.t('checkout.empty')}
          action={
            <Tap className="d-btn" onClick={() => (nav.canGoBack ? nav.back() : nav.switchTab('cart'))}>
              {t.t('d.checkout.backToCart')}
            </Tap>
          }
        />
      </Screen>
    )
  }

  const units = c.lines.reduce((n, l) => n + l.qty, 0)
  const localSum = c.lines.reduce((n, l) => n + l.unitPrice * l.qty, 0)
  const unavailableKeys = new Set(q?.lines.filter((l) => !l.available).map((l) => l.key) ?? [])
  const eta = q ? dateRange(t, q.etaDays) : null
  const promoApplied = !!q?.promoCode && !q.promoError && !!c.draft.promoCode
  const promoError = c.draft.promoCode && q?.promoError ? q.promoError : null
  const applyPromo = () => {
    const code = promo.trim().toUpperCase()
    if (!code) return
    c.setDraft({ promoCode: code })
  }
  const a = c.address

  return (
    <Screen>
      <PageTitle>{t.t('checkout.title')}</PageTitle>

      {c.unavailable ? (
        <Group className="g2-first">
          <Cell
            icon={
              <Squircle color="red">
                <AlertTriangle size={17} strokeWidth={2.2} />
              </Squircle>
            }
            title={t.t('d.checkout.unavailable')}
            tone="destructive"
            wrap
          />
          <Cell title={t.t('d.checkout.backToCart')} tone="link" onClick={() => (nav.canGoBack ? nav.back() : nav.switchTab('cart'))} />
        </Group>
      ) : null}

      <Group header={t.t('checkout.address')} className={c.unavailable ? undefined : 'g2-first'}>
        {c.addressesLoading ? (
          <div className="d-cell" aria-hidden="true">
            <span className="skeleton g2-sk" style={{ width: 29, height: 29 }} />
            <span className="d-cell-body">
              <span className="skeleton g2-sk" style={{ width: '70%', height: 16 }} />
              <span className="skeleton g2-sk" style={{ width: '50%', height: 13, marginTop: 6 }} />
            </span>
          </div>
        ) : a ? (
          <Cell
            icon={
              <Squircle color="red">
                <MapPin size={17} strokeWidth={2.2} />
              </Squircle>
            }
            title={`${a.street}${a.apartment ? `, ${a.apartment}` : ''}`}
            subtitle={
              <>
                {a.city}, {t.l(a.region)}
                <br />
                {a.recipient} · {fmtPhone(a.phone)}
              </>
            }
            chevron
            wrap
            onClick={() => setSheet('list')}
          />
        ) : (
          <Cell
            icon={
              <Squircle color="accent">
                <Plus size={18} strokeWidth={2.6} />
              </Squircle>
            }
            title={t.t('action.addAddress')}
            tone="link"
            onClick={() => setSheet('form')}
          />
        )}
      </Group>

      <Group header={t.t('checkout.delivery')} footer={eta ? t.t('checkout.eta', eta) : undefined}>
        <CheckCell
          checked={c.draft.delivery === 'courier'}
          icon={
            <Squircle color="orange">
              <Truck size={17} strokeWidth={2.2} />
            </Squircle>
          }
          title={t.t('delivery.courier')}
          subtitle={
            c.draft.delivery === 'courier' && q
              ? `${q.localDelivery ? t.money(q.localDelivery) : t.t('cart.free')}${eta ? ` · ${t.t('d.checkout.etaDates', eta)}` : ''}`
              : t.t('d.checkout.priceOnSelect')
          }
          onClick={() => c.setDraft({ delivery: 'courier' })}
        />
        <CheckCell
          checked={c.draft.delivery === 'pickup'}
          icon={
            <Squircle color="green">
              <Store size={17} strokeWidth={2.2} />
            </Squircle>
          }
          title={t.t('delivery.pickup')}
          subtitle={c.draft.delivery === 'pickup' && eta ? `${t.t('delivery.pickupDesc')} · ${t.t('d.checkout.etaDates', eta)}` : t.t('delivery.pickupDesc')}
          onClick={() => c.setDraft({ delivery: 'pickup' })}
        />
      </Group>

      <Group header={t.t('checkout.payment')} footer={t.t('checkout.demoPayment')}>
        {PAYMENTS.map(({ id, color, Icon }) => (
          <CheckCell
            key={id}
            checked={c.draft.payment === id}
            icon={
              <Squircle color={color}>
                <Icon size={17} strokeWidth={2.2} />
              </Squircle>
            }
            title={t.t(`payment.${id}`)}
            subtitle={t.t(`payment.${id}.desc`)}
            onClick={() => c.setDraft({ payment: id })}
          />
        ))}
      </Group>

      <Group
        header={t.t('checkout.promo')}
        footer={
          promoError ? (
            <span className="d-field-error">
              {promoError === 'min_total' ? t.t('d.g2.promoMin', { code: c.draft.promoCode ?? '' }) : t.t('d.checkout.promoInvalid')}
            </span>
          ) : promoApplied ? undefined : (
            t.t('checkout.promoHint')
          )
        }
      >
        {promoApplied ? (
          <Cell
            icon={
              <Squircle color="green">
                <Percent size={17} strokeWidth={2.4} />
              </Squircle>
            }
            title={t.t('checkout.promoApplied', { code: q?.promoCode ?? '' })}
            after={
              <Tap
                className="g2-text-btn"
                haptic="light"
                onClick={() => {
                  c.setDraft({ promoCode: null })
                  setPromo('')
                }}
              >
                {t.t('d.checkout.promoRemove')}
              </Tap>
            }
          />
        ) : (
          <Block className="g2-field">
            <input
              className="d-input g2-promo-input"
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyPromo()
              }}
              placeholder={t.t('checkout.promoPlaceholder')}
              aria-label={t.t('checkout.promo')}
              autoCapitalize="characters"
              autoComplete="off"
              enterKeyHint="done"
            />
            {c.draft.promoCode && c.recalculating ? (
              <Spinner size="sm" />
            ) : (
              <Tap className="g2-text-btn" disabled={!promo.trim()} onClick={applyPromo}>
                {t.t('d.checkout.promoApply')}
              </Tap>
            )}
          </Block>
        )}
      </Group>

      <Group header={t.t('checkout.comment')}>
        <textarea
          className="d-textarea"
          rows={2}
          maxLength={300}
          value={c.draft.comment}
          onChange={(e) => c.setDraft({ comment: e.target.value })}
          placeholder={t.t('checkout.commentPlaceholder')}
          aria-label={t.t('checkout.comment')}
        />
      </Group>

      <Group header={t.t('d.checkout.itemsCount', { n: units })}>
        {c.lines.map((l) => (
          <Cell
            key={l.key}
            to={paths.product(l.productId)}
            icon={<Img image={l.image} alt="" sizes="44px" className="g2-thumb-44" />}
            title={t.l(l.title)}
            subtitle={
              <>
                {t.l(l.selectionLabel) ? (
                  <>
                    {t.l(l.selectionLabel)}
                    <br />
                  </>
                ) : null}
                {t.t('d.checkout.qtyPrice', { qty: l.qty, price: t.money(l.unitPrice) })}
                {l.qty > 1 ? ` = ${t.money(l.unitPrice * l.qty)}` : ''}
                {unavailableKeys.has(l.key) ? <span className="d-field-error"> · {t.t('cart.unavailable')}</span> : null}
              </>
            }
            sep={75}
          />
        ))}
      </Group>

      <Group
        header={t.t('cart.summary')}
        headerRight={
          c.recalculating && q ? (
            <span className="g2-recalc">
              <Spinner size="sm" /> {t.t('d.cart.recalc')}
            </span>
          ) : null
        }
        footer={
          <>
            <p>{t.t('cart.calcNote')}</p>
            <p>{t.t('checkout.agree')}</p>
          </>
        }
      >
        <Totals quote={q} loading={!q && c.recalculating} fallbackItems={{ count: units, sum: localSum }} t={t} />
      </Group>

      {c.submitError ? (
        <div ref={errRef}>
          <Group footer={t.t('checkout.duplicateSafe')}>
            <Cell
              icon={
                <Squircle color="red">
                  <AlertTriangle size={17} strokeWidth={2.2} />
                </Squircle>
              }
              title={c.submitError}
              wrap
              after={
                <Tap className="g2-text-btn" onClick={c.retry} disabled={c.submitting}>
                  {t.t('action.retry')}
                </Tap>
              }
            />
          </Group>
        </div>
      ) : null}

      <AddressSheet
        open={sheet !== null}
        initialMode={sheet ?? 'list'}
        onClose={() => setSheet(null)}
        selectedId={a?.id ?? null}
        onSelect={(id) => c.setDraft({ addressId: id })}
      />
    </Screen>
  )
}
