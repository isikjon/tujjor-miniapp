import type { Address, Quote, QuoteInput } from '../types'
import type { CatalogDb } from './catalog'

/**
 * Demo business rules for the "server-side" quote. All money is integer UZS.
 * In production these live in the Order service configuration (versioned) — the client never totals money.
 */
export const PRICING_RULES = {
  version: 'demo-2026.10',
  shippingPerKg: 79_000,
  poizonExpressPerKg: 95_000,
  shippingMin: 29_000,
  serviceFeeRate: 0.03,
  serviceFeeMin: 9_000,
  serviceFeeMax: 450_000,
  courierTashkent: 25_000,
  courierRegions: 39_000,
  courierFreeFrom: 1_500_000,
  promos: {
    TUJJOR10: { kind: 'percent' as const, value: 10, max: 200_000, minTotal: 0 },
    NEW50: { kind: 'fixed' as const, value: 50_000, max: 50_000, minTotal: 500_000 },
  },
}

const up1000 = (n: number) => Math.ceil(n / 1000) * 1000
const isTashkentCity = (a: Address | null) => !a || a.region.ru === 'Ташкент'

export function unitPriceOf(db: CatalogDb, productId: string, selection: Record<string, string>) {
  const p = db.byId.get(productId)
  if (!p) return null
  let unit = p.price
  let old = p.oldPrice
  let stock = p.stock
  for (const opt of p.options) {
    const v = opt.values.find((x) => x.id === selection[opt.id])
    if (!v) continue
    unit += v.priceDelta ?? 0
    if (old != null) old += v.priceDelta ?? 0
    stock = Math.min(stock, v.stock)
  }
  return { product: p, unit, old, stock }
}

export function computeQuote(db: CatalogDb, input: QuoteInput, address: Address | null): Quote {
  const R = PRICING_RULES
  let itemsTotal = 0
  let savings = 0
  let weight = 0
  let itemsCount = 0
  let shippingRaw = 0
  let etaMin = 0
  let etaMax = 0

  const lines = input.lines.map((l) => {
    const info = unitPriceOf(db, l.productId, l.selection)
    const available = !!info && info.stock >= l.qty && l.qty > 0
    const lineTotal = info ? info.unit * l.qty : 0
    if (info && available) {
      itemsTotal += lineTotal
      itemsCount += l.qty
      if (info.old != null) savings += (info.old - info.unit) * l.qty
      const w = info.product.weightKg * l.qty
      weight += w
      shippingRaw += w * (info.product.source === 'poizon' ? R.poizonExpressPerKg : R.shippingPerKg)
      etaMin = Math.max(etaMin, info.product.deliveryDays[0])
      etaMax = Math.max(etaMax, info.product.deliveryDays[1])
    }
    return { key: l.key, productId: l.productId, qty: l.qty, unitPrice: info?.unit ?? 0, lineTotal, available }
  })

  let promoDiscount = 0
  let promoError: string | null = null
  const code = input.promoCode?.trim().toUpperCase() || null
  if (code) {
    const promo = R.promos[code as keyof typeof R.promos]
    if (!promo) promoError = 'invalid'
    else if (itemsTotal < promo.minTotal) promoError = 'min_total'
    else promoDiscount = Math.min(promo.max, promo.kind === 'percent' ? Math.floor((itemsTotal * promo.value) / 100 / 1000) * 1000 : promo.value)
  }

  const hasItems = itemsCount > 0
  const internationalShipping = hasItems ? Math.max(R.shippingMin, up1000(shippingRaw)) : 0
  const serviceFee = hasItems ? Math.min(R.serviceFeeMax, Math.max(R.serviceFeeMin, up1000(itemsTotal * R.serviceFeeRate))) : 0
  const localDelivery =
    !hasItems || input.delivery === 'pickup' ? 0 : isTashkentCity(address) ? (itemsTotal >= R.courierFreeFrom ? 0 : R.courierTashkent) : R.courierRegions
  const localDays: [number, number] = input.delivery === 'pickup' ? [1, 1] : isTashkentCity(address) ? [1, 2] : [2, 4]

  return {
    lines,
    itemsCount,
    itemsTotal,
    savings,
    promoDiscount,
    promoCode: promoError ? null : code,
    promoError,
    internationalShipping,
    serviceFee,
    localDelivery,
    total: itemsTotal - promoDiscount + internationalShipping + serviceFee + localDelivery,
    weightKg: Math.round(weight * 100) / 100,
    etaDays: hasItems ? [etaMin + localDays[0], etaMax + localDays[1]] : [0, 0],
    rulesVersion: R.version,
    calculatedAt: new Date().toISOString(),
  }
}
