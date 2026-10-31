import { Component, memo, Suspense, useEffect, useLayoutEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { useLocation, useNavigate, useNavigationType, type Location } from 'react-router'
import { useVariant, type VariantDefinition } from '../runtime/variant'
import { tg } from '../telegram/adapter'
import { scopedStorage } from '../lib/storage'
import { scheduleIdle } from '../perf/idle'
import { NavContext, ScreenContext, type NavApi } from './context'
import { matchScreen, type ScreenId } from './routes'
import { runTopBackHandler, useBackHandlers } from './back'

/**
 * Stack navigator on top of React Router history.
 *  - pushed screens stay mounted underneath (instant back, preserved scroll & state)
 *  - tab roots are kept alive while hidden
 *  - transitions animate only transform/opacity via data-phase attributes (see base.css)
 *  - the Telegram BackButton mirrors `canGoBack` and pops sheets first
 */

type Phase = 'from' | 'to-instant' | 'active' | 'covered' | 'idle-hidden' | 'exit' | 'fade-out'
type Dir = 'push' | 'reveal' | 'tab' | null

interface Entry {
  key: string
  locKey: string
  path: string
  screen: ScreenId
  params: Record<string, string>
  query: Record<string, string>
  tab: string | null
  /** The history entry right before this one belongs to the entry below it in the stack. */
  backedBelow: boolean
  phase: Phase
  dir: Dir
  z: number
}

interface NavState {
  roots: Entry[]
  rootKey: string
  stack: Entry[]
  exiting: Entry[]
}

const NAV_KEY = 'nav'
const RESTORE_TTL = 30 * 60_000

let keySeq = 0
let zSeq = 1

function makeEntry(path: string, locKey: string, variant: VariantDefinition, opts: Partial<Entry> = {}): Entry {
  const url = new URL(path, 'http://x')
  const m = matchScreen(url.pathname) ?? { id: 'home' as ScreenId, params: {} }
  const tab = variant.tabs.find((t) => t.screen === m.id)?.id ?? null
  return {
    key: tab ? `tab:${tab}` : `e${++keySeq}`,
    locKey,
    path: url.pathname + url.search,
    screen: m.id,
    params: m.params,
    query: Object.fromEntries(url.searchParams),
    tab,
    backedBelow: false,
    phase: 'to-instant',
    dir: null,
    z: tab ? 1 : ++zSeq,
    ...opts,
  }
}

const PARENTS: Record<ScreenId, string[]> = {
  home: [],
  catalog: ['/'],
  cart: ['/'],
  profile: ['/'],
  favorites: ['/', '/profile'],
  orders: ['/', '/profile'],
  order: ['/', '/profile', '/orders'],
  category: ['/', '/catalog'],
  search: ['/'],
  product: ['/'],
  checkout: ['/', '/cart'],
  checkoutSuccess: ['/', '/cart'],
}

/** Natural back-stack for a deep link: starts at the closest tab root. */
export function chainFor(path: string, variant: VariantDefinition): string[] {
  const m = matchScreen(new URL(path, 'http://x').pathname)
  if (!m) return [variant.tabs[0] ? pathOfTab(variant, variant.tabs[0].id) : '/']
  const isTab = (p: string) => variant.tabs.some((t) => t.screen === matchScreen(p)?.id)
  if (isTab(new URL(path, 'http://x').pathname)) return [path]
  const parents = PARENTS[m.id]
  let start = -1
  for (let i = parents.length - 1; i >= 0; i--) if (isTab(parents[i])) { start = i; break }
  const chain = start >= 0 ? parents.slice(start) : [pathOfTab(variant, variant.tabs[0].id), ...parents.filter((p) => !isTab(p))]
  return [...chain, path]
}

function pathOfTab(variant: VariantDefinition, tabId: string): string {
  const screen = variant.tabs.find((t) => t.id === tabId)?.screen ?? 'home'
  return { home: '/', catalog: '/catalog', cart: '/cart', profile: '/profile', favorites: '/favorites', orders: '/orders', search: '/search' }[screen as string] ?? '/'
}

function settle(s: NavState): NavState {
  const fix = (e: Entry): Entry => {
    if (e.phase === 'covered' || e.phase === 'fade-out') return { ...e, phase: 'idle-hidden', dir: null }
    if (e.phase === 'from' || e.phase === 'to-instant') return { ...e, phase: 'active', dir: null }
    return e
  }
  const changed = s.exiting.length || [...s.roots, ...s.stack].some((e) => e.phase !== 'active' && e.phase !== 'idle-hidden')
  if (!changed) return s
  return { ...s, roots: s.roots.map((e) => ({ ...fix(e), z: 1 })), stack: s.stack.map(fix), exiting: [] }
}

function buildFromChain(chain: string[], locKey: string, variant: VariantDefinition, prev: NavState | null): NavState {
  const [rootPath, ...rest] = chain
  const fresh = makeEntry(rootPath, rest.length ? `${locKey}:root` : locKey, variant)
  const existing = prev?.roots.find((r) => r.key === fresh.key)
  const rootPhase: Phase = rest.length ? 'idle-hidden' : 'to-instant'
  const root: Entry = existing
    ? { ...existing, locKey: fresh.locKey, path: fresh.path, query: fresh.query, phase: rootPhase, dir: null, z: 1 }
    : { ...fresh, phase: rootPhase }
  const others = (prev?.roots ?? []).map((r) => (r.key === root.key ? root : { ...r, phase: 'idle-hidden' as Phase, dir: null, z: 1 }))
  const roots = existing ? others : [...others, root]
  zSeq = 1
  const stack = rest.map((p, i) =>
    makeEntry(p, i === rest.length - 1 ? locKey : `${locKey}:${i}`, variant, { phase: i === rest.length - 1 ? 'to-instant' : 'idle-hidden', backedBelow: false }),
  )
  return { roots, rootKey: root.key, stack, exiting: [] }
}

type Action =
  | { type: 'push'; entry: Entry; animate: boolean }
  | { type: 'replace'; entry: Entry; animate: boolean }
  | { type: 'popTo'; key: string; locKey: string; animate: boolean }
  | { type: 'tab'; entry: Entry; fade: boolean }
  | { type: 'rebuild'; chain: string[]; locKey: string }
  | { type: 'promote' }
  | { type: 'settle' }

function topOf(s: NavState): Entry {
  return s.stack[s.stack.length - 1] ?? s.roots.find((r) => r.key === s.rootKey)!
}

function reducerFor(variant: VariantDefinition) {
  return function reducer(state: NavState, a: Action): NavState {
    if (a.type === 'settle') return settle(state)
    if (a.type === 'promote') {
      const up = (e: Entry): Entry => (e.phase === 'from' || e.phase === 'to-instant' ? { ...e, phase: 'active' } : e)
      return { ...state, roots: state.roots.map(up), stack: state.stack.map(up) }
    }
    const s = settle(state)
    const prevTop = topOf(s)
    const cover = (e: Entry, animate: boolean): Entry => ({ ...e, phase: animate ? 'covered' : 'idle-hidden', dir: null })

    switch (a.type) {
      case 'push': {
        const entry = { ...a.entry, phase: (a.animate ? 'from' : 'to-instant') as Phase, dir: 'push' as Dir, backedBelow: true }
        const coverPrev = (e: Entry) => (e.key === prevTop.key ? cover(e, a.animate) : e)
        return { ...s, roots: s.roots.map(coverPrev), stack: [...s.stack.map(coverPrev), entry] }
      }
      case 'replace': {
        if (!s.stack.length) {
          // replacing a root = behave like a tab switch without animation
          return reducer(s, { type: 'tab', entry: a.entry, fade: false })
        }
        const old = s.stack[s.stack.length - 1]
        const entry = { ...a.entry, z: old.z + 1, phase: (a.animate ? 'from' : 'to-instant') as Phase, dir: 'push' as Dir, backedBelow: old.backedBelow }
        return { ...s, stack: [...s.stack.slice(0, -1), entry], exiting: a.animate ? [{ ...old, phase: 'covered', dir: null }] : [] }
      }
      case 'popTo': {
        const idx = s.stack.findIndex((e) => e.key === a.key)
        const targetIsRoot = s.rootKey === a.key
        if (idx < 0 && !targetIsRoot) return s
        const keep = targetIsRoot ? [] : s.stack.slice(0, idx + 1)
        const top = s.stack[s.stack.length - 1]
        const reveal = (e: Entry): Entry => ({ ...e, locKey: a.locKey, phase: a.animate ? 'from' : 'to-instant', dir: a.animate ? 'reveal' : null })
        const roots = targetIsRoot ? s.roots.map((r) => (r.key === a.key ? reveal(r) : r)) : s.roots
        const stack = keep.map((e, i) => (i === keep.length - 1 ? reveal(e) : e))
        return { ...s, roots, stack, exiting: a.animate && top ? [{ ...top, phase: 'exit', dir: 'push' }] : [] }
      }
      case 'tab': {
        const existing = s.roots.find((r) => r.key === a.entry.key)
        const nextRoot: Entry = existing
          ? { ...existing, locKey: a.entry.locKey, path: a.entry.path, query: a.entry.query, params: a.entry.params, phase: 'to-instant', dir: null, z: 1 }
          : { ...a.entry, phase: 'to-instant', dir: null, z: 1 }
        const fadeOut: Entry | null = a.fade && prevTop.key !== nextRoot.key ? { ...prevTop, phase: 'fade-out', dir: 'tab' } : null
        const roots = s.roots.map((r) =>
          r.key === nextRoot.key ? nextRoot : fadeOut && r.key === fadeOut.key ? fadeOut : { ...r, phase: 'idle-hidden' as Phase, dir: null, z: 1 },
        )
        if (!existing) roots.push(nextRoot)
        const exiting = fadeOut && s.stack.some((e) => e.key === fadeOut.key) ? [fadeOut] : []
        zSeq = 1
        return { roots, rootKey: nextRoot.key, stack: [], exiting }
      }
      case 'rebuild':
        return buildFromChain(a.chain, a.locKey, variant, s)
    }
  }
}

function readRestore(): string[] | null {
  try {
    const raw = scopedStorage.getItem(NAV_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as { at: number; paths: string[] }
    return Date.now() - v.at < RESTORE_TTL && v.paths.length ? v.paths : null
  } catch {
    return null
  }
}

const prefersReduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

const NAV_DURATION: Record<VariantDefinition['transition'], number> = { slide: 360, fade: 260, lift: 340 }

export function Navigator({ children }: { children?: ReactNode }) {
  const variant = useVariant()
  const location = useLocation()
  const navType = useNavigationType()
  const navigate = useNavigate()
  const reducer = useMemo(() => reducerFor(variant), [variant])

  const [state, dispatch] = useReducer(reducer, null, () => buildFromChain(chainFor(location.pathname + location.search, variant), location.key, variant, null))
  const stateRef = useRef(state)
  useLayoutEffect(() => {
    stateRef.current = state
  })
  const lastLocKey = useRef(location.key)

  // Reopen where the user left off: Telegram may kill the WebView in background (TTL 30 min).
  useEffect(() => {
    if (location.pathname !== '/' || (location.state as { nav?: string } | null)?.nav) return
    const restored = readRestore()
    if (restored && new URL(restored[restored.length - 1], 'http://x').pathname !== '/') navigate(restored[restored.length - 1], { replace: true, state: { nav: 'reset', stack: restored } })
    // mount only
  }, [])
  const lastPushAt = useRef(0)
  const animateRef = useRef(!prefersReduced())

  // ── react to history changes ────────────────────────────────────────────
  useLayoutEffect(() => {
    if (location.key === lastLocKey.current) return
    lastLocKey.current = location.key
    const s = stateRef.current
    const nav = (location.state as { nav?: string; stack?: string[] } | null) ?? {}
    const path = location.pathname + location.search
    const animate = animateRef.current
    const m = matchScreen(location.pathname)
    if (!m) {
      navigate('/', { replace: true })
      return
    }

    if (nav.nav === 'reset' && nav.stack?.length) {
      const chain = chainFor(nav.stack[0], variant)
      dispatch({ type: 'rebuild', chain: [...chain.slice(0, -1), ...nav.stack], locKey: location.key })
      return
    }
    if (navType === 'POP') {
      const target = [...s.stack, ...s.roots.filter((r) => r.key === s.rootKey)].find((e) => e.locKey === location.key)
      if (target) dispatch({ type: 'popTo', key: target.key, locKey: location.key, animate })
      else dispatch({ type: 'rebuild', chain: chainFor(path, variant), locKey: location.key })
      return
    }
    const entry = makeEntry(path, location.key, variant)
    if (navType === 'REPLACE') {
      if (nav.nav === 'pop' || nav.nav === 'poproot') {
        const below = nav.nav === 'poproot' ? null : s.stack[s.stack.length - 2]
        const target = below && below.path === path ? below : s.roots.find((r) => r.key === s.rootKey)!
        if (nav.nav === 'poproot' || target.path === path) {
          dispatch({ type: 'popTo', key: target.key, locKey: location.key, animate })
          return
        }
        dispatch({ type: 'rebuild', chain: chainFor(path, variant), locKey: location.key })
        return
      }
      dispatch({ type: 'replace', entry, animate })
      return
    }
    // PUSH
    if (entry.tab) dispatch({ type: 'tab', entry, fade: variant.tabTransition === 'fade' && animate })
    else dispatch({ type: 'push', entry, animate })
  }, [location, navType, navigate, variant])

  // ── run the two-step transition: commit "from" → force style → "active" ──
  const stackRef = useRef<HTMLDivElement>(null)
  const needsPromote = [...state.roots, ...state.stack].some((e) => e.phase === 'from' || e.phase === 'to-instant')
  const needsSettle = state.exiting.length > 0 || [...state.roots, ...state.stack].some((e) => e.phase === 'covered' || e.phase === 'fade-out')
  useLayoutEffect(() => {
    if (!needsPromote) return
    void stackRef.current?.offsetWidth // flush styles so the transition starts from the "from" state
    dispatch({ type: 'promote' })
  }, [needsPromote])
  useEffect(() => {
    if (!needsSettle) return
    const ms = animateRef.current ? NAV_DURATION[variant.transition] + 40 : 0
    const t = setTimeout(() => dispatch({ type: 'settle' }), ms)
    return () => clearTimeout(t)
  }, [needsSettle, state, variant.transition])

  // ── derived ─────────────────────────────────────────────────────────────
  const root = state.roots.find((r) => r.key === state.rootKey)!
  const top = state.stack[state.stack.length - 1] ?? root
  const canGoBack = state.stack.length > 0
  const sheetDepth = useBackHandlers((s) => s.depth)

  // ── navigation API ──────────────────────────────────────────────────────
  const api = useMemo<NavApi>(() => {
    const preload = (path: string) => {
      const m = matchScreen(new URL(path, 'http://x').pathname)
      if (m) void variant.screens[m.id].preload().catch(() => {})
    }
    return {
      push(path) {
        const s = stateRef.current
        const t = s.stack[s.stack.length - 1] ?? s.roots.find((r) => r.key === s.rootKey)!
        const now = performance.now()
        if (t.path === path || now - lastPushAt.current < 280) return // double-tap guard
        lastPushAt.current = now
        preload(path)
        navigate(path, { state: { nav: 'push' } })
      },
      replace(path) {
        preload(path)
        navigate(path, { replace: true, state: { nav: 'replace' } })
      },
      back() {
        const s = stateRef.current
        if (runTopBackHandler()) return
        const t = s.stack[s.stack.length - 1]
        if (!t) return
        const below = s.stack[s.stack.length - 2] ?? s.roots.find((r) => r.key === s.rootKey)!
        if (t.backedBelow && window.history.length > 1) navigate(-1)
        else navigate(below.path, { replace: true, state: { nav: 'pop' } })
      },
      switchTab(tabId) {
        const s = stateRef.current
        const path = pathOfTab(variant, tabId)
        const current = s.roots.find((r) => r.key === s.rootKey)
        if (current?.tab === tabId) {
          if (s.stack.length) navigate(current.path, { replace: true, state: { nav: 'poproot' } })
          else window.dispatchEvent(new CustomEvent('tj:scrolltop', { detail: current.key }))
          return
        }
        variant.screens[variant.tabs.find((t) => t.id === tabId)!.screen].preload()
        navigate(path, { state: { nav: 'tab' } })
      },
      reset(paths) {
        if (!paths.length) return
        navigate(paths[paths.length - 1], { replace: true, state: { nav: 'reset', stack: paths } })
      },
      preload,
      canGoBack,
      activeTab: root.tab,
    }
  }, [navigate, variant, canGoBack, root.tab])

  // ── Telegram BackButton / Escape / lab route reporting / persistence ─────
  useEffect(() => {
    tg.setBackHandler(() => api.back())
    return () => tg.setBackHandler(null)
  }, [api])
  useEffect(() => {
    tg.setBackVisible(canGoBack || sheetDepth > 0)
  }, [canGoBack, sheetDepth])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (sheetDepth > 0 || canGoBack)) api.back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [api, sheetDepth, canGoBack])
  useEffect(() => {
    tg.reportRoute(top.screen, top.path)
    scopedStorage.setItem(NAV_KEY, JSON.stringify({ at: Date.now(), paths: [root.path, ...state.stack.map((e) => e.path)] }))
  }, [top.screen, top.path, root.path, state.stack])

  // ── idle preloading of every screen chunk (skipped on Save-Data) ─────────
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    if (conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? '')) return
    const loaders = Object.values(variant.screens)
    let i = 0
    let cancel = () => {}
    const next = () => {
      if (i >= loaders.length) return
      void loaders[i++].preload().catch(() => {}).finally(() => (cancel = scheduleIdle(next, 400)))
    }
    cancel = scheduleIdle(next, 1200)
    return () => cancel()
  }, [variant])

  // ── render ──────────────────────────────────────────────────────────────
  const visibleKeys = new Set([root.key, ...state.stack.map((e) => e.key)])
  const layers = [...state.roots, ...state.stack, ...state.exiting]
  const topCovers = !variant.showTabBar(top.screen)
  const tabZ = topCovers ? top.z * 4 - 1 : top.z * 4 + 3

  return (
    <NavContext.Provider value={api}>
      <div ref={stackRef} className="nav-stack" data-nav={variant.transition} style={{ ['--nav-duration' as string]: `${NAV_DURATION[variant.transition]}ms` }}>
        {layers.map((e) => (
          <Layer key={e.key} entry={e} active={e.key === top.key && !state.exiting.includes(e)} visible={visibleKeys.has(e.key) || state.exiting.includes(e)} />
        ))}
      </div>
      <div className="tabbar-host" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: Math.max(tabZ, 1) }}>
        <variant.TabBar tabs={variant.tabs} active={root.tab} onSelect={api.switchTab} />
      </div>
      {children}
    </NavContext.Provider>
  )
}

const Layer = memo(function Layer({ entry, active, visible }: { entry: Entry; active: boolean; visible: boolean }) {
  const variant = useVariant()
  const ctx = useMemo(() => ({ screen: entry.screen, entryKey: entry.key, path: entry.path, active }), [entry.screen, entry.key, entry.path, active])
  const Screen = variant.screens[entry.screen].Component
  const content = useMemo(
    () => (
      <ScreenBoundary>
        <Suspense fallback={null}>
          <Screen params={entry.params} query={entry.query} />
        </Suspense>
      </ScreenBoundary>
    ),
    [Screen, entry.params, entry.query],
  )
  const phase = !visible && entry.phase === 'active' ? 'idle-hidden' : entry.phase
  return (
    <div
      className="nav-layer"
      data-phase={phase}
      data-dir={entry.dir ?? undefined}
      data-screen={entry.screen}
      style={{ zIndex: entry.z * 4 + (entry.phase === 'fade-out' ? 2 : 0) }}
      inert={!active}
      aria-hidden={!active || undefined}
    >
      <ScreenContext.Provider value={ctx}>{content}</ScreenContext.Provider>
    </div>
  )
})

class ScreenBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    console.error('[screen]', error)
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <p style={{ fontWeight: 600, marginBottom: 12 }}>Не удалось открыть экран · Ekranni ochib boʻlmadi</p>
          <button className="tap" style={{ padding: '10px 18px', borderRadius: 12, background: 'var(--color-accent)', color: 'var(--color-accent-ink)' }} onClick={() => location.reload()}>
            ↻
          </button>
        </div>
      </div>
    )
  }
}

export type { Location }
