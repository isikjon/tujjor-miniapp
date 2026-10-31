import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { CartLine, Product } from '../types'
import { scopedStorage } from '../lib/storage'
import { selectionLabel } from '../demo/orders'

export const lineKey = (productId: string, selection: Record<string, string>) =>
  `${productId}|${Object.keys(selection).sort().map((k) => `${k}=${selection[k]}`).join('&')}`

/** Unit price, old price and stock for a product + SKU selection (client snapshot for instant UI). */
export function priceFor(p: Product, selection: Record<string, string>) {
  let unit = p.price
  let old = p.oldPrice
  let stock = p.stock
  for (const o of p.options) {
    const v = o.values.find((x) => x.id === selection[o.id])
    if (!v) continue
    unit += v.priceDelta ?? 0
    if (old != null) old += v.priceDelta ?? 0
    stock = Math.min(stock, v.stock)
  }
  return { unit, old, stock }
}

const MAX_QTY = 99

interface CartState {
  lines: CartLine[]
  seeded: boolean
  add: (product: Product, selection: Record<string, string>, qty?: number) => { line: CartLine; merged: boolean }
  setQty: (key: string, qty: number) => void
  remove: (key: string) => { line: CartLine; index: number } | null
  restore: (line: CartLine, index: number) => void
  toggle: (key: string) => void
  setAllSelected: (selected: boolean) => void
  removeKeys: (keys: string[]) => void
  markSeeded: () => void
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      seeded: false,
      add: (product, selection, qty = 1) => {
        const key = lineKey(product.id, selection)
        const { unit, old, stock } = priceFor(product, selection)
        const maxQty = Math.max(1, Math.min(stock, MAX_QTY))
        const existing = get().lines.find((l) => l.key === key)
        if (existing) {
          const next = { ...existing, qty: Math.min(existing.qty + qty, maxQty), maxQty, unitPrice: unit, oldUnitPrice: old, selected: true }
          set({ lines: get().lines.map((l) => (l.key === key ? next : l)) })
          return { line: next, merged: true }
        }
        const line: CartLine = {
          key,
          productId: product.id,
          title: product.title,
          image: product.image,
          source: product.source,
          selection,
          selectionLabel: selectionLabel(product, selection),
          unitPrice: unit,
          oldUnitPrice: old,
          qty: Math.min(qty, maxQty),
          maxQty,
          selected: true,
          addedAt: Date.now(),
        }
        set({ lines: [line, ...get().lines] })
        return { line, merged: false }
      },
      setQty: (key, qty) =>
        set({ lines: get().lines.map((l) => (l.key === key ? { ...l, qty: Math.max(1, Math.min(qty, l.maxQty)) } : l)) }),
      remove: (key) => {
        const index = get().lines.findIndex((l) => l.key === key)
        if (index < 0) return null
        const line = get().lines[index]
        set({ lines: get().lines.filter((l) => l.key !== key) })
        return { line, index }
      },
      restore: (line, index) => {
        if (get().lines.some((l) => l.key === line.key)) return
        const lines = [...get().lines]
        lines.splice(Math.min(index, lines.length), 0, line)
        set({ lines })
      },
      toggle: (key) => set({ lines: get().lines.map((l) => (l.key === key ? { ...l, selected: !l.selected } : l)) }),
      setAllSelected: (selected) => set({ lines: get().lines.map((l) => ({ ...l, selected })) }),
      removeKeys: (keys) => set({ lines: get().lines.filter((l) => !keys.includes(l.key)) }),
      markSeeded: () => set({ seeded: true }),
    }),
    { name: 'cart', storage: createJSONStorage(() => scopedStorage), version: 1 },
  ),
)

/** Total number of units in the cart (for tab badges). */
export const useCartCount = () => useCart((s) => s.lines.reduce((n, l) => n + l.qty, 0))
export const useCartLines = () => useCart((s) => s.lines)
