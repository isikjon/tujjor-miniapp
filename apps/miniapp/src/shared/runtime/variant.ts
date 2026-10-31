import { createContext, useContext, type ComponentType } from 'react'
import type { MessageKey, VariantMessages } from '../i18n'
import type { LazyScreen } from '../nav/lazyScreen'
import type { ScreenId } from '../nav/routes'
import type { Scheme } from '../telegram/protocol'

export type VariantId = 'a' | 'b' | 'c' | 'd'

export interface TabSpec {
  /** Stable id, e.g. 'home'. */
  id: string
  /** Root screen shown by the tab (must be a screen with a static path: home, catalog, cart, profile, favorites, orders, search). */
  screen: ScreenId
  label: MessageKey
}

export interface TabBarProps {
  tabs: TabSpec[]
  active: string | null
  onSelect: (tabId: string) => void
}

/**
 * Contract every design variant implements (src/variants/<id>/index.ts default export).
 * Logic, data, navigation and Telegram integration are shared; a variant only owns visuals.
 */
export interface VariantDefinition {
  id: VariantId
  /** Root class scoping the variant's tokens, e.g. 'v-a'. */
  className: string
  /** Push/pop animation preset implemented in base.css. */
  transition: 'slide' | 'fade' | 'lift'
  /** Tab switching: instant (iOS) or a quick 140 ms fade. */
  tabTransition: 'none' | 'fade'
  screens: Record<ScreenId, LazyScreen>
  tabs: TabSpec[]
  TabBar: ComponentType<TabBarProps>
  /** Visual height of the tab bar without the bottom safe area, px. */
  tabBarHeight: number
  /** Whether the tab bar stays visible on a screen (false → the screen covers it when pushed). */
  showTabBar: (screen: ScreenId) => boolean
  toastPosition: 'top' | 'bottom'
  messages?: VariantMessages
  /** Colours passed to Telegram (header, background, bottom bar) for each scheme. */
  telegramColors: (scheme: Scheme) => { header: string; background: string; bottomBar: string }
}

export const VariantContext = createContext<VariantDefinition | null>(null)

export function useVariant(): VariantDefinition {
  const v = useContext(VariantContext)
  if (!v) throw new Error('useVariant outside AppRuntime')
  return v
}
