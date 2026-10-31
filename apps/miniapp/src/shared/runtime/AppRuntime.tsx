import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, type CSSProperties } from 'react'
import { BrowserRouter } from 'react-router'
import { VariantMessagesContext } from '../i18n'
import { clearScope } from '../lib/storage'
import { withBase } from '../lib/base'
import { cx } from '../lib/cx'
import { useNav } from '../nav/context'
import { chainFor, Navigator } from '../nav/Navigator'
import { queryClient } from '../query/client'
import { useSettings } from '../store/settings'
import { tg, useTg } from '../telegram/adapter'
import { loadCatalog } from '../demo/catalog'
import { FallbackChrome } from '../ui/FallbackChrome'
import { OfflineBanner } from '../ui/States'
import { Toaster } from '../ui/Toaster'
import { featuredProduct, seedDemoState } from './seed'
import { useVariant, VariantContext, type VariantDefinition } from './variant'

/** Providers + app frame shared by every variant. */
export function AppRuntime({ variant }: { variant: VariantDefinition }) {
  return (
    <QueryClientProvider client={queryClient}>
      <VariantContext.Provider value={variant}>
        <VariantMessagesContext.Provider value={variant.messages ?? null}>
          <BrowserRouter basename={withBase(`app/${variant.id}`)}>
            <RootFrame />
          </BrowserRouter>
        </VariantMessagesContext.Provider>
      </VariantContext.Provider>
    </QueryClientProvider>
  )
}

function RootFrame() {
  const variant = useVariant()
  const scheme = useTg((s) => s.scheme)
  const locale = useSettings((s) => s.locale)

  useEffect(() => {
    tg.setColors(variant.telegramColors(scheme))
  }, [variant, scheme])
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
  useEffect(() => {
    void seedDemoState()
  }, [])

  return (
    <div
      id="app-root"
      className={cx('app-root', variant.className)}
      data-scheme={scheme}
      style={{ '--tabbar-h': `${variant.tabBarHeight}px` } as CSSProperties}
    >
      <Navigator>
        <LabBridge />
      </Navigator>
      <Toaster position={variant.toastPosition} />
      <OfflineBanner />
      <FallbackChrome />
    </div>
  )
}

const LAB_TARGETS = {
  home: () => '/',
  catalog: () => '/catalog',
  search: () => '/search',
  cart: () => '/cart',
  checkout: () => '/checkout',
  profile: () => '/profile',
  orders: () => '/orders',
} as const

/** Handles Design Lab commands (screen sync, locale, reset) inside the app. */
function LabBridge() {
  const nav = useNav()
  const variant = useVariant()
  useEffect(
    () =>
      tg.onLabMessage((msg) => {
        if (msg.t === 'init' || msg.t === 'locale') useSettings.getState().setLocale(msg.locale)
        if (msg.t === 'navigate') {
          if (msg.screen === 'product') {
            void loadCatalog().then((db) => nav.reset(chainFor(`/product/${featuredProduct(db).id}`, variant)))
          } else {
            nav.reset(chainFor(LAB_TARGETS[msg.screen](), variant))
          }
        }
        if (msg.t === 'reset') {
          clearScope()
          queryClient.clear()
          location.replace(withBase(`app/${variant.id}/`))
        }
      }),
    [nav, variant],
  )
  useEffect(() => {
    tg.ready(variant.id)
  }, [variant.id])
  return null
}
