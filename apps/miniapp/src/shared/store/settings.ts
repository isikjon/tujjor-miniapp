import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Locale } from '../types'
import { scopedStorage } from '../lib/storage'

interface SettingsState {
  locale: Locale
  setLocale: (l: Locale) => void
}

const initialLocale = (): Locale => {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lang') : null
  return q === 'uz' ? 'uz' : 'ru'
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      locale: initialLocale(),
      setLocale: (locale) => {
        set({ locale })
        document.documentElement.lang = locale
      },
    }),
    { name: 'settings', storage: createJSONStorage(() => scopedStorage), version: 1 },
  ),
)
