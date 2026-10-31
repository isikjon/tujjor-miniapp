/**
 * Device capability tier. "low" keeps every interaction and transition (transform/opacity only),
 * but drops paint-heavy extras: shimmer, layer shadows, backdrop blur, parallax dimming.
 * Override for testing with ?perf=low|high.
 */
export type PerfTier = 'low' | 'high'

export function detectPerfTier(): PerfTier {
  const q = new URLSearchParams(location.search).get('perf')
  if (q === 'low' || q === 'high') return q
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  const cores = nav.hardwareConcurrency ?? 8
  const mem = nav.deviceMemory ?? 8
  const android = /android/i.test(navigator.userAgent)
  if (nav.connection?.saveData) return 'low'
  if (mem <= 2 || cores <= 2) return 'low'
  if (android && (mem <= 3 || cores <= 4)) return 'low'
  return 'high'
}

export function applyPerfTier(): PerfTier {
  const tier = detectPerfTier()
  document.documentElement.setAttribute('data-perf', tier)
  return tier
}
