import { create } from 'zustand'
import {
  isEnvelope,
  LAB_NS,
  MAIN_BUTTON_HIDDEN,
  TG_THEMES,
  type AppToLab,
  type HapticKind,
  type LabToApp,
  type MainButtonState,
  type NetworkProfile,
  type Scheme,
  type TgThemeParams,
} from './protocol'
import { session } from '../lib/storage'

/**
 * One adapter, three hosts:
 *  - telegram: real Telegram client (window.Telegram.WebApp with signed initData)
 *  - lab:      Design Lab iframe — the parent window emulates Telegram chrome via postMessage
 *  - web:      plain browser tab — Back / Main buttons are rendered in-page by <FallbackChrome/>
 * initDataUnsafe is used for display only; authentication will validate raw initData on the backend.
 */
export type HostMode = 'telegram' | 'lab' | 'web'

interface TelegramWebApp {
  initData: string
  initDataUnsafe: { user?: { id: number; first_name: string; last_name?: string; username?: string; language_code?: string } }
  platform: string
  colorScheme: Scheme
  themeParams: Partial<TgThemeParams>
  version: string
  isVersionAtLeast(v: string): boolean
  ready(): void
  expand(): void
  close(): void
  disableVerticalSwipes?: () => void
  setHeaderColor(c: string): void
  setBackgroundColor(c: string): void
  setBottomBarColor?: (c: string) => void
  onEvent(e: string, cb: () => void): void
  openLink(url: string): void
  openTelegramLink(url: string): void
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void }
  MainButton: {
    setParams(p: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean; has_shine_effect?: boolean }): void
    showProgress(leaveActive?: boolean): void
    hideProgress(): void
    onClick(cb: () => void): void
  }
  HapticFeedback?: {
    impactOccurred(s: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
    notificationOccurred(t: 'error' | 'success' | 'warning'): void
    selectionChanged(): void
  }
  safeAreaInset?: { top: number; bottom: number; left: number; right: number }
  contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

interface TgState {
  mode: HostMode
  platform: string
  scheme: Scheme
  theme: TgThemeParams
  network: NetworkProfile
  backVisible: boolean
  mainButton: MainButtonState
}

const LAB_FLAG = 'tj:embed'

function detectMode(): HostMode {
  const wa = window.Telegram?.WebApp
  if (wa && wa.initData) return 'telegram'
  const embedded = window.parent !== window
  const q = new URLSearchParams(location.search)
  if (embedded && (q.get('embed') === 'lab' || session.get(LAB_FLAG) === '1')) {
    session.set(LAB_FLAG, '1')
    return 'lab'
  }
  return 'web'
}

const systemScheme = (): Scheme => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

const initialScheme = (): Scheme => {
  const pre = document.documentElement.getAttribute('data-scheme')
  return pre === 'dark' ? 'dark' : pre === 'light' ? 'light' : systemScheme()
}

const initialNetwork = (): NetworkProfile => {
  const q = new URLSearchParams(location.search).get('net')
  const saved = session.get('tj:net')
  const v = (q ?? saved ?? 'fast') as NetworkProfile
  return ['fast', '4g', '3g', 'offline', 'flaky'].includes(v) ? v : 'fast'
}

export const useTg = create<TgState>(() => ({
  mode: 'web',
  platform: 'unknown',
  scheme: initialScheme(),
  theme: TG_THEMES[initialScheme()],
  network: initialNetwork(),
  backVisible: false,
  mainButton: MAIN_BUTTON_HIDDEN,
}))

// ── internal wiring ────────────────────────────────────────────────────────
let backHandler: (() => void) | null = null
let mainHandler: (() => void) | null = null
const labListeners = new Set<(msg: LabToApp) => void>()

function post(msg: AppToLab) {
  if (useTg.getState().mode !== 'lab') return
  window.parent.postMessage({ ns: LAB_NS, ...msg }, location.origin)
}

function applyTheme(scheme: Scheme, theme: TgThemeParams) {
  const root = document.documentElement
  root.setAttribute('data-scheme', scheme)
  root.style.colorScheme = scheme
  for (const [k, v] of Object.entries(theme)) root.style.setProperty(`--tg-theme-${k.replace(/_/g, '-')}`, v)
  session.set('tj:scheme', scheme)
  useTg.setState({ scheme, theme })
}

function setSafeBottom(px: number) {
  document.documentElement.style.setProperty('--safe-bottom', `${px}px`)
}

let initialized = false

/** Call once at boot, before the first render. */
export function initTelegram() {
  if (initialized) return
  initialized = true
  const mode = detectMode()
  useTg.setState({ mode })

  if (mode === 'telegram') {
    const wa = window.Telegram!.WebApp!
    useTg.setState({ platform: wa.platform })
    wa.ready()
    wa.expand()
    wa.disableVerticalSwipes?.()
    const sync = () => applyTheme(wa.colorScheme, { ...TG_THEMES[wa.colorScheme], ...wa.themeParams } as TgThemeParams)
    sync()
    wa.onEvent('themeChanged', sync)
    wa.BackButton.onClick(() => backHandler?.())
    wa.MainButton.onClick(() => mainHandler?.())
    const safe = () => {
      const b = (wa.safeAreaInset?.bottom ?? 0) + (wa.contentSafeAreaInset?.bottom ?? 0)
      if (b) setSafeBottom(b)
    }
    safe()
    wa.onEvent('safeAreaChanged', safe)
    wa.onEvent('contentSafeAreaChanged', safe)
    return
  }

  if (mode === 'lab') {
    useTg.setState({ platform: 'ios' })
    applyTheme(useTg.getState().scheme, TG_THEMES[useTg.getState().scheme])
    window.addEventListener('message', (e) => {
      if (e.origin !== location.origin || e.source !== window.parent || !isEnvelope(e.data)) return
      const msg = e.data as unknown as LabToApp
      switch (msg.t) {
        case 'init':
          applyTheme(msg.scheme, msg.theme)
          setSafeBottom(msg.safeBottom)
          setNetworkState(msg.network)
          break
        case 'scheme':
          applyTheme(msg.scheme, msg.theme)
          break
        case 'network':
          setNetworkState(msg.network)
          break
        case 'safeArea':
          setSafeBottom(msg.bottom)
          break
        case 'backPressed':
          backHandler?.()
          break
        case 'mainButtonPressed':
          if (useTg.getState().mainButton.active && !useTg.getState().mainButton.progress) mainHandler?.()
          break
      }
      for (const l of labListeners) l(msg)
    })
    return
  }

  // web
  useTg.setState({ platform: /android/i.test(navigator.userAgent) ? 'android' : /iphone|ipad/i.test(navigator.userAgent) ? 'ios' : 'web' })
  const q = new URLSearchParams(location.search).get('scheme')
  const scheme = q === 'dark' || q === 'light' ? q : initialScheme()
  applyTheme(scheme, TG_THEMES[scheme])
  if (!q) {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const s: Scheme = e.matches ? 'dark' : 'light'
      applyTheme(s, TG_THEMES[s])
    })
  }
}

function setNetworkState(network: NetworkProfile) {
  session.set('tj:net', network)
  useTg.setState({ network })
}

// ── public API ─────────────────────────────────────────────────────────────
export const tg = {
  /** Announce readiness to the lab (after first render). */
  ready(variant: string) {
    post({ t: 'ready', variant })
  },
  reportRoute(screen: string, path: string) {
    post({ t: 'route', screen, path })
  },
  setBackHandler(fn: (() => void) | null) {
    backHandler = fn
  },
  setBackVisible(visible: boolean) {
    if (useTg.getState().backVisible === visible) return
    useTg.setState({ backVisible: visible })
    const { mode } = useTg.getState()
    if (mode === 'telegram') {
      const bb = window.Telegram!.WebApp!.BackButton
      if (visible) bb.show()
      else bb.hide()
    } else post({ t: 'backButton', visible })
  },
  setMainHandler(fn: (() => void) | null) {
    mainHandler = fn
  },
  setMainButton(state: MainButtonState) {
    const prev = useTg.getState().mainButton
    if (
      prev.visible === state.visible && prev.text === state.text && prev.active === state.active &&
      prev.progress === state.progress && prev.color === state.color && prev.textColor === state.textColor
    )
      return
    useTg.setState({ mainButton: state })
    const { mode } = useTg.getState()
    if (mode === 'telegram') {
      const mb = window.Telegram!.WebApp!.MainButton
      mb.setParams({
        text: state.text,
        color: state.color,
        text_color: state.textColor,
        is_active: state.active,
        is_visible: state.visible,
        has_shine_effect: state.shine ?? false,
      })
      if (state.progress) mb.showProgress(false)
      else mb.hideProgress()
    } else post({ t: 'mainButton', state })
  },
  haptic(kind: HapticKind) {
    const { mode } = useTg.getState()
    if (mode === 'telegram') {
      const h = window.Telegram!.WebApp!.HapticFeedback
      if (!h) return
      if (kind === 'selection') h.selectionChanged()
      else if (kind === 'success' || kind === 'warning' || kind === 'error') h.notificationOccurred(kind)
      else h.impactOccurred(kind)
    } else if (mode === 'lab') post({ t: 'haptic', kind })
    else if (kind === 'error' || kind === 'warning') navigator.vibrate?.(20)
  },
  setColors(colors: { header: string; background: string; bottomBar: string }) {
    const { mode } = useTg.getState()
    if (mode === 'telegram') {
      const wa = window.Telegram!.WebApp!
      try {
        wa.setHeaderColor(colors.header)
        wa.setBackgroundColor(colors.background)
        wa.setBottomBarColor?.(colors.bottomBar)
      } catch {
        /* older clients accept only theme keys */
      }
    } else post({ t: 'colors', ...colors })
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors.header)
  },
  /** Used by the in-page fallback chrome (plain browser host). */
  pressBack() {
    backHandler?.()
  },
  pressMain() {
    const mb = useTg.getState().mainButton
    if (mb.visible && mb.active && !mb.progress) mainHandler?.()
  },
  onLabMessage(fn: (msg: LabToApp) => void) {
    labListeners.add(fn)
    return () => {
      labListeners.delete(fn)
    }
  },
  /** Display-only Telegram user (never trusted for auth). */
  user() {
    return window.Telegram?.WebApp?.initDataUnsafe.user ?? null
  },
}
