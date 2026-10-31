import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { scopedStorage } from '../lib/storage'

interface FavoritesState {
  ids: string[]
  seeded: boolean
  set: (id: string, on: boolean) => void
  seed: (ids: string[]) => void
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      seeded: false,
      set: (id, on) => {
        const has = get().ids.includes(id)
        if (on && !has) set({ ids: [id, ...get().ids] })
        if (!on && has) set({ ids: get().ids.filter((x) => x !== id) })
      },
      seed: (ids) => set({ ids, seeded: true }),
    }),
    { name: 'favorites', storage: createJSONStorage(() => scopedStorage), version: 1 },
  ),
)

export const useIsFavorite = (id: string) => useFavorites((s) => s.ids.includes(id))
