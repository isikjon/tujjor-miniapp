import { Check, MapPin, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatPhone, isValidUzPhone, REGIONS } from '../../../../shared/demo/user'
import { useT } from '../../../../shared/i18n'
import { uid } from '../../../../shared/lib/id'
import { useSaveAddress } from '../../../../shared/query/hooks'
import type { Address, L10n } from '../../../../shared/types'
import { Sheet } from '../../../../shared/ui/Sheet'
import { Tap } from '../../../../shared/ui/Tap'
import { Button, Chip } from '../kit'

type LabelKind = 'home' | 'work' | 'other'
const LABELS: Record<LabelKind, L10n> = {
  home: { ru: 'Дом', uz: 'Uy' },
  work: { ru: 'Работа', uz: 'Ish' },
  other: { ru: 'Другое', uz: 'Boshqa' },
}

interface Form {
  label: LabelKind
  region: number
  city: string
  street: string
  apartment: string
  recipient: string
  phone: string
  isDefault: boolean
}
const EMPTY: Form = { label: 'home', region: 0, city: '', street: '', apartment: '', recipient: '', phone: '', isDefault: false }

/** Checkout address picker: saved list (radio) + "new address" form with validation (+998 phone). */
export function AddressSheet({ open, onClose, addresses, currentId, onPick }: { open: boolean; onClose: () => void; addresses: Address[]; currentId: string | null; onPick: (id: string) => void }) {
  const t = useT()
  const save = useSaveAddress()
  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [f, setF] = useState<Form>(EMPTY)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (!open) return
    setMode(addresses.length ? 'list' : 'form')
    setF({ ...EMPTY, isDefault: !addresses.length })
    setTried(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }))
  const phoneFull = `+998${f.phone}`
  const errors = {
    city: !f.city.trim(),
    street: !f.street.trim(),
    recipient: !f.recipient.trim(),
    phone: !isValidUzPhone(phoneFull),
  }
  const invalid = Object.values(errors).some(Boolean)

  const submit = () => {
    setTried(true)
    if (invalid || save.isPending) return
    const a: Address = {
      id: uid('addr-'),
      label: LABELS[f.label],
      region: REGIONS[f.region],
      city: f.city.trim(),
      street: f.street.trim(),
      apartment: f.apartment.trim() || undefined,
      recipient: f.recipient.trim(),
      phone: phoneFull,
      isDefault: f.isDefault,
    }
    save.mutate(a, { onSuccess: () => onClose() })
  }

  const err = (k: keyof typeof errors, text = t.t('address.required')) => (tried && errors[k] ? <span className="b-field__err">{text}</span> : null)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={mode === 'list' ? t.t('b.addressPick') : t.t('address.new')}
      footer={
        mode === 'list' ? (
          <Button block size="lg" kind="secondary" icon={<Plus size={18} strokeWidth={2.6} aria-hidden="true" />} onClick={() => setMode('form')}>
            {t.t('action.addAddress')}
          </Button>
        ) : (
          <div className="b-sheet-foot">
            {addresses.length ? (
              <Button kind="ghost" size="lg" onClick={() => setMode('list')}>
                {t.t('action.cancel')}
              </Button>
            ) : null}
            <Button size="lg" loading={save.isPending} onClick={submit}>
              {t.t('b.g2.saveAddress')}
            </Button>
          </div>
        )
      }
    >
      {mode === 'list' ? (
        <div className="b-sheet-list" role="radiogroup">
          {addresses.map((a) => {
            const on = a.id === currentId
            return (
              <Tap
                key={a.id}
                flat
                role="radio"
                aria-checked={on}
                className="b-sheet-row b-addr-row"
                data-on={on}
                onClick={() => {
                  onPick(a.id)
                  onClose()
                }}
              >
                <span className="b-g2-ico" data-tone={on ? 'accent' : 'muted'}>
                  <MapPin size={18} strokeWidth={2.2} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="b-addr-row__label">
                    {t.l(a.label)} · {t.l(a.region)}
                  </span>
                  <span className="b-addr-row__line">
                    {a.city}, {a.street}
                    {a.apartment ? `, ${a.apartment}` : ''}
                  </span>
                  <span className="b-addr-row__sub">
                    {a.recipient} · {formatPhone(a.phone)}
                  </span>
                </span>
                {on ? <Check size={20} strokeWidth={2.6} className="b-sheet-row__check" aria-hidden="true" /> : null}
              </Tap>
            )
          })}
        </div>
      ) : (
        <div className="b-addr-form">
          <div className="b-fsec__chips">
            {(Object.keys(LABELS) as LabelKind[]).map((k) => (
              <Chip key={k} tone="tile" on={f.label === k} onClick={() => set('label', k)}>
                {t.t(`address.${k}`)}
              </Chip>
            ))}
          </div>
          <label className="b-field">
            <span className="b-field__label">{t.t('address.region')}</span>
            <select className="b-input" value={f.region} onChange={(e) => set('region', Number(e.target.value))}>
              {REGIONS.map((r, i) => (
                <option key={i} value={i}>
                  {t.l(r)}
                </option>
              ))}
            </select>
          </label>
          <label className="b-field">
            <span className="b-field__label">{t.t('address.city')}</span>
            <input className="b-input" value={f.city} onChange={(e) => set('city', e.target.value)} autoComplete="address-level2" data-err={tried && errors.city} />
            {err('city')}
          </label>
          <label className="b-field">
            <span className="b-field__label">{t.t('address.street')}</span>
            <input className="b-input" value={f.street} onChange={(e) => set('street', e.target.value)} autoComplete="address-line1" data-err={tried && errors.street} />
            {err('street')}
          </label>
          <label className="b-field">
            <span className="b-field__label">{t.t('address.apartment')}</span>
            <input className="b-input" value={f.apartment} onChange={(e) => set('apartment', e.target.value)} autoComplete="address-line2" />
          </label>
          <label className="b-field">
            <span className="b-field__label">{t.t('address.recipient')}</span>
            <input className="b-input" value={f.recipient} onChange={(e) => set('recipient', e.target.value)} autoComplete="name" data-err={tried && errors.recipient} />
            {err('recipient')}
          </label>
          <label className="b-field">
            <span className="b-field__label">{t.t('address.phone')}</span>
            <span className="b-phone" data-err={tried && errors.phone}>
              <span className="b-phone__cc">+998</span>
              <input
                className="b-phone__input b-num"
                value={f.phone}
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={9}
                placeholder="90 123 45 67"
                onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 9))}
              />
            </span>
            {tried && errors.phone ? <span className="b-field__err">{t.t('address.phoneInvalid')}</span> : <span className="b-field__hint">{t.t('b.phoneHint')}</span>}
          </label>
          <Tap flat className="b-switch-row" role="switch" aria-checked={f.isDefault} onClick={() => set('isDefault', !f.isDefault)}>
            <span className="b-switch-row__text">
              <span className="b-switch-row__title">{t.t('address.default')}</span>
            </span>
            <span className="b-switch" data-on={f.isDefault} aria-hidden="true" />
          </Tap>
        </div>
      )}
    </Sheet>
  )
}
