import { ChevronDown, MapPin, Plus } from 'lucide-react'
import { useState } from 'react'
import type { Address, L10n, Locale } from '../../../../shared/types'
import { makeTranslator, useT } from '../../../../shared/i18n'
import { REGIONS, formatPhone, isValidUzPhone } from '../../../../shared/demo/user'
import { uid } from '../../../../shared/lib/id'
import { useAddresses, useMe, useSaveAddress } from '../../../../shared/query/hooks'
import { useCheckoutDraft } from '../../../../shared/store/checkout'
import { useSettings } from '../../../../shared/store/settings'
import { toast } from '../../../../shared/store/toast'
import { Sheet } from '../../../../shared/ui/Sheet'
import { Skeleton } from '../../../../shared/ui/Skeleton'
import { ErrorState } from '../../../../shared/ui/States'
import { Tap } from '../../../../shared/ui/Tap'
import { Radio, Spinner, Sticker } from '../bits'

interface SheetBase {
  open: boolean
  onClose: () => void
}

// ── language ──────────────────────────────────────────────────────────────
export function LanguageSheet({ open, onClose }: SheetBase) {
  const t = useT()
  const locale = useSettings((s) => s.locale)
  const setLocale = useSettings((s) => s.setLocale)
  const pick = (l: Locale) => {
    if (l !== locale) {
      setLocale(l)
      toast({ text: makeTranslator(l, null).t('toast.languageChanged'), tone: 'success' })
    }
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={t.t('language.title')}>
      <p className="mb-4 px-1 text-[14px] leading-snug text-ink-2">{t.t('c.g3.langHint')}</p>
      <div className="grid gap-2 pb-2">
        {(['ru', 'uz'] as Locale[]).map((l) => (
          <Tap key={l} className="c-g3-lang c-soft" data-on={l === locale} aria-pressed={l === locale} onClick={() => pick(l)}>
            <span className="c-g3-lang-code">{l.toUpperCase()}</span>
            <span className="flex-1 text-left text-[16px] font-[650]">{t.t(`language.${l}`)}</span>
            <Radio on={l === locale} />
          </Tap>
        ))}
      </div>
    </Sheet>
  )
}

// ── support / FAQ ─────────────────────────────────────────────────────────
export function SupportSheet({ open, onClose }: SheetBase) {
  const t = useT()
  const [openQ, setOpenQ] = useState<number | null>(1)
  return (
    <Sheet open={open} onClose={onClose} title={t.t('support.title')}>
      <div className="c-g3-support">
        <Sticker tone="lime" tilt={-3}>
          {t.t('c.g3.supportHours')}
        </Sticker>
        <p className="mt-3 text-[15px] leading-snug">{t.t('support.text')}</p>
      </div>
      <p className="c-kicker mb-2 mt-5 px-1">{t.t('support.faq')}</p>
      <div className="c-menu mb-2">
        {[1, 2, 3, 4].map((i) => {
          const on = openQ === i
          return (
            <div key={i} className="c-g3-acc" data-open={on}>
              <Tap flat className="c-g3-acc-q" aria-expanded={on} onClick={() => setOpenQ(on ? null : i)}>
                <span className="c-g3-acc-n">{String(i).padStart(2, '0')}</span>
                <span className="flex-1 text-left text-[15px] font-[650] leading-snug">{t.t(`support.q${i}`)}</span>
                <ChevronDown size={18} strokeWidth={2.2} className="c-g3-acc-chev shrink-0 text-ink-3" />
              </Tap>
              {on ? <p className="c-g3-acc-a c-rise">{t.t(`support.a${i}`)}</p> : null}
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}

// ── how it works ──────────────────────────────────────────────────────────
export function HowSheet({ open, onClose }: SheetBase) {
  const t = useT()
  return (
    <Sheet open={open} onClose={onClose} title={t.t('profile.howItWorks')}>
      <p className="mb-4 px-1 text-[14px] text-ink-2">{t.t('c.g3.howLead')}</p>
      <div className="c-how mx-0 mb-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="c-how-step">
            <span className="c-how-n">{String(i).padStart(2, '0')}</span>
            <div className="pt-1">
              <p className="text-[15.5px] font-[700]">{t.t(`home.how${i}.title`)}</p>
              <p className="mt-1 text-[13.5px] leading-snug opacity-70">{t.t(`home.how${i}.text`)}</p>
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  )
}

// ── addresses ─────────────────────────────────────────────────────────────
const RU = makeTranslator('ru', null)
const UZ = makeTranslator('uz', null)
const both = (key: string): L10n => ({ ru: RU.t(key), uz: UZ.t(key) })
const LABELS = ['address.home', 'address.work', 'address.other'] as const

interface Form {
  label: number
  region: number
  city: string
  street: string
  apartment: string
  recipient: string
  phone: string
}
type Field = 'region' | 'city' | 'street' | 'recipient' | 'phone'

export function AddressesSheet({ open, onClose }: SheetBase) {
  const t = useT()
  const q = useAddresses()
  const me = useMe()
  const save = useSaveAddress()
  const draftId = useCheckoutDraft((s) => s.addressId)
  const update = useCheckoutDraft((s) => s.update)
  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [touched, setTouched] = useState(false)
  const [form, setForm] = useState<Form>({ label: 0, region: -1, city: '', street: '', apartment: '', recipient: '', phone: '+998 ' })
  const list = q.data ?? []
  const current = list.find((a) => a.id === draftId) ?? list.find((a) => a.isDefault) ?? list[0]

  const startForm = () => {
    const u = me.data
    setForm({ label: 0, region: -1, city: '', street: '', apartment: '', recipient: u ? `${u.firstName} ${u.lastName}` : '', phone: u ? formatPhone(u.phone) : '+998 ' })
    setTouched(false)
    setMode('form')
  }
  const errors: Partial<Record<Field, string>> = {}
  if (form.region < 0) errors.region = t.t('address.required')
  if (!form.city.trim()) errors.city = t.t('address.required')
  if (!form.street.trim()) errors.street = t.t('address.required')
  if (!form.recipient.trim()) errors.recipient = t.t('address.required')
  if (!isValidUzPhone(form.phone)) errors.phone = t.t('address.phoneInvalid')
  const valid = Object.keys(errors).length === 0
  const err = (f: Field) => (touched ? errors[f] : undefined)

  const submit = () => {
    setTouched(true)
    if (!valid || save.isPending) return
    const a: Address = {
      id: uid('addr-'),
      label: both(LABELS[form.label]),
      region: REGIONS[form.region],
      city: form.city.trim(),
      street: form.street.trim(),
      apartment: form.apartment.trim() || undefined,
      recipient: form.recipient.trim(),
      phone: `+${form.phone.replace(/\D/g, '')}`,
      isDefault: list.length === 0,
    }
    save.mutate(a, { onSuccess: () => setMode('list') })
  }
  const close = () => {
    onClose()
    setMode('list')
  }

  const footer =
    mode === 'list' ? (
      <Tap className="c-cta" onClick={startForm}>
        <Plus size={20} strokeWidth={2.4} />
        {t.t('action.addAddress')}
      </Tap>
    ) : (
      <div className="flex gap-2">
        <Tap className="c-btn2 flex-none" onClick={() => setMode('list')}>
          {t.t('action.cancel')}
        </Tap>
        <Tap className="c-cta flex-1" aria-disabled={touched && !valid} onClick={submit}>
          {save.isPending ? (
            <>
              <Spinner /> {t.t('c.g3.saving')}
            </>
          ) : (
            t.t('action.save')
          )}
        </Tap>
      </div>
    )

  return (
    <Sheet open={open} onClose={close} title={mode === 'list' ? t.t('address.title') : t.t('address.new')} footer={footer}>
      {mode === 'list' ? (
        q.isPending ? (
          <div className="grid gap-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-[92px] w-full" style={{ borderRadius: 20 }} />
            ))}
          </div>
        ) : q.isError && !q.data ? (
          <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-8 text-center">
            <span className="c-row-ico mb-3" style={{ width: 56, height: 56, borderRadius: 18 }}>
              <MapPin size={26} />
            </span>
            <p className="text-[17px] font-[700]">{t.t('c.g3.noAddresses')}</p>
            <p className="mt-1.5 max-w-[280px] text-[14px] leading-snug text-ink-2">{t.t('c.g3.noAddressesHint')}</p>
          </div>
        ) : (
          <>
            <p className="mb-3 px-1 text-[13.5px] text-ink-2">{t.t('c.g3.tapToSelect')}</p>
            <div className="grid gap-2 pb-1">
              {list.map((a) => {
                const on = a.id === current?.id
                return (
                  <Tap key={a.id} className="c-g3-addr c-soft" data-on={on} aria-pressed={on} onClick={() => update({ addressId: a.id })}>
                    <Radio on={on} />
                    <span className="min-w-0 flex-1 text-left">
                      <span className="flex items-center gap-2">
                        <span className="text-[15.5px] font-[700]">{t.l(a.label)}</span>
                        {on ? (
                          <Sticker tone="lime" tilt={-2}>
                            {t.t('c.address.current')}
                          </Sticker>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-[14px] leading-snug">
                        {[t.l(a.region), a.city, a.street, a.apartment].filter(Boolean).join(', ')}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-ink-2">
                        {a.recipient} · {formatPhone(a.phone)}
                      </span>
                    </span>
                  </Tap>
                )
              })}
            </div>
          </>
        )
      ) : (
        <div className="grid gap-3.5 pb-2">
          <div className="flex flex-wrap gap-2">
            {LABELS.map((k, i) => (
              <Tap key={k} className="c-chip" data-on={form.label === i} aria-pressed={form.label === i} onClick={() => setForm({ ...form, label: i })}>
                {t.t(k)}
              </Tap>
            ))}
          </div>
          <label className="block">
            <span className="c-label">{t.t('address.region')}</span>
            <span className="c-field" data-invalid={!!err('region')}>
              <select value={form.region} onChange={(e) => setForm({ ...form, region: Number(e.target.value) })} aria-invalid={!!err('region')}>
                <option value={-1} disabled>
                  {t.t('c.address.selectRegion')}
                </option>
                {REGIONS.map((r, i) => (
                  <option key={r.ru} value={i}>
                    {t.l(r)}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} className="shrink-0 text-ink-3" />
            </span>
            {err('region') ? <p className="c-err">{err('region')}</p> : null}
          </label>
          <TextField label={t.t('address.city')} value={form.city} onChange={(v) => setForm({ ...form, city: v })} error={err('city')} autoComplete="address-level2" />
          <TextField label={t.t('address.street')} value={form.street} onChange={(v) => setForm({ ...form, street: v })} error={err('street')} autoComplete="street-address" />
          <TextField label={t.t('address.apartment')} value={form.apartment} onChange={(v) => setForm({ ...form, apartment: v })} />
          <TextField label={t.t('address.recipient')} value={form.recipient} onChange={(v) => setForm({ ...form, recipient: v })} error={err('recipient')} autoComplete="name" />
          <TextField
            label={t.t('address.phone')}
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v.startsWith('+') ? v : `+${v.replace(/^\+*/, '')}` })}
            error={err('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
          />
        </div>
      )}
    </Sheet>
  )
}

function TextField({
  label,
  value,
  onChange,
  error,
  type = 'text',
  inputMode,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  type?: string
  inputMode?: 'tel' | 'text'
  autoComplete?: string
}) {
  return (
    <label className="block">
      <span className="c-label">{label}</span>
      <span className="c-field" data-invalid={!!error}>
        <input type={type} inputMode={inputMode} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} />
      </span>
      {error ? <p className="c-err">{error}</p> : null}
    </label>
  )
}
