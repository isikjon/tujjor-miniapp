import { BadgeCheck, ChevronRight, CreditCard, MousePointerClick, PackageCheck, Truck, Wallet } from 'lucide-react'
import { memo } from 'react'
import { useT } from '../../../shared/i18n'
import { Link } from '../../../shared/nav/Link'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { useHome, useProductsInfinite } from '../../../shared/query/hooks'
import type { Banner, Category, HomeSection, SourceMarket } from '../../../shared/types'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { DemoBadge, ErrorState } from '../../../shared/ui/States'
import { searchPath, SOURCES } from '../lib'
import { ProductCard, RailSkeleton, SearchBar, SectionHeader } from '../ui'
import { FeedGrid, VioletHead } from '../ui/g1/parts'
import '../styles/g1.css'

const RECO_QUERY = { sort: 'popular' as const }

function bannerPath(b: Banner): string {
  if (b.link.kind === 'category') return paths.category(b.link.categoryId)
  if (b.link.kind === 'product') return paths.product(b.link.productId)
  return searchPath({ q: b.link.query })
}

const BannerCard = memo(function BannerCard({ banner, first }: { banner: Banner; first: boolean }) {
  const t = useT()
  return (
    <Link to={bannerPath(banner)} className="b1-banner" data-tone={banner.tone}>
      <span className="b1-banner__glow" aria-hidden="true" />
      <span className="b1-banner__text">
        <span className="b1-banner__title">{t.l(banner.title)}</span>
        <span className="b1-banner__sub">{t.l(banner.subtitle)}</span>
        <span className="b1-banner__cta">
          {t.l(banner.cta)}
          <ChevronRight size={14} strokeWidth={2.6} aria-hidden="true" />
        </span>
      </span>
      <Img className="b1-banner__img" image={banner.image} alt="" sizes="(max-width: 480px) 36vw, 170px" priority={first} />
    </Link>
  )
})

const CategoryTile = memo(function CategoryTile({ c }: { c: Category }) {
  const t = useT()
  return (
    <Link to={paths.category(c.id)} className="b1-cat">
      <span className="b1-cat__img">
        <Img image={c.image} alt="" sizes="60px" />
      </span>
      <span className="b1-cat__name">{t.l(c.name)}</span>
    </Link>
  )
})

const SUBS: Record<HomeSection['kind'], string> = {
  flash: 'b.flashSub',
  hits: 'b.g1.hitsSub',
  new: 'b.g1.newSub',
  poizon: 'b.poizonSub',
  budget: 'b.budgetSub',
}

function sectionPath(s: HomeSection): string {
  switch (s.kind) {
    case 'flash':
      return searchPath({ sort: 'discount' })
    case 'new':
      return searchPath({ sort: 'new' })
    case 'poizon':
      return searchPath({ source: 'poizon' })
    case 'budget':
      return searchPath({ sort: 'price_asc' })
    default:
      return searchPath({ sort: 'popular' })
  }
}

const Section = memo(function Section({ s }: { s: HomeSection }) {
  const t = useT()
  const tone = s.kind === 'flash' ? 'flash' : s.kind === 'poizon' ? 'dark' : undefined
  return (
    <section className="b1-block" data-tone={tone}>
      <SectionHeader title={t.l(s.title)} sub={t.t(SUBS[s.kind])} endsAt={s.kind === 'flash' ? s.endsAt : undefined} to={sectionPath(s)} />
      <div className="b-rail pt-1">
        {s.items.map((p) => (
          <ProductCard key={p.id} item={p} variant="rail" />
        ))}
      </div>
    </section>
  )
})

function Markets() {
  const t = useT()
  return (
    <section className="b1-block b1-block--flat">
      <SectionHeader title={t.t('home.sources')} sub={t.t('b.g1.marketsSub')} />
      <div className="b1-markets">
        {SOURCES.map((s: SourceMarket) => (
          <Link key={s} to={searchPath({ source: s })} className="b1-market" data-src={s}>
            <span className="b1-market__name">{t.t(`source.${s}`)}</span>
            <span className="b1-market__desc">{t.t(`source.${s}.desc`)}</span>
            <span className="b1-market__go">
              {t.t('b.g1.marketGo')}
              <ChevronRight size={13} strokeWidth={2.6} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

const HOW = [MousePointerClick, Wallet, PackageCheck, Truck]

function HowItWorks() {
  const t = useT()
  return (
    <section className="b1-block">
      <SectionHeader title={t.t('home.howItWorks')} sub={t.t('b.howSub')} />
      <div className="b1-how pt-1">
        {HOW.map((Icon, i) => (
          <div key={i} className="b1-how__card">
            <span className="b1-how__icon">
              <Icon size={19} strokeWidth={2.3} aria-hidden="true" />
            </span>
            <span className="b1-how__step">{t.t('b.g1.step', { n: i + 1 })}</span>
            <p className="b1-how__title">{t.t(`home.how${i + 1}.title`)}</p>
            <p className="b1-how__text">{t.t(`home.how${i + 1}.text`)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function HomeSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="b1-hero">
        <div className="b1-banners">
          <Skeleton className="b1-banner" style={{ background: 'var(--color-skeleton)' }} />
          <Skeleton className="b1-banner" style={{ background: 'var(--color-skeleton)' }} />
        </div>
      </div>
      <div className="b1-perks" style={{ height: 40 }} />
      <section className="b1-block">
        <div className="b-sec">
          <Skeleton style={{ height: 20, width: 140 }} />
        </div>
        <div className="b1-cats">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="b1-cat">
              <Skeleton className="b1-cat__img" />
              <Skeleton style={{ height: 12, width: '70%' }} />
            </div>
          ))}
        </div>
      </section>
      <section className="b1-block">
        <div className="b-sec">
          <Skeleton style={{ height: 20, width: 180 }} />
        </div>
        <RailSkeleton count={3} />
      </section>
    </div>
  )
}

export default function Home(_: ScreenProps) {
  const t = useT()
  const home = useHome()
  const reco = useProductsInfinite(RECO_QUERY)
  const data = home.data

  const header = (
    <VioletHead
      title={
        <div className="flex min-w-0 items-center gap-2">
          <span className="b1-logo">
            {t.t('app.name')}
            <span>.</span>
          </span>
          <span className="b1-tagline">{t.t('b.demoShort')}</span>
        </div>
      }
      right={<DemoBadge />}
    >
      <SearchBar tone="header" />
    </VioletHead>
  )

  return (
    <Screen header={header}>
      {home.isPending ? (
        <HomeSkeleton />
      ) : home.isError && !data ? (
        <ErrorState error={home.error} onRetry={() => void home.refetch()} />
      ) : data ? (
        <>
          <div className="b1-hero">
            <div className="b1-banners">
              {data.banners.map((b, i) => (
                <BannerCard key={b.id} banner={b} first={i === 0} />
              ))}
            </div>
          </div>

          <div className="b1-perks">
            <span className="b1-perk">
              <Wallet size={14} strokeWidth={2.4} aria-hidden="true" />
              {t.t('b.g1.perkPrice')}
            </span>
            <span className="b1-perk">
              <BadgeCheck size={14} strokeWidth={2.4} aria-hidden="true" />
              {t.t('b.g1.perkCheck')}
            </span>
            <span className="b1-perk">
              <CreditCard size={14} strokeWidth={2.4} aria-hidden="true" />
              {t.t('b.g1.perkPay')}
            </span>
          </div>

          <section className="b1-block">
            <SectionHeader title={t.t('home.categories')} to={paths.catalog()} />
            <div className="b1-cats">
              {data.categories.slice(0, 8).map((c) => (
                <CategoryTile key={c.id} c={c} />
              ))}
            </div>
          </section>

          {data.sections.map((s, i) => (
            <div key={s.id}>
              <Section s={s} />
              {i === 0 ? <Markets /> : null}
            </div>
          ))}

          <HowItWorks />

          <section className="mt-3">
            <SectionHeader title={t.t('home.recommended')} sub={t.t('b.g1.recoSub')} />
            <div className="pt-1">
              <FeedGrid list={reco} />
            </div>
          </section>
        </>
      ) : null}
    </Screen>
  )
}
