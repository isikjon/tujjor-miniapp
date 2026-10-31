import { memo, type ReactNode } from 'react'
import type { ProductSummary } from '../../../../shared/types'
import { useT } from '../../../../shared/i18n'
import { VirtualGrid } from '../../../../shared/ui/VirtualGrid'
import { ErrorState } from '../../../../shared/ui/States'
import { keyOfProduct } from '../../lib/util'
import { ProductCard, ProductCardSkeleton } from '../ProductCard'
import { Spinner } from '../bits'
import '../../styles/g1.css'

const Cell = memo(function Cell({ item }: { item: ProductSummary; index: number }) {
  return <ProductCard item={item} />
})

/** Card ≈ square tile (~165 px on a phone) + fixed text block. Rows are measured anyway. */
const EST = 258

export function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="g1-grid">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

interface FeedProps {
  items: ProductSummary[]
  isLoading: boolean
  error: unknown
  onRetry: () => void
  hasMore: boolean
  loadingMore: boolean
  onEndReached: () => void
  /** Rendered when the list is loaded and empty. */
  empty: ReactNode
  /** Dims the grid while a new filter result is on its way (previous data stays visible). */
  refreshing?: boolean
}

/** Virtualised 2-column product feed with skeleton / error / empty / loading-more / end states. */
export function ProductFeed({ items, isLoading, error, onRetry, hasMore, loadingMore, onEndReached, empty, refreshing }: FeedProps) {
  const t = useT()
  if (isLoading && !items.length) return <FeedSkeleton count={6} />
  if (error && !items.length) return <ErrorState error={error} onRetry={onRetry} className="g1-pad" />
  if (!items.length) return <>{empty}</>
  return (
    <div className="g1-feed" data-busy={refreshing || undefined}>
      <VirtualGrid
        items={items}
        Item={Cell}
        getKey={keyOfProduct}
        columns={2}
        gap={12}
        estimateHeight={EST}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onEndReached={onEndReached}
        footer={
          loadingMore ? (
            <div className="g1-end" aria-live="polite">
              <Spinner />
              <span>{t.t('state.loading')}</span>
            </div>
          ) : error ? (
            <ErrorState error={error} onRetry={onRetry} compact />
          ) : !hasMore ? (
            <div className="g1-end">
              <i aria-hidden="true" />
              <span>{t.t('state.end')}</span>
              <i aria-hidden="true" />
            </div>
          ) : (
            <div className="g1-end" aria-hidden="true">
              <Spinner />
            </div>
          )
        }
      />
    </div>
  )
}
