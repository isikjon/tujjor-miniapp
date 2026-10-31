import { useEffect, useEffectEvent } from 'react'
import { create } from 'zustand'

/**
 * Stack of temporary back handlers (bottom sheets, full-screen pickers…). The Telegram BackButton
 * and the Escape key close the top-most one before navigating back.
 */
const handlers: Array<{ id: number; fn: () => void }> = []
let seq = 0

export const useBackHandlers = create<{ depth: number }>(() => ({ depth: 0 }))

export function pushBackHandler(fn: () => void): () => void {
  const id = ++seq
  handlers.push({ id, fn })
  useBackHandlers.setState({ depth: handlers.length })
  return () => {
    const i = handlers.findIndex((h) => h.id === id)
    if (i >= 0) handlers.splice(i, 1)
    useBackHandlers.setState({ depth: handlers.length })
  }
}

/** Returns true when a handler consumed the back action. */
export function runTopBackHandler(): boolean {
  const top = handlers[handlers.length - 1]
  if (!top) return false
  top.fn()
  return true
}

export function useBackHandler(enabled: boolean, fn: () => void) {
  const onBack = useEffectEvent(fn)
  useEffect(() => {
    if (!enabled) return
    return pushBackHandler(() => onBack())
  }, [enabled])
}
