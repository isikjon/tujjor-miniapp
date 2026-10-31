import { Heart, RotateCcw, X } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
import '../styles/g3.css'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { useT } from '../../../shared/i18n'
import { useIsActiveScreen, useNav } from '../../../shared/nav/context'
import { Screen } from '../../../shared/nav/Screen'
import { useFavoriteToggle, useProduct } from '../../../shared/query/hooks'
import { useFavorites } from '../../../shared/store/favorites'
import { toast } from '../../../shared/store/toast'
import { EmptyState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { VirtualGrid } from '../../../shared/ui/VirtualGrid'
import { TopBar } from '../ui/bits'
import { ProductCard, ProductCardSkeleton } from '../ui/ProductCard'

const keyOf = (id: string) => id

export default function Favorites(_: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const ids = useFavorites((s) => s.ids)
  const toggle = useFavoriteToggle()
  const active = useIsActiveScreen()
  // The shared VirtualGrid reads the Screen scroller ref on its first layout effect, which runs before the
  // scroller ref is attached on the very first commit: mount it one frame later (skeleton with the same geometry).
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])

  // Undo for hearts removed right here (the card disappears from the grid immediately).
  const prev = useRef(ids)
  useEffect(() => {
    const removed = prev.current.filter((x) => !ids.includes(x))
    prev.current = ids
    if (active && removed.length === 1) {
      const id = removed[0]
      toast({ text: t.t('c.g3.removedFav'), action: { label: t.t('action.undo'), onClick: () => toggle(id) } })
    }
  }, [ids]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen className="c-g3" header={<TopBar title={t.t('favorites.title')} />}>
      <div className="px-4">
        <div className="mb-4 mt-1">
          {ids.length ? <p className="c-kicker mb-1.5">{t.tp('catalog.products', ids.length)}</p> : null}
          <h1 className="c-h1">{t.t('favorites.title')}</h1>
        </div>
        {ids.length === 0 ? (
          <EmptyState
            className="c-g3-empty"
            icon={<Heart size={40} strokeWidth={1.8} />}
            title={t.t('favorites.empty')}
            text={t.t('favorites.emptyHint')}
            action={
              <Tap className="c-cta px-6" style={{ width: 'auto' }} onClick={() => nav.switchTab('catalog')}>
                {t.t('action.toCatalog')}
              </Tap>
            }
          />
        ) : (
          ready ? (
            <VirtualGrid items={ids} Item={FavCell} getKey={keyOf} columns={2} gap={12} estimateHeight={262} overscan={4} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {ids.slice(0, 4).map((id) => (
                <ProductCardSkeleton key={id} />
              ))}
            </div>
          )
        )}
      </div>
    </Screen>
  )
}

const FavCell = memo(function FavCell({ item: id }: { item: string; index: number }) {
  const t = useT()
  const q = useProduct(id)
  const toggle = useFavoriteToggle()
  if (q.summary) return <ProductCard item={q.summary} />
  if (q.isError) {
    return (
      <div className="c-g3-favfail">
        <p className="text-[14px] font-[650]">{t.t('c.g3.favError')}</p>
        <div className="mt-3 flex gap-2">
          <Tap className="c-ibtn" aria-label={t.t('action.retry')} onClick={() => void q.refetch()}>
            <RotateCcw size={18} />
          </Tap>
          <Tap className="c-ibtn" aria-label={t.t('action.delete')} onClick={() => toggle(id)}>
            <X size={18} />
          </Tap>
        </div>
      </div>
    )
  }
  return <ProductCardSkeleton />
})
