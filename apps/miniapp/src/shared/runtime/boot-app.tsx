import { createRoot } from 'react-dom/client'
import { initTelegram } from '../telegram/adapter'
import { applyPerfTier } from '../perf/device'
import { AppRuntime } from './AppRuntime'
import type { VariantDefinition } from './variant'

/** Removes boot-only query params so they do not leak into navigation paths. */
function stripBootParams() {
  const url = new URL(location.href)
  let changed = false
  for (const k of ['embed', 'scheme', 'net', 'lang', 'perf', 'r']) {
    if (url.searchParams.has(k)) {
      url.searchParams.delete(k)
      changed = true
    }
  }
  if (changed) history.replaceState(history.state, '', url.pathname + url.search + url.hash)
}

export async function bootApp(variantPromise: Promise<{ default: VariantDefinition }>) {
  initTelegram()
  applyPerfTier()
  stripBootParams()
  // iOS WebKit only applies :active styles when a touch listener exists.
  document.addEventListener('touchstart', () => {}, { passive: true })
  const { default: variant } = await variantPromise
  createRoot(document.getElementById('root')!).render(<AppRuntime variant={variant} />)
}
