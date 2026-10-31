import { Heart } from 'lucide-react'
import { useCallback, useLayoutEffect, useState } from 'react'
import { useT } from '../../../shared/i18n'
import { useNav } from '../../../shared/nav/context'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { Screen } from '../../../shared/nav/Screen'
import { useFavoriteToggle } from '../../../shared/query/hooks'
import { useFavorites } from '../../../shared/store/favorites'
import { toast } from '../../../shared/store/toast'
import { Tap } from '../../../shared/ui/Tap'
import { VirtualGrid } from '../../../shared/ui/VirtualGrid'
import { EmptyView, PageTitle } from '../ui/controls'
import { FavCard, FavRemoveContext } from '../ui/g3/FavCard'
import '../styles/g3.css'

const idKey = (id: string) => id

export default function Favorites(_: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const ids = useFavorites((s) => s.ids)
  const toggle = useFavoriteToggle()
  // VirtualGrid reads the Screen scroller ref in a layout effect; on the very first commit the ancestor ref
  // is not attached yet (React attaches parent refs after child layout effects), so mount it one commit later.
  const [mounted, setMounted] = useState(false)
  useLayoutEffect(() => setMounted(true), [])

  const remove = useCallback(
    (id: string) => {
      if (!useFavorites.getState().ids.includes(id)) return
      toggle(id)
      toast({
        text: t.t('d.favorites.removed'),
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
      <div className="d-g3-titlewrap">
        <PageTitle sub={ids.length ? t.tp('d.favorites.count', ids.length) : undefined}>{t.t('favorites.title')}</PageTitle>
      </div>
      {ids.length ? (
        <FavRemoveContext.Provider value={remove}>
          <div className="d-g3-grid">
            {mounted ? <VirtualGrid items={ids} Item={FavCard} getKey={idKey} columns={2} gap={8} estimateHeight={290} overscan={4} footer={<p className="d-g3-end">{t.t('d.end')}</p>} /> : null}
          </div>
        </FavRemoveContext.Provider>
      ) : (
        <EmptyView
          icon={<Heart size={44} strokeWidth={1.6} />}
          title={t.t('favorites.empty')}
          text={t.t('favorites.emptyHint')}
          action={
            <Tap className="d-btn d-btn-tinted" haptic="light" onClick={() => nav.switchTab('catalog')}>
              {t.t('action.toCatalog')}
            </Tap>
          }
        />
      )}
    </Screen>
  )
}
