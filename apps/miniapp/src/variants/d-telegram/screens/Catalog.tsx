import { LayoutGrid } from 'lucide-react'
import { useT } from '../../../shared/i18n'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { useCategories, useProductsCount } from '../../../shared/query/hooks'
import type { SourceMarket } from '../../../shared/types'
import { CategoryIcon } from '../../../shared/ui/CategoryIcon'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { ErrorState } from '../../../shared/ui/States'
import { Block, Cell, Group } from '../ui/Cell'
import { PageTitle, SearchEntry, Squircle } from '../ui/controls'
import { CATEGORY_COLOR, SOURCES, SOURCE_COLOR, searchPath } from '../ui/lib'
import { SOURCE_ICON } from '../ui/g1/Results'
import '../styles/g1.css'

export default function Catalog(_: ScreenProps) {
  const t = useT()
  const cats = useCategories()
  const all = useProductsCount({})

  return (
    <Screen>
      <PageTitle sub={t.t('d.catalog.subtitle')}>{t.t('catalog.title')}</PageTitle>
      <div className="g1-search-row">
        <SearchEntry to={paths.search()} placeholder={t.t('search.placeholderShort')} />
      </div>

      <Group header={t.t('search.categories')}>
        <Cell
          to={searchPath({ sort: 'popular' })}
          icon={
            <Squircle color="gray">
              <LayoutGrid size={17} strokeWidth={2.3} />
            </Squircle>
          }
          title={t.t('catalog.all')}
          value={all.data != null ? t.compact(all.data) : undefined}
          chevron
        />
        {cats.data ? (
          cats.data.map((c) => (
            <Cell
              key={c.id}
              to={paths.category(c.id)}
              icon={
                <Squircle color={CATEGORY_COLOR[c.id]}>
                  <CategoryIcon id={c.id} size={17} strokeWidth={2.3} />
                </Squircle>
              }
              title={t.l(c.name)}
              value={t.compact(c.productCount)}
              chevron
            />
          ))
        ) : cats.isError ? (
          <Block className="d-pad">
            <ErrorState compact error={cats.error} onRetry={() => void cats.refetch()} />
          </Block>
        ) : (
          Array.from({ length: 8 }, (_, i) => (
            <Block key={i} sep={60} className="g1-sk-cell">
              <Skeleton style={{ width: 29, height: 29, borderRadius: 7 }} />
              <Skeleton style={{ width: `${40 + ((i * 17) % 30)}%`, height: 14 }} />
            </Block>
          ))
        )}
      </Group>

      <Group header={t.t('catalog.sources')} footer={t.t('d.g1.marketsFooter')}>
        {SOURCES.map((s) => (
          <SourceCell key={s} s={s} />
        ))}
      </Group>
    </Screen>
  )
}

function SourceCell({ s }: { s: SourceMarket }) {
  const t = useT()
  const Icon = SOURCE_ICON[s]
  return (
    <Cell
      to={searchPath({ source: s })}
      icon={
        <Squircle color={SOURCE_COLOR[s]}>
          <Icon size={17} strokeWidth={2.3} />
        </Squircle>
      }
      title={t.t(`source.${s}`)}
      subtitle={t.t(`source.${s}.desc`)}
      chevron
    />
  )
}
