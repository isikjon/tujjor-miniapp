import { Columns4, ExternalLink, Gauge, Moon, RotateCcw, Settings2, Smartphone, Sun, Wifi } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { VariantId } from '../shared/runtime/variant'
import type { VariantMeta } from '../shared/runtime/meta'
import { LAB_SCREENS, type LabScreen, type NetworkProfile, type Scheme } from '../shared/telegram/protocol'
import { METAS } from './metas'
import { PhoneFrame, type FrameHandle } from './PhoneFrame'
import { withBase } from '../shared/lib/base'

const SCREEN_LABEL: Record<LabScreen, string> = {
  home: 'Главная',
  catalog: 'Каталог',
  search: 'Поиск и фильтры',
  product: 'Карточка товара',
  cart: 'Корзина',
  checkout: 'Оформление',
  profile: 'Профиль',
  orders: 'Заказы',
}

/** App screen → lab chip it belongs to. */
const SCREEN_GROUP: Record<string, LabScreen> = {
  home: 'home',
  catalog: 'catalog',
  category: 'catalog',
  search: 'search',
  product: 'product',
  cart: 'cart',
  checkout: 'checkout',
  checkoutSuccess: 'checkout',
  profile: 'profile',
  favorites: 'profile',
  orders: 'orders',
  order: 'orders',
}

const NETWORKS: Array<{ id: NetworkProfile; label: string; hint: string }> = [
  { id: 'fast', label: 'Быстрая', hint: 'Без задержек' },
  { id: '4g', label: '4G', hint: '90–220 мс на запрос' },
  { id: '3g', label: '3G', hint: '0,45–1,1 с — видны скелетоны' },
  { id: 'flaky', label: 'Нестабильная', hint: '35% запросов падают — видны повторы и откаты' },
  { id: 'offline', label: 'Офлайн', hint: 'Кеш и понятные ошибки' },
]

const IDS: VariantId[] = ['a', 'b', 'c', 'd']
const PHONE_W = 417
const PHONE_H = 876

function useStored<T extends string>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      return (localStorage.getItem(`lab:${key}`) as T) ?? initial
    } catch {
      return initial
    }
  })
  const set = useCallback(
    (nv: T) => {
      setV(nv)
      try {
        localStorage.setItem(`lab:${key}`, nv)
      } catch {
        /* storage unavailable */
      }
    },
    [key],
  )
  return [v, set]
}

function useMedia(q: string) {
  const [m, setM] = useState(() => matchMedia(q).matches)
  useEffect(() => {
    const mq = matchMedia(q)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [q])
  return m
}

interface Stats {
  stats: Record<string, { js: number; css: number }>
}

function useLabStats() {
  const [stats, setStats] = useState<Stats['stats'] | null>(null)
  useEffect(() => {
    fetch(withBase('lab-stats.json'))
      .then((r) => (r.ok ? (r.json() as Promise<Stats>) : null))
      .then((d) => d && setStats(d.stats))
      .catch(() => {})
  }, [])
  return stats
}

const kb = (b: number) => `${(b / 1024).toFixed(1).replace('.', ',')} КБ`

export function LabApp() {
  const [mode, setMode] = useStored<'focus' | 'compare'>('mode', 'focus')
  const [focused, setFocused] = useStored<VariantId>('variant', 'a')
  const [scheme, setScheme] = useStored<Scheme>('scheme', 'light')
  const [locale, setLocale] = useStored<'ru' | 'uz'>('locale', 'ru')
  const [network, setNetwork] = useStored<NetworkProfile>('network', 'fast')
  const [routes, setRoutes] = useState<Partial<Record<VariantId, string>>>({})
  const [panel, setPanel] = useState(false)
  const frames = useRef<Partial<Record<VariantId, FrameHandle>>>({})
  const isMobile = useMedia('(max-width: 899px)')
  const stats = useLabStats()
  const effectiveMode = isMobile ? 'focus' : mode
  const visible: VariantId[] = effectiveMode === 'compare' ? IDS : [focused]

  const register = useCallback((id: VariantId, h: FrameHandle | null) => {
    if (h) frames.current[id] = h
    else delete frames.current[id]
  }, [])
  const onRoute = useCallback((id: VariantId, screen: string) => setRoutes((r) => (r[id] === screen ? r : { ...r, [id]: screen })), [])

  const goScreen = (screen: LabScreen) => {
    for (const id of visible) frames.current[id]?.post({ t: 'navigate', screen })
    setPanel(false)
  }
  const resetAll = () => {
    for (const id of visible) frames.current[id]?.post({ t: 'reset' })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return
      const i = ['1', '2', '3', '4'].indexOf(e.key)
      if (i >= 0) {
        setFocused(IDS[i])
        setMode('focus')
      }
      if (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'с') setMode(mode === 'compare' ? 'focus' : 'compare')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, setFocused, setMode])

  const groups = visible.map((id) => (routes[id] ? SCREEN_GROUP[routes[id]!] : undefined))
  const activeChip = groups.every((g) => g && g === groups[0]) ? groups[0] : undefined
  const meta = METAS.find((m) => m.id === focused)!

  // ── scale phones to the available stage ──────────────────────────────────
  const stageRef = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState({ w: 1200, h: 900 })
  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setStage({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [effectiveMode, isMobile])
  const labelH = effectiveMode === 'compare' ? 44 : 0
  const slotW = effectiveMode === 'compare' ? (stage.w - 3 * 20) / 4 : stage.w
  const scale = Math.min(1, slotW / PHONE_W, (stage.h - labelH) / PHONE_H)

  const controls = (
    <>
      <div className="seg" role="group" aria-label="Тема Telegram">
        <button type="button" aria-pressed={scheme === 'light'} onClick={() => setScheme('light')}>
          <Sun size={15} /> Светлая
        </button>
        <button type="button" aria-pressed={scheme === 'dark'} onClick={() => setScheme('dark')}>
          <Moon size={15} /> Тёмная
        </button>
      </div>
      <div className="seg" role="group" aria-label="Язык">
        <button type="button" aria-pressed={locale === 'ru'} onClick={() => setLocale('ru')}>
          RU
        </button>
        <button type="button" aria-pressed={locale === 'uz'} onClick={() => setLocale('uz')}>
          UZ
        </button>
      </div>
      <label className="net-select" title={NETWORKS.find((n) => n.id === network)?.hint}>
        <Wifi size={15} />
        <select value={network} onChange={(e) => setNetwork(e.target.value as NetworkProfile)} aria-label="Сеть">
          {NETWORKS.map((n) => (
            <option key={n.id} value={n.id}>
              Сеть: {n.label}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="ghost-btn" onClick={resetAll} title="Очистить корзину, заказы и избранное у видимых вариантов">
        <RotateCcw size={15} /> Сбросить демо
      </button>
    </>
  )

  const screenChips = (
    <div className="chips" role="toolbar" aria-label="Экраны">
      {LAB_SCREENS.map((s) => (
        <button key={s} type="button" className="chip" aria-pressed={activeChip === s} onClick={() => goScreen(s)}>
          {SCREEN_LABEL[s]}
        </button>
      ))}
    </div>
  )

  if (isMobile) {
    return (
      <div className="lab lab-mobile" data-app-scheme={scheme}>
        <header className="m-top">
          <span className="logo-mark">T</span>
          <div className="seg seg-variants" role="tablist" aria-label="Вариант дизайна">
            {IDS.map((id) => (
              <button key={id} type="button" role="tab" aria-selected={focused === id} onClick={() => setFocused(id)}>
                {id.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" className="icon-btn" aria-label="Настройки лаборатории" onClick={() => setPanel(true)}>
            <Settings2 size={20} />
          </button>
        </header>
        <div className="m-stage">
          <PhoneFrame key={focused} variant={focused} scheme={scheme} locale={locale} network={network} chrome="bare" register={register} onRoute={onRoute} />
        </div>
        {panel ? (
          <div className="m-panel-backdrop" onClick={() => setPanel(false)}>
            <div className="m-panel" onClick={(e) => e.stopPropagation()}>
              <div className="m-panel-handle" />
              <VariantDetails meta={meta} stats={stats} />
              <h3 className="panel-h">Экран</h3>
              {screenChips}
              <h3 className="panel-h">Окружение</h3>
              <div className="m-controls">{controls}</div>
              <p className="demo-note">DEMO: товары, цены, заказы и оплата — демонстрационные.</p>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="lab" data-app-scheme={scheme}>
      <header className="topbar">
        <div className="brand">
          <span className="logo-mark">T</span>
          <b>TUJJOR</b>
          <span className="muted">Design Lab</span>
          <span className="demo-pill">DEMO-ДАННЫЕ</span>
        </div>
        <div className="seg seg-mode" role="group" aria-label="Режим">
          <button type="button" aria-pressed={effectiveMode === 'focus'} onClick={() => setMode('focus')}>
            <Smartphone size={15} /> Один вариант
          </button>
          <button type="button" aria-pressed={effectiveMode === 'compare'} onClick={() => setMode('compare')}>
            <Columns4 size={15} /> Сравнение A–D
          </button>
        </div>
        <div className="controls">{controls}</div>
      </header>
      <div className="screenbar">
        {effectiveMode === 'focus' ? (
          <div className="seg seg-variants-inline" role="group" aria-label="Вариант">
            {IDS.map((id) => (
              <button key={id} type="button" aria-pressed={focused === id} onClick={() => setFocused(id)}>
                {id.toUpperCase()}
              </button>
            ))}
          </div>
        ) : null}
        <span className="muted small">{effectiveMode === 'compare' ? 'Экран во всех вариантах:' : 'Экран:'}</span>
        {screenChips}
      </div>

      {effectiveMode === 'focus' ? (
        <main className="focus">
          <nav className="rail" aria-label="Варианты">
            {METAS.map((m) => (
              <button key={m.id} type="button" className="vcard" aria-pressed={m.id === focused} onClick={() => setFocused(m.id)}>
                <span className="vletter" style={{ background: m.palette[0]?.hex ?? '#111' }}>
                  {m.letter}
                </span>
                <span className="vtext">
                  <b>{m.name}</b>
                  <span>{m.title}</span>
                  <small>{m.tagline}</small>
                </span>
                <span className="vdots">
                  {m.palette.slice(0, 5).map((p) => (
                    <i key={p.hex + p.name} style={{ background: p.hex }} />
                  ))}
                </span>
              </button>
            ))}
            <p className="hint">
              Клавиши: <kbd>1</kbd>–<kbd>4</kbd> вариант, <kbd>C</kbd> сравнение.
              <br />
              «Закрыть» в шапке Telegram перезапускает мини-приложение — корзина и экран сохраняются.
            </p>
          </nav>
          <div className="stage" ref={stageRef}>
            <div className="phone-slot" style={{ width: PHONE_W * scale, height: PHONE_H * scale }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: PHONE_W, height: PHONE_H } as CSSProperties}>
                <PhoneFrame key={focused} variant={focused} scheme={scheme} locale={locale} network={network} chrome="device" register={register} onRoute={onRoute} />
              </div>
            </div>
          </div>
          <aside className="details">
            <VariantDetails meta={meta} stats={stats} />
          </aside>
        </main>
      ) : (
        <main className="compare" ref={stageRef}>
          {IDS.map((id) => {
            const m = METAS.find((x) => x.id === id)!
            return (
              <section key={id} className="compare-col" style={{ width: slotW }}>
                <div className="compare-label" style={{ width: PHONE_W * scale }}>
                  <span className="vletter sm" style={{ background: m.palette[0]?.hex ?? '#111' }}>
                    {m.letter}
                  </span>
                  <b>{m.name}</b>
                  <button
                    type="button"
                    className="ghost-btn sm"
                    onClick={() => {
                      setFocused(id)
                      setMode('focus')
                    }}
                  >
                    Подробнее
                  </button>
                </div>
                <div className="phone-slot" style={{ width: PHONE_W * scale, height: PHONE_H * scale }}>
                  <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: PHONE_W, height: PHONE_H }}>
                    <PhoneFrame variant={id} scheme={scheme} locale={locale} network={network} chrome="device" register={register} onRoute={onRoute} />
                  </div>
                </div>
              </section>
            )
          })}
        </main>
      )}
    </div>
  )
}

function VariantDetails({ meta, stats }: { meta: VariantMeta; stats: Record<string, { js: number; css: number }> | null }) {
  const s = stats?.[`variant-${meta.id}`]
  const shared = stats ? (stats.vendor?.js ?? 0) + (stats.shared?.js ?? 0) + (stats.shared?.css ?? 0) : 0
  return (
    <div className="vdetails">
      <div className="vd-head">
        <span className="vletter lg" style={{ background: meta.palette[0]?.hex ?? '#111' }}>
          {meta.letter}
        </span>
        <div>
          <h2>{meta.name}</h2>
          <p className="muted">{meta.title}</p>
        </div>
      </div>
      {meta.tagline ? <p className="vd-tagline">{meta.tagline}</p> : null}
      {meta.concept ? <p className="vd-text">{meta.concept}</p> : null}
      {meta.strengths.length ? (
        <>
          <h3 className="panel-h">Сильные стороны</h3>
          <ul className="vd-list plus">
            {meta.strengths.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </>
      ) : null}
      {meta.tradeoffs.length ? (
        <>
          <h3 className="panel-h">Компромиссы</h3>
          <ul className="vd-list minus">
            {meta.tradeoffs.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </>
      ) : null}
      {meta.bestFor ? (
        <>
          <h3 className="panel-h">Лучше всего подходит</h3>
          <p className="vd-text">{meta.bestFor}</p>
        </>
      ) : null}
      {meta.palette.length ? (
        <>
          <h3 className="panel-h">Палитра</h3>
          <div className="swatches">
            {meta.palette.map((p) => (
              <div key={p.name + p.hex} className="swatch">
                <i style={{ background: p.hex }} />
                <span>{p.name}</span>
                <code>{p.hex}</code>
              </div>
            ))}
          </div>
        </>
      ) : null}
      <h3 className="panel-h">Типографика</h3>
      <p className="vd-text">
        {meta.typography.display} / {meta.typography.body}
        <br />
        <span className="muted small">Вес шрифтов: {meta.typography.cost}</span>
      </p>
      {meta.motion ? (
        <>
          <h3 className="panel-h">Движение</h3>
          <p className="vd-text">{meta.motion}</p>
        </>
      ) : null}
      {meta.telegram ? (
        <>
          <h3 className="panel-h">Интеграция с Telegram</h3>
          <p className="vd-text">{meta.telegram}</p>
        </>
      ) : null}
      <h3 className="panel-h">
        <Gauge size={14} /> Вес варианта (gzip)
      </h3>
      {s ? (
        <p className="vd-text">
          JS {kb(s.js)} · CSS {kb(s.css)}
          <br />
          <span className="muted small">+ общий рантайм {kb(shared)} (React, роутер, Query, ядро) — загружается один раз для любого варианта</span>
        </p>
      ) : (
        <p className="vd-text muted small">Доступно в production-сборке (npm run lab).</p>
      )}
      <div className="vd-actions">
        <a className="ghost-btn" href={withBase(`app/${meta.id}/`)} target="_blank" rel="noreferrer">
          <ExternalLink size={15} /> Открыть отдельно
        </a>
      </div>
    </div>
  )
}
