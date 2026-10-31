import type { CategoryId, Order, OrderStatus, ProductQuery, SortKey, SourceMarket } from '../../../shared/types'
import type { Translator } from '../../../shared/i18n'
import type { SquircleColor } from './controls'

/** Telegram-style squircle colour per category (stable, independent of order). */
export const CATEGORY_COLOR: Record<CategoryId, SquircleColor> = {
  electronics: 'blue',
  clothing: 'purple',
  shoes: 'orange',
  bags: 'red',
  watches: 'indigo',
  beauty: 'pink',
  home: 'green',
  sport: 'teal',
}

export const SOURCES: SourceMarket[] = ['1688', 'alibaba', 'poizon']
export const SOURCE_COLOR: Record<SourceMarket, SquircleColor> = { '1688': 'orange', alibaba: 'blue', poizon: 'teal' }

export const SORTS: SortKey[] = ['popular', 'price_asc', 'price_desc', 'rating', 'new', 'discount']
export const isSort = (v: string | undefined): v is SortKey => !!v && (SORTS as string[]).includes(v)
export const isSource = (v: string | undefined): v is SourceMarket => !!v && (SOURCES as string[]).includes(v)

/** Extended search path (shared `paths.search` covers q/category/sort; this variant also reads `source`). */
export function searchPath(p: { q?: string; category?: string; sort?: string; source?: string; max?: number }) {
  const s = new URLSearchParams()
  if (p.q) s.set('q', p.q)
  if (p.category) s.set('category', p.category)
  if (p.sort) s.set('sort', p.sort)
  if (p.source) s.set('source', p.source)
  if (p.max) s.set('max', String(p.max))
  const qs = s.toString()
  return `/search${qs ? `?${qs}` : ''}`
}

export const discountPct = (price: number, old: number | null) => (old && old > price ? Math.round(((old - price) / old) * 100) : 0)

/** 4.6 → "4,6" (RU & UZ both use a decimal comma). */
export const fmtRating = (r: number) => r.toFixed(1).replace('.', ',')

export function addDays(days: number, from = Date.now()) {
  return new Date(from + days * 86_400_000)
}

/** "12 ноября – 18 ноября" from a [min, max] day range. */
export function dateRange(t: Translator, days: [number, number], from = Date.now()) {
  return { from: t.date(addDays(days[0], from)), to: t.date(addDays(days[1], from)) }
}

/** Number of active filters (for the toolbar badge). */
export function filterCount(f: ProductQuery) {
  let n = 0
  if (f.sources?.length) n++
  if (f.priceMin != null || f.priceMax != null) n++
  if (f.maxDeliveryDays != null) n++
  if (f.minRating != null) n++
  if (f.onlyDiscounts) n++
  return n
}

export const AWAITING: OrderStatus[] = ['pending_payment', 'paid', 'purchased', 'china_warehouse']
export const TRANSIT: OrderStatus[] = ['in_transit', 'customs', 'arrived', 'out_for_delivery']

export type OrderFilter = 'all' | 'active' | 'done' | 'awaiting' | 'transit'
export function matchesOrderFilter(o: Order, f: OrderFilter) {
  switch (f) {
    case 'active':
      return AWAITING.includes(o.status) || TRANSIT.includes(o.status)
    case 'done':
      return o.status === 'delivered' || o.status === 'cancelled'
    case 'awaiting':
      return AWAITING.includes(o.status)
    case 'transit':
      return TRANSIT.includes(o.status)
    default:
      return true
  }
}

/** Telegram default avatar gradient index (0–6) for a numeric id. */
export const avatarGradient = (id: number) => Math.abs(id) % 7

export function initials(first: string, last?: string) {
  return `${first.trim()[0] ?? ''}${last?.trim()[0] ?? ''}`.toUpperCase()
}
