import { ChevronDown, MapPin, Plus } from 'lucide-react'
import { useState } from 'react'
import type { Address, L10n } from '../../../../shared/types'
import { useT } from '../../../../shared/i18n'
import { ru } from '../../../../shared/i18n/ru'
import { uz } from '../../../../shared/i18n/uz'
import { REGIONS, formatPhone, isValidUzPhone } from '../../../../shared/demo/user'
import { uid } from '../../../../shared/lib/id'
import { useMe, useSaveAddress } from '../../../../shared/query/hooks'
import { useCheckoutDraft } from '../../../../shared/store/checkout'
import { Sheet } from '../../../../shared/ui/Sheet'
import { Tap } from '../../../../shared/ui/Tap'
import { Radio, Spinner, Switch } from '../bits'

type LabelKind = 'home' | 'work' | 'other'
const LABELS: LabelKind[] = ['home', 'work', 'other']
const labelL10n = (k: LabelKind): L10n => ({ ru: ru[`address.${k}`], uz: uz[`address.${k}`] })

/** "90 123 45 67" from up to 9 local digits. */
const fmtLocal = (d: string) => [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ')

export function addressLine(a: Address, l: (v: L10n) => string): string {
  return [a.street, a.apartment, a.city, l(a.region)].filter(Boolean).join(', ')
}

/** Address picker + "new address" form in one bottom sheet. */
export function AddressSheet({ open, onClose, addresses, currentId, startInForm }: { open: boolean; onClose: () => void; addresses: Address[]; currentId: string | null; startInForm?: boolean }) {
  const t = useT()
  const [mode, setMode] = useState<'list' | 'form'>(startInForm ? 'form' : 'list')
  const save = useSaveAddress()
  const me = useMe().data
  const [label, setLabel] = useState<LabelKind>('home')
  const [region, setRegion] = useState(0)
  const [city, setCity] = useState('')
  const [street, setStreet] = useState('')
  const [apt, setApt] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [isDefault, setDefault] = useState(false)
  const [tried, setTried] = useState(false)

  const openForm = () => {
    if (!name && me) setName(`${me.firstName} ${me.lastName}`.trim())
    if (!phone && me) setPhone(me.phone.replace(/\D/g, '').replace(/^998/, '').slice(0, 9))
    setTried(false)
    setMode('form')
  }

  const errs = {
    city: !city.trim(),
    street: !street.trim(),
    name: !name.trim(),
    phone: !isValidUzPhone(`+998${phone}`),
  }
  const invalid = Object.values(errs).some(Boolean)

  const submit = () => {
    setTried(true)
    if (invalid || save.isPending) return
    const a: Address = {
      id: uid('addr-'),
      label: labelL10n(label),
      region: REGIONS[region],
      city: city.trim(),
      street: street.trim(),
      apartment: apt.trim() || undefined,
      recipient: name.trim(),
      phone: `+998${phone}`,
      isDefault: isDefault || addresses.length === 0,
    }
    save.mutate(a, {
      onSuccess: () => {
        setMode('list')
        setCity('')
        setStreet('')
        setApt('')
        onClose()
      },
    })
  }

  const pick = (id: string) => {
    useCheckoutDraft.getState().update({ addressId: id })
    onClose()
  }

  const isForm = mode === 'form' || addresses.length === 0
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isForm ? t.t('address.new') : t.t('c.g2.chooseAddress')}
      onClosed={() => setMode(startInForm ? 'form' : 'list')}
      footer={
        isForm ? (
          <div className="flex gap-2">
            {addresses.length ? (
              <Tap className="c-btn2" onClick={() => setMode('list')}>
                {t.t('action.cancel')}
              </Tap>
            ) : null}
            <Tap className="c-cta flex-1" style={{ height: 52 }} aria-disabled={save.isPending || undefined} onClick={submit}>
              {save.isPending ? <Spinner /> : t.t('action.save')}
            </Tap>
          </div>
        ) : (
          <Tap className="c-btn2 w-full" onClick={openForm}>
            <Plus size={18} strokeWidth={2.4} />
            {t.t('action.addAddress')}
          </Tap>
        )
      }
    >
      {isForm ? (
        <div className="flex flex-col gap-3.5 px-4 pb-4">
          <div className="flex gap-2">
            {LABELS.map((k) => (
              <Tap key={k} className="c-chip" data-on={label === k} aria-pressed={label === k} onClick={() => setLabel(k)}>
                {t.t(`address.${k}`)}
              </Tap>
            ))}
          </div>
          <div>
            <label className="c-label" htmlFor="g2-region">
              {t.t('address.region')}
            </label>
            <div className="c-field">
              <select id="g2-region" value={region} onChange={(e) => setRegion(Number(e.target.value))} aria-label={t.t('c.address.selectRegion')}>
                {REGIONS.map((r, i) => (
                  <option key={i} value={i}>
                    {t.l(r)}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} className="pointer-events-none shrink-0 text-ink-3" />
            </div>
          </div>
          <Field id="g2-city" label={t.t('address.city')} value={city} onChange={setCity} placeholder={t.t('c.g2.cityPh')} error={tried && errs.city ? t.t('address.required') : null} autoComplete="address-level2" />
          <Field id="g2-street" label={t.t('address.street')} value={street} onChange={setStreet} placeholder={t.t('c.g2.streetPh')} error={tried && errs.street ? t.t('address.required') : null} autoComplete="street-address" />
          <Field id="g2-apt" label={t.t('address.apartment')} value={apt} onChange={setApt} placeholder={t.t('c.g2.aptPh')} />
          <Field id="g2-name" label={t.t('address.recipient')} value={name} onChange={setName} placeholder={t.t('c.g2.namePh')} error={tried && errs.name ? t.t('address.required') : null} autoComplete="name" />
          <div>
            <label className="c-label" htmlFor="g2-phone">
              {t.t('address.phone')}
            </label>
            <div className="c-field" data-invalid={(tried && errs.phone) || undefined}>
              <span className="c-mono text-[16px] font-semibold text-ink-2">+998</span>
              <input
                id="g2-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="90 123 45 67"
                value={fmtLocal(phone)}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').replace(/^998(?=\d{9})/, '').slice(0, 9))}
              />
            </div>
            {tried && errs.phone ? <p className="c-err">{t.t('address.phoneInvalid')}</p> : null}
          </div>
          <Tap flat className="g2-switchrow" aria-pressed={isDefault} onClick={() => setDefault((v) => !v)}>
            <span className="flex-1 text-left text-[15px] font-semibold">{t.t('address.default')}</span>
            <Switch on={isDefault} />
          </Tap>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 px-4 pb-4">
          {addresses.map((a) => (
            <Tap key={a.id} flat className="c-pick" data-on={a.id === currentId} aria-pressed={a.id === currentId} onClick={() => pick(a.id)}>
              <span className="c-pick-ico">
                <MapPin size={20} strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[15px] font-semibold">
                  {t.l(a.label)}
                  {a.isDefault ? <span className="g2-tag">{t.t('address.default')}</span> : null}
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">{addressLine(a, t.l)}</span>
                <span className="c-mono mt-0.5 block text-[12px] text-ink-3">
                  {a.recipient} · <span className="whitespace-nowrap">{formatPhone(a.phone)}</span>
                </span>
              </span>
              <Radio on={a.id === currentId} />
            </Tap>
          ))}
        </div>
      )}
    </Sheet>
  )
}

function Field({ id, label, value, onChange, placeholder, error, autoComplete }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; error?: string | null; autoComplete?: string }) {
  return (
    <div>
      <label className="c-label" htmlFor={id}>
        {label}
      </label>
      <div className="c-field" data-invalid={!!error || undefined}>
        <input id={id} value={value} placeholder={placeholder} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} />
      </div>
      {error ? <p className="c-err">{error}</p> : null}
    </div>
  )
}
