import type { CategoryId, Order, OrderStatus, ProductFilters, SortKey, SourceMarket } from '../../shared/types'

/** Helpers private to variant A (no shared-core changes). */

export const SOURCES: SourceMarket[] = ['1688', 'alibaba', 'poizon']
export const SORTS: SortKey[] = ['popular', 'price_asc', 'price_desc', 'rating', 'new', 'discount']
const CATEGORY_IDS: CategoryId[] = ['electronics', 'clothing', 'shoes', 'bags', 'watches', 'beauty', 'home', 'sport']

export const isSort = (v: unknown): v is SortKey => typeof v === 'string' && (SORTS as string[]).includes(v)
export const isSource = (v: unknown): v is SourceMarket => typeof v === 'string' && (SOURCES as string[]).includes(v)
export const isCategory = (v: unknown): v is CategoryId => typeof v === 'string' && (CATEGORY_IDS as string[]).includes(v)

/** Rounded discount in percent, 0 when there is no old price. */
export function discountPct(price: number, old: number | null | undefined): number {
  return old && old > price ? Math.round((1 - price / old) * 100) : 0
}

// ── product filters (category + search share one sheet) ─────────────────────

export interface FilterState {
  sources: SourceMarket[]
  priceMin: number | null
  priceMax: number | null
  fast: boolean
  topRated: boolean
  discounts: boolean
}

export const NO_FILTERS: FilterState = { sources: [], priceMin: null, priceMax: null, fast: false, topRated: false, discounts: false }
export const FAST_DAYS = 14
export const TOP_RATING = 4.5

export function toQuery(f: FilterState): ProductFilters {
  const q: ProductFilters = {}
  if (f.sources.length) q.sources = SOURCES.filter((s) => f.sources.includes(s))
  if (f.priceMin != null) q.priceMin = f.priceMin
  if (f.priceMax != null) q.priceMax = f.priceMax
  if (f.fast) q.maxDeliveryDays = FAST_DAYS
  if (f.topRated) q.minRating = TOP_RATING
  if (f.discounts) q.onlyDiscounts = true
  return q
}

export function countActive(f: FilterState): number {
  return (f.sources.length ? 1 : 0) + (f.priceMin != null || f.priceMax != null ? 1 : 0) + (f.fast ? 1 : 0) + (f.topRated ? 1 : 0) + (f.discounts ? 1 : 0)
}

const num = (v: string | undefined) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

/** Filters encoded in search params: source=poizon[,1688] · min · max · discount=1 · fast=1 · top=1 */
export function filtersFromParams(q: Record<string, string>): FilterState {
  return {
    sources: (q.source ?? '').split(',').filter(isSource),
    priceMin: num(q.min),
    priceMax: num(q.max),
    fast: q.fast === '1',
    topRated: q.top === '1',
    discounts: q.discount === '1',
  }
}

/** Search deep link (the shared `paths.search` builder only knows q/category/sort). */
export function searchHref(p: { q?: string; category?: CategoryId; sort?: SortKey; source?: SourceMarket; max?: number; discount?: boolean }): string {
  const s = new URLSearchParams()
  if (p.q) s.set('q', p.q)
  if (p.category) s.set('category', p.category)
  if (p.sort) s.set('sort', p.sort)
  if (p.source) s.set('source', p.source)
  if (p.max) s.set('max', String(p.max))
  if (p.discount) s.set('discount', '1')
  const qs = s.toString()
  return qs ? `/search?${qs}` : '/search'
}

// ── dates ─────────────────────────────────────────────────────────────────

/** Noon of today + n days (stable for date formatting). */
export function inDays(n: number, from: Date = new Date()): Date {
  const d = new Date(from)
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + n)
  return d
}

export const initials = (first: string, last: string) => `${first.trim()[0] ?? ''}${last.trim()[0] ?? ''}`.toUpperCase() || '·'

// ── orders ────────────────────────────────────────────────────────────────

export type OrderFilter = 'all' | 'active' | 'done'
export type OrderGroup = 'awaiting' | 'transit' | 'delivered'

export const ORDER_GROUPS: Record<OrderGroup, OrderStatus[]> = {
  awaiting: ['pending_payment', 'paid', 'purchased'],
  transit: ['china_warehouse', 'in_transit', 'customs', 'arrived', 'out_for_delivery'],
  delivered: ['delivered'],
}
export const GROUP_PARENT: Record<OrderGroup, OrderFilter> = { awaiting: 'active', transit: 'active', delivered: 'done' }
export const isOrderGroup = (v: unknown): v is OrderGroup => v === 'awaiting' || v === 'transit' || v === 'delivered'
export const isOrderFilter = (v: unknown): v is OrderFilter => v === 'all' || v === 'active' || v === 'done'

export function orderMatches(o: Order, filter: OrderFilter, group: OrderGroup | null): boolean {
  if (group) return ORDER_GROUPS[group].includes(o.status)
  if (filter === 'active') return o.status !== 'delivered' && o.status !== 'cancelled'
  if (filter === 'done') return o.status === 'delivered' || o.status === 'cancelled'
  return true
}

/** Visual tone of a status line. */
export function statusTone(s: OrderStatus): 'active' | 'done' | 'muted' | 'attention' {
  if (s === 'delivered') return 'done'
  if (s === 'cancelled') return 'muted'
  if (s === 'pending_payment') return 'attention'
  return 'active'
}

/** Digits-only money input → integer (null when empty). */
export function parseAmount(v: string): number | null {
  const d = v.replace(/\D/g, '').slice(0, 10)
  return d ? Number(d) : null
}
