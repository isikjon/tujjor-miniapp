import type { Address, DeliveryMethod, L10n, Order, OrderEvent, OrderItem, OrderStatus, PaymentMethod, Product, QuoteInput } from '../types'
import { scopedStorage } from '../lib/storage'
import type { CatalogDb } from './catalog'
import { computeQuote, unitPriceOf } from './pricing'
import { SEED_ADDRESSES } from './user'

const FLOW: OrderStatus[] = ['paid', 'purchased', 'china_warehouse', 'in_transit', 'customs', 'arrived', 'out_for_delivery', 'delivered']
const DAY = 86_400_000

const NOTES: Partial<Record<OrderStatus, L10n>> = {
  purchased: { ru: 'Поставщик подтвердил отправку на наш склад', uz: 'Yetkazib beruvchi omborimizga joʻnatishni tasdiqladi' },
  china_warehouse: { ru: 'Склад TUJJOR в Иу: товар проверен, сделаны фото', uz: 'TUJJOR Iu ombori: mahsulot tekshirildi, suratga olindi' },
  in_transit: { ru: 'Авиарейс Иу → Ташкент', uz: 'Iu → Toshkent aviareysi' },
  customs: { ru: 'Таможенный пост «Ташкент-Авиа»', uz: '«Toshkent-Avia» bojxona posti' },
  arrived: { ru: 'Сортировочный центр, Чиланзар', uz: 'Saralash markazi, Chilonzor' },
  out_for_delivery: { ru: 'Курьер позвонит за час до приезда', uz: 'Kuryer kelishidan bir soat oldin qoʻngʻiroq qiladi' },
}

export function buildTimeline(status: OrderStatus, createdAt: number, stepHours = 30): OrderEvent[] {
  if (status === 'cancelled') {
    return [
      { status: 'pending_payment', at: new Date(createdAt).toISOString() },
      { status: 'cancelled', at: new Date(createdAt + 2 * 3_600_000).toISOString(), note: { ru: 'Отменён покупателем до выкупа', uz: 'Xaridor tomonidan sotib olishdan oldin bekor qilindi' } },
    ]
  }
  const reached = FLOW.indexOf(status)
  return FLOW.map((s, i) => ({
    status: s,
    at: i <= reached ? new Date(createdAt + i * stepHours * 3_600_000).toISOString() : null,
    note: NOTES[s],
  }))
}

function itemsFrom(db: CatalogDb, lines: QuoteInput['lines']): OrderItem[] {
  return lines.map((l) => {
    const info = unitPriceOf(db, l.productId, l.selection)!
    const p = info.product
    return { productId: p.id, title: p.title, image: p.image, selectionLabel: selectionLabel(p, l.selection), qty: l.qty, unitPrice: info.unit }
  })
}

export function selectionLabel(p: Product, selection: Record<string, string>): L10n {
  const parts = p.options.map((o) => o.values.find((v) => v.id === selection[o.id])?.label).filter((x): x is L10n => !!x)
  return { ru: parts.map((x) => x.ru).join(' · '), uz: parts.map((x) => x.uz).join(' · ') }
}

export function defaultSelection(p: Product): Record<string, string> {
  const sel: Record<string, string> = {}
  for (const o of p.options) {
    const v = o.values.find((x) => x.stock > 0) ?? o.values[0]
    sel[o.id] = v.id
  }
  return sel
}

function makeOrder(
  db: CatalogDb,
  args: { id: string; number: string; createdAt: number; status: OrderStatus; lines: QuoteInput['lines']; address: Address; delivery: DeliveryMethod; payment: PaymentMethod },
): Order {
  const quote = computeQuote(db, { lines: args.lines, addressId: args.address.id, delivery: args.delivery }, args.address)
  return {
    id: args.id,
    number: args.number,
    createdAt: new Date(args.createdAt).toISOString(),
    status: args.status,
    items: itemsFrom(db, args.lines),
    quote,
    address: args.address,
    delivery: args.delivery,
    payment: args.payment,
    timeline: buildTimeline(args.status, args.createdAt),
    trackingCode: ['in_transit', 'customs', 'arrived', 'out_for_delivery', 'delivered'].includes(args.status) ? `TJ${args.number.replace(/\D/g, '')}CN` : null,
    etaDate: args.status === 'cancelled' ? null : new Date(args.createdAt + quote.etaDays[1] * DAY).toISOString(),
  }
}

function seedOrders(db: CatalogDb): Order[] {
  const now = Date.now()
  const top = (cat: string, i: number): Product | undefined => {
    const list = db.products.filter((p) => p.categoryId === cat).sort((a, b) => b.sold - a.sold)
    return list[Math.min(i, list.length - 1)]
  }
  const line = (p: Product | undefined, qty = 1) => (p ? [{ key: `${p.id}:seed`, productId: p.id, selection: defaultSelection(p), qty }] : [])
  const home = SEED_ADDRESSES[0]
  const specs: Array<Omit<Parameters<typeof makeOrder>[1], 'lines'> & { lines: QuoteInput['lines'] }> = [
    { id: 'o-104702', number: 'TJ-26-104702', createdAt: now - 2 * DAY, status: 'purchased', lines: [...line(top('electronics', 1))], address: home, delivery: 'courier', payment: 'payme' },
    { id: 'o-104381', number: 'TJ-26-104381', createdAt: now - 9 * DAY, status: 'in_transit', lines: [...line(top('shoes', 0)), ...line(top('electronics', 4), 2)], address: home, delivery: 'courier', payment: 'click' },
    { id: 'o-103957', number: 'TJ-26-103957', createdAt: now - 15 * DAY, status: 'customs', lines: [...line(top('watches', 0))], address: SEED_ADDRESSES[1], delivery: 'pickup', payment: 'card' },
    { id: 'o-102118', number: 'TJ-26-102118', createdAt: now - 34 * DAY, status: 'delivered', lines: [...line(top('home', 0)), ...line(top('home', 3)), ...line(top('beauty', 1))], address: home, delivery: 'courier', payment: 'payme' },
    { id: 'o-101540', number: 'TJ-26-101540', createdAt: now - 41 * DAY, status: 'cancelled', lines: [...line(top('clothing', 2))], address: home, delivery: 'courier', payment: 'click' },
  ]
  return specs.filter((o) => o.lines.length).map((o) => makeOrder(db, o))
}

// ── persistence ("server database" for the demo) ────────────────────────────
const ORDERS_KEY = 'orders'
const IDEM_KEY = 'idempotency'

export function loadOrders(db: CatalogDb): Order[] {
  const raw = scopedStorage.getItem(ORDERS_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as Order[]
    } catch {
      /* fall through to reseed */
    }
  }
  const seeded = seedOrders(db)
  scopedStorage.setItem(ORDERS_KEY, JSON.stringify(seeded))
  return seeded
}

export function saveOrders(orders: Order[]) {
  scopedStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
}

export function idempotencyLookup(key: string): string | null {
  try {
    const map = JSON.parse(scopedStorage.getItem(IDEM_KEY) ?? '{}') as Record<string, string>
    return map[key] ?? null
  } catch {
    return null
  }
}

export function idempotencyStore(key: string, orderId: string) {
  let map: Record<string, string> = {}
  try {
    map = JSON.parse(scopedStorage.getItem(IDEM_KEY) ?? '{}')
  } catch {
    /* reset */
  }
  map[key] = orderId
  scopedStorage.setItem(IDEM_KEY, JSON.stringify(map))
}

export function createOrder(db: CatalogDb, input: QuoteInput, address: Address, payment: PaymentMethod): Order {
  const n = String(104_800 + Math.floor(Math.random() * 90_000))
  return makeOrder(db, {
    id: `o-${n}`,
    number: `TJ-26-${n}`,
    createdAt: Date.now(),
    status: 'paid',
    lines: input.lines,
    address,
    delivery: input.delivery,
    payment,
  })
}
