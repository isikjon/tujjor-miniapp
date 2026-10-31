import { CircleUserRound, Heart, House, LayoutGrid, ShoppingCart, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { TabBarProps } from '../../shared/runtime/variant'
import { useT } from '../../shared/i18n'
import { useCartCount } from '../../shared/store/cart'
import { Tap } from '../../shared/ui/Tap'

const ICONS: Record<string, LucideIcon> = { home: House, catalog: LayoutGrid, favorites: Heart, cart: ShoppingCart, profile: CircleUserRound }

/** 5 tabs, active violet, pink cart badge that bumps when the count grows. */
export function TabBar({ tabs, active, onSelect }: TabBarProps) {
  const t = useT()
  const count = useCartCount()
  const prev = useRef(count)
  const [bump, setBump] = useState(0)
  useEffect(() => {
    if (count > prev.current) setBump((b) => b + 1)
    prev.current = count
  }, [count])
  return (
    <nav className="b-tabbar">
      {tabs.map((tab) => {
        const Icon = ICONS[tab.id] ?? House
        const on = active === tab.id
        const badge = tab.id === 'cart' && count > 0 ? (count > 99 ? '99+' : String(count)) : null
        return (
          <Tap key={tab.id} flat className="b-tab" data-on={on} aria-current={on ? 'page' : undefined} onClick={() => onSelect(tab.id)}>
            <span className="b-tab__icon">
              <Icon size={24} strokeWidth={on ? 2.3 : 1.9} aria-hidden="true" />
              {badge ? (
                <span key={bump} className="b-tab__badge" data-bump={bump > 0} aria-label={t.tp('cart.items', count)}>
                  {badge}
                </span>
              ) : null}
            </span>
            <span className="b-tab__label">{t.t(tab.label)}</span>
          </Tap>
        )
      })}
    </nav>
  )
}
