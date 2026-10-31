import { Heart } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useT } from '../../../shared/i18n'
import { useNav } from '../../../shared/nav/context'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { Screen } from '../../../shared/nav/Screen'
import { useFavoriteToggle } from '../../../shared/query/hooks'
import { useFavorites } from '../../../shared/store/favorites'
import { toast } from '../../../shared/store/toast'
import { EmptyState } from '../../../shared/ui/States'
import { VirtualGrid } from '../../../shared/ui/VirtualGrid'
import { Btn } from '../ui/controls'
import { PageTitle } from '../ui/PageTitle'
import { GridSkeleton } from '../ui/ProductCard'
import { FavCard, FavRemoveContext } from '../ui/g3/FavCard'
import '../styles/g3.css'

const idKey = (id: string) => id

export default function Favorites(_: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const ids = useFavorites((s) => s.ids)
  const toggle = useFavoriteToggle()
  // VirtualGrid must mount after the Screen scroller ref is attached (shared VirtualGrid reads it in a layout
  // effect that runs before the parent's ref on the very first commit) — one frame of skeleton, same geometry.
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])

  // Screen-level remove (+ undo): the card unmounts as soon as it leaves the list.
  const remove = useCallback(
    (id: string) => {
      if (!useFavorites.getState().ids.includes(id)) return
      toggle(id)
      toast({
        text: t.t('a.g3.favRemoved'),
        action: {
          label: t.t('action.undo'),
          onClick: () => {
            if (!useFavorites.getState().ids.includes(id)) toggle(id)
          },
        },
      })
    },
    [toggle, t],
  )

  return (
    <Screen>
      <PageTitle title={t.t('favorites.title')} subtitle={ids.length ? t.tp('catalog.products', ids.length) : undefined} />
      {ids.length ? (
        <FavRemoveContext.Provider value={remove}>
          <div className="a-gutter a-grid">
            {ready ? (
              <VirtualGrid items={ids} Item={FavCard} getKey={idKey} columns={2} gap={12} estimateHeight={300} overscan={4} />
            ) : (
              <GridSkeleton rows={Math.min(3, Math.ceil(ids.length / 2))} />
            )}
          </div>
        </FavRemoveContext.Provider>
      ) : (
        <EmptyState
          className="a-g3-empty"
          icon={<Heart size={40} strokeWidth={1.25} />}
          title={t.t('favorites.empty')}
          text={t.t('favorites.emptyHint')}
          action={
            <Btn size="md" onClick={() => nav.switchTab('catalog')}>
              {t.t('action.toCatalog')}
            </Btn>
          }
        />
      )}
    </Screen>
  )
}
