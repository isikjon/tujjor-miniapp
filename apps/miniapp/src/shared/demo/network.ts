import { onlineManager } from '@tanstack/react-query'
import { useTg } from '../telegram/adapter'
import type { NetworkProfile } from '../telegram/protocol'
import { ApiError } from './errors'

/**
 * Network conditions for the demo API. Default "fast" adds no delay at all.
 * Slower profiles are an explicit, labelled Design Lab control used to preview loading,
 * error and offline states — never a hidden artificial delay.
 */
let profile: NetworkProfile = useTg.getState().network
onlineManager.setOnline(profile !== 'offline')
useTg.subscribe((s) => {
  if (s.network === profile) return
  profile = s.network
  onlineManager.setOnline(profile !== 'offline')
})

export const getNetworkProfile = () => profile

const rand = (a: number, b: number) => a + Math.random() * (b - a)

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new ApiError('aborted'))
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => (clearTimeout(t), reject(new ApiError('aborted'))), { once: true })
  })
}

/** At most MAX_INFLIGHT API calls run at once; the rest wait in FIFO order (protects slow networks). */
const MAX_INFLIGHT = 4
let inflight = 0
const queue: Array<() => void> = []

async function acquire(signal?: AbortSignal) {
  if (inflight < MAX_INFLIGHT) {
    inflight++
    return
  }
  await new Promise<void>((resolve, reject) => {
    const go = () => {
      inflight++
      resolve()
    }
    queue.push(go)
    signal?.addEventListener(
      'abort',
      () => {
        const i = queue.indexOf(go)
        if (i >= 0) queue.splice(i, 1)
        reject(new ApiError('aborted'))
      },
      { once: true },
    )
  })
}

function release() {
  inflight--
  queue.shift()?.()
}

/** Wraps a demo "server" handler with the selected network conditions. */
export async function net<T>(handler: () => T | Promise<T>, signal?: AbortSignal): Promise<T> {
  if (profile === 'offline') throw new ApiError('offline')
  await acquire(signal)
  try {
    const delay = profile === '4g' ? rand(90, 220) : profile === '3g' ? rand(450, 1100) : profile === 'flaky' ? rand(150, 650) : 0
    if (delay) await sleep(delay, signal)
    if (profile === 'flaky' && Math.random() < 0.35) throw new ApiError('server')
    if (signal?.aborted) throw new ApiError('aborted')
    return await handler()
  } finally {
    release()
  }
}
