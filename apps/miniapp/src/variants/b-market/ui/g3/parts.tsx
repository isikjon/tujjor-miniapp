import { Check, ChevronDown, ChevronRight, MapPin } from 'lucide-react'
import type { ReactNode } from 'react'
import { useT } from '../../../../shared/i18n'
import { useAddresses } from '../../../../shared/query/hooks'
import { formatPhone } from '../../../../shared/demo/user'
import { useCheckoutDraft } from '../../../../shared/store/checkout'
import { useSettings } from '../../../../shared/store/settings'
import { toast } from '../../../../shared/store/toast'
import { tg } from '../../../../shared/telegram/adapter'
import type { Locale, Order, OrderStatus } from '../../../../shared/types'
import { Img } from '../../../../shared/ui/Img'
import { Sheet } from '../../../../shared/ui/Sheet'
import { Skeleton } from '../../../../shared/ui/Skeleton'
import { Tap } from '../../../../shared/ui/Tap'
import { statusTone } from '../../lib'

/** Status pill coloured by lib.statusTone. */
export function StatusPill({ status, className }: { status: OrderStatus; className?: string }) {
  const t = useT()
  return (
    <span className={`b3-pill ${className ?? ''}`} data-tone={statusTone(status)}>
      {t.t(`status.${status}`)}
    </span>
  )
}

/** Reached steps / total steps of the tracking timeline (cancelled → 0). */
export function orderProgress(o: Order) {
  const total = o.timeline.length || 1
  const done = o.timeline.filter((e) => e.at != null).length
  return { done, total, ratio: o.status === 'cancelled' ? 0 : Math.min(1, done / total) }
}

/** Thin violet progress bar (transform only). */
export function ProgressBar({ ratio, tone }: { ratio: number; tone?: 'ok' | 'accent' }) {
  return (
    <span className="b3-progress" data-tone={tone ?? 'accent'} aria-hidden="true">
      <span style={{ transform: `scaleX(${Math.max(0.04, ratio)})` }} />
    </span>
  )
}

/** Up to `max` product thumbnails + "+N" tile. */
export function OrderThumbs({ order, max = 4 }: { order: Order; max?: number }) {
  const t = useT()
  const shown = order.items.slice(0, order.items.length > max ? max - 1 : max)
  const rest = order.items.length - shown.length
  return (
    <div className="b3-thumbs">
      {shown.map((it) => (
        <span className="b3-thumb" key={it.productId + it.selectionLabel.ru}>
          <Img image={it.image} alt={t.l(it.title)} sizes="56px" />
          {it.qty > 1 ? <span className="b3-thumb__qty b-num">×{it.qty}</span> : null}
        </span>
      ))}
      {rest > 0 ? <span className="b3-thumb b3-thumb--more b-num">{t.t('b.g3.more', { n: rest })}</span> : null}
    </div>
  )
}

/** Menu row: coloured icon tile, title, optional sub/value, chevron. Renders a <Tap> when onClick is set, else a static row. */
export function MenuRow({ icon, tone = 'accent', title, sub, value, badge, onClick, chevron = true }: { icon: ReactNode; tone?: 'accent' | 'hot' | 'flash' | 'ok' | 'muted'; title: string; sub?: string; value?: string; badge?: string; onClick?: () => void; chevron?: boolean }) {
  const body = (
    <>
      <span className="b3-row__icon" data-tone={tone}>
        {icon}
      </span>
      <span className="b3-row__main">
        <span className="b3-row__title">{title}</span>
        {sub ? <span className="b3-row__sub">{sub}</span> : null}
      </span>
      {badge ? <span className="b3-row__badge">{badge}</span> : null}
      {value ? <span className="b3-row__value">{value}</span> : null}
      {onClick && chevron ? <ChevronRight className="b3-row__chev" size={18} strokeWidth={2.2} aria-hidden="true" /> : null}
    </>
  )
  return onClick ? (
    <Tap flat className="b3-row" onClick={onClick}>
      {body}
    </Tap>
  ) : (
    <div className="b3-row">{body}</div>
  )
}

/** Copies text to the clipboard with a toast (navigator.clipboard, graceful failure). */
export async function copyText(text: string, okText: string, failText: string) {
  try {
    await navigator.clipboard.writeText(text)
    tg.haptic('success')
    toast({ text: okText, tone: 'success' })
  } catch {
    toast({ text: failText, tone: 'error' })
  }
}

// ── sheets ───────────────────────────────────────────────────────────────

export function LanguageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const locale = useSettings((s) => s.locale)
  const setLocale = useSettings((s) => s.setLocale)
  const pick = (l: Locale) => {
    if (l !== locale) {
      setLocale(l)
      tg.haptic('success')
    }
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={t.t('language.title')}>
      <div className="b-sheet-list">
        {(['ru', 'uz'] as Locale[]).map((l) => (
          <Tap key={l} flat className="b-sheet-row" data-on={l === locale} onClick={() => pick(l)}>
            <span className="b3-flag" aria-hidden="true">
              {l === 'ru' ? 'RU' : 'UZ'}
            </span>
            {t.t(`language.${l}`)}
            {l === locale ? <Check className="b-sheet-row__check" size={20} strokeWidth={2.6} aria-hidden="true" /> : null}
          </Tap>
        ))}
      </div>
    </Sheet>
  )
}

export function SupportSheet({ open, onClose, orderNumber }: { open: boolean; onClose: () => void; orderNumber?: string }) {
  const t = useT()
  return (
    <Sheet open={open} onClose={onClose} title={t.t('support.title')}>
      <div className="b3-sheet-pad">
        <p className="b3-support__text">{t.t('support.text')}</p>
        {orderNumber ? (
          <Tap className="b3-support__num" onClick={() => copyText(orderNumber, t.t('b.g3.numberCopied'), t.t('b.copyFail'))}>
            <span className="min-w-0">
              <span className="b3-support__numlabel">{t.t('b.g3.orderSupportNote', { number: orderNumber })}</span>
            </span>
            <span className="b3-support__copy">{t.t('action.copy')}</span>
          </Tap>
        ) : null}
        <p className="b3-faq__title">{t.t('support.faq')}</p>
        <p className="b3-faq__hint">{t.t('b.g3.faqHint')}</p>
        <div className="b3-faq">
          {[1, 2, 3, 4].map((i) => (
            <details key={i} className="b3-faq__item">
              <summary>
                <span>{t.t(`support.q${i}`)}</span>
                <ChevronDown size={18} strokeWidth={2.4} aria-hidden="true" />
              </summary>
              <p>{t.t(`support.a${i}`)}</p>
            </details>
          ))}
        </div>
      </div>
    </Sheet>
  )
}

export function HowSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  return (
    <Sheet open={open} onClose={onClose} title={t.t('profile.howItWorks')}>
      <div className="b3-sheet-pad">
        <ol className="b3-how">
          {[1, 2, 3, 4].map((i) => (
            <li key={i} className="b3-how__step">
              <span className="b3-how__n b-num">{i}</span>
              <span>
                <span className="b3-how__title">{t.t(`home.how${i}.title`)}</span>
                <span className="b3-how__text">{t.t(`home.how${i}.text`)}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="b3-note">{t.t('b.g3.howNote')}</p>
      </div>
    </Sheet>
  )
}

/** Saved addresses; tapping one makes it the delivery address for the next checkout. */
export function AddressesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const q = useAddresses()
  const draftId = useCheckoutDraft((s) => s.addressId)
  const list = q.data ?? []
  const current = list.find((a) => a.id === draftId) ?? list.find((a) => a.isDefault) ?? list[0]
  return (
    <Sheet open={open} onClose={onClose} title={t.t('profile.addresses')}>
      <div className="b-sheet-list">
        {q.isPending ? (
          [0, 1].map((i) => <Skeleton key={i} style={{ height: 72, borderRadius: 12, margin: '4px 0' }} />)
        ) : list.length ? (
          list.map((a) => {
            const on = a.id === current?.id
            return (
              <Tap
                key={a.id}
                flat
                className="b-sheet-row b3-addr"
                data-on={on}
                onClick={() => {
                  useCheckoutDraft.getState().update({ addressId: a.id })
                  if (!on) toast({ text: t.t('b.g3.addrChosen'), tone: 'success' })
                  onClose()
                }}
              >
                <MapPin className="b3-addr__pin" size={20} strokeWidth={2.2} aria-hidden="true" />
                <span className="b3-addr__main">
                  <span className="b3-addr__label">
                    {t.l(a.label)}
                    {a.isDefault ? <span className="b3-addr__def">{t.t('b.g3.default')}</span> : null}
                  </span>
                  <span className="b3-addr__line">
                    {t.l(a.region)}, {a.city}, {a.street}
                    {a.apartment ? `, ${a.apartment}` : ''}
                  </span>
                  <span className="b3-addr__line">
                    {a.recipient} · {formatPhone(a.phone)}
                  </span>
                </span>
                {on ? <Check className="b-sheet-row__check" size={20} strokeWidth={2.6} aria-hidden="true" /> : null}
              </Tap>
            )
          })
        ) : (
          <p className="b3-note">{t.t('b.noAddresses')}</p>
        )}
        <p className="b3-note">{t.t('b.g3.addrHint')}</p>
      </div>
    </Sheet>
  )
}
