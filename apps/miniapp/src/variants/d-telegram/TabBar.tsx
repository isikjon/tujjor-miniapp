import { CircleUserRound, House, LayoutGrid, ShoppingCart } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
import { useT } from '../../shared/i18n'
import type { TabBarProps } from '../../shared/runtime/variant'
import { useCartCount } from '../../shared/store/cart'
import { tg } from '../../shared/telegram/adapter'

const ICONS: Record<string, typeof House> = { home: House, catalog: LayoutGrid, cart: ShoppingCart, profile: CircleUserRound }

/** Cart badge: red pill (iOS badge), bumps once when the count grows. */
function Badge({ count }: { count: number }) {
  const prev = useRef(count)
  const [bump, setBump] = useState(0)
  useEffect(() => {
    if (count > prev.current) setBump((b) => b + 1)
    prev.current = count
  }, [count])
  if (count <= 0) return null
  return (
    <span key={bump} className="d-tab-badge" data-bump={bump > 0 || undefined} aria-hidden="true">
      {count > 99 ? '99+' : count}
    </span>
  )
}

/** UITabBar: solid bottom-bar colour, hairline top, tint = Telegram button colour, height 49 + safe area. */
export const TabBar = memo(function TabBar({ tabs, active, onSelect }: TabBarProps) {
  const t = useT()
  const count = useCartCount()
  return (
    <nav className="d-tabbar">
      {tabs.map((tab) => {
        const Icon = ICONS[tab.id] ?? House
        const on = active === tab.id
        const label = t.t(tab.label)
        return (
          <button
            key={tab.id}
            type="button"
            className="d-tab"
            style={{ height: 50 }}
            aria-current={on ? 'page' : undefined}
            aria-label={tab.id === 'cart' && count > 0 ? `${label}, ${count}` : label}
            onClick={() => {
              if (!on) tg.haptic('selection')
              onSelect(tab.id)
            }}
          >
            <span className="d-tab-icon">
              <Icon size={26} strokeWidth={on ? 2.1 : 1.8} aria-hidden="true" />
              {tab.id === 'cart' ? <Badge count={count} /> : null}
            </span>
            <span className="d-tab-label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
})
