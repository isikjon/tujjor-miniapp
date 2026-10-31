import { PackageSearch, Search } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import type { CategoryId, ProductQuery, SortKey } from '../../../shared/types'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { useT } from '../../../shared/i18n'
import { Link } from '../../../shared/nav/Link'
import { useNav } from '../../../shared/nav/context'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { useCategories, useProductsInfinite } from '../../../shared/query/hooks'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { EmptyState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { activeCount, EMPTY_FILTERS, isSort, searchPath, toQuery, type FilterState } from '../lib/util'
import { Kicker, TopBar } from '../ui/bits'
import { FiltersSheet } from '../ui/g1/FiltersSheet'
import { ProductFeed } from '../ui/g1/ProductFeed'
import { SortRail } from '../ui/g1/SortRail'
import '../styles/g1.css'

export default function Category({ params, query }: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const id = params.categoryId as CategoryId
  const cats = useCategories()
  const cat = cats.data?.find((c) => c.id === id)
  const known = !cats.data || !!cat

  const [sort, setSort] = useState<SortKey>(isSort(query.sort) ? query.sort : 'popular')
  const [filters, setFilters] = useState<FilterState>(() => ({ ...EMPTY_FILTERS, categoryId: id }))
  const [sheet, setSheet] = useState(false)

  const base = useMemo<ProductQuery>(() => ({ categoryId: id, sort }), [id, sort])
  const q = useMemo<ProductQuery>(() => ({ ...toQuery(filters), categoryId: id, sort }), [filters, id, sort])
  const list = useProductsInfinite(q, { enabled: known })
  const nFilters = activeCount(filters)
  const resetFilters = useCallback(() => setFilters({ ...EMPTY_FILTERS, categoryId: id }), [id])

  const title = cat ? t.l(cat.name) : t.t('catalog.title')

  return (
    <Screen
      header={
        <div className="c-headbg">
          <TopBar
            title={title}
            pinned
            right={
              <Link to={searchPath({ category: id, sort })} className="c-ibtn" aria-label={t.t('c.g1.searchIn', { name: title })}>
                <Search size={20} strokeWidth={2.3} />
              </Link>
            }
          />
          {known ? <SortRail sort={sort} onSort={setSort} filters={nFilters} onFilters={() => setSheet(true)} /> : null}
        </div>
      }
    >
      {!known ? (
        <EmptyState
          className="g1-pad"
          icon={<PackageSearch size={36} strokeWidth={1.8} />}
          title={t.t('c.g1.noCategory')}
          action={
            <Tap className="c-cta" onClick={() => nav.push(paths.catalog())}>
              {t.t('action.toCatalog')}
            </Tap>
          }
        />
      ) : (
        <>
          <div className="g1-counter">
            {list.isLoading && !list.items.length ? (
              <Skeleton className="h-[14px] w-[120px]" />
            ) : (
              <Kicker>{t.tp('catalog.products', list.total)}</Kicker>
            )}
            {nFilters > 0 ? (
              <Tap className="g1-linkbtn" onClick={resetFilters}>
                {t.t('action.reset')}
              </Tap>
            ) : null}
          </div>
          <ProductFeed
            items={list.items}
            isLoading={list.isLoading}
            error={list.error}
            onRetry={() => void list.refetch()}
            hasMore={!!list.hasNextPage}
            loadingMore={list.isFetchingNextPage}
            onEndReached={() => void list.fetchNextPage()}
            refreshing={list.isPlaceholderData}
            empty={
              <EmptyState
                className="g1-pad"
                icon={<PackageSearch size={36} strokeWidth={1.8} />}
                title={t.t('search.nothing')}
                text={t.t('search.nothingHint')}
                action={
                  nFilters > 0 ? (
                    <Tap className="c-cta" onClick={resetFilters}>
                      {t.t('action.reset')}
                    </Tap>
                  ) : (
                    <Tap className="c-btn2" onClick={() => nav.push(paths.catalog())}>
                      {t.t('action.toCatalog')}
                    </Tap>
                  )
                }
              />
            }
          />
        </>
      )}
      <FiltersSheet open={sheet} onClose={() => setSheet(false)} value={filters} onApply={(f) => setFilters({ ...f, categoryId: id })} base={base} />
    </Screen>
  )
}
