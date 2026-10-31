import type { Category, CategoryId, Product, ProductQuery, ProductSummary, SourceMarket } from '../types'
import { SYNONYMS } from './content'
import catalogUrl from './catalog.json?url'

/**
 * Demo catalog "database". The JSON is emitted as a hashed static asset and fetched on the first
 * API call — a real network request with HTTP caching — so it never weighs on the JS bundle.
 */
type RawProduct = Omit<Product, 'syncedAt'> & { syncedMin: number }
interface RawCatalog {
  version: string
  categories: Category[]
  products: RawProduct[]
}

export interface CatalogDb {
  version: string
  categories: Category[]
  products: Product[]
  byId: Map<string, Product>
  haystack: Map<string, { strong: string; weak: string }>
}

let dbPromise: Promise<CatalogDb> | null = null
const bootTime = Date.now()

export function loadCatalog(): Promise<CatalogDb> {
  dbPromise ??= fetch(catalogUrl)
    .then((r) => {
      if (!r.ok) throw new Error(`catalog HTTP ${r.status}`)
      return r.json() as Promise<RawCatalog>
    })
    .then(build)
    .catch((e) => {
      dbPromise = null // allow a retry after a failed load
      throw e
    })
  return dbPromise
}

/** Normalise for matching: lowercase, ё→е, drop Uzbek apostrophes so "oʻ", "o'", "o’" all match. */
export const norm = (s: string) =>
  s.toLowerCase().replace(/ё/g, 'е').replace(/[ʻʼ'’`‘]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

function build(raw: RawCatalog): CatalogDb {
  const catName = new Map(raw.categories.map((c) => [c.id, `${c.name.ru} ${c.name.uz}`]))
  const products: Product[] = raw.products.map(({ syncedMin, ...p }) => ({
    ...p,
    deliveryDays: p.deliveryDays as [number, number],
    syncedAt: new Date(bootTime - syncedMin * 60_000).toISOString(),
  }))
  const haystack = new Map(
    products.map((p) => [
      p.id,
      {
        strong: ` ${norm(`${p.title.ru} ${p.title.uz} ${p.brand ?? ''} ${p.subtitle.ru} ${p.subtitle.uz}`)} `,
        weak: ` ${norm(`${catName.get(p.categoryId) ?? ''} ${p.description.ru} ${p.description.uz} ${p.options.flatMap((o) => o.values.map((v) => `${v.label.ru} ${v.label.uz}`)).join(' ')}`)} `,
      },
    ]),
  )
  return { version: raw.version, categories: raw.categories, products, byId: new Map(products.map((p) => [p.id, p])), haystack }
}

export function toSummary(p: Product): ProductSummary {
  return {
    id: p.id,
    title: p.title,
    subtitle: p.subtitle,
    categoryId: p.categoryId,
    source: p.source,
    brand: p.brand,
    price: p.price,
    oldPrice: p.oldPrice,
    rating: p.rating,
    reviews: p.reviews,
    sold: p.sold,
    stock: p.stock,
    image: p.image,
    deliveryDays: p.deliveryDays,
    badges: p.badges,
    syncedAt: p.syncedAt,
  }
}

/** Expand a query token with its synonym group (prefix match on group members). */
function expand(token: string): string[] {
  const out = new Set([token])
  for (const group of SYNONYMS) {
    const g = group.map(norm)
    if (g.some((w) => token.startsWith(w) || (token.length >= 3 && w.startsWith(token)))) g.forEach((w) => out.add(w))
  }
  return [...out]
}

const discount = (p: Product) => (p.oldPrice ? (p.oldPrice - p.price) / p.oldPrice : 0)

export function queryProducts(db: CatalogDb, q: ProductQuery): Product[] {
  let items = db.products
  const scores = new Map<string, number>()

  if (q.categoryId) items = items.filter((p) => p.categoryId === q.categoryId)
  if (q.sources?.length) items = items.filter((p) => q.sources!.includes(p.source))
  if (q.priceMin != null) items = items.filter((p) => p.price >= q.priceMin!)
  if (q.priceMax != null) items = items.filter((p) => p.price <= q.priceMax!)
  if (q.maxDeliveryDays != null) items = items.filter((p) => p.deliveryDays[1] <= q.maxDeliveryDays!)
  if (q.minRating != null) items = items.filter((p) => p.rating >= q.minRating!)
  if (q.onlyDiscounts) items = items.filter((p) => p.oldPrice != null)

  const text = q.q ? norm(q.q) : ''
  if (text) {
    const tokens = text.split(' ').filter(Boolean)
    items = items.filter((p) => {
      const h = db.haystack.get(p.id)!
      let score = 0
      for (const token of tokens) {
        const variants = expand(token)
        const strong = variants.some((v) => h.strong.includes(` ${v}`))
        const weak = !strong && variants.some((v) => h.weak.includes(` ${v}`))
        if (!strong && !weak) return false
        score += strong ? 3 : 1
      }
      scores.set(p.id, score)
      return true
    })
  }

  const sorted = [...items]
  switch (q.sort ?? 'popular') {
    case 'price_asc':
      sorted.sort((a, b) => a.price - b.price)
      break
    case 'price_desc':
      sorted.sort((a, b) => b.price - a.price)
      break
    case 'rating':
      sorted.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
      break
    case 'new':
      sorted.sort((a, b) => Number(b.badges.includes('new')) - Number(a.badges.includes('new')) || b.syncedAt.localeCompare(a.syncedAt))
      break
    case 'discount':
      sorted.sort((a, b) => discount(b) - discount(a))
      break
    default:
      sorted.sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) || b.sold - a.sold)
  }
  return sorted
}

/** Maps a pasted supplier link to a demo product of the same marketplace. */
export function resolveSupplierLink(db: CatalogDb, input: string): { source: SourceMarket; product: Product } | null {
  const s = input.trim()
  const patterns: Array<[SourceMarket, RegExp]> = [
    ['1688', /1688\.com\/(?:offer\/(\d+)|.*?offerId=(\d+))/i],
    ['alibaba', /alibaba\.com\/(?:product-detail\/[^?]*?_(\d+)\.html|.*?(\d{8,}))/i],
    ['poizon', /(?:dewu\.com|poizon\.com|dw4\.co)\/(?:.*?(?:spuId=|product\/|t\/)([\w\d]+))?/i],
  ]
  for (const [source, re] of patterns) {
    const m = s.match(re)
    if (!m) continue
    const key = m.slice(1).find(Boolean) ?? s
    let hash = 0
    for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
    const pool = db.products.filter((p) => p.source === source)
    if (!pool.length) return null
    return { source, product: pool[hash % pool.length] }
  }
  return null
}

export const looksLikeLink = (s: string) => /(https?:\/\/|www\.|1688\.com|alibaba\.com|dewu\.com|poizon\.com|dw4\.co)/i.test(s)

export function categoryById(db: CatalogDb, id: CategoryId) {
  return db.categories.find((c) => c.id === id)
}
