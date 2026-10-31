import { FolderSearch } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useT } from '../../../shared/i18n'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { Link } from '../../../shared/nav/Link'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { useCategories } from '../../../shared/query/hooks'
import type { CategoryId, ProductQuery, SortKey } from '../../../shared/types'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { EmptyView, PageTitle } from '../ui/controls'
import { filterCount, isSort } from '../ui/lib'
import { ProductResults, Toolbar, type FilterValue } from '../ui/g1/Results'
import '../styles/g1.css'

export default function Category({ params, query }: ScreenProps) {
  const t = useT()
  const id = params.categoryId as CategoryId
  const cats = useCategories()
  const cat = cats.data?.find((c) => c.id === id)
  const [sort, setSort] = useState<SortKey>(isSort(query.sort) ? query.sort : 'popular')
  const [filters, setFilters] = useState<FilterValue>({})
  const base = useMemo<ProductQuery>(() => ({ categoryId: id, sort }), [id, sort])
  const productQuery = useMemo<ProductQuery>(() => ({ ...base, ...filters }), [base, filters])
  const active = filterCount(filters) > 0

  if (cats.isSuccess && !cat) {
    return (
      <Screen>
        <EmptyView
          icon={<FolderSearch size={44} strokeWidth={1.8} />}
          title={t.t('search.nothing')}
          action={
            <Link to={paths.catalog()} className="d-btn d-btn-tinted">
              {t.t('action.toCatalog')}
            </Link>
          }
        />
      </Screen>
    )
  }

  return (
    <Screen>
      <PageTitle sub={cat ? t.tp('catalog.products', cat.productCount) : <Skeleton style={{ display: 'inline-block', width: 96, height: 13 }} />}>
        {cat ? t.l(cat.name) : <Skeleton style={{ display: 'inline-block', width: 180, height: 26 }} />}
      </PageTitle>
      <Toolbar sort={sort} onSort={setSort} filters={filters} onFilters={setFilters} base={base} />
      <ProductResults query={productQuery} showCount={active} onReset={active ? () => setFilters({}) : undefined} />
    </Screen>
  )
}
