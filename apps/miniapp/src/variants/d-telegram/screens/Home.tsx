import { ChevronRight, PackageCheck, Search as SearchIcon, Timer, Truck, Wallet } from 'lucide-react'
import { memo, useCallback } from 'react'
import { useT } from '../../../shared/i18n'
import { Link } from '../../../shared/nav/Link'
import { paths } from '../../../shared/nav/routes'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { useHome, useProductsInfinite } from '../../../shared/query/hooks'
import type { Banner, HomeSection, HomeSectionKind, ProductQuery } from '../../../shared/types'
import { CategoryIcon } from '../../../shared/ui/CategoryIcon'
import { useCountdown } from '../../../shared/ui/Countdown'
import { Img } from '../../../shared/ui/Img'
import { Screen } from '../../../shared/nav/Screen'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { DemoBadge, ErrorState } from '../../../shared/ui/States'
import { VirtualGrid } from '../../../shared/ui/VirtualGrid'
import { Cell, Group } from '../ui/Cell'
import { SearchEntry, Spinner, Squircle, type SquircleColor } from '../ui/controls'
import { CATEGORY_COLOR, searchPath } from '../ui/lib'
import { CardSkeleton, GridItem, GridSkeleton, ProductCard, productKey } from '../ui/g1/ProductCard'
import '../styles/g1.css'

const RECO: ProductQuery = { sort: 'popular' }

/** "All" target per home section (search reads sort / source / max). */
const SECTION_ALL: Record<HomeSectionKind, string> = {
  flash: searchPath({ sort: 'discount' }),
  hits: searchPath({ sort: 'popular' }),
  new: searchPath({ sort: 'new' }),
  poizon: searchPath({ source: 'poizon' }),
  budget: searchPath({ sort: 'price_asc', max: 150_000 }),
}

const HOW: Array<{ icon: typeof Wallet; color: SquircleColor }> = [
  { icon: SearchIcon, color: 'blue' },
  { icon: Wallet, color: 'green' },
  { icon: PackageCheck, color: 'orange' },
  { icon: Truck, color: 'purple' },
]

const bannerPath = (b: Banner) =>
  b.link.kind === 'category' ? paths.category(b.link.categoryId) : b.link.kind === 'product' ? paths.product(b.link.productId) : searchPath({ q: b.link.query })

export default function Home(_: ScreenProps) {
  const t = useT()
  const home = useHome()
  const data = home.data

  return (
    <Screen
      header={
        <div className="d-header g1-head">
          <SearchEntry to={paths.search()} placeholder={t.t('search.placeholderShort')} />
          <DemoBadge className="g1-demo" />
        </div>
      }
    >
      {data ? (
        <>
          <div className="d-banners g1-banners">
            {data.banners.map((b, i) => (
              <Link key={b.id} to={bannerPath(b)} className="d-banner" data-tone={b.tone}>
                <span className="d-banner-text">
                  <span className="d-banner-title">{t.l(b.title)}</span>
                  <span className="d-banner-sub">{t.l(b.subtitle)}</span>
                  <span className="d-banner-cta">{t.l(b.cta)}</span>
                </span>
                <span className="d-banner-media">
                  <Img image={b.image} alt="" sizes="124px" priority={i === 0} />
                </span>
              </Link>
            ))}
          </div>

          <div className="d-section g1-cats">
            <div className="d-catgrid">
              {data.categories.slice(0, 8).map((c) => (
                <Link key={c.id} to={paths.category(c.id)} className="d-cattile">
                  <Squircle color={CATEGORY_COLOR[c.id]} size="lg">
                    <CategoryIcon id={c.id} size={26} strokeWidth={2} />
                  </Squircle>
                  <span className="d-cattile-label">{t.l(c.name)}</span>
                </Link>
              ))}
            </div>
          </div>

          {data.sections.map((s) => (
            <Shelf key={s.id} s={s} />
          ))}

          <Group header={t.t('home.howItWorks')} footer={t.t('d.home.howFooter')}>
            {HOW.map(({ icon: Icon, color }, i) => (
              <Cell
                key={i}
                icon={
                  <Squircle color={color}>
                    <Icon size={17} strokeWidth={2.3} />
                  </Squircle>
                }
                title={t.t(`home.how${i + 1}.title`)}
                subtitle={t.t(`home.how${i + 1}.text`)}
              />
            ))}
          </Group>

          <Recommendations />
        </>
      ) : home.isError ? (
        <ErrorState error={home.error} onRetry={() => void home.refetch()} />
      ) : (
        <HomeSkeleton />
      )}
    </Screen>
  )
}

const FlashTimer = memo(function FlashTimer({ endsAt }: { endsAt?: string }) {
  const t = useT()
  const c = useCountdown(endsAt)
  if (!endsAt || c.done) return null
  return (
    <p className="g1-flash">
      <span>{t.t('home.flashEnds')}</span>
      <span className="d-timer" role="timer">
        <Timer size={13} strokeWidth={2.6} aria-hidden="true" />
        {c.h}:{c.m}:{c.s}
      </span>
    </p>
  )
})

const Shelf = memo(function Shelf({ s }: { s: HomeSection }) {
  const t = useT()
  if (!s.items.length) return null
  return (
    <section className="g1-shelf">
      <div className="d-shelf-head">
        <h2 className="d-shelf-title">{t.l(s.title)}</h2>
        <Link to={SECTION_ALL[s.kind]} className="d-shelf-all">
          {t.t('action.showAll')}
          <ChevronRight size={17} strokeWidth={2.4} aria-hidden="true" />
        </Link>
      </div>
      {s.kind === 'flash' ? <FlashTimer endsAt={s.endsAt} /> : null}
      <div className="d-shelf">
        {s.items.map((p) => (
          <ProductCard key={p.id} p={p} shelf />
        ))}
      </div>
      {s.kind === 'poizon' ? <p className="g1-foot">{t.t('d.home.poizonFooter')}</p> : null}
    </section>
  )
})

function Recommendations() {
  const t = useT()
  const q = useProductsInfinite(RECO)
  const { items, fetchNextPage } = q
  const onEnd = useCallback(() => void fetchNextPage(), [fetchNextPage])
  return (
    <section className="g1-shelf g1-reco">
      <div className="d-shelf-head">
        <h2 className="d-shelf-title">{t.t('home.recommended')}</h2>
      </div>
      {q.isPending ? (
        <GridSkeleton n={4} />
      ) : q.isError && !items.length ? (
        <div className="g1-grid">
          <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />
        </div>
      ) : (
        <VirtualGrid
          items={items}
          Item={GridItem}
          getKey={productKey}
          columns={2}
          gap={8}
          estimateHeight={272}
          hasMore={q.hasNextPage}
          loadingMore={q.isFetchingNextPage}
          onEndReached={onEnd}
          className="g1-grid"
          footer={<div className="g1-end">{q.isFetchingNextPage ? <Spinner /> : !q.hasNextPage ? t.t('d.end') : null}</div>}
        />
      )}
    </section>
  )
}

function HomeSkeleton() {
  return (
    <div aria-busy="true">
      <div className="d-banners g1-banners">
        <Skeleton className="g1-sk-banner" />
        <Skeleton className="g1-sk-banner" />
      </div>
      <div className="d-section g1-cats">
        <div className="d-catgrid">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="d-cattile">
              <Skeleton style={{ width: 56, height: 56, borderRadius: 14 }} />
              <Skeleton style={{ width: '70%', height: 11, margin: '2px 0 17px' }} />
            </span>
          ))}
        </div>
      </div>
      <section className="g1-shelf">
        <div className="d-shelf-head">
          <Skeleton style={{ width: 160, height: 18 }} />
        </div>
        <div className="d-shelf">
          {Array.from({ length: 3 }, (_, i) => (
            <CardSkeleton key={i} shelf />
          ))}
        </div>
      </section>
    </div>
  )
}
