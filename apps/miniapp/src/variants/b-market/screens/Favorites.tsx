import { Heart } from 'lucide-react'
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useT } from '../../../shared/i18n'
import { useIsActiveScreen, useNav } from '../../../shared/nav/context'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { Screen } from '../../../shared/nav/Screen'
import { useFavoriteToggle, useProduct } from '../../../shared/query/hooks'
import { useFavorites } from '../../../shared/store/favorites'
import { toast } from '../../../shared/store/toast'
import { VirtualGrid } from '../../../shared/ui/VirtualGrid'
import { Button, CardSkeleton, EmptyView, ProductCard } from '../ui'
import '../styles/g3.css'

const idKey = (id: string) => id

/** Card for one favourite id: instant from any cached list, else loads the product (skeleton keeps the exact size). */
const FavItem = memo(function FavItem({ item }: { item: string; index: number }) {
  const { summary } = useProduct(item)
  return summary ? <ProductCard item={summary} sizes="(max-width: 520px) 50vw, 260px" /> : <CardSkeleton />
})

export default function Favorites(_: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const ids = useFavorites((s) => s.ids)
  const toggle = useFavoriteToggle()
  const active = useIsActiveScreen()
  // Shared VirtualGrid reads the screen scroller in its first layout effect, before <Screen> attaches the scroller ref;
  // with synchronous data (ids) nothing re-renders it afterwards → 0 rows. Mount it one (pre-paint) render later.
  const [ready, setReady] = useState(false)
  useLayoutEffect(() => setReady(true), [])

  // Heart on a card removes it from the list → offer undo while this screen is in front.
  const prev = useRef(ids)
  useEffect(() => {
    const before = prev.current
    prev.current = ids
    if (!active || ids.length !== before.length - 1) return
    const removed = before.find((id) => !ids.includes(id))
    if (!removed) return
    toast({
      text: t.t('b.g3.favRemoved'),
      action: {
        label: t.t('action.undo'),
        onClick: () => {
          if (!useFavorites.getState().ids.includes(removed)) toggle(removed)
        },
      },
    })
  }, [ids, active, t, toggle])

  const header = (
    <div className="b3-ohead b3-ohead--plain">
      <h1 className="b3-title">{t.t('favorites.title')}</h1>
      {ids.length ? <span className="b3-title__count b-num">{t.tp('b.favCount', ids.length)}</span> : null}
    </div>
  )

  return (
    <Screen header={header} className="b3-screen">
      {ids.length ? (
        <div className="b3-favgrid">
          {ready ? <VirtualGrid className="px-3" items={ids} Item={FavItem} getKey={idKey} columns={2} gap={8} estimateHeight={300} overscan={4} /> : null}
        </div>
      ) : (
        <EmptyView
          className="b3-empty-full"
          icon={<Heart size={34} strokeWidth={2.2} />}
          title={t.t('favorites.empty')}
          text={t.t('favorites.emptyHint')}
          action={
            <Button size="lg" onClick={() => nav.switchTab('catalog')}>
              {t.t('action.toCatalog')}
            </Button>
          }
        />
      )}
    </Screen>
  )
}
