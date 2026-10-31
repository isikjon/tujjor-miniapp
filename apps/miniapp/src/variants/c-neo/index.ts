import '@fontsource-variable/unbounded'
import './theme.css'
import { lazyScreen } from '../../shared/nav/lazyScreen'
import type { ScreenId } from '../../shared/nav/routes'
import type { VariantDefinition } from '../../shared/runtime/variant'
import { messages as base } from './i18n'
import { messages as g1 } from './i18n.g1'
import { messages as g2 } from './i18n.g2'
import { messages as g3 } from './i18n.g3'

const messages = {
  ru: { ...base.ru, ...g1.ru, ...g2.ru, ...g3.ru },
  uz: { ...base.uz, ...g1.uz, ...g2.uz, ...g3.uz },
}
import { TabBar } from './TabBar'

// Kick off the display face (Latin + Cyrillic subsets) in parallel with the first data request,
// so prices and headlines rarely render in the fallback face.
try {
  void document.fonts?.load('700 20px "Unbounded Variable"', 'TUJJOR сум 0123')
} catch {
  /* fonts API unavailable */
}

const WITH_TABBAR: ScreenId[] = ['home', 'catalog', 'category', 'cart', 'profile', 'orders', 'favorites']

const variant: VariantDefinition = {
  id: 'c',
  className: 'v-c',
  transition: 'lift',
  tabTransition: 'fade',
  screens: {
    home: lazyScreen(() => import('./screens/Home')),
    catalog: lazyScreen(() => import('./screens/Catalog')),
    category: lazyScreen(() => import('./screens/Category')),
    search: lazyScreen(() => import('./screens/Search')),
    product: lazyScreen(() => import('./screens/Product')),
    cart: lazyScreen(() => import('./screens/Cart')),
    checkout: lazyScreen(() => import('./screens/Checkout')),
    checkoutSuccess: lazyScreen(() => import('./screens/CheckoutSuccess')),
    profile: lazyScreen(() => import('./screens/Profile')),
    orders: lazyScreen(() => import('./screens/Orders')),
    order: lazyScreen(() => import('./screens/Order')),
    favorites: lazyScreen(() => import('./screens/Favorites')),
  },
  tabs: [
    { id: 'home', screen: 'home', label: 'tab.home' },
    { id: 'catalog', screen: 'catalog', label: 'tab.catalog' },
    { id: 'cart', screen: 'cart', label: 'tab.cart' },
    { id: 'profile', screen: 'profile', label: 'tab.profile' },
  ],
  TabBar,
  // floating pill (64) + its lift above the safe area; content ends ~14 px above the pill
  tabBarHeight: 76,
  showTabBar: (s) => WITH_TABBAR.includes(s),
  toastPosition: 'top',
  messages,
  telegramColors: (scheme) =>
    scheme === 'dark' ? { header: '#0c0c0f', background: '#0c0c0f', bottomBar: '#0c0c0f' } : { header: '#f1f0eb', background: '#f1f0eb', bottomBar: '#f1f0eb' },
}

export default variant
