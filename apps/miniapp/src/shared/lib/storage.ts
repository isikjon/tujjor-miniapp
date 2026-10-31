import { variantFromPath } from './base'

/**
 * Per-variant scoped storage. Each variant runs in its own document (/app/<id>), so state never
 * leaks between design variants in the lab. The scope comes from the URL at module evaluation time.
 */
export const SCOPE = typeof location !== 'undefined' ? (variantFromPath() ?? 'lab') : 'lab'

export const scopedKey = (name: string) => `tj:${SCOPE}:${name}`

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

/** localStorage that never throws (private mode / blocked storage) and is namespaced by variant. */
export const scopedStorage = {
  getItem: (name: string) => safe(() => localStorage.getItem(scopedKey(name)), null),
  setItem: (name: string, value: string) => safe(() => localStorage.setItem(scopedKey(name), value), undefined),
  removeItem: (name: string) => safe(() => localStorage.removeItem(scopedKey(name)), undefined),
}

export const session = {
  get: (k: string) => safe(() => sessionStorage.getItem(k), null),
  set: (k: string, v: string) => safe(() => sessionStorage.setItem(k, v), undefined),
  remove: (k: string) => safe(() => sessionStorage.removeItem(k), undefined),
}

/** Wipes every persisted key of the current variant (used by the lab "reset demo" action). */
export function clearScope() {
  safe(() => {
    const prefix = `tj:${SCOPE}:`
    for (const k of Object.keys(localStorage)) if (k.startsWith(prefix)) localStorage.removeItem(k)
    for (const k of Object.keys(sessionStorage)) if (k.startsWith(prefix)) sessionStorage.removeItem(k)
  }, undefined)
}
