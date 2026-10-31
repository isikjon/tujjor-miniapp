import type { CategoryId, Order, OrderStatus, ProductQuery, ProductSummary, SortKey, SourceMarket } from '../../shared/types'
import { isActiveOrder } from '../../shared/query/hooks'

/** Variant B helpers shared by all screens (pure, no React). */

export const SORT_KEYS: SortKey[] = ['popular', 'price_asc', 'price_desc', 'rating', 'new', 'discount']
export const SOURCES: SourceMarket[] = ['1688', 'alibaba', 'poizon']
/** "Быстрая доставка" threshold (deliveryDays[1] <= FAST_DAYS). */
export const FAST_DAYS = 14

/** Rounded discount percent (23 for −23%) or null when there is no real discount. */
export function discountPct(price: number, oldPrice: number | null | undefined): number | null {
  if (!oldPrice || oldPrice <= price) return null
  const p = Math.round((1 - price / oldPrice) * 100)
  return p >= 1 ? p : null
}

export const isFast = (p: Pick<ProductSummary, 'deliveryDays'>) => p.deliveryDays[1] <= FAST_DAYS

/** /search?q=&category=&sort=&source= (paths.search has no `source`). */
export function searchPath(p: { q?: string; category?: CategoryId | string; sort?: SortKey | string; source?: SourceMarket | string } = {}) {
  const s = new URLSearchParams()
  for (const [k, v] of Object.entries(p)) if (v != null && v !== '') s.set(k, String(v))
  const qs = s.toString()
  return qs ? `/search?${qs}` : '/search'
}

/** UI filter state used by FilterBar / FiltersSheet. Convert with toProductQuery(). */
export interface FilterState {
  sort: SortKey
  sources: SourceMarket[]
  priceMin?: number
  priceMax?: number
  /** delivery ≤ FAST_DAYS */
  fast: boolean
  /** rating ≥ 4.5 */
  topRated: boolean
  discounts: boolean
}

export const EMPTY_FILTERS: FilterState = { sort: 'popular', sources: [], fast: false, topRated: false, discounts: false }

/** Builds the ProductQuery for hooks (useProductsInfinite / useProductsCount). */
export function toProductQuery(f: FilterState, base: ProductQuery = {}): ProductQuery {
  const q: ProductQuery = { ...base, sort: f.sort }
  if (f.sources.length) q.sources = [...f.sources].sort()
  if (f.priceMin != null) q.priceMin = f.priceMin
  if (f.priceMax != null) q.priceMax = f.priceMax
  if (f.fast) q.maxDeliveryDays = FAST_DAYS
  if (f.topRated) q.minRating = 4.5
  if (f.discounts) q.onlyDiscounts = true
  return q
}

/** Initial filter state from screen query params (`sort`, `source`). */
export function filtersFromParams(query: Record<string, string | undefined> | undefined): FilterState {
  const sort = SORT_KEYS.includes(query?.sort as SortKey) ? (query!.sort as SortKey) : 'popular'
  const src = query?.source as SourceMarket | undefined
  return { ...EMPTY_FILTERS, sort, sources: src && SOURCES.includes(src) ? [src] : [] }
}

/** Number of active filters (sort excluded) — badge on the "Фильтры" chip. */
export function activeFilterCount(f: FilterState): number {
  return (f.sources.length ? 1 : 0) + (f.priceMin != null || f.priceMax != null ? 1 : 0) + (f.fast ? 1 : 0) + (f.topRated ? 1 : 0) + (f.discounts ? 1 : 0)
}

/** "Оригинал" quick chip = POIZON only. */
export const isOriginalOnly = (f: FilterState) => f.sources.length === 1 && f.sources[0] === 'poizon'

// ── orders ────────────────────────────────────────────────────────────────
export type OrderGroup = 'all' | 'active' | 'done'
export const ORDER_GROUPS: OrderGroup[] = ['all', 'active', 'done']
export const orderGroupOf = (o: Order): Exclude<OrderGroup, 'all'> => (isActiveOrder(o) ? 'active' : 'done')
export const parseOrderGroup = (v: string | undefined): OrderGroup => (v === 'active' || v === 'done' ? v : 'all')
export const filterOrders = (orders: Order[], g: OrderGroup) => (g === 'all' ? orders : orders.filter((o) => orderGroupOf(o) === g))
export const countOrders = (orders: Order[]) => ({ all: orders.length, active: orders.filter(isActiveOrder).length, done: orders.filter((o) => !isActiveOrder(o)).length })

/** Colour tone for an order status pill: 'accent' | 'flash' | 'ok' | 'hot' | 'muted'. */
export function statusTone(s: OrderStatus): 'accent' | 'flash' | 'ok' | 'hot' | 'muted' {
  if (s === 'delivered') return 'ok'
  if (s === 'cancelled') return 'muted'
  if (s === 'pending_payment') return 'hot'
  if (s === 'out_for_delivery' || s === 'arrived') return 'flash'
  return 'accent'
}
