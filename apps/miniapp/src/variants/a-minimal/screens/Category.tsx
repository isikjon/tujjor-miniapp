import { useMemo, useState } from 'react'
import type { ProductQuery, SortKey } from '../../../shared/types'
import { useT } from '../../../shared/i18n'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { useNav } from '../../../shared/nav/context'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { useCategories, useProductsInfinite } from '../../../shared/query/hooks'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { EmptyState } from '../../../shared/ui/States'
import { countActive, filtersFromParams, isCategory, isSort, NO_FILTERS, toQuery, type FilterState } from '../lib'
import { Btn } from '../ui/controls'
import { FiltersSheet, filterTokens, GridToolbar, SortSheet } from '../ui/FilterSheets'
import { PageTitle } from '../ui/PageTitle'
import { ProductGrid } from '../ui/ProductGrid'
import '../styles/g1.css'

export default function Category({ params, query }: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const categoryId = isCategory(params.categoryId) ? params.categoryId : null
  const cats = useCategories()
  const category = cats.data?.find((c) => c.id === categoryId)

  const [sort, setSort] = useState<SortKey>(isSort(query.sort) ? query.sort : 'popular')
  const [filters, setFilters] = useState<FilterState>(() => filtersFromParams(query))
  const [sheet, setSheet] = useState<'sort' | 'filters' | null>(null)

  const base = useMemo<ProductQuery>(() => ({ categoryId: categoryId ?? undefined }), [categoryId])
  const productQuery = useMemo<ProductQuery>(() => ({ ...base, sort, ...toQuery(filters) }), [base, sort, filters])
  const products = useProductsInfinite(productQuery, { enabled: !!categoryId })
  const active = countActive(filters)

  if (!categoryId) {
    return (
      <Screen>
        <PageTitle title={t.t('catalog.title')} />
        <EmptyState
          className="a-state"
          title={t.t('a.g1.categoryMissing')}
          text={t.t('a.g1.categoryMissingText')}
          action={
            <Btn size="md" onClick={() => nav.switchTab('catalog')}>
              {t.t('action.toCatalog')}
            </Btn>
          }
        />
      </Screen>
    )
  }

  const title = category ? t.l(category.name) : ''
  const total = products.isPending ? null : products.total

  return (
    <Screen>
      <PageTitle
        title={title || t.t('catalog.title')}
        eyebrow={t.t('catalog.title')}
        seamless
        subtitle={total != null ? <span className="a-g1-count">{t.tp('catalog.products', total)}</span> : <Skeleton className="a-g1-countskel" />}
      />

      <GridToolbar
        sort={sort}
        onSort={() => setSheet('sort')}
        filtersCount={active}
        onFilters={() => setSheet('filters')}
        tokens={filterTokens(filters, setFilters, t)}
      />

      <div className="a-gutter a-g1-results">
        <ProductGrid
          key={categoryId}
          q={products}
          skeletonRows={3}
          empty={
            <EmptyState
              className="a-state"
              title={t.t('search.nothing')}
              text={active ? t.t('search.nothingHint') : t.t('a.g1.categoryEmpty')}
              action={
                active ? (
                  <Btn size="md" onClick={() => setFilters(NO_FILTERS)}>
                    {t.t('a.g1.resetFilters')}
                  </Btn>
                ) : (
                  <Btn size="md" kind="outline" onClick={() => nav.push(paths.search())}>
                    {t.t('search.placeholderShort')}
                  </Btn>
                )
              }
            />
          }
        />
      </div>

      <SortSheet open={sheet === 'sort'} onClose={() => setSheet(null)} value={sort} onChange={setSort} />
      <FiltersSheet open={sheet === 'filters'} onClose={() => setSheet(null)} value={filters} onApply={setFilters} base={base} />
    </Screen>
  )
}
