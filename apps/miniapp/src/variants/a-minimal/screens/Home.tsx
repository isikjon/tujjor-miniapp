import { ArrowUpRight, ChevronRight, Search as SearchIcon } from 'lucide-react'
import { useRef } from 'react'
import type { Banner, HomeData, HomeSection, ProductQuery, ProductSummary } from '../../../shared/types'
import { useT } from '../../../shared/i18n'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { Link } from '../../../shared/nav/Link'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { prefetchProduct, useHome, useProductsInfinite } from '../../../shared/query/hooks'
import { useCountdown } from '../../../shared/ui/Countdown'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { DemoBadge, ErrorState } from '../../../shared/ui/States'
import { searchHref } from '../lib'
import { useSnapDots } from '../ui/carousel'
import { SectionHead } from '../ui/controls'
import { HowSteps } from '../ui/InfoSheets'
import { PageTitle } from '../ui/PageTitle'
import { CardSkeleton, GridCard, ShelfCard } from '../ui/ProductCard'
import { ProductGrid } from '../ui/ProductGrid'
import '../styles/g1.css'

const RECS: ProductQuery = { sort: 'popular' }
const BUDGET_MAX = 150_000

export default function Home(_: ScreenProps) {
  const t = useT()
  const home = useHome()
  const data = home.data
  // The feed starts once the editorial part is laid out, so the grid measures its final offset.
  const recs = useProductsInfinite(RECS, { enabled: !!data })

  return (
    <Screen>
      <PageTitle title="TUJJOR" eyebrow={<DateLine />} aside={<DemoBadge />} subtitle={t.t('app.tagline')} className="a-head--home" />
      <div className="a-gutter">
        <Link to={paths.search()} className="a-searchentry">
          <SearchIcon size={18} strokeWidth={1.75} aria-hidden="true" />
          <span>{t.t('search.placeholder')}</span>
        </Link>
      </div>

      {data ? (
        <HomeBody data={data} />
      ) : home.isError ? (
        <ErrorState error={home.error} onRetry={() => void home.refetch()} className="a-state" />
      ) : (
        <HomeSkeleton />
      )}

      {data ? (
        <section className="a-section a-gutter">
          <SectionHead title={t.t('home.recommended')} />
          <ProductGrid key={home.dataUpdatedAt} q={recs} empty={null} />
        </section>
      ) : null}
    </Screen>
  )
}

function DateLine() {
  const t = useT()
  const now = new Date()
  return (
    <>
      {t.t(`a.weekday.${now.getDay()}`)}, {t.date(now)}
    </>
  )
}

function HomeBody({ data }: { data: HomeData }) {
  const t = useT()
  const by = (kind: HomeSection['kind']) => data.sections.find((s) => s.kind === kind && s.items.length)
  const flash = by('flash')
  const fresh = by('new')
  const poizon = by('poizon')
  const hits = by('hits')
  const budget = by('budget')

  return (
    <>
      {data.banners.length ? <Hero banners={data.banners} /> : null}

      <section className="a-section">
        <SectionHead className="a-gutter" title={t.t('home.categories')} link={{ label: t.t('action.showAll'), to: paths.catalog() }} />
        <div className="a-rail a-snap">
          {data.categories.map((c) => (
            <Link key={c.id} to={paths.category(c.id)} className="a-catcard">
              <Img image={c.image} alt="" sizes="132px" className="a-catcard__tile" />
              <span className="a-catcard__name">{t.l(c.name)}</span>
              <span className="a-catcard__count">{t.tp('catalog.products', c.productCount)}</span>
            </Link>
          ))}
        </div>
      </section>

      {flash ? (
        <section className="a-section">
          <SectionHead className="a-gutter" title={t.l(flash.title)} link={{ label: t.t('action.showAll'), to: searchHref({ sort: 'discount', discount: true }) }} />
          {flash.endsAt ? <FlashTimer endsAt={flash.endsAt} /> : null}
          <div className="a-rail a-snap">
            {flash.items.map((p) => (
              <ShelfCard key={p.id} item={p} />
            ))}
          </div>
        </section>
      ) : null}

      {fresh ? (
        <section className="a-section a-gutter">
          <SectionHead title={t.l(fresh.title)} link={{ label: t.t('action.showAll'), to: searchHref({ sort: 'new' }) }} />
          <div className="a-grid2">
            {fresh.items.slice(0, 4).map((p, i) => (
              <GridCard key={p.id} item={p} index={i} />
            ))}
          </div>
        </section>
      ) : null}

      {poizon ? <PoizonFeature section={poizon} /> : null}

      {hits || budget ? (
        <section className="a-section a-gutter">
          <div className="a-duo">
            {hits ? <CollectionTile title={t.l(hits.title)} items={hits.items} to={searchHref({ sort: 'popular' })} /> : null}
            {budget ? <CollectionTile title={t.l(budget.title)} items={budget.items} to={searchHref({ max: BUDGET_MAX })} /> : null}
          </div>
        </section>
      ) : null}

      <section className="a-section a-gutter">
        <SectionHead title={t.t('home.howItWorks')} />
        <HowSteps />
      </section>
    </>
  )
}

// ── hero ────────────────────────────────────────────────────────────────────

function bannerHref(b: Banner): string {
  switch (b.link.kind) {
    case 'category':
      return paths.category(b.link.categoryId)
    case 'product':
      return paths.product(b.link.productId)
    case 'search':
      return searchHref({ q: b.link.query })
  }
}

function Hero({ banners }: { banners: Banner[] }) {
  const t = useT()
  const track = useRef<HTMLDivElement>(null)
  const dots = useRef<HTMLDivElement>(null)
  useSnapDots(track, dots, banners.length)
  return (
    <section className="a-hero" aria-roledescription="carousel">
      <div ref={track} className="a-hero__track a-snap">
        {banners.map((b, i) => {
          const link = b.link
          return (
            <Link
              key={b.id}
              to={bannerHref(b)}
              className="a-banner"
              data-tone={b.tone}
              style={{ ['--tint' as string]: b.image.tint }}
              onIntent={link.kind === 'product' ? () => prefetchProduct(link.productId) : undefined}
            >
              <span className="a-banner__text">
                <span className="a-banner__title">{t.l(b.title)}</span>
                <span className="a-banner__sub">{t.l(b.subtitle)}</span>
                <span className="a-banner__cta">
                  {t.l(b.cta)}
                  <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
                </span>
              </span>
              <Img image={b.image} alt="" sizes="(max-width: 500px) 66vw, 300px" priority={i === 0} className="a-banner__img" />
            </Link>
          )
        })}
      </div>
      {banners.length > 1 ? (
        <div ref={dots} className="a-dots" aria-hidden="true">
          {banners.map((b, i) => (
            <span key={b.id} data-active={i === 0} />
          ))}
        </div>
      ) : null}
    </section>
  )
}

// ── sections ────────────────────────────────────────────────────────────────

/** Isolated so the 1-second tick re-renders only this line. */
function FlashTimer({ endsAt }: { endsAt: string }) {
  const t = useT()
  const { h, m, s, done } = useCountdown(endsAt)
  if (done) return null
  return (
    <p className="a-timer a-gutter">
      {t.t('home.flashEnds')}{' '}
      <span className="a-timer__clock">
        {h}:{m}:{s}
      </span>
    </p>
  )
}

function PoizonFeature({ section }: { section: HomeSection }) {
  const t = useT()
  return (
    <section className="a-section a-gutter">
      <div className="a-feature">
        <p className="a-feature__eyebrow">{t.t('product.authenticity')}</p>
        <h2 className="a-feature__title">{t.l(section.title)}</h2>
        <p className="a-feature__text">{t.t('source.poizon.desc')}</p>
        <Link to={searchHref({ source: 'poizon' })} className="a-feature__cta">
          {t.t('a.seeAll')}
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </Link>
        <div className="a-feature__row">
          {section.items.slice(0, 3).map((p) => (
            <Link key={p.id} to={paths.product(p.id)} onIntent={() => prefetchProduct(p.id)} className="a-feature__item" aria-label={t.l(p.title)}>
              <Img image={p.image} alt="" sizes="(max-width: 500px) 28vw, 130px" className="a-feature__img" />
              <span className="a-feature__price">{t.money(p.price)}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function CollectionTile({ title, items, to }: { title: string; items: ProductSummary[]; to: string }) {
  const pics = items.slice(0, 2)
  return (
    <Link to={to} className="a-collection">
      <span className="a-collection__title">{title}</span>
      <ArrowUpRight size={18} strokeWidth={1.5} className="a-collection__arrow" aria-hidden="true" />
      <span className="a-collection__pics">
        {pics.map((p) => (
          <Img key={p.id} image={p.image} alt="" sizes="96px" className="a-collection__img" />
        ))}
      </span>
    </Link>
  )
}

// ── loading ─────────────────────────────────────────────────────────────────

function HomeSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="a-hero">
        <div className="a-hero__track">
          <Skeleton className="a-banner a-banner--skel" />
          <Skeleton className="a-banner a-banner--skel" />
        </div>
        <div className="a-dots" />
      </div>
      <section className="a-section">
        <div className="a-sechead a-gutter">
          <Skeleton style={{ width: 132, height: 22 }} />
        </div>
        <div className="a-rail">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="a-catcard">
              <Skeleton className="a-catcard__tile" />
              <Skeleton style={{ width: '70%', height: 13, marginTop: 10 }} />
            </div>
          ))}
        </div>
      </section>
      <section className="a-section">
        <div className="a-sechead a-gutter">
          <Skeleton style={{ width: 180, height: 22 }} />
        </div>
        <div className="a-rail">
          <CardSkeleton className="a-shelfcard a-shelfcard--lg" />
          <CardSkeleton className="a-shelfcard a-shelfcard--lg" />
        </div>
      </section>
    </div>
  )
}
