export type ScreenId =
  | 'home'
  | 'catalog'
  | 'category'
  | 'search'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'checkoutSuccess'
  | 'profile'
  | 'orders'
  | 'order'
  | 'favorites'

export const SCREEN_IDS: ScreenId[] = ['home', 'catalog', 'category', 'search', 'product', 'cart', 'checkout', 'checkoutSuccess', 'profile', 'orders', 'order', 'favorites']

const ROUTES: Array<{ id: ScreenId; re: RegExp; keys: string[] }> = [
  { id: 'home', re: /^\/$/, keys: [] },
  { id: 'catalog', re: /^\/catalog\/?$/, keys: [] },
  { id: 'category', re: /^\/catalog\/([^/]+)\/?$/, keys: ['categoryId'] },
  { id: 'search', re: /^\/search\/?$/, keys: [] },
  { id: 'product', re: /^\/product\/([^/]+)\/?$/, keys: ['id'] },
  { id: 'cart', re: /^\/cart\/?$/, keys: [] },
  { id: 'checkout', re: /^\/checkout\/?$/, keys: [] },
  { id: 'checkoutSuccess', re: /^\/checkout\/success\/([^/]+)\/?$/, keys: ['orderId'] },
  { id: 'profile', re: /^\/profile\/?$/, keys: [] },
  { id: 'orders', re: /^\/orders\/?$/, keys: [] },
  { id: 'order', re: /^\/orders\/([^/]+)\/?$/, keys: ['id'] },
  { id: 'favorites', re: /^\/favorites\/?$/, keys: [] },
]

export interface ScreenMatch {
  id: ScreenId
  params: Record<string, string>
}

export function matchScreen(pathname: string): ScreenMatch | null {
  for (const r of ROUTES) {
    const m = pathname.match(r.re)
    if (m) return { id: r.id, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) }
  }
  return null
}

const q = (params?: Record<string, string | undefined>) => {
  if (!params) return ''
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '') as [string, string][]).toString()
  return s ? `?${s}` : ''
}

/** Typed path builders (paths are relative to the variant basename). */
export const paths = {
  home: () => '/',
  catalog: () => '/catalog',
  category: (categoryId: string, query?: { sort?: string }) => `/catalog/${encodeURIComponent(categoryId)}${q(query)}`,
  search: (query?: { q?: string; category?: string; sort?: string }) => `/search${q(query)}`,
  product: (id: string) => `/product/${encodeURIComponent(id)}`,
  cart: () => '/cart',
  checkout: () => '/checkout',
  checkoutSuccess: (orderId: string) => `/checkout/success/${encodeURIComponent(orderId)}`,
  profile: () => '/profile',
  orders: (status?: string) => `/orders${q({ status })}`,
  order: (id: string) => `/orders/${encodeURIComponent(id)}`,
  favorites: () => '/favorites',
}

export const pathOfScreen: Record<ScreenId, (() => string) | null> = {
  home: paths.home,
  catalog: paths.catalog,
  category: null,
  search: paths.search,
  product: null,
  cart: paths.cart,
  checkout: paths.checkout,
  checkoutSuccess: null,
  profile: paths.profile,
  orders: paths.orders,
  order: null,
  favorites: paths.favorites,
}
