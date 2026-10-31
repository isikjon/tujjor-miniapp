import { LayoutGrid } from 'lucide-react'
import { useCallback, type ReactNode } from 'react'
import { useT } from '../../../../shared/i18n'
import { useNav } from '../../../../shared/nav/context'
import type { useProductsInfinite } from '../../../../shared/query/hooks'
import type { ProductSummary } from '../../../../shared/types'
import { ErrorState } from '../../../../shared/ui/States'
import { VirtualGrid } from '../../../../shared/ui/VirtualGrid'
import { Button, GridSkeleton } from '../kit'
import { ProductGridItem } from '../ProductCard'

/** Violet branded header used by the g1 screens (merges with the violet Telegram header in light mode). */
export function VioletHead({ children, title, right }: { children?: ReactNode; title?: ReactNode; right?: ReactNode }) {
  return (
    <div className="b1-head">
      {title || right ? (
        <div className="b1-head__row">
          {title}
          {right ? <div className="ml-auto flex flex-none items-center gap-2">{right}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}

const getKey = (p: ProductSummary) => p.id

type ProductList = ReturnType<typeof useProductsInfinite>

/**
 * Product feed: exact-size skeleton → virtualised 2-col grid (+ loading-more spinner, end state) /
 * error with retry / `empty`. Keeps the previous result dimmed while filters change.
 */
export function FeedGrid({ list, empty, showEnd = true }: { list: ProductList; empty?: ReactNode; showEnd?: boolean }) {
  const t = useT()
  const nav = useNav()
  const { fetchNextPage } = list
  const onEnd = useCallback(() => void fetchNextPage(), [fetchNextPage])
  if (list.isPending) return <GridSkeleton count={6} />
  if (list.isError && !list.items.length) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  if (!list.items.length) return <>{empty}</>
  const footer = list.isFetchingNextPage ? (
    <div className="b1-more" aria-label={t.t('state.loading')}>
      <span className="b1-spin" />
    </div>
  ) : list.isFetchNextPageError ? (
    <div className="px-3 pt-2">
      <ErrorState compact error={list.error} onRetry={onEnd} />
    </div>
  ) : !list.hasNextPage && showEnd ? (
    <div className="b1-end">
      <p className="b1-end__title">{t.t('b.endTitle')}</p>
      <p className="b1-end__text">{t.t('b.endText')}</p>
      <Button kind="secondary" size="md" icon={<LayoutGrid size={17} strokeWidth={2.3} aria-hidden="true" />} onClick={() => nav.switchTab('catalog')}>
        {t.t('action.toCatalog')}
      </Button>
    </div>
  ) : null
  return (
    <div style={{ opacity: list.isPlaceholderData ? 0.55 : 1, transition: 'opacity 160ms' }}>
      <VirtualGrid
        className="px-3"
        items={list.items}
        Item={ProductGridItem}
        getKey={getKey}
        columns={2}
        gap={8}
        estimateHeight={300}
        hasMore={list.hasNextPage}
        loadingMore={list.isFetchingNextPage}
        onEndReached={onEnd}
        footer={footer}
      />
    </div>
  )
}
