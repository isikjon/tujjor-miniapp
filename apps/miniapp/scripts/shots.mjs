#!/usr/bin/env node
// Screenshot every lab screen of a variant (inside the emulated Telegram phone).
//   node scripts/shots.mjs --variant a [--scheme light|dark] [--lang ru|uz] [--screens home,cart] [--scroll] [--reset]
// Output: .shots/<variant>/<scheme>-<lang>-<screen>.png  (+ "-scrolled" variants with --scroll)
import { LAB_SCREENS, openLab } from './lib/lab-driver.mjs'

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`)
  return i > 0 ? process.argv[i + 1] : d
}
const flag = (k) => process.argv.includes(`--${k}`)

const variant = arg('variant', 'a')
const scheme = arg('scheme', 'light')
const lang = arg('lang', 'ru')
const screens = (arg('screens', LAB_SCREENS.join(','))).split(',')
const base = arg('base', 'http://localhost:5173')

const lab = await openLab({ variant, scheme, lang, base, reset: flag('reset') })
const files = []
try {
  for (const s of screens) {
    await lab.go(s)
    files.push(await lab.shot(`${scheme}-${lang}-${s}`))
    if (flag('scroll')) {
      await lab.scroll(600)
      files.push(await lab.shot(`${scheme}-${lang}-${s}-scrolled`))
      await lab.scroll(0, { to: 0 })
    }
  }
} finally {
  await lab.close()
}
console.log(files.join('\n'))
const errs = [...new Set(lab.errors)].filter((e) => !/Download the React DevTools|vite|Unrecognized feature/.test(e))
console.log(errs.length ? `\nCONSOLE ERRORS/WARNINGS (${errs.length}):\n${errs.join('\n')}` : '\nNo console errors.')
