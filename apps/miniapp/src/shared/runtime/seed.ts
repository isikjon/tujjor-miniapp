import { loadCatalog, type CatalogDb } from '../demo/catalog'
import { defaultSelection } from '../demo/orders'
import type { Product } from '../types'
import { useCart } from '../store/cart'
import { useFavorites } from '../store/favorites'

const top = (db: CatalogDb, cat: string, i = 0, f: (p: Product) => boolean = () => true) =>
  db.products.filter((p) => p.categoryId === cat && f(p)).sort((a, b) => b.sold - a.sold)[i]

/** Product the lab opens for the "Product" screen: richest SKU matrix (colour + size). */
export function featuredProduct(db: CatalogDb): Product {
  return top(db, 'shoes', 0, (p) => p.options.length >= 2) ?? top(db, 'shoes') ?? db.products[0]
}

/**
 * First run only: a few cart lines and favourites so the Cart / Checkout / Favourites screens
 * are meaningful in the lab. Real users start empty.
 */
export async function seedDemoState() {
  const cart = useCart.getState()
  const fav = useFavorites.getState()
  if (cart.seeded && fav.seeded) return
  const db = await loadCatalog()
  if (!cart.seeded) {
    const picks: Array<[Product | undefined, number]> = [
      [featuredProduct(db), 1],
      [top(db, 'electronics', 3), 1],
      [top(db, 'home', 1), 2],
    ]
    for (const [p, qty] of picks.reverse()) {
      if (!p) continue
      const sel = defaultSelection(p)
      for (const o of p.options) {
        if (o.kind === 'size') {
          const mid = o.values.filter((v) => v.stock > 0)
          const v = mid[Math.floor(mid.length / 2)]
          if (v) sel[o.id] = v.id
        }
      }
      useCart.getState().add(p, sel, qty)
    }
    useCart.getState().markSeeded()
  }
  if (!fav.seeded) {
    const ids = [top(db, 'watches', 0), top(db, 'bags', 1), top(db, 'beauty', 0), top(db, 'electronics', 0)].filter(Boolean).map((p) => p!.id)
    useFavorites.getState().seed(ids)
  }
}
