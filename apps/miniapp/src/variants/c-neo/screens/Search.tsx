import { ArrowUpLeft, ChevronRight, Clock3, Link2, PackageSearch, Search as SearchIcon, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CategoryId, ProductQuery, SortKey, Suggestion } from '../../../shared/types'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { useT } from '../../../shared/i18n'
import { useNav } from '../../../shared/nav/context'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { looksLikeLink, prefetchProduct, useCategories, useDebouncedValue, useHome, useProductsInfinite, useResolveLink, useSuggest } from '../../../shared/query/hooks'
import { useRecentSearches } from '../../../shared/store/recent'
import { CategoryIcon } from '../../../shared/ui/CategoryIcon'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { EmptyState, ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { activeCount, EMPTY_FILTERS, glowStyle, isSort, isSource, toQuery, type FilterState } from '../lib/util'
import { Kicker, Price, SOURCE_NAME, Spinner, Sticker } from '../ui/bits'
import { FiltersSheet } from '../ui/g1/FiltersSheet'
import { ProductFeed } from '../ui/g1/ProductFeed'
import { SortRail } from '../ui/g1/SortRail'
import '../styles/g1.css'

const CATS: CategoryId[] = ['electronics', 'clothing', 'shoes', 'bags', 'watches', 'beauty', 'home', 'sport']

function initialFilters(query: Record<string, string | undefined>): FilterState {
  const max = Number(query.max)
  return {
    ...EMPTY_FILTERS,
    categoryId: query.category && (CATS as string[]).includes(query.category) ? (query.category as CategoryId) : undefined,
    sources: isSource(query.source) ? [query.source] : [],
    deals: query.deals === '1',
    priceMax: Number.isFinite(max) && max > 0 ? max : undefined,
  }
}

type Mode = 'idle' | 'suggest' | 'link' | 'results'

export default function Search({ query }: ScreenProps) {
  const t = useT()
  const recent = useRecentSearches()
  const inputRef = useRef<HTMLInputElement>(null)

  const [text, setText] = useState(query.q ?? '')
  const [submitted, setSubmitted] = useState((query.q ?? '').trim())
  const [sort, setSort] = useState<SortKey>(isSort(query.sort) ? query.sort : 'popular')
  const [filters, setFilters] = useState<FilterState>(() => initialFilters(query))
  const [sheet, setSheet] = useState(false)
  const browse = isSort(query.sort)

  const trimmed = text.trim()
  const isLink = looksLikeLink(trimmed)
  const nFilters = activeCount(filters, true)
  const typing = trimmed !== submitted
  const mode: Mode = isLink ? 'link' : typing && trimmed ? 'suggest' : submitted || nFilters > 0 || browse ? 'results' : 'idle'

  // keyboard up when the screen opens empty; results opened from a link keep the keyboard down
  useEffect(() => {
    if (query.q || nFilters > 0 || browse) return
    const id = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 260)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (query.q) recent.add(query.q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = useCallback(
    (raw: string) => {
      const q = raw.trim()
      setText(q)
      if (looksLikeLink(q)) return
      setSubmitted(q)
      if (q) recent.add(q)
      inputRef.current?.blur()
    },
    [recent],
  )

  const clear = () => {
    setText('')
    setSubmitted('')
    inputRef.current?.focus()
  }

  const base = useMemo<ProductQuery>(() => ({ q: submitted || undefined, sort }), [submitted, sort])
  const productQuery = useMemo<ProductQuery>(() => ({ ...base, ...toQuery(filters) }), [base, filters])
  const list = useProductsInfinite(productQuery, { enabled: mode === 'results' })

  return (
    <Screen
      header={
        <div className="c-headbg g1-searchhead">
          <form
            className="c-field g1-searchfield"
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              submit(text)
            }}
          >
            <SearchIcon size={20} strokeWidth={2.3} className="flex-none" />
            <input
              ref={inputRef}
              type="text"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={text}
              placeholder={t.t('search.placeholder')}
              aria-label={t.t('search.placeholderShort')}
              onChange={(e) => {
                setText(e.target.value)
                if (!e.target.value.trim()) setSubmitted('')
              }}
            />
            {text ? (
              <Tap className="g1-clear" onClick={clear} aria-label={t.t('c.g1.clear')}>
                <X size={16} strokeWidth={2.6} />
              </Tap>
            ) : null}
          </form>
          {mode === 'results' ? <SortRail sort={sort} onSort={setSort} filters={nFilters} onFilters={() => setSheet(true)} /> : null}
        </div>
      }
    >
      {mode === 'idle' ? <Idle onPick={submit} /> : null}
      {mode === 'suggest' ? <Suggest text={trimmed} onQuery={submit} /> : null}
      {mode === 'link' ? <LinkResult text={trimmed} /> : null}
      {mode === 'results' ? (
        <>
          <div className="g1-counter">
            {list.isLoading && !list.items.length ? <Skeleton className="h-[14px] w-[140px]" /> : <Kicker>{t.tp('search.results', list.total)}</Kicker>}
            {nFilters > 0 ? (
              <Tap className="g1-linkbtn" onClick={() => setFilters(EMPTY_FILTERS)}>
                {t.t('action.reset')}
              </Tap>
            ) : null}
          </div>
          {submitted ? <h1 className="g1-qtitle c-clamp2">«{submitted}»</h1> : null}
          <ProductFeed
            items={list.items}
            isLoading={list.isLoading}
            error={list.error}
            onRetry={() => void list.refetch()}
            hasMore={!!list.hasNextPage}
            loadingMore={list.isFetchingNextPage}
            onEndReached={() => void list.fetchNextPage()}
            refreshing={list.isPlaceholderData}
            empty={
              <EmptyState
                className="g1-pad"
                icon={<PackageSearch size={36} strokeWidth={1.8} />}
                title={t.t('search.nothing')}
                text={t.t('search.nothingHint')}
                action={
                  nFilters > 0 ? (
                    <Tap className="c-cta" onClick={() => setFilters(EMPTY_FILTERS)}>
                      {t.t('action.reset')}
                    </Tap>
                  ) : (
                    <Tap className="c-btn2" onClick={clear}>
                      {t.t('c.g1.newSearch')}
                    </Tap>
                  )
                }
              />
            }
          />
        </>
      ) : null}
      <FiltersSheet open={sheet} onClose={() => setSheet(false)} value={filters} onApply={setFilters} base={base} withCategory />
    </Screen>
  )
}

/** Empty input: link hint, recent queries, trending, categories. */
function Idle({ onPick }: { onPick: (q: string) => void }) {
  const t = useT()
  const nav = useNav()
  const recent = useRecentSearches()
  const home = useHome()
  const cats = useCategories()
  const trending = home.data?.trending ?? []

  return (
    <div className="g1-idle">
      <div className="g1-linkhint">
        <span className="g1-linkhint-ico">
          <Link2 size={18} strokeWidth={2.4} />
        </span>
        <span className="min-w-0 flex-1">
          <b>{t.t('search.byLink')}</b>
          <small>{t.t('c.search.linkText')}</small>
        </span>
      </div>

      {recent.items.length ? (
        <section className="g1-sblock">
          <div className="g1-shead">
            <Kicker>{t.t('search.recent')}</Kicker>
            <Tap className="g1-linkbtn" onClick={recent.clear}>
              {t.t('search.clearRecent')}
            </Tap>
          </div>
          <div className="g1-wrap">
            {recent.items.map((q) => (
              <span key={q} className="g1-recent">
                <Tap className="g1-recent-q" onClick={() => onPick(q)}>
                  <Clock3 size={14} strokeWidth={2.4} />
                  <span className="truncate">{q}</span>
                </Tap>
                <Tap className="g1-recent-x" onClick={() => recent.remove(q)} aria-label={`${t.t('action.delete')}: ${q}`}>
                  <X size={14} strokeWidth={2.6} />
                </Tap>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="g1-sblock">
        <div className="g1-shead">
          <Kicker>{t.t('search.trending')}</Kicker>
        </div>
        {home.isLoading ? (
          <div className="g1-trend">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="my-[13px] h-[18px] w-[60%]" />
            ))}
          </div>
        ) : home.error && !trending.length ? (
          <ErrorState error={home.error} onRetry={() => void home.refetch()} compact />
        ) : (
          <div className="g1-trend">
            {trending.slice(0, 8).map((x, i) => (
              <Tap key={x.ru} className="g1-trend-row" onClick={() => onPick(t.l(x))}>
                <span className="g1-trend-n c-mono">{String(i + 1).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1 truncate text-left">{t.l(x)}</span>
                {i < 3 ? (
                  <Sticker tone="lime" tilt={i % 2 ? 3 : -3}>
                    {t.t('badge.hit')}
                  </Sticker>
                ) : null}
                <ArrowUpLeft size={18} strokeWidth={2.2} className="flex-none text-ink-3" />
              </Tap>
            ))}
          </div>
        )}
      </section>

      <section className="g1-sblock">
        <div className="g1-shead">
          <Kicker>{t.t('search.categories')}</Kicker>
        </div>
        <div className="g1-wrap">
          {(cats.data ?? []).map((c) => (
            <Tap key={c.id} className="c-chip" onClick={() => nav.push(paths.category(c.id))}>
              <CategoryIcon id={c.id} size={16} strokeWidth={2.2} />
              {t.l(c.name)}
            </Tap>
          ))}
        </div>
      </section>
    </div>
  )
}

/** Typing: debounced suggestions + "search for" row. */
function Suggest({ text, onQuery }: { text: string; onQuery: (q: string) => void }) {
  const t = useT()
  const nav = useNav()
  const debounced = useDebouncedValue(text, 220)
  const sug = useSuggest(debounced)
  const items: Suggestion[] = debounced.length >= 2 ? (sug.data ?? []) : []

  const open = (s: Suggestion) => {
    if (s.kind === 'category' && s.categoryId) nav.push(paths.category(s.categoryId))
    else if (s.kind === 'product' && s.productId) {
      prefetchProduct(s.productId)
      nav.push(paths.product(s.productId))
    } else onQuery(t.l(s.text))
  }

  return (
    <div className="g1-sugg">
      <Tap className="g1-sugg-row g1-sugg-main" onClick={() => onQuery(text)}>
        <span className="g1-sugg-ico">
          <SearchIcon size={17} strokeWidth={2.4} />
        </span>
        <span className="min-w-0 flex-1 truncate text-left">{t.t('c.search.searchFor', { q: text })}</span>
        {sug.isFetching ? <Spinner className="g1-spin-s" /> : <ChevronRight size={18} strokeWidth={2.2} />}
      </Tap>
      {items.map((s, i) => (
        <Tap key={`${s.kind}-${s.categoryId ?? s.productId ?? ''}-${i}`} className="g1-sugg-row" onClick={() => open(s)}>
          <span className="g1-sugg-ico" data-kind={s.kind}>
            {s.kind === 'category' && s.categoryId ? <CategoryIcon id={s.categoryId} size={17} strokeWidth={2.2} /> : <SearchIcon size={16} strokeWidth={2.2} />}
          </span>
          <span className="min-w-0 flex-1 truncate text-left">{t.l(s.text)}</span>
          <span className="g1-sugg-kind">{t.t(s.kind === 'category' ? 'c.search.kindCategory' : s.kind === 'product' ? 'c.search.kindProduct' : 'c.search.kindQuery')}</span>
        </Tap>
      ))}
    </div>
  )
}

/** Pasted marketplace link → resolved demo product. */
function LinkResult({ text }: { text: string }) {
  const t = useT()
  const nav = useNav()
  const res = useResolveLink(text)
  const hit = res.data

  return (
    <div className="g1-linkwrap">
      <Kicker>{t.t('search.byLink')}</Kicker>
      {res.isLoading ? (
        <div className="g1-linkcard" aria-live="polite">
          <div className="flex items-center gap-3">
            <Spinner />
            <span className="text-[15px] font-semibold">{t.t('c.search.resolving')}</span>
          </div>
        </div>
      ) : res.error ? (
        <ErrorState error={res.error} onRetry={() => void res.refetch()} compact />
      ) : hit ? (
        <div className="g1-linkcard c-reveal">
          <div className="flex items-center justify-between gap-2">
            <Sticker tone="lime" tilt={-3}>
              {t.t('search.linkFound')}
            </Sticker>
            <span className="g1-linksrc">{t.t('search.linkDetected', { source: SOURCE_NAME[hit.source] })}</span>
          </div>
          <div className="g1-linkprod">
            <span className="g1-linkimg c-glow" style={glowStyle(hit.product.image.tint)}>
              <Img image={hit.product.image} alt={t.l(hit.product.title)} sizes="96px" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="g1-linktitle c-clamp2">{t.l(hit.product.title)}</span>
              <Price value={hit.product.price} size="l" />
            </span>
          </div>
          <Tap
            className="c-cta"
            haptic="light"
            onPointerDown={() => prefetchProduct(hit.product.id)}
            onClick={() => nav.push(paths.product(hit.product.id))}
          >
            {t.t('c.search.open')}
          </Tap>
          <p className="g1-note">{t.t('search.linkDemo')}</p>
        </div>
      ) : (
        <div className="g1-linkcard" data-tone="error">
          <p className="text-[15px] font-semibold">{t.t('search.linkNotFound')}</p>
        </div>
      )}
    </div>
  )
}
