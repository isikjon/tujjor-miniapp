import type { ReactNode } from 'react'
import type { ProductSummary } from '../../../shared/types'
import { useT } from '../../../shared/i18n'
import type { useProductsInfinite } from '../../../shared/query/hooks'
import { ErrorState } from '../../../shared/ui/States'
import { VirtualGrid } from '../../../shared/ui/VirtualGrid'
import { Spinner } from './controls'
import { GridCard, GridSkeleton } from './ProductCard'

type ProductsQuery = ReturnType<typeof useProductsInfinite>

const getKey = (p: ProductSummary) => p.id

/**
 * Product grid with every state: exact-size skeleton → virtualised grid (infinite) → end marker,
 * empty and error (+ retry). While new filters load, the previous result stays visible but dimmed.
 */
export function ProductGrid({ q, empty, skeletonRows = 2 }: { q: ProductsQuery; empty: ReactNode; skeletonRows?: number }) {
  const t = useT()
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = q
  const onEnd = () => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
  }

  if (q.isPending) return <GridSkeleton rows={skeletonRows} />
  if (q.isError && !q.items.length) return <ErrorState error={q.error} onRetry={() => void q.refetch()} className="a-state" />
  if (!q.items.length) return <>{empty}</>

  const footer = q.isFetchNextPageError ? (
    <ErrorState compact error={q.error} onRetry={() => void fetchNextPage()} className="a-gridfoot__err" />
  ) : isFetchingNextPage || hasNextPage ? (
    <div className="a-gridfoot" aria-label={t.t('state.loading')}>
      <Spinner />
    </div>
  ) : (
    <p className="a-gridfoot a-gridfoot--end">{t.t('state.end')}</p>
  )

  return (
    <div className="a-grid" data-stale={q.isPlaceholderData || undefined}>
      <VirtualGrid
        items={q.items}
        Item={GridCard}
        getKey={getKey}
        columns={2}
        gap={12}
        estimateHeight={300}
        overscan={4}
        hasMore={hasNextPage}
        loadingMore={isFetchingNextPage}
        onEndReached={onEnd}
        footer={footer}
      />
    </div>
  )
}
