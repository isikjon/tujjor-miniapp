import { createContext, useContext, type RefObject } from 'react'
import type { ScreenId } from './routes'

export interface ScreenContextValue {
  screen: ScreenId
  entryKey: string
  path: string
  /** True while this screen is the top of the visible stack (logically focused). */
  active: boolean
}

export const ScreenContext = createContext<ScreenContextValue>({ screen: 'home', entryKey: 'root', path: '/', active: true })
export const useScreenContext = () => useContext(ScreenContext)
export const useIsActiveScreen = () => useContext(ScreenContext).active

/** Scroll container of the current screen (for virtualization, scroll-to-top, sticky logic). */
export const ScrollerContext = createContext<RefObject<HTMLDivElement | null>>({ current: null })
export const useScroller = () => useContext(ScrollerContext)

export interface NavApi {
  push: (path: string) => void
  replace: (path: string) => void
  back: () => void
  switchTab: (tabId: string) => void
  reset: (paths: string[]) => void
  preload: (path: string) => void
  canGoBack: boolean
  activeTab: string | null
}

export const NavContext = createContext<NavApi | null>(null)

export function useNav(): NavApi {
  const v = useContext(NavContext)
  if (!v) throw new Error('useNav must be used inside <Navigator>')
  return v
}
