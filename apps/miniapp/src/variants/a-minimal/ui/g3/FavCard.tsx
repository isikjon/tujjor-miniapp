import { Heart, X } from 'lucide-react'
import { createContext, memo, useContext } from 'react'
import { useT } from '../../../../shared/i18n'
import { useProduct } from '../../../../shared/query/hooks'
import { Tap } from '../../../../shared/ui/Tap'
import { CardSkeleton, GridCard } from '../ProductCard'

/** Provided by the Favorites screen (stays mounted, so "undo" still works after the card unmounts). */
export const FavRemoveContext = createContext<(id: string) => void>(() => undefined)

/** Favourite cell for VirtualGrid: item is a product id; data comes from useProduct (cached summary first). */
export const FavCard = memo(function FavCard({ item: id, index }: { item: string; index: number }) {
  const t = useT()
  const remove = useContext(FavRemoveContext)
  const { summary, isError, refetch, isFetching } = useProduct(id)

  if (!summary) {
    if (!isError) return <CardSkeleton />
    return (
      <div className="a-card a-g3-favgone">
        <div className="a-g3-favgone__tile">
          <Heart size={28} strokeWidth={1.25} aria-hidden="true" />
        </div>
        <p className="a-g3-favgone__text">{t.t('a.g3.unavailable')}</p>
        <div className="a-g3-favgone__actions">
          <Tap className="a-g3-link" disabled={isFetching} onClick={() => void refetch()}>
            {t.t('action.retry')}
          </Tap>
          <Tap className="a-g3-link a-g3-link--muted" onClick={() => remove(id)}>
            {t.t('action.delete')}
          </Tap>
        </div>
      </div>
    )
  }

  return (
    <div className="a-g3-fav">
      <GridCard item={summary} index={index} />
      <Tap haptic="light" className="a-g3-fav__remove" aria-label={t.t('a.g3.favRemove')} onClick={() => remove(id)}>
        <X size={16} strokeWidth={1.75} aria-hidden="true" />
      </Tap>
    </div>
  )
})
