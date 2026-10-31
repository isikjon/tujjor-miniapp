// Playwright driver for the Design Lab: opens one variant inside the emulated Telegram phone
// and takes element screenshots of the phone. Uses the locally installed Google Chrome.
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

export const LAB_SCREENS = ['home', 'catalog', 'search', 'product', 'cart', 'checkout', 'profile', 'orders']
const CHIP = { home: 'Главная', catalog: 'Каталог', search: 'Поиск и фильтры', product: 'Карточка товара', cart: 'Корзина', checkout: 'Оформление', profile: 'Профиль', orders: 'Заказы' }

export async function openLab({ variant = 'a', scheme = 'light', lang = 'ru', network = 'fast', base = 'http://localhost:5173', outDir, reset = false, headless = true } = {}) {
  const browser = await chromium.launch({ channel: 'chrome', headless })
  const context = await browser.newContext({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`)
  })
  await page.addInitScript(
    ([v, s, l, n]) => {
      localStorage.setItem('lab:mode', 'focus')
      localStorage.setItem('lab:variant', v)
      localStorage.setItem('lab:scheme', s)
      localStorage.setItem('lab:locale', l)
      localStorage.setItem('lab:network', n)
    },
    [variant, scheme, lang, network],
  )
  await page.goto(`${base}/design-lab`, { waitUntil: 'load' })
  const phone = page.locator('.phone').first()
  await phone.waitFor()
  const frame = page.frameLocator('.phone iframe')
  await frame.locator('.nav-layer').first().waitFor({ timeout: 30_000 })
  if (reset) {
    await page.locator('.ghost-btn', { hasText: 'Сбросить демо' }).click()
    await page.waitForTimeout(800)
    await frame.locator('.nav-layer').first().waitFor({ timeout: 30_000 })
  }
  const dir = outDir ?? path.resolve('.shots', variant)
  fs.mkdirSync(dir, { recursive: true })

  const settle = async (ms = 700) => {
    await page.waitForTimeout(ms)
    // wait for visible images in the active layer to finish loading
    await frame.locator('body').evaluate(async () => {
      const imgs = [...document.querySelectorAll('.nav-layer:not([data-phase="idle-hidden"]) img')].filter((i) => i.getBoundingClientRect().top < innerHeight)
      await Promise.race([Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => i.addEventListener('load', r, { once: true }))))), new Promise((r) => setTimeout(r, 2500))])
    }).catch(() => page.waitForTimeout(1500)) // iframe may reload (HMR) — just give it time
  }

  return {
    browser,
    page,
    frame,
    errors,
    dir,
    /** Navigate all visible frames to a lab screen via the screen chips. */
    async go(screen) {
      await page.locator('.screenbar .chip', { hasText: CHIP[screen] }).click()
      await settle(900)
    },
    /** Element screenshot of the phone → <dir>/<name>.png */
    async shot(name) {
      await settle(250)
      const file = path.join(dir, `${name}.png`)
      await phone.screenshot({ path: file })
      return file
    },
    /** Scroll the active screen's scroller by `px` (or to an absolute position with {to}). */
    async scroll(px, { to } = {}) {
      await frame.locator('body').evaluate(
        (_, [delta, abs]) => {
          const layers = [...document.querySelectorAll('.nav-layer')].filter((l) => !l.inert)
          const sc = layers[layers.length - 1]?.querySelector('[data-screen-scroller]')
          if (!sc) return
          if (abs != null) sc.scrollTop = abs
          else sc.scrollTop += delta
        },
        [px, to],
      )
      await settle(500)
    },
    async back() {
      await page.locator('.tg-hbtn').first().click()
      await settle(700)
    },
    async mainButton() {
      await page.locator('.tg-mainbtn').click()
      await settle(900)
    },
    async close() {
      await browser.close()
    },
  }
}
