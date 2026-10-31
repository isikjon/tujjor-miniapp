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

/** Screens that cover the tab bar: focused flows with their own sticky CTA (and search, so the keyboard has room). */
const NO_TABBAR: ScreenId[] = ['product', 'checkout', 'checkoutSuccess', 'search']

const variant: VariantDefinition = {
  id: 'a',
  className: 'v-a',
  transition: 'fade',
  tabTransition: 'none',
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
  tabBarHeight: 50,
  showTabBar: (s) => !NO_TABBAR.includes(s),
  toastPosition: 'bottom',
  messages,
  // Telegram chrome takes the page colour, so header and app read as one surface.
  telegramColors: (scheme) =>
    scheme === 'dark' ? { header: '#000000', background: '#000000', bottomBar: '#000000' } : { header: '#ffffff', background: '#ffffff', bottomBar: '#ffffff' },
}

export default variant
