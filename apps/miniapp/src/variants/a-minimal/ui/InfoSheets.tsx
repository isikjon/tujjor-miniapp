import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { Locale } from '../../../shared/types'
import { makeTranslator, useT } from '../../../shared/i18n'
import { useVariant } from '../../../shared/runtime/variant'
import { useSettings } from '../../../shared/store/settings'
import { toast } from '../../../shared/store/toast'
import { Sheet } from '../../../shared/ui/Sheet'
import { Tap } from '../../../shared/ui/Tap'

const FAQ = [1, 2, 3, 4] as const

/** Support: response promise + FAQ accordion (one open at a time). */
export function SupportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const [openQ, setOpenQ] = useState<number | null>(1)
  return (
    <Sheet open={open} onClose={onClose} title={t.t('support.title')}>
      <div className="a-sheetpad">
        <p className="a-lead">{t.t('support.text')}</p>
        <h3 className="a-h3 a-sheetpad__h">{t.t('support.faq')}</h3>
        <div className="a-faq">
          {FAQ.map((i) => {
            const on = openQ === i
            return (
              <div key={i} className="a-faq__item" data-open={on}>
                <Tap flat className="a-faq__q" aria-expanded={on} onClick={() => setOpenQ(on ? null : i)}>
                  <span>{t.t(`support.q${i}`)}</span>
                  <ChevronDown size={18} strokeWidth={1.75} className="a-faq__chev" aria-hidden="true" />
                </Tap>
                {on ? <p className="a-faq__a">{t.t(`support.a${i}`)}</p> : null}
              </div>
            )
          })}
        </div>
      </div>
    </Sheet>
  )
}

const STEPS = [1, 2, 3, 4] as const

/** The four-step explanation, numbered 01–04 (same rhythm as on Home). */
export function HowSteps() {
  const t = useT()
  return (
    <ol className="a-steps">
      {STEPS.map((i) => (
        <li key={i} className="a-step">
          <span className="a-step__n">{String(i).padStart(2, '0')}</span>
          <span className="a-step__body">
            <span className="a-step__title">{t.t(`home.how${i}.title`)}</span>
            <span className="a-step__text">{t.t(`home.how${i}.text`)}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

export function HowSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  return (
    <Sheet open={open} onClose={onClose} title={t.t('profile.howItWorks')}>
      <div className="a-sheetpad">
        <HowSteps />
        <p className="a-note">{t.t('demo.note')}</p>
      </div>
    </Sheet>
  )
}

const LOCALES: Locale[] = ['ru', 'uz']

/** Language switch: the whole UI re-renders live (every string comes from useT). */
export function LanguageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const variant = useVariant()
  const locale = useSettings((s) => s.locale)
  const setLocale = useSettings((s) => s.setLocale)
  return (
    <Sheet open={open} onClose={onClose} title={t.t('language.title')}>
      <div className="a-sheetlist" role="radiogroup" aria-label={t.t('language.title')}>
        {LOCALES.map((l) => (
          <Tap
            key={l}
            flat
            role="radio"
            aria-checked={l === locale}
            className="a-sheetrow"
            lang={l}
            onClick={() => {
              if (l !== locale) {
                setLocale(l)
                toast({ text: makeTranslator(l, variant.messages ?? null).t('toast.languageChanged'), tone: 'success' })
              }
              onClose()
            }}
          >
            <span className="a-sheetrow__text">{t.t(`language.${l}`)}</span>
            {l === locale ? <Check size={20} strokeWidth={2} className="a-sheetrow__check" aria-hidden="true" /> : null}
          </Tap>
        ))}
      </div>
    </Sheet>
  )
}
