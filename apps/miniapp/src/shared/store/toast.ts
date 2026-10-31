import { create } from 'zustand'

export interface ToastItem {
  id: number
  text: string
  tone: 'neutral' | 'success' | 'error'
  action?: { label: string; onClick: () => void }
  leaving?: boolean
  duration: number
}

interface ToastState {
  items: ToastItem[]
  show: (t: Omit<ToastItem, 'id' | 'duration' | 'tone'> & { tone?: ToastItem['tone']; duration?: number }) => number
  dismiss: (id: number) => void
}

let seq = 1

export const useToasts = create<ToastState>((set, get) => ({
  items: [],
  show: (t) => {
    const id = seq++
    const item: ToastItem = { tone: 'neutral', duration: t.action ? 4500 : 2600, ...t, id }
    set({ items: [...get().items.slice(-1), item] })
    setTimeout(() => get().dismiss(id), item.duration)
    return id
  },
  dismiss: (id) => {
    if (!get().items.some((i) => i.id === id && !i.leaving)) return
    set({ items: get().items.map((i) => (i.id === id ? { ...i, leaving: true } : i)) })
    setTimeout(() => set({ items: get().items.filter((i) => i.id !== id) }), 190)
  },
}))

/** Imperative toast API usable from event handlers. */
export const toast = (t: Parameters<ToastState['show']>[0]) => useToasts.getState().show(t)
