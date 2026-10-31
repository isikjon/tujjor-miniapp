#!/usr/bin/env node
// Builds the demo image set used by the Design Lab.
// Source: DummyJSON product renders (1000×1000, transparent background).
// Output: public/demo-media/{id}-{w}.avif|webp (alpha kept) + {id}-{w}.jpg fallback, and manifest.json.
// The same responsive/format strategy is what the production image proxy (CDN) will serve.
//
//   node scripts/build-demo-media.mjs            # all source images
//   node scripts/build-demo-media.mjs --only-catalog   # only images referenced by src/shared/demo/catalog.json
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC_JSON = path.join(ROOT, 'scripts/demo-source/dummyjson.json')
const CACHE = path.join(ROOT, 'scripts/.cache/demo-src')
const OUT = path.join(ROOT, 'public/demo-media')

export const WIDTHS = [240, 400, 640, 1000]
const JPEG_WIDTHS = [400, 1000]
const FILL = 0.86 // product occupies 86% of the longer side of the square canvas
const JPEG_BG = '#F2F2F4'
const CONCURRENCY = 6

const onlyCatalog = process.argv.includes('--only-catalog')
const force = process.argv.includes('--force')

const { products } = JSON.parse(await fs.readFile(SRC_JSON, 'utf8'))
let wanted = null
if (onlyCatalog) {
  const catalog = JSON.parse(await fs.readFile(path.join(ROOT, 'src/shared/demo/catalog.json'), 'utf8'))
  wanted = new Set(catalog.products.flatMap((p) => p.images.map((i) => i.id)))
}

const jobs = []
for (const p of products) {
  p.images.forEach((url, i) => {
    const id = `dj${p.id}-${i}`
    if (!wanted || wanted.has(id)) jobs.push({ id, url })
  })
}

await fs.mkdir(CACHE, { recursive: true })
await fs.mkdir(OUT, { recursive: true })

const manifestPath = path.join(OUT, 'manifest.json')
const manifest = existsSync(manifestPath) && !force ? JSON.parse(await fs.readFile(manifestPath, 'utf8')) : {}

async function download(job) {
  const file = path.join(CACHE, `${job.id}.webp`)
  if (existsSync(file)) return file
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(job.url, { signal: AbortSignal.timeout(20_000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await fs.writeFile(file, Buffer.from(await res.arrayBuffer()))
      return file
    } catch (e) {
      if (attempt === 4) throw new Error(`${job.id}: download failed (${e.message})`)
      await new Promise((r) => setTimeout(r, 400 * 2 ** attempt + Math.random() * 300))
    }
  }
}

const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

async function process1(job) {
  if (manifest[job.id] && !force && existsSync(path.join(OUT, `${job.id}-1000.avif`))) return 'cached'
  const file = await download(job)

  // 1. Trim transparent margins, then re-pad to a centred square so every product fills the tile consistently.
  const trimmed = await sharp(file).ensureAlpha().trim({ threshold: 6 }).png().toBuffer({ resolveWithObject: true })
  const { width: tw, height: th } = trimmed.info
  const side = Math.round(Math.max(tw, th) / FILL)
  const left = Math.floor((side - tw) / 2)
  const top = Math.floor((side - th) / 2)
  const square = await sharp(trimmed.data)
    .extend({ left, right: side - tw - left, top, bottom: side - th - top, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  // 2. Tint = average colour of (mostly) opaque product pixels.
  const { data, info } = await sharp(square).resize(48, 48, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
  let r = 0, g = 0, b = 0, n = 0
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] > 200) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++ }
  }
  const tint = n ? hex(r / n, g / n, b / n) : '#9a9aa0'

  // 3. Variants.
  await Promise.all(
    WIDTHS.flatMap((w) => {
      const base = sharp(square).resize(w, w, { kernel: 'lanczos3' })
      const tasks = [
        base.clone().avif({ quality: 55, effort: 4 }).toFile(path.join(OUT, `${job.id}-${w}.avif`)),
        base.clone().webp({ quality: 80, alphaQuality: 90, effort: 4 }).toFile(path.join(OUT, `${job.id}-${w}.webp`)),
      ]
      if (JPEG_WIDTHS.includes(w))
        tasks.push(base.clone().flatten({ background: JPEG_BG }).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(OUT, `${job.id}-${w}.jpg`)))
      return tasks
    }),
  )
  manifest[job.id] = { tint, side, trimmed: [tw, th] }
  return 'built'
}

let done = 0, built = 0
const failures = []
const queue = [...jobs]
const t0 = Date.now()
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const job = queue.shift()
      try {
        if ((await process1(job)) === 'built') built++
      } catch (e) {
        failures.push(e.message)
      }
      if (++done % 40 === 0) console.log(`${done}/${jobs.length}`)
    }
  }),
)
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 0))

let bytes = 0, files = 0
for (const f of await fs.readdir(OUT)) {
  if (f === 'manifest.json') continue
  bytes += (await fs.stat(path.join(OUT, f))).size
  files++
}
console.log(`\n${jobs.length} images (${built} built) in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${files} files, ${(bytes / 1048576).toFixed(1)} MB`)
if (failures.length) {
  console.log(`FAILURES (${failures.length}):\n${failures.join('\n')}`)
  process.exitCode = 1
}
