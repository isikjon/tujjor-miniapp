import { BadgeCheck, ChevronDown, Clock, MessageCircle, PackageCheck, Plus, Search, Truck, Wallet } from 'lucide-react'
import { useContext, useState, type CSSProperties } from 'react'
import { makeTranslator, useT, VariantMessagesContext } from '../../../../shared/i18n'
import { useAddresses, useSaveAddress } from '../../../../shared/query/hooks'
import { useSettings } from '../../../../shared/store/settings'
import { toast } from '../../../../shared/store/toast'
import { tg } from '../../../../shared/telegram/adapter'
import { REGIONS, formatPhone, isValidUzPhone } from '../../../../shared/demo/user'
import type { Address, L10n, Locale } from '../../../../shared/types'
import { Sheet } from '../../../../shared/ui/Sheet'
import { Skeleton } from '../../../../shared/ui/Skeleton'
import { Tap } from '../../../../shared/ui/Tap'
import { Block, Cell, CheckCell, Group } from '../Cell'
import { SheetBar, SheetClose, Squircle, Switch } from '../controls'

interface SheetBaseProps {
  open: boolean
  onClose: () => void
}

/* ── Support (FAQ accordion) ─────────────────────────────────────────────── */
const FAQ = [1, 2, 3, 4] as const

export function SupportSheet({ open, onClose, orderNumber }: SheetBaseProps & { orderNumber?: string }) {
  const t = useT()
  const [openQ, setOpenQ] = useState<number | null>(null)
  return (
    <Sheet open={open} onClose={onClose} title={t.t('support.title')} header={<SheetBar title={t.t('support.title')} right={<SheetClose onClose={onClose} />} />}>
      <Group footer={orderNumber ? t.t('d.g3.order.supportHint', { number: orderNumber }) : undefined}>
        <Cell icon={<Squircle color="accent"><MessageCircle size={18} strokeWidth={2.4} /></Squircle>} title={t.t('d.support.contact')} wrap />
        <Cell icon={<Squircle color="green"><Clock size={18} strokeWidth={2.4} /></Squircle>} title={t.t('d.support.hours')} wrap />
      </Group>
      <Group header={t.t('support.faq')}>
        {FAQ.map((n) => {
          const on = openQ === n
          return (
            <div key={n} className="d-block d-g3-faq" data-open={on}>
              <Tap flat className="d-cell" haptic="selection" aria-expanded={on} onClick={() => setOpenQ(on ? null : n)}>
                <span className="d-cell-body">
                  <span className="d-cell-title" data-wrap="">
                    {t.t(`support.q${n}`)}
                  </span>
                </span>
                <ChevronDown className="d-g3-faq-chev" size={18} strokeWidth={2.4} aria-hidden="true" />
              </Tap>
              {on ? <p className="d-g3-faq-a d-fade-in">{t.t(`support.a${n}`)}</p> : null}
            </div>
          )
        })}
      </Group>
    </Sheet>
  )
}

/* ── How it works ────────────────────────────────────────────────────────── */
const HOW = [
  { icon: Search, color: 'blue' },
  { icon: Wallet, color: 'green' },
  { icon: PackageCheck, color: 'orange' },
  { icon: Truck, color: 'purple' },
] as const

export function HowSheet({ open, onClose }: SheetBaseProps) {
  const t = useT()
  return (
    <Sheet open={open} onClose={onClose} title={t.t('d.how.title')} header={<SheetBar title={t.t('d.how.title')} right={<SheetClose onClose={onClose} />} />}>
      <p className="d-g3-lead">{t.t('d.how.lead')}</p>
      <Group footer={t.t('d.home.howFooter')}>
        {HOW.map(({ icon: I, color }, i) => (
          <Cell
            key={i}
            icon={
              <Squircle color={color}>
                <I size={18} strokeWidth={2.4} />
              </Squircle>
            }
            title={t.t(`home.how${i + 1}.title`)}
            subtitle={t.t(`home.how${i + 1}.text`)}
            className="d-g3-tall"
          />
        ))}
      </Group>
    </Sheet>
  )
}

/* ── Language ────────────────────────────────────────────────────────────── */
const LOCALES: Locale[] = ['ru', 'uz']

export function LanguageSheet({ open, onClose }: SheetBaseProps) {
  const t = useT()
  const locale = useSettings((s) => s.locale)
  const setLocale = useSettings((s) => s.setLocale)
  const extra = useContext(VariantMessagesContext)
  return (
    <Sheet open={open} onClose={onClose} title={t.t('language.title')} header={<SheetBar title={t.t('language.title')} right={<SheetClose onClose={onClose} />} />}>
      <Group footer={t.t('d.language.note')}>
        {LOCALES.map((l) => (
          <CheckCell
            key={l}
            checked={locale === l}
            title={t.t(`language.${l}`)}
            onClick={() => {
              if (l !== locale) {
                setLocale(l)
                toast({ text: makeTranslator(l, extra).t('d.profile.languageChanged'), tone: 'success' })
              }
              onClose()
            }}
          />
        ))}
      </Group>
    </Sheet>
  )
}

/* ── Addresses: list (tap = make default) + add form ─────────────────────── */
const LABELS: Array<{ key: 'home' | 'work' | 'other'; l10n: L10n }> = [
  { key: 'home', l10n: { ru: 'Дом', uz: 'Uy' } },
  { key: 'work', l10n: { ru: 'Работа', uz: 'Ish' } },
  { key: 'other', l10n: { ru: 'Другое', uz: 'Boshqa' } },
]

type Form = { label: number; region: number; city: string; street: string; apartment: string; recipient: string; phone: string; isDefault: boolean }
const EMPTY: Form = { label: 0, region: 0, city: '', street: '', apartment: '', recipient: '', phone: '', isDefault: true }

export function addressLine(t: ReturnType<typeof useT>, a: Address) {
  return [t.l(a.region), a.city, a.street, a.apartment].filter(Boolean).join(', ')
}

export function AddressesSheet({ open, onClose }: SheetBaseProps) {
  const t = useT()
  const q = useAddresses()
  const save = useSaveAddress()
  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [f, setF] = useState<Form>(EMPTY)
  const [tried, setTried] = useState(false)
  const list = q.data ?? []

  const raw = f.phone.replace(/\D/g, '')
  const digits = (raw.length > 9 && raw.startsWith('998') ? raw.slice(3) : raw).slice(0, 9)
  const errors = {
    city: !f.city.trim(),
    street: !f.street.trim(),
    recipient: !f.recipient.trim(),
    phone: !isValidUzPhone(`+998${digits}`),
  }
  const invalid = Object.values(errors).some(Boolean)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }))

  const close = () => {
    onClose()
    setMode('list')
  }
  const submit = () => {
    setTried(true)
    if (invalid) {
      tg.haptic('error')
      return
    }
    const a: Address = {
      id: `addr-${Date.now().toString(36)}`,
      label: LABELS[f.label].l10n,
      region: REGIONS[f.region],
      city: f.city.trim(),
      street: f.street.trim(),
      apartment: f.apartment.trim() || undefined,
      recipient: f.recipient.trim(),
      phone: `+998${digits}`,
      isDefault: f.isDefault || list.length === 0,
    }
    save.mutate(a, {
      onSuccess: () => {
        setMode('list')
        setF(EMPTY)
        setTried(false)
      },
    })
  }

  const err = (k: keyof typeof errors) => tried && errors[k]

  if (mode === 'form') {
    return (
      <Sheet
        open={open}
        onClose={close}
        title={t.t('address.new')}
        header={
          <SheetBar
            title={t.t('address.new')}
            left={
              <Tap className="d-sheetbar-btn" haptic="light" onClick={() => setMode('list')}>
                {t.t('action.cancel')}
              </Tap>
            }
            right={
              <Tap className="d-sheetbar-btn d-g3-strong" haptic="light" disabled={save.isPending} onClick={submit}>
                {t.t('action.save')}
              </Tap>
            }
          />
        }
      >
        <div className="d-g3-seg-wrap">
          <div className="d-seg" role="group" aria-label={t.t('address.label')} style={{ '--n': 3, '--i': f.label } as CSSProperties}>
            <span className="d-seg-thumb" aria-hidden="true" />
            {LABELS.map((l, i) => (
              <button
                key={l.key}
                type="button"
                aria-pressed={f.label === i}
                onClick={() => {
                  tg.haptic('selection')
                  set('label', i)
                }}
              >
                {t.t(`address.${l.key}`)}
              </button>
            ))}
          </div>
        </div>
        <Group>
          <label className="d-cell d-g3-field">
            <span className="d-g3-flabel">{t.t('address.region')}</span>
            <select className="d-select d-g3-select" value={f.region} onChange={(e) => set('region', Number(e.target.value))} aria-label={t.t('d.g3.addr.pickRegion')}>
              {REGIONS.map((r, i) => (
                <option key={r.ru} value={i}>
                  {t.l(r)}
                </option>
              ))}
            </select>
          </label>
          <Field label={t.t('address.city')} value={f.city} onChange={(v) => set('city', v)} error={err('city')} autoComplete="address-level2" />
          <Field label={t.t('address.street')} value={f.street} onChange={(v) => set('street', v)} error={err('street')} autoComplete="address-line1" />
          <Field label={t.t('address.apartment')} value={f.apartment} onChange={(v) => set('apartment', v)} autoComplete="address-line2" />
        </Group>
        <Group footer={tried && invalid ? <span className="d-field-error">{errors.phone && !errors.recipient ? t.t('address.phoneInvalid') : t.t('address.required')}</span> : t.t('address.phoneInvalid')}>
          <Field label={t.t('address.recipient')} value={f.recipient} onChange={(v) => set('recipient', v)} error={err('recipient')} autoComplete="name" />
          <label className="d-cell d-g3-field" data-error={err('phone') || undefined}>
            <span className="d-g3-flabel">{t.t('address.phone')}</span>
            <span className="d-g3-phone">
              <span className="d-g3-prefix">+998</span>
              <input
              className="d-input d-g3-phoneinput"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="90 123 45 67"
              value={formatLocal(digits)}
              onChange={(e) => set('phone', e.target.value)}
              aria-invalid={err('phone') || undefined}
              />
            </span>
          </label>
        </Group>
        <Group>
          <Cell title={t.t('address.default')} after={<Switch checked={f.isDefault} onChange={(v) => set('isDefault', v)} label={t.t('address.default')} />} />
        </Group>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onClose={close} title={t.t('address.title')} header={<SheetBar title={t.t('address.title')} right={<SheetClose onClose={close} />} />}>
      <Group footer={list.length ? t.t('d.g3.addr.footer') : undefined}>
        {q.isPending ? (
          [0, 1].map((i) => (
            <Block key={i} className="d-g3-addr-sk">
              <Skeleton style={{ width: '40%', height: 16 }} />
              <Skeleton style={{ width: '80%', height: 14, marginTop: 8 }} />
            </Block>
          ))
        ) : list.length === 0 ? (
          <Cell title={t.t('d.g3.addr.empty')} tone="hint" />
        ) : (
          list.map((a) => (
            <CheckCell
              key={a.id}
              checked={a.isDefault}
              className="d-g3-tall"
              icon={
                <Squircle color={a.isDefault ? 'accent' : 'gray'}>
                  <BadgeCheck size={18} strokeWidth={2.4} />
                </Squircle>
              }
              title={t.l(a.label)}
              subtitle={
                <>
                  {addressLine(t, a)}
                  <br />
                  {a.recipient} · {formatPhone(a.phone)}
                </>
              }
              disabled={save.isPending}
              onClick={() => {
                if (!a.isDefault) save.mutate({ ...a, isDefault: true })
              }}
            />
          ))
        )}
      </Group>
      <Group>
        <Cell
          tone="link"
          icon={
            <span className="d-g3-plus">
              <Plus size={20} strokeWidth={2.6} />
            </span>
          }
          sep={60}
          title={t.t('action.addAddress')}
          onClick={() => {
            setTried(false)
            setF({ ...EMPTY, isDefault: list.length === 0 })
            setMode('form')
          }}
        />
      </Group>
    </Sheet>
  )
}

function formatLocal(d: string) {
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ')
}

function Field({ label, value, onChange, error, autoComplete }: { label: string; value: string; onChange: (v: string) => void; error?: boolean; autoComplete?: string }) {
  return (
    <label className="d-cell d-g3-field" data-error={error || undefined}>
      <span className="d-g3-flabel">{label}</span>
      <input className="d-input" value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} aria-invalid={error || undefined} enterKeyHint="next" />
    </label>
  )
}
