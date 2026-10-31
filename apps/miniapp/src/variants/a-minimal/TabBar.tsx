import { CircleUserRound, House, LayoutGrid, ShoppingBag, type LucideIcon } from 'lucide-react'
import type { TabBarProps } from '../../shared/runtime/variant'
import { useT } from '../../shared/i18n'
import { useCartCount } from '../../shared/store/cart'
import { Tap } from '../../shared/ui/Tap'

const ICONS: Record<string, LucideIcon> = { home: House, catalog: LayoutGrid, cart: ShoppingBag, profile: CircleUserRound }

/** White / black bar with a hairline, 1.5-stroke icons, ink for the active tab, ink-3 for the rest. */
export function TabBar({ tabs, active, onSelect }: TabBarProps) {
  const t = useT()
  const count = useCartCount()
  return (
    <nav className="a-tabbar">
      {tabs.map((tab) => {
        const Icon = ICONS[tab.id] ?? House
        const on = active === tab.id
        const badge = tab.id === 'cart' && count > 0 ? (count > 99 ? '99+' : String(count)) : null
        return (
          <Tap key={tab.id} flat className="a-tab" data-on={on} aria-current={on ? 'page' : undefined} onClick={() => onSelect(tab.id)}>
            <span className="a-tab__icon">
              <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
              {badge ? (
                <span className="a-tab__badge" aria-label={t.tp('cart.items', count)}>
                  {badge}
                </span>
              ) : null}
            </span>
            <span className="a-tab__label">{t.t(tab.label)}</span>
          </Tap>
        )
      })}
    </nav>
  )
}
