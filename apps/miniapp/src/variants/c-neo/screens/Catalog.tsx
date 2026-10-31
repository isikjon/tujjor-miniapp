import { ArrowRight, ArrowUpRight, Search } from 'lucide-react'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { useT } from '../../../shared/i18n'
import { Link } from '../../../shared/nav/Link'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { useCategories } from '../../../shared/query/hooks'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { ErrorState } from '../../../shared/ui/States'
import { glowStyle, searchPath, SOURCES } from '../lib/util'
import { Kicker, SectionHead, SOURCE_NAME, TopBar } from '../ui/bits'
import '../styles/g1.css'

/** Display size by the longest word, so uppercase names never break mid-word. */
const nameSize = (name: string) => {
  const w = Math.max(...name.split(/\s+/).map((x) => x.length))
  return w > 11 ? 18 : w > 9 ? 21 : w > 7 ? 24 : 27
}

const GLYPH = { '1688': '1688', alibaba: 'A', poizon: 'P' } as const

export default function Catalog(_: ScreenProps) {
  const t = useT()
  const cats = useCategories()
  const list = cats.data ?? []

  return (
    <Screen
      header={
        <TopBar
          title={t.t('catalog.title')}
          right={
            <Link to={searchPath()} className="c-ibtn" aria-label={t.t('search.placeholderShort')}>
              <Search size={20} strokeWidth={2.3} />
            </Link>
          }
        />
      }
    >
      <div className="g1-titlebox">
        <Kicker>{list.length ? t.tp('c.catalog.cats', list.length) : t.t('state.loading')}</Kicker>
        <h1 className="c-h1 mt-2">{t.t('catalog.title')}</h1>
      </div>

      <Link to={searchPath({ sort: 'popular' })} className="g1-allrow">
        <span className="min-w-0 flex-1">
          <span className="g1-allrow-title">{t.t('catalog.all')}</span>
          <span className="g1-allrow-hint">{t.t('c.catalog.allHint')}</span>
        </span>
        <span className="g1-allrow-go">
          <ArrowRight size={20} strokeWidth={2.4} />
        </span>
      </Link>

      {cats.isLoading ? (
        <div aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="c-catrow">
              <Skeleton className="h-[26px] w-[52%]" />
              <Skeleton className="mt-3 h-[12px] w-[26%]" />
            </div>
          ))}
        </div>
      ) : cats.error && !list.length ? (
        <ErrorState error={cats.error} onRetry={() => void cats.refetch()} className="g1-pad" />
      ) : (
        <div className="g1-catlist">
          {list.map((c, i) => (
            <Link key={c.id} to={paths.category(c.id)} className="c-catrow" style={glowStyle(c.image.tint)}>
              <span className="c-catrow-glow" aria-hidden="true" />
              <Img className="c-catrow-img" image={c.image} sizes="136px" alt="" priority={i < 2} />
              <span className="g1-catrow-n c-mono">
                {String(i + 1).padStart(2, '0')} · {t.tp('catalog.products', c.productCount)}
              </span>
              <span className="c-catrow-name g1-catrow-name" style={{ fontSize: nameSize(t.l(c.name)) }}>
                {t.l(c.name)}
              </span>
            </Link>
          ))}
        </div>
      )}

      <section className="g1-block">
        <SectionHead kicker={t.t('c.catalog.marketsKicker')} title={t.t('catalog.sources')} />
        <div className="g1-srcgrid">
          {SOURCES.map((s) => (
            <Link key={s} to={searchPath({ source: s })} className="c-srctile" data-src={s}>
              <span className="flex items-start justify-between gap-2">
                <span className="c-srctile-name">{SOURCE_NAME[s]}</span>
                <ArrowUpRight size={22} strokeWidth={2.4} className="flex-none" />
              </span>
              <span className="g1-src-desc">{t.t(`source.${s}.desc`)}</span>
              <span className="c-srctile-glyph" aria-hidden="true">
                {GLYPH[s]}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </Screen>
  )
}
