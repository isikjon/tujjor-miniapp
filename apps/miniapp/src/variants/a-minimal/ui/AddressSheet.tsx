import { ChevronDown, Plus } from 'lucide-react'
import { useState } from 'react'
import type { Address, L10n } from '../../../shared/types'
import { REGIONS, formatPhone, isValidUzPhone } from '../../../shared/demo/user'
import { useT } from '../../../shared/i18n'
import { uid } from '../../../shared/lib/id'
import { useBackHandler } from '../../../shared/nav/back'
import { useAddresses, useMe, useSaveAddress } from '../../../shared/query/hooks'
import { Sheet } from '../../../shared/ui/Sheet'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { Btn, Chip, RadioMark, SwitchMark } from './controls'

interface AddressSheetProps {
  open: boolean
  onClose: () => void
  /** pick: choose the delivery address for checkout · manage: choose the default address (profile). */
  mode: 'pick' | 'manage'
  selectedId?: string | null
  onPick?: (id: string) => void
  /** Open straight on the "new address" form (e.g. checkout without any address). */
  startWithForm?: boolean
}

export function AddressSheet({ open, onClose, mode, selectedId, onPick, startWithForm }: AddressSheetProps) {
  const t = useT()
  const list = useAddresses()
  const save = useSaveAddress()
  useMe() // warm the profile so the form can prefill recipient + phone
  const [step, setStep] = useState<'list' | 'form'>(startWithForm ? 'form' : 'list')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setStep(startWithForm ? 'form' : 'list')
  }
  // Telegram Back on the form returns to the list first (registered above the sheet's own handler).
  useBackHandler(open && step === 'form' && !startWithForm, () => setStep('list'))

  const addresses = list.data ?? []
  const activeId = mode === 'pick' ? selectedId : addresses.find((a) => a.isDefault)?.id

  const choose = (a: Address) => {
    if (mode === 'pick') {
      onPick?.(a.id)
      onClose()
    } else if (!a.isDefault) {
      save.mutate({ ...a, isDefault: true })
    }
  }

  const title = step === 'form' ? t.t('address.new') : t.t('address.title')

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {step === 'list' ? (
        <div className="a-sheetlist">
          {list.isPending ? (
            <div className="a-addr-skel">
              <Skeleton style={{ height: 64, borderRadius: 14 }} />
              <Skeleton style={{ height: 64, borderRadius: 14 }} />
            </div>
          ) : list.isError ? (
            <ErrorState compact error={list.error} onRetry={() => void list.refetch()} className="mx-5" />
          ) : (
            addresses.map((a) => (
              <Tap key={a.id} flat role="radio" aria-checked={a.id === activeId} className="a-addrrow" onClick={() => choose(a)}>
                <RadioMark on={a.id === activeId} />
                <span className="a-addrrow__text">
                  <span className="a-addrrow__label">
                    {t.l(a.label)}
                    {a.isDefault ? <span className="a-addrrow__tag">{t.t('address.default')}</span> : null}
                  </span>
                  <span className="a-addrrow__line">{[a.street, a.apartment].filter(Boolean).join(', ')}</span>
                  <span className="a-addrrow__line">
                    {a.city}, {t.l(a.region)}
                  </span>
                  <span className="a-addrrow__line a-addrrow__line--muted">
                    {a.recipient} · {formatPhone(a.phone)}
                  </span>
                </span>
              </Tap>
            ))
          )}
          <Tap flat className="a-addrrow a-addrrow--add" onClick={() => setStep('form')}>
            <span className="a-addrrow__plus" aria-hidden="true">
              <Plus size={18} strokeWidth={1.75} />
            </span>
            <span className="a-addrrow__label">{t.t('action.addAddress')}</span>
          </Tap>
        </div>
      ) : (
        <AddressForm
          saving={save.isPending}
          onSubmit={(a) =>
            save.mutate(a, {
              onSuccess: () => {
                if (mode === 'pick') {
                  onPick?.(a.id)
                  onClose()
                } else if (startWithForm) onClose()
                else setStep('list')
              },
            })
          }
        />
      )}
    </Sheet>
  )
}

// ── form ────────────────────────────────────────────────────────────────────

const LABELS: Array<{ key: 'address.home' | 'address.work' | 'address.other'; value: L10n }> = [
  { key: 'address.home', value: { ru: 'Дом', uz: 'Uy' } },
  { key: 'address.work', value: { ru: 'Работа', uz: 'Ish' } },
  { key: 'address.other', value: { ru: 'Другое', uz: 'Boshqa' } },
]

const digitsOf = (phone: string) => phone.replace(/\D/g, '').replace(/^998/, '').slice(0, 9)
const groupPhone = (d: string) => [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ')

function AddressForm({ onSubmit, saving }: { onSubmit: (a: Address) => void; saving: boolean }) {
  const t = useT()
  const me = useMe().data
  const [label, setLabel] = useState(0)
  const [region, setRegion] = useState(0)
  const [city, setCity] = useState('')
  const [street, setStreet] = useState('')
  const [apartment, setApartment] = useState('')
  const [recipient, setRecipient] = useState(() => (me ? `${me.firstName} ${me.lastName}` : ''))
  const [phone, setPhone] = useState(() => (me ? digitsOf(me.phone) : ''))
  const [isDefault, setIsDefault] = useState(false)
  const [tried, setTried] = useState(false)

  const errors = {
    city: !city.trim(),
    street: !street.trim(),
    recipient: !recipient.trim(),
    phone: !isValidUzPhone(`+998${phone}`),
  }
  const valid = !Object.values(errors).some(Boolean)

  const submit = () => {
    setTried(true)
    if (!valid) return
    onSubmit({
      id: uid('addr-'),
      label: LABELS[label].value,
      region: REGIONS[region],
      city: city.trim(),
      street: street.trim(),
      apartment: apartment.trim() || undefined,
      recipient: recipient.trim(),
      phone: `+998${phone}`,
      isDefault,
    })
  }

  return (
    <form
      className="a-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="a-chiprow">
        {LABELS.map((l, i) => (
          <Chip key={l.key} on={label === i} onClick={() => setLabel(i)}>
            {t.t(l.key)}
          </Chip>
        ))}
      </div>

      <label className="a-field">
        <span className="a-field__label">{t.t('address.region')}</span>
        <span className="a-select">
          <select className="a-input" value={region} onChange={(e) => setRegion(Number(e.target.value))}>
            {REGIONS.map((r, i) => (
              <option key={r.ru} value={i}>
                {t.l(r)}
              </option>
            ))}
          </select>
          <ChevronDown size={18} strokeWidth={1.75} className="a-select__icon" aria-hidden="true" />
        </span>
      </label>

      <Field label={t.t('address.city')} value={city} onChange={setCity} error={tried && errors.city ? t.t('address.required') : null} autoComplete="address-level2" />
      <Field label={t.t('address.street')} value={street} onChange={setStreet} error={tried && errors.street ? t.t('address.required') : null} autoComplete="street-address" />
      <Field label={t.t('address.apartment')} value={apartment} onChange={setApartment} autoComplete="address-line2" />
      <Field label={t.t('address.recipient')} value={recipient} onChange={setRecipient} error={tried && errors.recipient ? t.t('address.required') : null} autoComplete="name" />

      <label className="a-field">
        <span className="a-field__label">{t.t('address.phone')}</span>
        <span className="a-input a-input--phone" data-invalid={(tried && errors.phone) || undefined}>
          <span className="a-input__prefix">+998</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="90 123 45 67"
            value={groupPhone(phone)}
            onChange={(e) => setPhone(digitsOf(e.target.value))}
          />
        </span>
        {tried && errors.phone ? <span className="a-field__error">{t.t('address.phoneInvalid')}</span> : null}
      </label>

      <Tap flat role="switch" aria-checked={isDefault} className="a-togglerow" onClick={() => setIsDefault((v) => !v)}>
        <span className="a-togglerow__text">{t.t('address.default')}</span>
        <SwitchMark on={isDefault} />
      </Tap>

      <Btn type="submit" block loading={saving} className="a-form__submit">
        {t.t('action.save')}
      </Btn>
    </form>
  )
}

function Field({ label, value, onChange, error, autoComplete }: { label: string; value: string; onChange: (v: string) => void; error?: string | null; autoComplete?: string }) {
  return (
    <label className="a-field">
      <span className="a-field__label">{label}</span>
      <input className="a-input" value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} data-invalid={error ? true : undefined} enterKeyHint="next" />
      {error ? <span className="a-field__error">{error}</span> : null}
    </label>
  )
}
