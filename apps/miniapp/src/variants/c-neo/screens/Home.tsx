import { ArrowRight, ArrowUpRight, Link2, Search } from 'lucide-react'
import { memo } from 'react'
import type { Banner, HomeSection, SourceMarket } from '../../../shared/types'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { useT } from '../../../shared/i18n'
import { Link } from '../../../shared/nav/Link'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { useHome, useMe, useProductsInfinite } from '../../../shared/query/hooks'
import { CategoryIcon } from '../../../shared/ui/CategoryIcon'
import { useCountdown } from '../../../shared/ui/Countdown'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { DemoBadge, EmptyState, ErrorState } from '../../../shared/ui/States'
import { discountPct, glowStyle, searchPath } from '../lib/util'
import { Kicker, SectionHead, SOURCE_NAME } from '../ui/bits'
import { ProductCardSkeleton, RailCard } from '../ui/ProductCard'
import { ProductFeed } from '../ui/g1/ProductFeed'
import { budgetPath } from '../ui/g1/paths'
import '../styles/g1.css'

const RECO = { sort: 'popular' } as const

function bannerPath(b: Banner): string {
  const l = b.link
  if (l.kind === 'category') return paths.category(l.categoryId)
  if (l.kind === 'product') return paths.product(l.productId)
  return searchPath({ q: l.query })
}

function sectionPath(s: HomeSection): string {
  switch (s.kind) {
    case 'flash':
      return searchPath({ deals: true, sort: 'discount' })
    case 'hits':
      return searchPath({ sort: 'popular' })
    case 'new':
      return searchPath({ sort: 'new' })
    case 'poizon':
      return searchPath({ source: 'poizon' })
    case 'budget':
      return budgetPath()
  }
}

const KICKER: Record<HomeSection['kind'], string> = {
  flash: 'c.home.flashKicker',
  hits: 'c.home.hitsKicker',
  new: 'c.home.newKicker',
  poizon: 'c.home.poizonRail',
  budget: 'c.home.budgetKicker',
}

function Digits({ endsAt }: { endsAt?: string }) {
  const cd = useCountdown(endsAt)
  return (
    <span className="c-digits" role="timer" aria-label={`${cd.h}:${cd.m}:${cd.s}`}>
      <span className="c-digit">
        <span key={cd.h}>{cd.h}</span>
      </span>
      <b>:</b>
      <span className="c-digit">
        <span key={cd.m}>{cd.m}</span>
      </span>
      <b>:</b>
      <span className="c-digit">
        <span key={cd.s}>{cd.s}</span>
      </span>
    </span>
  )
}

function FlashTile({ section }: { section: HomeSection }) {
  const t = useT()
  const best = section.items.reduce((m, p) => Math.max(m, discountPct(p)), 0)
  const first = section.items[0]
  return (
    <Link to={sectionPath(section)} className="c-flash">
      <span className="g1-flash-kick">{t.t('home.flashEnds')}</span>
      <Digits endsAt={section.endsAt} />
      {first ? <Img className="c-flash-img" image={first.image} sizes="138px" alt="" /> : null}
      <span className="g1-flash-foot">
        <b className="g1-flash-title">{t.t('c.home.deals')}</b>
        {best > 0 ? <span className="g1-flash-pct">{t.t('c.home.dealsUpTo', { n: best })}</span> : null}
      </span>
    </Link>
  )
}

function MarketTile({ source }: { source: SourceMarket }) {
  const t = useT()
  return (
    <Link to={searchPath({ source })} className="c-mkt g1-mkt" data-src={source}>
      <span className="flex items-start justify-between gap-2">
        <Kicker>{t.t('c.home.marketKicker')}</Kicker>
        <span className="c-arrow">
          <ArrowUpRight size={16} strokeWidth={2.4} />
        </span>
      </span>
      <span className="mt-auto c-mkt-name">{SOURCE_NAME[source]}</span>
      <span className="g1-mkt-desc c-clamp2">{t.t(`source.${source}.desc`)}</span>
    </Link>
  )
}

const Rail = memo(function Rail({ section, index }: { section: HomeSection; index: number }) {
  const t = useT()
  if (!section.items.length) return null
  const ranked = section.kind === 'hits'
  return (
    <section className="g1-block">
      {section.kind === 'flash' ? (
        <div className="g1-flashhead">
          <span className="c-sec-idx">{String(index).padStart(2, '0')}</span>
          <Kicker>{t.t('home.flashEnds')}</Kicker>
          <Digits endsAt={section.endsAt} />
        </div>
      ) : null}
      {section.kind === 'poizon' ? (
        <Link to={sectionPath(section)} className="c-srctile g1-poizon" data-src="poizon">
          <Kicker className="g1-on-dark">{t.t('c.home.poizonKicker')}</Kicker>
          <span className="g1-poizon-title">{t.l(section.title)}</span>
          <span className="g1-poizon-lead">{t.t('c.home.poizonLead')}</span>
          <span className="c-hero-cta mt-3 self-start">
            {t.t('c.home.see')}
            <i>
              <ArrowRight size={16} strokeWidth={2.4} />
            </i>
          </span>
          <span className="c-srctile-glyph" aria-hidden="true">
            P
          </span>
        </Link>
      ) : (
        <SectionHead
          index={String(index).padStart(2, '0')}
          kicker={section.kind === 'flash' ? undefined : t.t(KICKER[section.kind])}
          title={t.l(section.title)}
          to={sectionPath(section)}
        />
      )}
      <div className="c-rail">
        {section.items.map((p, i) => (
          <RailCard key={p.id} item={p} rank={ranked ? i + 1 : undefined} />
        ))}
      </div>
    </section>
  )
})

function HomeSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="c-bento">
        <Skeleton className="col-span-2 h-[204px]" style={{ borderRadius: 28 }} />
        <Skeleton className="row-span-2" style={{ borderRadius: 24 }} />
        <Skeleton style={{ borderRadius: 24 }} />
        <Skeleton style={{ borderRadius: 24 }} />
      </div>
      <div className="g1-block">
        <div className="c-sec">
          <Skeleton className="h-[22px] w-[140px]" />
        </div>
        <div className="c-catchips">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-[46px] w-[140px]" round />
          ))}
        </div>
      </div>
      <div className="g1-block">
        <div className="c-sec">
          <Skeleton className="h-[22px] w-[180px]" />
        </div>
        <div className="c-rail">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} style={{ width: 156 }}>
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Home(_: ScreenProps) {
  const t = useT()
  const home = useHome()
  const me = useMe()
  const reco = useProductsInfinite(RECO)
  const data = home.data
  const hero = data?.banners[0]
  const flash = data?.sections.find((s) => s.kind === 'flash')
  const name = me.data?.firstName

  const header = (
    <div className="c-headbg g1-homehead">
      <span className="c-wordmark">
        TUJJOR
        <i />
      </span>
      <DemoBadge />
      <span className="flex-1" />
      <Link to={searchPath()} className="c-ibtn" aria-label={t.t('search.placeholderShort')}>
        <Search size={20} strokeWidth={2.3} />
      </Link>
    </div>
  )

  let n = 2
  return (
    <Screen header={header}>
      <div className="g1-intro">
        {name ? <p className="g1-hello">{t.t('c.home.greeting', { name })}</p> : <p className="g1-hello" aria-hidden="true">&nbsp;</p>}
        <Link to={searchPath()} className="c-searchpill">
          <Search size={20} strokeWidth={2.3} className="flex-none text-ink" />
          <span className="min-w-0 flex-1 truncate">{t.t('c.home.searchHint')}</span>
          <span className="c-searchpill-tag">
            <Link2 size={13} strokeWidth={2.6} />
            {t.t('c.g1.linkTag')}
          </span>
        </Link>
      </div>

      {home.isLoading ? (
        <HomeSkeleton />
      ) : home.error && !data ? (
        <ErrorState error={home.error} onRetry={() => void home.refetch()} className="g1-pad" />
      ) : data ? (
        <>
          <div className="c-bento">
            {hero ? (
              <Link to={bannerPath(hero)} className="c-hero">
                <span className="g1-hero-kick">{t.t('c.home.bannersKicker')}</span>
                <span className="g1-hero-title c-clamp2">{t.l(hero.title)}</span>
                <span className="g1-hero-sub c-clamp2">{t.l(hero.subtitle)}</span>
                <span className="c-hero-cta mt-auto self-start">
                  {t.l(hero.cta)}
                  <i>
                    <ArrowRight size={16} strokeWidth={2.4} />
                  </i>
                </span>
                <Img className="c-hero-img" image={hero.image} sizes="196px" alt="" priority />
              </Link>
            ) : null}
            {flash ? <FlashTile section={flash} /> : <MarketTile source="alibaba" />}
            <MarketTile source="poizon" />
            <MarketTile source="1688" />
          </div>

          <section className="g1-block">
            <SectionHead index="01" kicker={t.t('c.home.chipsKicker')} title={t.t('home.categories')} to={paths.catalog()} />
            <div className="c-catchips">
              {data.categories.map((c) => (
                <Link key={c.id} to={paths.category(c.id)} className="c-catchip">
                  <span className="c-catchip-ico" style={glowStyle(c.image.tint)}>
                    <CategoryIcon id={c.id} size={18} strokeWidth={2.2} />
                  </span>
                  {t.l(c.name)}
                  <span className="c-catchip-n">{t.compact(c.productCount)}</span>
                </Link>
              ))}
            </div>
          </section>

          {data.banners.length > 1 ? (
            <div className="c-rail g1-block">
              {data.banners.slice(1).map((b) => (
                <Link key={b.id} to={bannerPath(b)} className="c-banner" data-tone={b.tone}>
                  <span className="g1-banner-title c-clamp2">{t.l(b.title)}</span>
                  <span className="g1-banner-sub c-clamp2">{t.l(b.subtitle)}</span>
                  <span className="c-banner-cta mt-auto self-start">
                    {t.l(b.cta)}
                    <ArrowRight size={14} strokeWidth={2.6} />
                  </span>
                  <Img className="c-banner-img" image={b.image} sizes="158px" alt="" />
                </Link>
              ))}
            </div>
          ) : null}

          {data.sections.map((s) => (
            <Rail key={s.id} section={s} index={n++} />
          ))}

          <section className="g1-block">
            <div className="c-how">
              <Kicker className="g1-on-dark">{t.t('c.home.howKicker')}</Kicker>
              <h2 className="c-h2 mb-5 mt-1.5">{t.t('home.howItWorks')}</h2>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="c-how-step">
                  <span className="c-how-n">{String(i).padStart(2, '0')}</span>
                  <div className="min-w-0 pt-1">
                    <p className="text-[15px] font-bold leading-5">{t.t(`home.how${i}.title`)}</p>
                    <p className="g1-how-text">{t.t(`home.how${i}.text`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <section className="g1-block">
        <SectionHead index={String(n).padStart(2, '0')} kicker={t.t('c.home.recoKicker')} title={t.t('home.recommended')} />
        <ProductFeed
          items={reco.items}
          isLoading={reco.isLoading}
          error={reco.error}
          onRetry={() => void reco.refetch()}
          hasMore={!!reco.hasNextPage}
          loadingMore={reco.isFetchingNextPage}
          onEndReached={() => void reco.fetchNextPage()}
          empty={<EmptyState title={t.t('search.nothing')} />}
        />
      </section>
    </Screen>
  )
}
