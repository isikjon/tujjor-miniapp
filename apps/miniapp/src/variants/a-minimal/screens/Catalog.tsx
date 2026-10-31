import { ChevronRight, LayoutGrid } from 'lucide-react'
import type { Category, SourceMarket } from '../../../shared/types'
import { useT } from '../../../shared/i18n'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { Link } from '../../../shared/nav/Link'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { useCategories, useProductsCount } from '../../../shared/query/hooks'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { ErrorState } from '../../../shared/ui/States'
import { searchHref, SOURCES } from '../lib'
import { SectionHead } from '../ui/controls'
import { PageTitle } from '../ui/PageTitle'
import '../styles/g1.css'

export default function Catalog(_: ScreenProps) {
  const t = useT()
  const cats = useCategories()
  const total = cats.data?.reduce((n, c) => n + c.productCount, 0)

  return (
    <Screen>
      <PageTitle title={t.t('catalog.title')} />

      <nav className="a-gutter" aria-label={t.t('home.categories')}>
        <Link to={searchHref({ sort: 'popular' })} className="a-catrow">
          <span className="a-catrow__tile a-catrow__tile--icon" aria-hidden="true">
            <LayoutGrid size={24} strokeWidth={1.5} />
          </span>
          <span className="a-catrow__text">
            <span className="a-catrow__name">{t.t('catalog.all')}</span>
            {total != null ? <span className="a-catrow__count">{t.tp('catalog.products', total)}</span> : <Skeleton style={{ width: 72, height: 12, marginTop: 6 }} />}
          </span>
          <ChevronRight size={18} strokeWidth={1.5} className="a-chev" aria-hidden="true" />
        </Link>

        {cats.data ? (
          cats.data.map((c) => <CategoryRow key={c.id} category={c} />)
        ) : cats.isError ? (
          <ErrorState compact error={cats.error} onRetry={() => void cats.refetch()} className="a-state-compact" />
        ) : (
          Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="a-catrow" aria-hidden="true">
              <Skeleton className="a-catrow__tile" />
              <span className="a-catrow__text">
                <Skeleton style={{ width: `${48 + ((i * 13) % 30)}%`, height: 15 }} />
                <Skeleton style={{ width: 70, height: 12, marginTop: 8 }} />
              </span>
            </div>
          ))
        )}
      </nav>

      <section className="a-section a-gutter">
        <SectionHead title={t.t('catalog.sources')} />
        <div className="a-markets">
          {SOURCES.map((s) => (
            <MarketTile key={s} source={s} />
          ))}
        </div>
      </section>
    </Screen>
  )
}

function CategoryRow({ category: c }: { category: Category }) {
  const t = useT()
  return (
    <Link to={paths.category(c.id)} className="a-catrow">
      <Img image={c.image} alt="" sizes="64px" className="a-catrow__tile" />
      <span className="a-catrow__text">
        <span className="a-catrow__name">{t.l(c.name)}</span>
        <span className="a-catrow__count">{t.tp('catalog.products', c.productCount)}</span>
      </span>
      <ChevronRight size={18} strokeWidth={1.5} className="a-chev" aria-hidden="true" />
    </Link>
  )
}

function MarketTile({ source }: { source: SourceMarket }) {
  const t = useT()
  const count = useProductsCount({ sources: [source] })
  return (
    <Link to={searchHref({ source })} className="a-market" data-source={source}>
      <span className="a-market__mark">{t.t(`source.${source}`)}</span>
      <span className="a-market__desc">{t.t(`source.${source}.desc`)}</span>
      <span className="a-market__foot">
        {count.data != null ? <span>{t.tp('catalog.products', count.data)}</span> : <Skeleton style={{ width: 64, height: 12 }} />}
        <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" />
      </span>
    </Link>
  )
}
