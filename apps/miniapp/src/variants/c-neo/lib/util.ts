import type { CSSProperties } from 'react'
import type { Badge, CategoryId, Order, OrderStatus, ProductQuery, ProductSummary, SortKey, SourceMarket } from '../../../shared/types'

// ── tinted glow behind transparent product renders ─────────────────────────
const glowCache = new Map<string, CSSProperties>()

/**
 * Two soft halo colours derived from the image tint (computed once per tint):
 * a pale one for the paper theme and a deeper one for the dark theme, so dark products
 * still separate from a dark tile. Exposed as CSS vars, the theme picks one.
 */
export function glowStyle(hex: string): CSSProperties {
  const hit = glowCache.get(hex)
  if (hit) return hit
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex)
  let h = 0
  let s = 0
  if (m) {
    const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16) / 255)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const d = max - min
    const l = (max + min) / 2
    s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
    if (d) {
      h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
      h = (h * 60 + 360) % 360
    }
  }
  const hue = Math.round(h)
  const style = {
    '--glow-l': `hsl(${hue} ${Math.round(Math.min(s, 0.6) * 100)}% 95%)`,
    '--glow-d': `hsl(${hue} ${Math.round(Math.min(s, 0.55) * 100)}% 30%)`,
  } as CSSProperties
  glowCache.set(hex, style)
  return style
}

// ── paths with variant-only query params ──────────────────────────────────
export interface SearchParams {
  q?: string
  category?: CategoryId
  sort?: SortKey
  source?: SourceMarket
  deals?: boolean
}

/** /search with the params the search screen understands (q, category, sort, source, deals). */
export function searchPath(p: SearchParams = {}): string {
  const u = new URLSearchParams()
  if (p.q) u.set('q', p.q)
  if (p.category) u.set('category', p.category)
  if (p.sort) u.set('sort', p.sort)
  if (p.source) u.set('source', p.source)
  if (p.deals) u.set('deals', '1')
  const s = u.toString()
  return s ? `/search?${s}` : '/search'
}

export const SORTS: SortKey[] = ['popular', 'price_asc', 'price_desc', 'rating', 'new', 'discount']
export const SOURCES: SourceMarket[] = ['1688', 'alibaba', 'poizon']
export const isSort = (v: string | undefined): v is SortKey => !!v && (SORTS as string[]).includes(v)
export const isSource = (v: string | undefined): v is SourceMarket => !!v && (SOURCES as string[]).includes(v)

// ── filters ────────────────────────────────────────────────────────────────
export interface FilterState {
  categoryId?: CategoryId
  sources: SourceMarket[]
  priceMin?: number
  priceMax?: number
  fast: boolean
  topRated: boolean
  deals: boolean
}

export const EMPTY_FILTERS: FilterState = { sources: [], fast: false, topRated: false, deals: false }

export function toQuery(f: FilterState): ProductQuery {
  const q: ProductQuery = {}
  if (f.categoryId) q.categoryId = f.categoryId
  if (f.sources.length) q.sources = [...f.sources].sort()
  if (f.priceMin != null) q.priceMin = f.priceMin
  if (f.priceMax != null) q.priceMax = f.priceMax
  if (f.fast) q.maxDeliveryDays = 14
  if (f.topRated) q.minRating = 4.5
  if (f.deals) q.onlyDiscounts = true
  return q
}

/** Number of active filter groups (category excluded when it is fixed by the screen). */
export function activeCount(f: FilterState, withCategory = false): number {
  return (
    (withCategory && f.categoryId ? 1 : 0) +
    (f.sources.length ? 1 : 0) +
    (f.priceMin != null || f.priceMax != null ? 1 : 0) +
    (f.fast ? 1 : 0) +
    (f.topRated ? 1 : 0) +
    (f.deals ? 1 : 0)
  )
}

// ── product helpers ────────────────────────────────────────────────────────
export const discountPct = (p: { price: number; oldPrice: number | null }) =>
  p.oldPrice && p.oldPrice > p.price ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0

export type StickerTone = 'lime' | 'violet' | 'sale' | 'ink' | 'cyan' | 'paper'

const BADGE_TONE: Record<Badge, StickerTone> = {
  sale: 'sale',
  hit: 'lime',
  new: 'violet',
  original: 'ink',
  fast: 'cyan',
  choice: 'paper',
  wholesale: 'paper',
}
export const badgeTone = (b: Badge) => BADGE_TONE[b]

/** The single sticker a compact card shows (priority: discount → original → hit → new). */
export function cardBadge(p: ProductSummary): { kind: 'pct'; pct: number } | { kind: 'badge'; badge: Badge } | null {
  const pct = discountPct(p)
  if (pct >= 5) return { kind: 'pct', pct }
  for (const b of ['original', 'hit', 'new', 'choice'] as Badge[]) if (p.badges.includes(b)) return { kind: 'badge', badge: b }
  return null
}

export const keyOfProduct = (p: { id: string }) => p.id

// ── dates ──────────────────────────────────────────────────────────────────
export const DAY = 86_400_000
export const daysFromNow = (n: number) => new Date(Date.now() + n * DAY)

// ── orders ─────────────────────────────────────────────────────────────────
export type OrderFilter = 'all' | 'active' | 'transit' | 'done'
export const ORDER_FILTERS: OrderFilter[] = ['all', 'active', 'transit', 'done']
const TRANSIT: OrderStatus[] = ['china_warehouse', 'in_transit', 'customs', 'arrived', 'out_for_delivery']
const AWAITING: OrderStatus[] = ['pending_payment', 'paid', 'purchased']

export type StatusGroup = 'awaiting' | 'transit' | 'delivered' | 'cancelled'
export function statusGroup(s: OrderStatus): StatusGroup {
  if (AWAITING.includes(s)) return 'awaiting'
  if (TRANSIT.includes(s)) return 'transit'
  if (s === 'delivered') return 'delivered'
  return 'cancelled'
}

export function matchesFilter(o: Order, f: OrderFilter): boolean {
  const g = statusGroup(o.status)
  if (f === 'all') return true
  if (f === 'active') return g === 'awaiting' || g === 'transit'
  if (f === 'transit') return g === 'transit'
  return g === 'delivered' || g === 'cancelled'
}

export const isOrderFilter = (v: string | undefined): v is OrderFilter => !!v && (ORDER_FILTERS as string[]).includes(v)

/** Reached steps / total steps of the tracking timeline. */
export function orderProgress(o: Order): { done: number; total: number } {
  const total = o.timeline.length
  const done = o.timeline.filter((e) => e.at).length
  return { done, total }
}

export function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}
