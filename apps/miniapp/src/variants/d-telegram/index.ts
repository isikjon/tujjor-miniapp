import './theme.css'
import { lazyScreen } from '../../shared/nav/lazyScreen'
import type { ScreenId } from '../../shared/nav/routes'
import type { VariantDefinition } from '../../shared/runtime/variant'
import { TG_THEMES } from '../../shared/telegram/protocol'
import { TabBar } from './TabBar'

import { messages as base } from './i18n'
import { messages as g1 } from './i18n.g1'
import { messages as g2 } from './i18n.g2'
import { messages as g3 } from './i18n.g3'

const messages = {
  ru: { ...base.ru, ...g1.ru, ...g2.ru, ...g3.ru },
  uz: { ...base.uz, ...g1.uz, ...g2.uz, ...g3.uz },
}

/** Detail and task flows hide the tab bar (iOS hidesBottomBarWhenPushed); primary CTAs live in the Telegram MainButton. */
const NO_TABBAR: ScreenId[] = ['product', 'search', 'checkout', 'checkoutSuccess', 'order']

const variant: VariantDefinition = {
  id: 'd',
  className: 'v-d',
  transition: 'slide',
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
  toastPosition: 'top',
  messages,
  telegramColors: (scheme) => ({
    header: TG_THEMES[scheme].secondary_bg_color,
    background: TG_THEMES[scheme].secondary_bg_color,
    bottomBar: TG_THEMES[scheme].bottom_bar_bg_color,
  }),
}

export default variant
