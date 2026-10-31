/**
 * postMessage protocol between the Design Lab (parent window) and a variant app running in an iframe.
 * The lab emulates the Telegram client chrome: header with Back/Close, MainButton, haptics, theme.
 */
export const LAB_NS = 'tujjor-lab' as const

export type LabScreen = 'home' | 'catalog' | 'search' | 'product' | 'cart' | 'checkout' | 'profile' | 'orders'
export const LAB_SCREENS: LabScreen[] = ['home', 'catalog', 'search', 'product', 'cart', 'checkout', 'profile', 'orders']

export type Scheme = 'light' | 'dark'
export type NetworkProfile = 'fast' | '4g' | '3g' | 'offline' | 'flaky'

/** Subset of Telegram.WebApp.themeParams used by the apps. */
export interface TgThemeParams {
  bg_color: string
  secondary_bg_color: string
  section_bg_color: string
  header_bg_color: string
  bottom_bar_bg_color: string
  text_color: string
  hint_color: string
  subtitle_text_color: string
  section_header_text_color: string
  link_color: string
  accent_text_color: string
  button_color: string
  button_text_color: string
  destructive_text_color: string
  section_separator_color: string
}

/** Telegram iOS default Day / Night palettes (what most users see). */
export const TG_THEMES: Record<Scheme, TgThemeParams> = {
  light: {
    bg_color: '#ffffff',
    secondary_bg_color: '#efeff4',
    section_bg_color: '#ffffff',
    header_bg_color: '#f8f8f8',
    bottom_bar_bg_color: '#f2f2f7',
    text_color: '#000000',
    hint_color: '#8e8e93',
    subtitle_text_color: '#8e8e93',
    section_header_text_color: '#6d6d72',
    link_color: '#007aff',
    accent_text_color: '#007aff',
    button_color: '#007aff',
    button_text_color: '#ffffff',
    destructive_text_color: '#ff3b30',
    section_separator_color: '#c8c7cc',
  },
  dark: {
    bg_color: '#000000',
    secondary_bg_color: '#1c1c1d',
    section_bg_color: '#2c2c2e',
    header_bg_color: '#1a1a1a',
    bottom_bar_bg_color: '#1d1d1d',
    text_color: '#ffffff',
    hint_color: '#98989e',
    subtitle_text_color: '#98989e',
    section_header_text_color: '#8d8e93',
    link_color: '#3e88f7',
    accent_text_color: '#3e88f7',
    button_color: '#3e88f7',
    button_text_color: '#ffffff',
    destructive_text_color: '#eb5545',
    section_separator_color: '#545458',
  },
}

export interface MainButtonState {
  visible: boolean
  text: string
  active: boolean
  progress: boolean
  color?: string
  textColor?: string
  shine?: boolean
}

export const MAIN_BUTTON_HIDDEN: MainButtonState = { visible: false, text: '', active: true, progress: false }

export type HapticKind = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' | 'success' | 'warning' | 'error' | 'selection'

/** app → lab */
export type AppToLab =
  | { t: 'ready'; variant: string }
  | { t: 'route'; screen: string; path: string }
  | { t: 'backButton'; visible: boolean }
  | { t: 'mainButton'; state: MainButtonState }
  | { t: 'haptic'; kind: HapticKind }
  | { t: 'colors'; header: string; background: string; bottomBar: string }

/** lab → app */
export type LabToApp =
  | { t: 'init'; scheme: Scheme; theme: TgThemeParams; locale: 'ru' | 'uz'; network: NetworkProfile; safeBottom: number }
  | { t: 'scheme'; scheme: Scheme; theme: TgThemeParams }
  | { t: 'locale'; locale: 'ru' | 'uz' }
  | { t: 'network'; network: NetworkProfile }
  | { t: 'safeArea'; bottom: number }
  | { t: 'navigate'; screen: LabScreen }
  | { t: 'backPressed' }
  | { t: 'mainButtonPressed' }
  | { t: 'reset' }

export type Envelope<T> = { ns: typeof LAB_NS } & T

export function isEnvelope(data: unknown): data is Envelope<{ t: string }> {
  return !!data && typeof data === 'object' && (data as { ns?: unknown }).ns === LAB_NS && typeof (data as { t?: unknown }).t === 'string'
}
