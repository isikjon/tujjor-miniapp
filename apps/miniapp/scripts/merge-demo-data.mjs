#!/usr/bin/env node
// Merges the localized batches (src/shared/demo/data/b*.json) + image manifest into src/shared/demo/catalog.json.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA = path.join(ROOT, 'src/shared/demo/data')
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/demo-media/manifest.json'), 'utf8'))

const CATEGORIES = [
  { id: 'electronics', name: { ru: 'Электроника', uz: 'Elektronika' }, icon: 'Smartphone' },
  { id: 'clothing', name: { ru: 'Одежда', uz: 'Kiyim-kechak' }, icon: 'Shirt' },
  { id: 'shoes', name: { ru: 'Обувь', uz: 'Poyabzal' }, icon: 'Footprints' },
  { id: 'bags', name: { ru: 'Сумки и аксессуары', uz: 'Sumka va aksessuarlar' }, icon: 'Handbag' },
  { id: 'watches', name: { ru: 'Часы', uz: 'Soatlar' }, icon: 'Watch' },
  { id: 'beauty', name: { ru: 'Красота', uz: 'Goʻzallik' }, icon: 'Sparkles' },
  { id: 'home', name: { ru: 'Дом и кухня', uz: 'Uy va oshxona' }, icon: 'CookingPot' },
  { id: 'sport', name: { ru: 'Спорт и отдых', uz: 'Sport va hordiq' }, icon: 'Dumbbell' },
]

// Category is authoritative from the source dataset (localizers sometimes filed sunglasses under clothing etc.).
const SOURCE_CATEGORY = {
  smartphones: 'electronics', tablets: 'electronics', laptops: 'electronics', 'mobile-accessories': 'electronics',
  'mens-shirts': 'clothing', tops: 'clothing', 'womens-dresses': 'clothing',
  'mens-shoes': 'shoes', 'womens-shoes': 'shoes',
  'womens-bags': 'bags', sunglasses: 'bags', 'womens-jewellery': 'bags',
  'mens-watches': 'watches', 'womens-watches': 'watches',
  beauty: 'beauty', fragrances: 'beauty', 'skin-care': 'beauty',
  'kitchen-accessories': 'home', 'home-decoration': 'home', furniture: 'home',
  'sports-accessories': 'sport',
}
const sourceCat = new Map(
  JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/demo-source/dummyjson.json'), 'utf8')).products.map((p) => [p.id, SOURCE_CATEGORY[p.category]]),
)

const batches = fs.readdirSync(DATA).filter((f) => /^b\d.*\.json$/.test(f)).sort()
const products = []
for (const f of batches) {
  const items = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'))
  for (const p of Array.isArray(items) ? items : items.products) {
    const images = p.imageIdx.map((i) => {
      const id = `dj${p.djId}-${i}`
      if (!manifest[id]) throw new Error(`${f}: image ${id} missing from manifest — run npm run demo:media`)
      return { id, tint: manifest[id].tint }
    })
    // Deterministic pseudo-random "last supplier sync" (2…240 min) for data-freshness UI.
    const syncedMin = 2 + ((p.djId * 7919) % 239)
    products.push({
      id: `p${p.djId}`,
      title: p.title,
      subtitle: p.subtitle,
      categoryId: sourceCat.get(p.djId) ?? p.categoryId,
      source: p.source,
      brand: p.brand,
      price: p.price,
      oldPrice: p.oldPrice,
      rating: p.rating,
      reviews: p.reviews,
      sold: p.sold,
      stock: p.stock,
      image: images[0],
      images,
      deliveryDays: p.deliveryDays,
      badges: p.badges,
      description: p.description,
      options: p.options,
      specs: p.specs,
      supplier: p.supplier,
      weightKg: p.weightKg,
      reviewsPreview: p.reviewsPreview,
      syncedMin,
    })
  }
}

const partial = process.argv.includes('--partial')
const categories = CATEGORIES.flatMap((c) => {
  const inCat = products.filter((p) => p.categoryId === c.id).sort((a, b) => b.sold - a.sold)
  if (!inCat.length) {
    if (partial) return []
    throw new Error(`category ${c.id} has no products (use --partial while batches are still being written)`)
  }
  return [{ ...c, productCount: inCat.length, image: inCat[0].image }]
})

const out = { version: 'demo-2026.10', generatedAt: new Date().toISOString(), categories, products }
fs.writeFileSync(path.join(ROOT, 'src/shared/demo/catalog.json'), JSON.stringify(out))
const bySource = products.reduce((m, p) => ((m[p.source] = (m[p.source] ?? 0) + 1), m), {})
const byCat = products.reduce((m, p) => ((m[p.categoryId] = (m[p.categoryId] ?? 0) + 1), m), {})
console.log(`catalog.json: ${products.length} products from ${batches.length} batches`, bySource, byCat)
