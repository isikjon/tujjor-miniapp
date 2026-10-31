#!/usr/bin/env node
// Lab performance probe for the four variants (production build served by `vite preview`).
// Emulates a mid-range Android on typical 4G: CPU ×4 slowdown, 70 ms RTT, 9 Mbit/s down, 3 Mbit/s up.
// Measures cold start (empty cache) and warm reopen (HTTP cache) + tap→screen latency.
// This is a desktop-Chrome emulation, NOT a substitute for profiling on real Android/iOS/Telegram Desktop devices.
//
//   npm run build && npm run preview &   then   node scripts/perf.mjs [--runs 3] [--base http://localhost:4173]
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`)
  return i > 0 ? process.argv[i + 1] : d
}
const BASE = arg('base', 'http://localhost:4173')
const RUNS = Number(arg('runs', '3'))
const VARIANTS = (arg('variants', 'a,b,c,d')).split(',')
const NET = { offline: false, latency: 70, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (3 * 1024 * 1024) / 8 }
const CPU = 4

const INIT = () => {
  window.__perf = { fcp: 0, lcp: 0, longTasks: [], events: [] }
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__perf.fcp = e.startTime
  }).observe({ type: 'paint', buffered: true })
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__perf.lcp = e.startTime
  }).observe({ type: 'largest-contentful-paint', buffered: true })
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__perf.longTasks.push(e.duration)
  }).observe({ type: 'longtask', buffered: true })
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (e.interactionId) window.__perf.events.push({ name: e.name, duration: e.duration, processing: e.processingEnd - e.processingStart })
  }).observe({ type: 'event', buffered: true, durationThreshold: 16 })
}

async function measure(context, url, { interact }) {
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', NET)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })
  await page.addInitScript(INIT)
  const t0 = Date.now()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  // "useful UI": first product image of the home screen decoded and visible
  await page.waitForFunction(() => !!document.querySelector('.nav-layer[data-screen="home"] img[data-loaded="true"]'), null, { timeout: 30_000 })
  const usefulMs = Date.now() - t0
  await page.waitForTimeout(1200)
  const res = await page.evaluate(() => {
    const r = performance.getEntriesByType('resource')
    const nav = performance.getEntriesByType('navigation')[0]
    const sum = (f) => r.filter(f).reduce((s, e) => s + (e.transferSize || 0), 0)
    return {
      fcp: Math.round(window.__perf.fcp),
      lcp: Math.round(window.__perf.lcp),
      tbt: Math.round(window.__perf.longTasks.reduce((s, d) => s + Math.max(0, d - 50), 0)),
      jsKB: Math.round((sum((e) => e.initiatorType === 'script' || e.name.endsWith('.js')) + 0) / 1024),
      cssKB: Math.round(sum((e) => e.name.endsWith('.css')) / 1024),
      imgKB: Math.round(sum((e) => /\.(avif|webp|jpg)$/.test(e.name)) / 1024),
      fontKB: Math.round(sum((e) => /\.woff2?$/.test(e.name)) / 1024),
      dataKB: Math.round(sum((e) => e.name.endsWith('.json')) / 1024),
      htmlKB: Math.round((nav?.transferSize ?? 0) / 1024),
    }
  })
  let tap = null
  if (interact) {
    // tap the first product link in the home screen and time until the product layer is active
    const link = page.locator('.nav-layer[data-screen="home"] a[href*="/product/"]').first()
    await link.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    const start = await page.evaluate(() => performance.now())
    await link.click()
    await page.waitForFunction(() => {
      const l = document.querySelector('.nav-layer[data-screen="product"]')
      return l && l.getAttribute('data-phase') === 'active'
    })
    const shown = await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(performance.now()))))
    await page.waitForTimeout(600)
    const ev = await page.evaluate(() => window.__perf.events.filter((e) => e.name === 'click' || e.name === 'pointerup'))
    tap = { screenMs: Math.round(shown - start), eventMaxMs: Math.round(Math.max(0, ...ev.map((e) => e.duration))) }
  }
  await page.close()
  return { usefulMs, ...res, tap }
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const out = { emulation: { cpuSlowdown: CPU, rttMs: NET.latency, downMbps: 9, upMbps: 3 }, at: new Date().toISOString(), variants: {} }
for (const v of VARIANTS) {
  const cold = []
  const warm = []
  for (let i = 0; i < RUNS; i++) {
    const ctx = await browser.newContext({ viewport: { width: 393, height: 760 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true })
    cold.push(await measure(ctx, `${BASE}/app/${v}/?perf=high`, { interact: true }))
    warm.push(await measure(ctx, `${BASE}/app/${v}/?perf=high`, { interact: false }))
    await ctx.close()
  }
  const pick = (runs, k) => median(runs.map((r) => r[k]))
  out.variants[v] = {
    cold: { usefulMs: pick(cold, 'usefulMs'), fcp: pick(cold, 'fcp'), lcp: pick(cold, 'lcp'), tbt: pick(cold, 'tbt'), jsKB: pick(cold, 'jsKB'), cssKB: pick(cold, 'cssKB'), fontKB: pick(cold, 'fontKB'), imgKB: pick(cold, 'imgKB'), dataKB: pick(cold, 'dataKB') },
    warm: { usefulMs: pick(warm, 'usefulMs'), fcp: pick(warm, 'fcp'), lcp: pick(warm, 'lcp'), tbt: pick(warm, 'tbt') },
    tap: { screenMs: median(cold.map((r) => r.tap.screenMs)), eventMaxMs: median(cold.map((r) => r.tap.eventMaxMs)) },
  }
  console.log(v, JSON.stringify(out.variants[v]))
}
await browser.close()
const file = path.resolve('docs-perf-phase-a.json')
fs.writeFileSync(file, JSON.stringify(out, null, 2))
console.log(`\nSaved ${file}`)
