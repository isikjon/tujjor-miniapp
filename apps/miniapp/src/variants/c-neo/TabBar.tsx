import { House, LayoutGrid, ShoppingBag, User, type LucideIcon } from 'lucide-react'
import type { TabBarProps } from '../../shared/runtime/variant'
import { useT } from '../../shared/i18n'
import { useCartCount } from '../../shared/store/cart'
import { tg } from '../../shared/telegram/adapter'

const ICONS: Record<string, LucideIcon> = { home: House, catalog: LayoutGrid, cart: ShoppingBag, profile: User }

/** Floating pill tab bar: solid surface, lime capsule behind the active icon, bumping cart badge. */
export function TabBar({ tabs, active, onSelect }: TabBarProps) {
  const t = useT()
  const count = useCartCount()
  return (
    <nav className="c-tabbar" aria-label="TUJJOR">
      <div className="c-tabbar-pill">
        {tabs.map((tab) => {
          const I = ICONS[tab.id] ?? House
          const on = active === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              className="tap c-tab"
              data-active={on}
              aria-current={on ? 'page' : undefined}
              onClick={() => {
                tg.haptic('selection')
                onSelect(tab.id)
              }}
            >
              <span className="c-tab-ico">
                <I size={21} strokeWidth={on ? 2.4 : 2} />
                {tab.id === 'cart' && count > 0 ? (
                  <span key={count} className="c-tab-badge" aria-label={String(count)}>
                    {count > 99 ? '99+' : count}
                  </span>
                ) : null}
              </span>
              <span className="c-tab-label">{t.t(tab.label)}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
