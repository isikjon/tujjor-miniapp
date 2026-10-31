import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { scopedStorage } from '../lib/storage'

interface RecentState {
  items: string[]
  add: (q: string) => void
  remove: (q: string) => void
  clear: () => void
}

export const useRecentSearches = create<RecentState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (q) => {
        const v = q.trim()
        if (v.length < 2) return
        set({ items: [v, ...get().items.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 8) })
      },
      remove: (q) => set({ items: get().items.filter((x) => x !== q) }),
      clear: () => set({ items: [] }),
    }),
    { name: 'recent', storage: createJSONStorage(() => scopedStorage), version: 1 },
  ),
)
