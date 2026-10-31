import { MapPin, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { REGIONS } from '../../../../shared/demo/user'
import { makeTranslator, useT } from '../../../../shared/i18n'
import { uid } from '../../../../shared/lib/id'
import { useAddresses, useMe, useSaveAddress } from '../../../../shared/query/hooks'
import type { Address, L10n } from '../../../../shared/types'
import { Sheet } from '../../../../shared/ui/Sheet'
import { Tap } from '../../../../shared/ui/Tap'
import { Block, Cell, CheckCell, Group } from '../Cell'
import { Segmented, SheetBar, SheetClose, Spinner, Squircle, Switch } from '../controls'
import { fmtPhone, NoDrag } from './parts'

type LabelKind = 'home' | 'work' | 'other'
const RU = makeTranslator('ru', null)
const UZ = makeTranslator('uz', null)
const labelL10n = (k: LabelKind): L10n => ({ ru: RU.t(`address.${k}`), uz: UZ.t(`address.${k}`) })

const fmtDigits = (d: string) => [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ')
function toDigits(v: string) {
  let d = v.replace(/\D/g, '')
  if (d.startsWith('998') && d.length > 9) d = d.slice(3)
  return d.slice(0, 9)
}

/**
 * Address picker + "new address" form in one bottom sheet (checkmark rows, iOS form cells).
 * Reusable: checkout (select) and profile (manage, `selectedId` = default address).
 */
export function AddressSheet({
  open,
  onClose,
  initialMode = 'list',
  selectedId,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  initialMode?: 'list' | 'form'
  selectedId?: string | null
  onSelect?: (id: string) => void
}) {
  const t = useT()
  const addressesQ = useAddresses()
  const list = addressesQ.data ?? []
  const me = useMe().data
  const save = useSaveAddress()
  const [mode, setMode] = useState<'list' | 'form'>(initialMode)
  const [tried, setTried] = useState(false)
  const [label, setLabel] = useState<LabelKind>('home')
  const [region, setRegion] = useState(0)
  const [city, setCity] = useState('')
  const [street, setStreet] = useState('')
  const [apartment, setApartment] = useState('')
  const [recipient, setRecipient] = useState('')
  const [phone, setPhone] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  useEffect(() => {
    if (!open) return
    setMode(initialMode === 'form' || !(addressesQ.data?.length ?? 0) ? 'form' : 'list')
    setTried(false)
    setCity('')
    setStreet('')
    setApartment('')
    setRecipient(me ? `${me.firstName} ${me.lastName}`.trim() : '')
    setPhone(me ? toDigits(me.phone) : '')
    setIsDefault(!(addressesQ.data?.length ?? 0))
    // reset only when the sheet opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const err = { city: !city.trim(), street: !street.trim(), recipient: !recipient.trim(), phone: phone.length !== 9 }
  const invalid = err.city || err.street || err.recipient || err.phone

  const submit = () => {
    if (save.isPending) return
    setTried(true)
    if (invalid) return
    const a: Address = {
      id: uid('addr-'),
      label: labelL10n(label),
      region: REGIONS[region],
      city: city.trim(),
      street: street.trim(),
      apartment: apartment.trim() || undefined,
      recipient: recipient.trim(),
      phone: `+998${phone}`,
      isDefault,
    }
    save.mutate(a, {
      onSuccess: () => {
        onSelect?.(a.id)
        onClose()
      },
    })
  }

  const back = () => (list.length ? setMode('list') : onClose())
  const field = (bad: boolean) => (tried && bad ? 'true' : undefined)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={mode === 'form' ? t.t('d.address.form') : t.t('d.address.select')}
      header={
        mode === 'form' ? (
          <SheetBar
            title={t.t('d.address.form')}
            left={
              <NoDrag>
                <Tap className="d-sheetbar-btn" haptic="light" onClick={back}>
                  {t.t('action.cancel')}
                </Tap>
              </NoDrag>
            }
            right={
              <NoDrag>
                <Tap className="d-sheetbar-btn g2-strong" onClick={submit} disabled={save.isPending} aria-busy={save.isPending}>
                  {save.isPending ? <Spinner size="sm" /> : t.t('action.save')}
                </Tap>
              </NoDrag>
            }
          />
        ) : (
          <SheetBar
            title={t.t('d.address.select')}
            right={
              <NoDrag>
                <SheetClose onClose={onClose} />
              </NoDrag>
            }
          />
        )
      }
    >
      {mode === 'list' ? (
        <Group className="g2-first">
          {list.map((a) => (
            <CheckCell
              key={a.id}
              checked={a.id === selectedId}
              icon={
                <Squircle color={a.isDefault ? 'red' : 'gray'}>
                  <MapPin size={17} strokeWidth={2.2} />
                </Squircle>
              }
              title={`${t.l(a.label)} · ${a.street}`}
              subtitle={`${a.city}, ${t.l(a.region)} · ${a.recipient}, ${fmtPhone(a.phone)}`}
              onClick={() => {
                onSelect?.(a.id)
                onClose()
              }}
            />
          ))}
          <Cell
            icon={
              <Squircle color="accent">
                <Plus size={18} strokeWidth={2.6} />
              </Squircle>
            }
            title={t.t('action.addAddress')}
            tone="link"
            onClick={() => {
              setTried(false)
              setMode('form')
            }}
          />
        </Group>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          noValidate
        >
          <Group className="g2-first">
            <Block className="d-pad">
              <Segmented<LabelKind>
                value={label}
                onChange={setLabel}
                label={t.t('address.label')}
                options={[
                  { value: 'home', label: t.t('address.home') },
                  { value: 'work', label: t.t('address.work') },
                  { value: 'other', label: t.t('address.other') },
                ]}
              />
            </Block>
          </Group>
          <Group
            header={t.t('checkout.address')}
            footer={tried && (err.city || err.street) ? <span className="d-field-error">{t.t('d.g2.fillRequired')}</span> : undefined}
          >
            <Block className="g2-field">
              <span className="g2-field-label">{t.t('address.region')}</span>
              <select className="d-select g2-select" value={region} onChange={(e) => setRegion(Number(e.target.value))} aria-label={t.t('address.region')}>
                {REGIONS.map((r, i) => (
                  <option key={r.ru} value={i}>
                    {t.l(r)}
                  </option>
                ))}
              </select>
            </Block>
            <Block className="g2-field" style={{}}>
              <input className="d-input" data-err={field(err.city)} value={city} onChange={(e) => setCity(e.target.value)} placeholder={t.t('address.city')} aria-label={t.t('address.city')} autoComplete="address-level2" enterKeyHint="next" />
            </Block>
            <Block className="g2-field">
              <input className="d-input" data-err={field(err.street)} value={street} onChange={(e) => setStreet(e.target.value)} placeholder={t.t('address.street')} aria-label={t.t('address.street')} autoComplete="address-line1" enterKeyHint="next" />
            </Block>
            <Block className="g2-field">
              <input className="d-input" value={apartment} onChange={(e) => setApartment(e.target.value)} placeholder={t.t('address.apartment')} aria-label={t.t('address.apartment')} autoComplete="address-line2" enterKeyHint="next" />
            </Block>
          </Group>
          <Group
            header={t.t('checkout.recipient')}
            footer={
              tried && err.phone ? (
                <span className="d-field-error">{t.t('address.phoneInvalid')}</span>
              ) : tried && err.recipient ? (
                <span className="d-field-error">{t.t('address.required')}</span>
              ) : undefined
            }
          >
            <Block className="g2-field">
              <input className="d-input" data-err={field(err.recipient)} value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder={t.t('address.recipient')} aria-label={t.t('address.recipient')} autoComplete="name" enterKeyHint="next" />
            </Block>
            <Block className="g2-field">
              <span className="g2-prefix">{t.t('d.address.phonePrefix')}</span>
              <input
                className="d-input"
                data-err={field(err.phone)}
                value={fmtDigits(phone)}
                onChange={(e) => setPhone(toDigits(e.target.value))}
                placeholder="90 123 45 67"
                aria-label={t.t('address.phone')}
                inputMode="tel"
                type="tel"
                autoComplete="tel-national"
                enterKeyHint="done"
              />
            </Block>
          </Group>
          <Group>
            <Cell title={t.t('address.default')} after={<Switch checked={isDefault} onChange={setIsDefault} label={t.t('address.default')} />} />
          </Group>
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        </form>
      )}
    </Sheet>
  )
}
