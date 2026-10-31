import { LayoutGrid, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useT } from '../../../shared/i18n'
import { useNav } from '../../../shared/nav/context'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { Screen } from '../../../shared/nav/Screen'
import { useCategories, useProductsInfinite } from '../../../shared/query/hooks'
import type { CategoryId, ProductQuery } from '../../../shared/types'
import { CategoryIcon } from '../../../shared/ui/CategoryIcon'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { activeFilterCount, EMPTY_FILTERS, filtersFromParams, toProductQuery } from '../lib'
import { Button, EmptyView, FilterBar, SearchBar } from '../ui'
import { FeedGrid, VioletHead } from '../ui/g1/parts'
import '../styles/g1.css'

export default function Category({ params, query }: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const categoryId = params.categoryId as CategoryId
  const cats = useCategories()
  const cat = cats.data?.find((c) => c.id === categoryId)
  const unknown = !!cats.data && !cat

  const [f, setF] = useState(() => filtersFromParams(query))
  const base = useMemo<ProductQuery>(() => ({ categoryId }), [categoryId])
  const list = useProductsInfinite(toProductQuery(f, base), { enabled: !unknown })
  const name = cat ? t.l(cat.name) : ''

  const header = (
    <VioletHead>
      <SearchBar tone="header" category={categoryId} placeholder={name ? t.t('b.searchIn', { name }) : undefined} />
    </VioletHead>
  )

  if (unknown) {
    return (
      <Screen header={header}>
        <EmptyView
          icon={<SearchX size={30} strokeWidth={2} aria-hidden="true" />}
          title={t.t('b.g1.catNotFound')}
          text={t.t('b.g1.catNotFoundText')}
          action={
            <Button icon={<LayoutGrid size={17} strokeWidth={2.3} aria-hidden="true" />} onClick={() => nav.switchTab('catalog')}>
              {t.t('action.toCatalog')}
            </Button>
          }
        />
      </Screen>
    )
  }

  const filtered = activeFilterCount(f) > 0

  return (
    <Screen header={header}>
      <div className="b1-ctitle">
        <span className="b1-ctitle__icon">
          <CategoryIcon id={categoryId} size={20} strokeWidth={2.3} />
        </span>
        <div className="min-w-0">
          {cat ? <h1 className="b1-ctitle__name">{name}</h1> : <Skeleton style={{ height: 24, width: 160 }} />}
        </div>
      </div>
      <FilterBar value={f} onChange={setF} base={base} total={list.isPending ? undefined : list.total} />
      <FeedGrid
        list={list}
        empty={
          <EmptyView
            icon={<SearchX size={30} strokeWidth={2} aria-hidden="true" />}
            title={t.t('search.nothing')}
            text={t.t('search.nothingHint')}
            action={
              filtered || f.sort !== 'popular' ? (
                <Button kind="secondary" onClick={() => setF(EMPTY_FILTERS)}>
                  {t.t('b.resetFilters')}
                </Button>
              ) : null
            }
          />
        }
      />
    </Screen>
  )
}
