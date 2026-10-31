#!/usr/bin/env node
// Validates one localized demo-catalog batch produced for the Design Lab.
// Usage: node scripts/validate-demo-data.mjs <batch-output.json> [<source-batch.json>]
// Exit code 1 when there are errors. Warnings never fail.
import fs from 'node:fs'

const [outPath, srcPath] = process.argv.slice(2)
if (!outPath) {
  console.error('usage: validate-demo-data.mjs <batch-output.json> [<source-batch.json>]')
  process.exit(2)
}

const CATEGORIES = ['electronics', 'clothing', 'shoes', 'bags', 'watches', 'beauty', 'home', 'sport']
const SOURCES = ['1688', 'alibaba', 'poizon']
const BADGES = ['hit', 'new', 'sale', 'fast', 'original', 'choice', 'wholesale']
const KINDS = ['color', 'size', 'text']

const errors = []
const warnings = []
const err = (p, m) => errors.push(`${p}: ${m}`)
const warn = (p, m) => warnings.push(`${p}: ${m}`)

let data
try {
  data = JSON.parse(fs.readFileSync(outPath, 'utf8'))
} catch (e) {
  console.error(`Cannot parse ${outPath}: ${e.message}`)
  process.exit(1)
}
const products = Array.isArray(data) ? data : data.products
if (!Array.isArray(products)) {
  console.error('Top level must be an array of products or { "products": [...] }')
  process.exit(1)
}

const source = srcPath ? JSON.parse(fs.readFileSync(srcPath, 'utf8')) : null
const sourceById = source ? new Map(source.map((p) => [p.id, p])) : null

const isInt = (n) => Number.isInteger(n)
const CYR = /[Ѐ-ӿ]/
const BAD_OG = /([oOgG])['’`‘]/ // must be oʻ / gʻ (U+02BB)
const ASCII_APOS = /['’`]/

function checkUz(path, s) {
  if (CYR.test(s)) err(path, `Uzbek text must be Latin script, found Cyrillic: "${s.slice(0, 60)}"`)
  if (BAD_OG.test(s)) err(path, `use "oʻ"/"gʻ" with U+02BB (ʻ), not an apostrophe: "${s.match(BAD_OG)[0]}" in "${s.slice(0, 60)}"`)
  else if (ASCII_APOS.test(s)) warn(path, `apostrophe in Uzbek text — tutuq belgisi should be U+02BC (ʼ): "${s.slice(0, 60)}"`)
}

function l10n(path, v, { min = 1, max = 2000 } = {}) {
  if (!v || typeof v !== 'object') return err(path, 'must be { ru, uz }')
  for (const loc of ['ru', 'uz']) {
    const s = v[loc]
    if (typeof s !== 'string' || !s.trim()) {
      err(`${path}.${loc}`, 'missing text')
      continue
    }
    if (s.length < min) err(`${path}.${loc}`, `too short (${s.length} < ${min})`)
    if (s.length > max) err(`${path}.${loc}`, `too long (${s.length} > ${max}): "${s.slice(0, 50)}…"`)
    if (s !== s.trim()) warn(`${path}.${loc}`, 'leading/trailing whitespace')
  }
  if (typeof v.ru === 'string' && !CYR.test(v.ru) && !/^[\d\s.,×xX%+-/]+$/.test(v.ru) && v.ru.length > 3)
    warn(`${path}.ru`, `Russian text has no Cyrillic: "${v.ru.slice(0, 50)}" (ok only for model names / sizes)`)
  if (typeof v.uz === 'string') checkUz(`${path}.uz`, v.uz)
}

const seen = new Set()
products.forEach((p, i) => {
  const at = `#${i} (djId ${p?.djId})`
  if (!isInt(p.djId)) err(at, 'djId must be an integer')
  if (seen.has(p.djId)) err(at, 'duplicate djId')
  seen.add(p.djId)
  const src = sourceById?.get(p.djId)
  if (sourceById && !src) err(at, 'djId not present in the source batch')

  if (!CATEGORIES.includes(p.categoryId)) err(at, `categoryId must be one of ${CATEGORIES.join(', ')}`)
  if (!SOURCES.includes(p.source)) err(at, `source must be one of ${SOURCES.join(', ')}`)
  if (!(p.brand === null || (typeof p.brand === 'string' && p.brand.trim()))) err(at, 'brand must be a non-empty string or null')

  l10n(`${at}.title`, p.title, { min: 4, max: 64 })
  l10n(`${at}.subtitle`, p.subtitle, { min: 3, max: 44 })
  l10n(`${at}.description`, p.description, { min: 60, max: 620 })

  if (!isInt(p.price) || p.price % 1000 !== 0 || p.price < 5000 || p.price > 60_000_000)
    err(at, `price must be an integer multiple of 1000 between 5 000 and 60 000 000 UZS (got ${p.price})`)
  if (p.oldPrice !== null) {
    if (!isInt(p.oldPrice) || p.oldPrice % 1000 !== 0) err(at, 'oldPrice must be null or an integer multiple of 1000')
    else if (p.oldPrice < p.price * 1.03) err(at, 'oldPrice must be at least 3% above price')
    else if (p.oldPrice > p.price * 2.2) warn(at, 'discount above 55% looks unrealistic')
  }
  if (typeof p.rating !== 'number' || p.rating < 4.0 || p.rating > 4.9 || Math.round(p.rating * 10) !== p.rating * 10)
    err(at, 'rating must be 4.0–4.9 with one decimal')
  if (!isInt(p.reviews) || p.reviews < 0 || p.reviews > 50_000) err(at, 'reviews must be an integer 0–50 000')
  if (!isInt(p.sold) || p.sold < p.reviews) err(at, 'sold must be an integer ≥ reviews')
  if (!isInt(p.stock) || p.stock < 0 || p.stock > 9999) err(at, 'stock must be an integer 0–9999')
  if (!Array.isArray(p.deliveryDays) || p.deliveryDays.length !== 2 || !p.deliveryDays.every(isInt) || p.deliveryDays[0] < 3 || p.deliveryDays[0] >= p.deliveryDays[1] || p.deliveryDays[1] > 40)
    err(at, 'deliveryDays must be [min, max] integers with 3 ≤ min < max ≤ 40')
  if (typeof p.weightKg !== 'number' || p.weightKg < 0.01 || p.weightKg > 60) err(at, 'weightKg must be 0.01–60')

  if (!Array.isArray(p.badges) || p.badges.some((b) => !BADGES.includes(b))) err(at, `badges must be a subset of ${BADGES.join(', ')}`)
  else {
    if (new Set(p.badges).size !== p.badges.length) err(at, 'duplicate badges')
    if (p.badges.includes('sale') !== (p.oldPrice !== null)) err(at, `"sale" badge must be present exactly when oldPrice is set`)
    if (p.badges.includes('original') && p.source !== 'poizon') err(at, '"original" badge is only for source "poizon"')
    if (p.badges.includes('wholesale') && p.source !== '1688') err(at, '"wholesale" badge is only for source "1688"')
    if (p.badges.includes('fast') && p.deliveryDays?.[1] > 12) err(at, '"fast" badge requires deliveryDays max ≤ 12')
  }

  const nImg = src ? src.images.length : 4
  if (!Array.isArray(p.imageIdx) || p.imageIdx.length < 1 || p.imageIdx.length > 3) err(at, 'imageIdx must list 1–3 image indexes')
  else {
    if (new Set(p.imageIdx).size !== p.imageIdx.length) err(at, 'imageIdx has duplicates')
    for (const k of p.imageIdx) if (!isInt(k) || k < 0 || k >= nImg) err(at, `imageIdx ${k} out of range (source has ${nImg} images)`)
  }

  if (!Array.isArray(p.options) || p.options.length > 2) err(at, 'options must be an array with 0–2 options')
  else
    p.options.forEach((o, j) => {
      const op = `${at}.options[${j}]`
      if (typeof o.id !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(o.id)) err(op, 'id must be a lowercase slug')
      if (!KINDS.includes(o.kind)) err(op, `kind must be one of ${KINDS.join(', ')}`)
      l10n(`${op}.name`, o.name, { max: 24 })
      if (!Array.isArray(o.values) || o.values.length < 1 || o.values.length > 8) return err(op, 'values must have 1–8 items')
      const ids = new Set()
      o.values.forEach((v, k) => {
        const vp = `${op}.values[${k}]`
        if (typeof v.id !== 'string' || !v.id) err(vp, 'id required')
        if (ids.has(v.id)) err(vp, 'duplicate value id')
        ids.add(v.id)
        l10n(`${vp}.label`, v.label, { max: 28 })
        if (o.kind === 'color' && !/^#[0-9a-fA-F]{6}$/.test(v.hex ?? '')) err(vp, 'color values need hex "#RRGGBB"')
        if (v.imageIndex !== undefined && (!isInt(v.imageIndex) || v.imageIndex < 0 || v.imageIndex >= (p.imageIdx?.length ?? 0)))
          err(vp, 'imageIndex must point into this product\'s imageIdx list (0-based position)')
        if (v.priceDelta !== undefined && (!isInt(v.priceDelta) || v.priceDelta % 1000 !== 0)) err(vp, 'priceDelta must be an integer multiple of 1000')
        if (!isInt(v.stock) || v.stock < 0) err(vp, 'stock must be an integer ≥ 0')
      })
      if (o.values.every((v) => v.stock === 0)) err(op, 'at least one value must be in stock')
    })

  if (!Array.isArray(p.specs) || p.specs.length < 3 || p.specs.length > 7) err(at, 'specs must have 3–7 items')
  else p.specs.forEach((s, j) => { l10n(`${at}.specs[${j}].name`, s.name, { max: 32 }); l10n(`${at}.specs[${j}].value`, s.value, { max: 60 }) })

  const s = p.supplier
  if (!s || typeof s.name !== 'string' || !s.name.trim()) err(at, 'supplier.name required')
  else {
    l10n(`${at}.supplier.city`, s.city, { max: 24 })
    if (typeof s.rating !== 'number' || s.rating < 4 || s.rating > 5) err(at, 'supplier.rating must be 4.0–5.0')
    if (!isInt(s.years) || s.years < 1 || s.years > 25) err(at, 'supplier.years must be 1–25')
    if (typeof s.verified !== 'boolean') err(at, 'supplier.verified must be boolean')
  }

  if (!Array.isArray(p.reviewsPreview) || p.reviewsPreview.length < 2 || p.reviewsPreview.length > 3) err(at, 'reviewsPreview must have 2–3 items')
  else
    p.reviewsPreview.forEach((r, j) => {
      const rp = `${at}.reviewsPreview[${j}]`
      if (typeof r.author !== 'string' || !r.author.trim()) err(rp, 'author required')
      if (!isInt(r.rating) || r.rating < 1 || r.rating > 5) err(rp, 'rating must be integer 1–5')
      l10n(`${rp}.text`, r.text, { min: 12, max: 260 })
      if (!/^2026-(0[1-9]|10)-\d{2}$/.test(r.date ?? '')) err(rp, 'date must be YYYY-MM-DD between 2026-01 and 2026-10')
    })
})

if (sourceById) {
  const dropped = [...sourceById.keys()].filter((id) => !seen.has(id))
  if (dropped.length) warn('batch', `source products not included (ok if intentional): ${dropped.join(', ')}`)
}

for (const w of warnings) console.log(`WARN  ${w}`)
for (const e of errors) console.log(`ERROR ${e}`)
console.log(`\n${products.length} products, ${errors.length} errors, ${warnings.length} warnings`)
process.exit(errors.length ? 1 : 0)
