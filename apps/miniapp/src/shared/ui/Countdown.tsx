import { useEffect, useState } from 'react'

/** HH:MM:SS until `endsAt`. Ticks once per second only while mounted. */
export function useCountdown(endsAt: string | undefined) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!endsAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [endsAt])
  const left = Math.max(0, (endsAt ? new Date(endsAt).getTime() : now) - now)
  const h = Math.floor(left / 3_600_000)
  const m = Math.floor((left % 3_600_000) / 60_000)
  const s = Math.floor((left % 60_000) / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return { h: pad(h), m: pad(m), s: pad(s), done: left === 0 }
}
