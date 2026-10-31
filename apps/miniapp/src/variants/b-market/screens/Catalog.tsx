import { ChevronRight, LayoutGrid } from 'lucide-react'
import { memo } from 'react'
import { useT } from '../../../shared/i18n'
import { Link } from '../../../shared/nav/Link'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { useCategories } from '../../../shared/query/hooks'
import type { Category } from '../../../shared/types'
import { CategoryIcon } from '../../../shared/ui/CategoryIcon'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { ErrorState } from '../../../shared/ui/States'
import { searchPath, SOURCES } from '../lib'
import { SearchBar } from '../ui'
import { VioletHead } from '../ui/g1/parts'
import '../styles/g1.css'

const CategoryCard = memo(function CategoryCard({ c }: { c: Category }) {
  const t = useT()
  return (
    <Link to={paths.category(c.id)} className="b1-catcard">
      <span className="b1-catcard__name">{t.l(c.name)}</span>
      <span className="b1-catcard__count">{t.tp('catalog.products', c.productCount)}</span>
      <span className="b1-catcard__icon">
        <CategoryIcon id={c.id} size={16} strokeWidth={2.3} />
      </span>
      <Img className="b1-catcard__img" image={c.image} alt="" sizes="(max-width: 480px) 27vw, 130px" />
    </Link>
  )
})

export default function Catalog(_: ScreenProps) {
  const t = useT()
  const cats = useCategories()
  const total = cats.data?.reduce((n, c) => n + c.productCount, 0) ?? 0

  const header = (
    <VioletHead title={<h1 className="b1-head__title">{t.t('catalog.title')}</h1>}>
      <SearchBar tone="header" />
    </VioletHead>
  )

  return (
    <Screen header={header}>
      <div className="pt-3">
        <Link to={searchPath({ sort: 'popular' })} className="b1-allrow">
          <span className="b1-allrow__icon">
            <LayoutGrid size={20} strokeWidth={2.3} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="b1-allrow__title block">{t.t('catalog.all')}</span>
            <span className="b1-allrow__sub block">{cats.data ? t.tp('catalog.products', total) : ' '}</span>
          </span>
          <ChevronRight size={20} strokeWidth={2.4} aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-4 mb-2">
        <h2 className="b1-h2">{t.t('home.categories')}</h2>
        {cats.data ? <p className="b1-sub">{t.tp('b.g1.catsCount', cats.data.length)}</p> : <p className="b1-sub">&nbsp;</p>}
      </div>
      {cats.isPending ? (
        <div className="b1-catgrid" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="b1-catcard" style={{ borderRadius: 14 }} />
          ))}
        </div>
      ) : cats.isError && !cats.data ? (
        <ErrorState error={cats.error} onRetry={() => void cats.refetch()} />
      ) : (
        <div className="b1-catgrid">
          {cats.data?.map((c) => (
            <CategoryCard key={c.id} c={c} />
          ))}
        </div>
      )}

      <div className="mt-5 mb-2">
        <h2 className="b1-h2">{t.t('catalog.sources')}</h2>
        <p className="b1-sub">{t.t('b.g1.marketsSub')}</p>
      </div>
      <div className="px-3">
        {SOURCES.map((s) => (
          <Link key={s} to={searchPath({ source: s })} className="b1-mrow">
            <span className="b1-mrow__logo" data-src={s}>
              {s === '1688' ? '1688' : s === 'alibaba' ? 'Ali' : 'PZ'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="b1-mrow__name block">{t.t(`source.${s}`)}</span>
              <span className="b1-mrow__desc block">{t.t(`source.${s}.desc`)}</span>
            </span>
            <ChevronRight size={20} strokeWidth={2.4} className="flex-none text-ink-3" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </Screen>
  )
}
