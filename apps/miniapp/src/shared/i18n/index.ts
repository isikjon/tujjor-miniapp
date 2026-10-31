import { createContext, useContext, useMemo } from 'react'
import type { L10n, Locale } from '../types'
import { useSettings } from '../store/settings'
import { ru, type MessageKey } from './ru'
import { uz } from './uz'

export type { MessageKey }
export type Vars = Record<string, string | number>

/** Extra dictionaries a variant may contribute (its own copy: taglines, promo texts…). */
export type VariantMessages = { ru: Record<string, string>; uz: Record<string, string> }

export const VariantMessagesContext = createContext<VariantMessages | null>(null)

const BASE: Record<Locale, Record<string, string>> = { ru, uz }
const NBSP = ' '

function lookup(locale: Locale, key: string, extra: VariantMessages | null): string {
  return extra?.[locale]?.[key] ?? BASE[locale][key] ?? extra?.ru?.[key] ?? BASE.ru[key] ?? key
}

function fill(s: string, vars?: Vars): string {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

/** Russian plural category: 0 = one, 1 = few, 2 = many. */
function ruForm(n: number): 0 | 1 | 2 {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return 2
  if (b > 1 && b < 5) return 1
  if (b === 1) return 0
  return 2
}

export function pluralize(locale: Locale, template: string, n: number): string {
  const forms = template.split('|')
  if (forms.length === 1) return forms[0]
  return locale === 'ru' ? (forms[ruForm(n)] ?? forms[forms.length - 1]) : forms[0]
}

export function formatNumber(n: number): string {
  const neg = n < 0
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
  return neg ? `−${s}` : s
}

export function formatMoney(amount: number, locale: Locale): string {
  return `${formatNumber(amount)}${NBSP}${locale === 'uz' ? 'soʻm' : 'сум'}`
}

/** 5 400 → "5,4 тыс." / "5,4 ming"; 1 240 000 → "1,2 млн" / "1,2 mln". */
export function formatCompact(n: number, locale: Locale): string {
  const unit = (v: number, ruU: string, uzU: string) =>
    `${(Math.floor(v * 10) / 10).toString().replace('.', ',')}${NBSP}${locale === 'uz' ? uzU : ruU}`
  if (n >= 1_000_000) return unit(n / 1_000_000, 'млн', 'mln')
  if (n >= 10_000) return unit(n / 1000, 'тыс.', 'ming')
  return formatNumber(n)
}

const MONTHS: Record<Locale, string[]> = {
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
}

/** "14 сентября" / "14-sentabr" (+ year when not current). */
export function formatDate(iso: string | Date, locale: Locale, withYear = false): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const day = d.getDate()
  const month = MONTHS[locale][d.getMonth()]
  const year = withYear || d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''
  return locale === 'uz' ? `${day}-${month}${year}` : `${day} ${month}${year}`
}

export function formatTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function useLocale(): Locale {
  return useSettings((s) => s.locale)
}

export interface Translator {
  locale: Locale
  /** Message by key with {var} substitution. */
  t: (key: MessageKey | (string & {}), vars?: Vars) => string
  /** Plural message ("one|few|many"); {n} is formatted with thin grouping. */
  tp: (key: MessageKey | (string & {}), n: number, vars?: Vars) => string
  /** Pick the current locale from a data string pair. */
  l: (v: L10n | null | undefined) => string
  money: (amount: number) => string
  compact: (n: number) => string
  date: (iso: string | Date, withYear?: boolean) => string
  /** "5 мин назад", "2 ч назад", "14 сентября". */
  ago: (iso: string) => string
}

export function makeTranslator(locale: Locale, extra: VariantMessages | null): Translator {
  const t: Translator['t'] = (key, vars) => fill(lookup(locale, key, extra), vars)
  const tp: Translator['tp'] = (key, n, vars) => fill(pluralize(locale, lookup(locale, key, extra), n), { n: formatNumber(n), ...vars })
  return {
    locale,
    t,
    tp,
    l: (v) => (v ? v[locale] || v.ru : ''),
    money: (a) => formatMoney(a, locale),
    compact: (n) => formatCompact(n, locale),
    date: (iso, y) => formatDate(iso, locale, y),
    ago: (iso) => {
      const diff = Math.max(0, Date.now() - new Date(iso).getTime())
      const min = Math.floor(diff / 60_000)
      if (min < 1) return t('time.justNow')
      if (min < 60) return t('time.minutesAgo', { n: min })
      const h = Math.floor(min / 60)
      if (h < 24) return t('time.hoursAgo', { n: h })
      return formatDate(iso, locale)
    },
  }
}

/** Main i18n hook for components. Re-renders only when the locale changes. */
export function useT(): Translator {
  const locale = useLocale()
  const extra = useContext(VariantMessagesContext)
  return useMemo(() => makeTranslator(locale, extra), [locale, extra])
}
