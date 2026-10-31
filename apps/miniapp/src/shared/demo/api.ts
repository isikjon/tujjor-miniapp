import type {
  Address,
  Category,
  DemoUser,
  HomeData,
  HomeSection,
  Locale,
  Order,
  Page,
  PlaceOrderInput,
  Product,
  ProductQuery,
  ProductSummary,
  Quote,
  QuoteInput,
  SourceMarket,
  Suggestion,
} from '../types'
import { scopedStorage } from '../lib/storage'
import { BANNERS, TRENDING } from './content'
import { loadCatalog, looksLikeLink, norm, queryProducts, resolveSupplierLink, toSummary } from './catalog'
import { ApiError } from './errors'
import { net } from './network'
import { createOrder, idempotencyLookup, idempotencyStore, loadOrders, saveOrders } from './orders'
import { computeQuote } from './pricing'
import { DEMO_USER, SEED_ADDRESSES } from './user'

/**
 * In-browser demo backend with the same contract the real API gateway will expose.
 * Every call goes through `net()` (network conditions) and accepts an AbortSignal so
 * TanStack Query can cancel stale requests (search-as-you-type).
 */

const ADDR_KEY = 'addresses'

function loadAddresses(): Address[] {
  try {
    const raw = scopedStorage.getItem(ADDR_KEY)
    if (raw) return JSON.parse(raw) as Address[]
  } catch {
    /* reseed */
  }
  return SEED_ADDRESSES
}

function endOfToday() {
  const d = new Date()
  d.setHours(23, 59, 59, 0)
  return d.toISOString()
}

export const api = {
  async home(signal?: AbortSignal): Promise<HomeData> {
    const db = await loadCatalog()
    return net(() => {
      const by = (f: (p: Product) => boolean, sort: (a: Product, b: Product) => number, n = 12) =>
        db.products.filter(f).sort(sort).slice(0, n).map(toSummary)
      const disc = (p: Product) => (p.oldPrice ? (p.oldPrice - p.price) / p.oldPrice : 0)
      const sections: HomeSection[] = [
        { id: 'flash', kind: 'flash', title: { ru: 'Суперцены дня', uz: 'Kunning super narxlari' }, endsAt: endOfToday(), items: by((p) => p.oldPrice != null, (a, b) => disc(b) - disc(a), 10) },
        { id: 'hits', kind: 'hits', title: { ru: 'Хиты продаж', uz: 'Eng koʻp sotilganlar' }, items: by((p) => p.badges.includes('hit'), (a, b) => b.sold - a.sold) },
        { id: 'poizon', kind: 'poizon', title: { ru: 'Оригиналы с POIZON', uz: 'POIZONdan originallar' }, items: by((p) => p.source === 'poizon', (a, b) => b.rating - a.rating || b.sold - a.sold) },
        { id: 'new', kind: 'new', title: { ru: 'Новинки недели', uz: 'Hafta yangiliklari' }, items: by((p) => p.badges.includes('new'), (a, b) => b.rating - a.rating) },
        { id: 'budget', kind: 'budget', title: { ru: 'До 150 000 сум', uz: '150 000 soʻmgacha' }, items: by((p) => p.price <= 150_000, (a, b) => b.sold - a.sold) },
      ]
      const banners = BANNERS.map(({ imageFrom, ...b }) => {
        const pool = db.products.filter((p) => p.categoryId === imageFrom.categoryId).sort((a, b2) => b2.sold - a.sold)
        return { ...b, image: pool[imageFrom.rank ?? 0]?.image ?? db.products[0].image }
      })
      return { banners, categories: db.categories, sections, trending: TRENDING }
    }, signal)
  },

  async categories(signal?: AbortSignal): Promise<Category[]> {
    const db = await loadCatalog()
    return net(() => db.categories, signal)
  },

  /** Cursor pagination: the cursor is opaque to the client. */
  async products(query: ProductQuery, cursor: string | null, limit = 20, signal?: AbortSignal): Promise<Page<ProductSummary>> {
    const db = await loadCatalog()
    return net(() => {
      const all = queryProducts(db, query)
      const offset = cursor ? Number(atob(cursor)) || 0 : 0
      const items = all.slice(offset, offset + limit).map(toSummary)
      const next = offset + limit < all.length ? btoa(String(offset + limit)) : null
      return { items, nextCursor: next, total: all.length }
    }, signal)
  },

  /** Count only (used by the filter sheet "Show N items" button). */
  async count(query: ProductQuery, signal?: AbortSignal): Promise<number> {
    const db = await loadCatalog()
    return net(() => queryProducts(db, query).length, signal)
  },

  async product(id: string, signal?: AbortSignal): Promise<Product> {
    const db = await loadCatalog()
    return net(() => {
      const p = db.byId.get(id)
      if (!p) throw new ApiError('not_found')
      return p
    }, signal)
  },

  async similar(id: string, signal?: AbortSignal): Promise<ProductSummary[]> {
    const db = await loadCatalog()
    return net(() => {
      const p = db.byId.get(id)
      if (!p) return []
      return db.products
        .filter((x) => x.categoryId === p.categoryId && x.id !== id)
        .sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price))
        .slice(0, 10)
        .map(toSummary)
    }, signal)
  },

  async suggest(q: string, locale: Locale, signal?: AbortSignal): Promise<Suggestion[]> {
    const db = await loadCatalog()
    return net(() => {
      const n = norm(q)
      if (!n || looksLikeLink(q)) return []
      const out: Suggestion[] = []
      for (const c of db.categories) if (norm(c.name[locale]).includes(n) || norm(c.name.ru).includes(n) || norm(c.name.uz).includes(n)) out.push({ kind: 'category', text: c.name, categoryId: c.id })
      for (const tq of TRENDING) if ((norm(tq.ru).startsWith(n) || norm(tq.uz).startsWith(n)) && out.length < 4) out.push({ kind: 'query', text: tq })
      for (const p of queryProducts(db, { q }).slice(0, 6 - Math.min(out.length, 3))) out.push({ kind: 'product', text: p.title, productId: p.id })
      return out.slice(0, 7)
    }, signal)
  },

  async resolveLink(url: string, signal?: AbortSignal): Promise<{ source: SourceMarket; product: ProductSummary } | null> {
    const db = await loadCatalog()
    return net(() => {
      const r = resolveSupplierLink(db, url)
      return r ? { source: r.source, product: toSummary(r.product) } : null
    }, signal)
  },

  async addresses(signal?: AbortSignal): Promise<Address[]> {
    return net(() => loadAddresses(), signal)
  },

  async saveAddress(address: Address): Promise<Address[]> {
    return net(() => {
      let list = loadAddresses().filter((a) => a.id !== address.id)
      if (address.isDefault) list = list.map((a) => ({ ...a, isDefault: false }))
      list = [address, ...list]
      if (!list.some((a) => a.isDefault)) list[0] = { ...list[0], isDefault: true }
      scopedStorage.setItem(ADDR_KEY, JSON.stringify(list))
      return list
    })
  },

  /** Server-side price calculation — the only source of truth for money. */
  async quote(input: QuoteInput, signal?: AbortSignal): Promise<Quote> {
    const db = await loadCatalog()
    return net(() => {
      const address = loadAddresses().find((a) => a.id === input.addressId) ?? null
      return computeQuote(db, input, address)
    }, signal)
  },

  /**
   * Idempotent order creation: the same key always returns the same order, so a double tap,
   * a retry after a timeout or a resubmit after the app was minimised never creates a duplicate.
   */
  async placeOrder(input: PlaceOrderInput, idempotencyKey: string): Promise<Order> {
    const db = await loadCatalog()
    return net(() => {
      const existingId = idempotencyLookup(idempotencyKey)
      const orders = loadOrders(db)
      if (existingId) {
        const existing = orders.find((o) => o.id === existingId)
        if (existing) return existing
      }
      const address = loadAddresses().find((a) => a.id === input.quote.addressId)
      if (!address) throw new ApiError('validation', 'address')
      if (!input.quote.lines.length) throw new ApiError('validation', 'empty')
      const quote = computeQuote(db, input.quote, address)
      if (quote.lines.some((l) => !l.available)) throw new ApiError('out_of_stock')
      const order = createOrder(db, input.quote, address, input.payment)
      saveOrders([order, ...orders])
      idempotencyStore(idempotencyKey, order.id)
      return order
    })
  },

  async orders(signal?: AbortSignal): Promise<Order[]> {
    const db = await loadCatalog()
    return net(() => loadOrders(db).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), signal)
  },

  async order(id: string, signal?: AbortSignal): Promise<Order> {
    const db = await loadCatalog()
    return net(() => {
      const o = loadOrders(db).find((x) => x.id === id)
      if (!o) throw new ApiError('not_found')
      return o
    }, signal)
  },

  /** Favourites are synced to the server; the UI applies the change optimistically and rolls back on failure. */
  async setFavorite(_productId: string, _on: boolean): Promise<void> {
    return net(() => undefined)
  },

  async me(signal?: AbortSignal): Promise<DemoUser> {
    return net(() => DEMO_USER, signal)
  },
}

export type Api = typeof api
