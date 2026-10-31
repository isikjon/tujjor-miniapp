type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
  cancelIdleCallback?: (id: number) => void
}

/** requestIdleCallback with a setTimeout fallback (Safari / iOS WebView). Returns a cancel function. */
export function scheduleIdle(cb: () => void, delay = 0): () => void {
  const w = window as IdleWindow
  let idleId = 0
  const timer = setTimeout(() => {
    if (w.requestIdleCallback) idleId = w.requestIdleCallback(cb, { timeout: 2000 })
    else cb()
  }, delay)
  return () => {
    clearTimeout(timer)
    if (idleId && w.cancelIdleCallback) w.cancelIdleCallback(idleId)
  }
}
