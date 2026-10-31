import { ChevronLeft, Ellipsis, ExternalLink, RotateCcw, Trash2, X } from 'lucide-react'
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import type { VariantId } from '../shared/runtime/variant'
import {
  isEnvelope,
  LAB_NS,
  MAIN_BUTTON_HIDDEN,
  TG_THEMES,
  type AppToLab,
  type LabToApp,
  type MainButtonState,
  type NetworkProfile,
  type Scheme,
} from '../shared/telegram/protocol'
import { withBase } from '../shared/lib/base'

export interface FrameHandle {
  post: (msg: LabToApp) => void
  reload: () => void
}

interface PhoneFrameProps {
  variant: VariantId
  scheme: Scheme
  locale: 'ru' | 'uz'
  network: NetworkProfile
  /** 'device' = iPhone bezel with status bar (desktop); 'bare' = full-bleed (mobile lab). */
  chrome: 'device' | 'bare'
  register: (id: VariantId, h: FrameHandle | null) => void
  onRoute: (id: VariantId, screen: string) => void
}

const HOME_INDICATOR = 34

function luminance(hex: string) {
  const m = hex.replace('#', '').match(/.{2}/g)
  if (!m) return 1
  const [r, g, b] = m.map((x) => parseInt(x, 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Telegram client emulation around a variant iframe: header (Close ↔ Back), "⋯" menu,
 * MainButton bar, haptic pulse, theme params and safe areas — all driven by postMessage.
 */
export function PhoneFrame({ variant, scheme, locale, network, chrome, register, onRoute }: PhoneFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const latest = useRef({ scheme, locale, network })
  useLayoutEffect(() => {
    latest.current = { scheme, locale, network }
  })
  // The iframe URL is fixed per (re)load — theme/locale/network changes are pushed via postMessage.
  const makeSrc = () => {
    const l = latest.current
    return `${withBase(`app/${variant}/`)}?embed=lab&scheme=${l.scheme}&lang=${l.locale}&net=${l.network}&r=${Math.random().toString(36).slice(2, 7)}`
  }
  const [src, setSrc] = useState(makeSrc)
  const reload = () => setSrc(makeSrc())
  const [back, setBack] = useState(false)
  const [main, setMain] = useState<MainButtonState>(MAIN_BUTTON_HIDDEN)
  const [colors, setColors] = useState<{ header: string; bottomBar: string } | null>(null)
  const [haptic, setHaptic] = useState(0)
  const [menu, setMenu] = useState(false)
  const [closing, setClosing] = useState(false)
  const theme = TG_THEMES[scheme]

  const post = (msg: LabToApp) => iframeRef.current?.contentWindow?.postMessage({ ns: LAB_NS, ...msg }, location.origin)

  const onMessage = useEffectEvent((e: MessageEvent) => {
    if (e.source !== iframeRef.current?.contentWindow || !isEnvelope(e.data)) return
    const m = e.data as unknown as AppToLab
    switch (m.t) {
      case 'ready':
        post({ t: 'init', scheme, theme, locale, network, safeBottom: main.visible ? 0 : HOME_INDICATOR })
        break
      case 'route':
        onRoute(variant, m.screen)
        break
      case 'backButton':
        setBack(m.visible)
        break
      case 'mainButton':
        setMain(m.state)
        break
      case 'haptic':
        setHaptic((n) => n + 1)
        break
      case 'colors':
        setColors({ header: m.header, bottomBar: m.bottomBar })
        break
    }
  })

  useEffect(() => {
    const h = (e: MessageEvent) => onMessage(e)
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [])

  useEffect(() => {
    register(variant, { post, reload })
    return () => register(variant, null)
  })

  useEffect(() => post({ t: 'scheme', scheme, theme: TG_THEMES[scheme] }), [scheme])
  useEffect(() => post({ t: 'locale', locale }), [locale])
  useEffect(() => post({ t: 'network', network }), [network])
  useEffect(() => post({ t: 'safeArea', bottom: main.visible ? 0 : HOME_INDICATOR }), [main.visible])

  // a fresh iframe starts without Telegram chrome state
  useEffect(() => {
    setBack(false)
    setMain(MAIN_BUTTON_HIDDEN)
  }, [src])

  const headerBg = colors?.header ?? theme.header_bg_color
  const headerFg = luminance(headerBg) > 0.45 ? '#000000' : '#ffffff'
  const bottomBg = colors?.bottomBar ?? theme.bottom_bar_bg_color

  const simulateClose = () => {
    // "Close" in the lab = close and reopen the mini app (shows state persistence after reopen)
    setClosing(true)
    setTimeout(() => {
      reload()
      setClosing(false)
    }, 380)
  }

  return (
    <div className={chrome === 'device' ? 'phone' : 'phone-bare'} data-scheme={scheme}>
      {haptic > 0 ? <span key={haptic} className="haptic-ring" aria-hidden="true" /> : null}
      <div className="phone-screen" style={{ background: theme.bg_color }}>
        {chrome === 'device' ? (
          <div className="status-bar" style={{ background: headerBg, color: headerFg }}>
            <span className="status-time">9:41</span>
            <span className="dynamic-island" />
            <span className="status-icons" aria-hidden="true">
              <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
              <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.2-1.3A10.5 10.5 0 0 0 8 .4C5.2.4 2.7 1.5.8 3.3L2 4.6a8.6 8.6 0 0 1 6-2.4Zm0 3.6c1.4 0 2.6.5 3.6 1.4l1.2-1.3A7 7 0 0 0 8 4 7 7 0 0 0 3.2 5.9l1.2 1.3c1-.9 2.2-1.4 3.6-1.4Zm0 3.6c.5 0 1 .2 1.3.5L8 11.6 6.7 9.9c.3-.3.8-.5 1.3-.5Z" /></svg>
              <svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x="0.5" y="0.5" width="23" height="12" rx="3.8" stroke="currentColor" opacity="0.4" /><rect x="2" y="2" width="20" height="9" rx="2.5" fill="currentColor" /><path d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2Z" fill="currentColor" opacity="0.45" /></svg>
            </span>
          </div>
        ) : null}

        <div className="tg-header" style={{ background: headerBg, color: headerFg }}>
          <button type="button" className="tg-hbtn" onClick={back ? () => post({ t: 'backPressed' }) : simulateClose}>
            {back ? (
              <>
                <ChevronLeft size={22} strokeWidth={2.4} /> Назад
              </>
            ) : (
              <>
                <X size={18} strokeWidth={2.4} /> Закрыть
              </>
            )}
          </button>
          <div className="tg-title">
            <b>TUJJOR</b>
            <span>мини-приложение · demo</span>
          </div>
          <button type="button" className="tg-hbtn tg-more" aria-label="Меню мини-приложения" onClick={() => setMenu((v) => !v)}>
            <Ellipsis size={20} />
          </button>
          {menu ? (
            <div className="tg-menu" role="menu" onMouseLeave={() => setMenu(false)}>
              <button type="button" role="menuitem" onClick={() => (setMenu(false), reload())}>
                <RotateCcw size={16} /> Перезапустить
              </button>
              <button type="button" role="menuitem" onClick={() => (setMenu(false), window.open(withBase(`app/${variant}/`), '_blank'))}>
                <ExternalLink size={16} /> Открыть в новой вкладке
              </button>
              <button type="button" role="menuitem" className="danger" onClick={() => (setMenu(false), post({ t: 'reset' }))}>
                <Trash2 size={16} /> Сбросить демо-данные
              </button>
            </div>
          ) : null}
        </div>

        <iframe
          key={src}
          ref={iframeRef}
          className="app-frame"
          data-closing={closing || undefined}
          src={src}
          title={`TUJJOR — вариант ${variant.toUpperCase()}`}
          allow="clipboard-write; vibrate"
        />

        {main.visible ? (
          <div className="tg-mainbar" style={{ background: bottomBg }}>
            <button
              type="button"
              className="tg-mainbtn"
              style={{ background: main.color ?? theme.button_color, color: main.textColor ?? theme.button_text_color, opacity: main.active ? 1 : 0.5 }}
              disabled={!main.active || main.progress}
              onClick={() => post({ t: 'mainButtonPressed' })}
            >
              {main.progress ? <span className="tg-spinner" /> : main.text}
            </button>
          </div>
        ) : null}
        {chrome === 'device' ? <span className="home-indicator" style={{ background: scheme === 'dark' ? '#fff' : '#000' }} /> : null}
      </div>
    </div>
  )
}
