import { ChevronRight, Clock, Link2, Link2Off, Package, Search as SearchIcon, TrendingUp, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useT } from '../../../shared/i18n'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { useNav } from '../../../shared/nav/context'
import { Link } from '../../../shared/nav/Link'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { looksLikeLink, prefetchProduct, useCategories, useDebouncedValue, useHome, useResolveLink, useSuggest } from '../../../shared/query/hooks'
import { useRecentSearches } from '../../../shared/store/recent'
import type { CategoryId, ProductQuery, SortKey, SourceMarket, Suggestion } from '../../../shared/types'
import { CategoryIcon } from '../../../shared/ui/CategoryIcon'
import { Img } from '../../../shared/ui/Img'
import { ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { Cell, Group } from '../ui/Cell'
import { EmptyView, SearchInput, Spinner, Squircle } from '../ui/controls'
import { CATEGORY_COLOR, SOURCE_COLOR, discountPct, filterCount, isSort, isSource } from '../ui/lib'
import { ProductResults, SOURCE_ICON, Toolbar, type FilterValue } from '../ui/g1/Results'
import '../styles/g1.css'

const CATEGORY_IDS: CategoryId[] = ['electronics', 'clothing', 'shoes', 'bags', 'watches', 'beauty', 'home', 'sport']
const isCategory = (v: string | undefined): v is CategoryId => !!v && (CATEGORY_IDS as string[]).includes(v)
const EXAMPLE_LINK = 'https://detail.1688.com/offer/652874139284.html'

export default function Search({ query }: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const recent = useRecentSearches()
  const inputRef = useRef<HTMLInputElement>(null)

  const initialQ = (query.q ?? '').trim()
  const [input, setInput] = useState(initialQ)
  const [submitted, setSubmitted] = useState(initialQ)
  const [category, setCategory] = useState<CategoryId | undefined>(isCategory(query.category) ? query.category : undefined)
  const [sort, setSort] = useState<SortKey>(isSort(query.sort) ? query.sort : 'popular')
  const [filters, setFilters] = useState<FilterValue>(() => {
    const max = Number(query.max)
    return { ...(isSource(query.source) ? { sources: [query.source] } : null), ...(max > 0 ? { priceMax: max } : null) }
  })
  /** Opened from an "All" link (sort only) → browse every product without a text query. */
  const [browseAll, setBrowseAll] = useState(!!query.sort && !initialQ)

  const text = input.trim()
  const isLink = looksLikeLink(text)
  const editing = text.length > 0 && text !== submitted
  const showResults = !!submitted || !!category || filterCount(filters) > 0 || browseAll

  // Autofocus once the push transition settled (focus during the slide makes WebKit jump); not when we arrive with results.
  useEffect(() => {
    if (initialQ || showResults) return
    const id = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 360)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = (value: string) => {
    const v = value.trim()
    setInput(v)
    if (looksLikeLink(v)) return
    setSubmitted(v)
    if (v) recent.add(v)
    inputRef.current?.blur()
  }
  const clear = () => {
    setInput('')
    setSubmitted('')
    setBrowseAll(false)
    inputRef.current?.focus({ preventScroll: true })
  }
  const browseSource = (s: SourceMarket) => {
    setInput('')
    setSubmitted('')
    setFilters({ sources: [s] })
    inputRef.current?.blur()
  }
  const onSuggestion = (s: Suggestion) => {
    if (s.kind === 'category' && s.categoryId) nav.push(paths.category(s.categoryId))
    else if (s.kind === 'product' && s.productId) nav.push(paths.product(s.productId))
    else submit(t.l(s.text))
  }

  const base = useMemo<ProductQuery>(() => ({ q: submitted || undefined, categoryId: category, sort }), [submitted, category, sort])
  const productQuery = useMemo<ProductQuery>(() => ({ ...base, ...filters }), [base, filters])

  let body: ReactNode
  if (editing && isLink) body = <LinkResult text={text} onBrowseSource={browseSource} />
  else if (editing && text.length >= 2) body = <Suggestions text={text} onPick={onSuggestion} onSubmit={() => submit(text)} />
  else if (showResults)
    body = (
      <>
        <ResultsTitle q={submitted} source={filters.sources?.length === 1 ? filters.sources[0] : undefined} />
        <Toolbar
          sort={sort}
          onSort={setSort}
          filters={filters}
          onFilters={setFilters}
          base={base}
          lead={category ? <CategoryPill id={category} onRemove={() => setCategory(undefined)} /> : null}
        />
        <ProductResults query={productQuery} onReset={filterCount(filters) > 0 || category ? () => (setFilters({}), setCategory(undefined)) : undefined} />
      </>
    )
  else body = <Idle onSubmit={submit} onExample={() => setInput(EXAMPLE_LINK)} recent={recent} />

  return (
    <Screen
      header={
        <div className="d-header g1-head">
          <SearchInput ref={inputRef} value={input} onChange={setInput} onSubmit={() => submit(input)} onClear={clear} placeholder={t.t('search.placeholder')} />
        </div>
      }
    >
      {body}
    </Screen>
  )
}

function ResultsTitle({ q, source }: { q: string; source?: SourceMarket }) {
  const t = useT()
  const title = q ? t.t('d.search.resultsFor', { q }) : source ? t.t('d.search.inSource', { source: t.t(`source.${source}`) }) : t.t('d.search.allProducts')
  return <h2 className="g1-results-title truncate">{title}</h2>
}

function CategoryPill({ id, onRemove }: { id: CategoryId; onRemove: () => void }) {
  const t = useT()
  const cats = useCategories()
  const name = t.l(cats.data?.find((c) => c.id === id)?.name)
  return (
    <Tap flat className="g1-chip" onClick={onRemove} aria-label={`${t.t('action.reset')}: ${name}`}>
      <span className="d-pill" data-on="true">
        <CategoryIcon id={id} size={15} strokeWidth={2.2} />
        {name || t.t('filters.category')}
        <X size={14} strokeWidth={2.6} aria-hidden="true" />
      </span>
    </Tap>
  )
}

function Idle({ onSubmit, onExample, recent }: { onSubmit: (v: string) => void; onExample: () => void; recent: { items: string[]; remove: (q: string) => void; clear: () => void } }) {
  const t = useT()
  const home = useHome()
  const trending = home.data?.trending ?? []
  return (
    <div className="g1-idle">
      {recent.items.length ? (
        <Group
          header={t.t('search.recent')}
          headerRight={
            <Tap className="d-hlink" haptic="light" onClick={recent.clear}>
              {t.t('search.clearRecent')}
            </Tap>
          }
        >
          {recent.items.map((q) => (
            <div key={q} className="d-cell g1-row" style={{ '--sep': '52px' } as CSSProperties}>
              <Tap flat className="g1-row-main" onClick={() => onSubmit(q)}>
                <Clock size={20} strokeWidth={2} className="g1-row-icon" aria-hidden="true" />
                <span className="d-cell-title">{q}</span>
              </Tap>
              <Tap className="g1-row-x" haptic="light" onClick={() => recent.remove(q)} aria-label={t.t('d.search.remove')}>
                <X size={18} strokeWidth={2.2} />
              </Tap>
            </div>
          ))}
        </Group>
      ) : null}

      {trending.length ? (
        <section className="d-group">
          <div className="d-group-header">{t.t('search.trending')}</div>
          <div className="g1-trend">
            {trending.map((q) => (
              <Tap key={q.ru} flat className="g1-chip" onClick={() => onSubmit(t.l(q))}>
                <span className="d-pill">
                  <TrendingUp size={15} strokeWidth={2.2} className="g1-trend-ic" aria-hidden="true" />
                  {t.l(q)}
                </span>
              </Tap>
            ))}
          </div>
        </section>
      ) : null}

      <Group header={t.t('search.byLink')} footer={t.t('search.hint')}>
        <Cell
          onClick={onExample}
          icon={
            <Squircle color="orange">
              <Link2 size={17} strokeWidth={2.3} />
            </Squircle>
          }
          title={t.t('d.search.example')}
          subtitle={t.t('d.search.exampleHint')}
          tone="link"
        />
      </Group>
    </div>
  )
}

/** Bold the typed part of a suggestion (iOS Spotlight style). */
function Highlight({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0 || !q) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <b>{text.slice(i, i + q.length)}</b>
      {text.slice(i + q.length)}
    </>
  )
}

function Suggestions({ text, onPick, onSubmit }: { text: string; onPick: (s: Suggestion) => void; onSubmit: () => void }) {
  const t = useT()
  const debounced = useDebouncedValue(text, 220)
  const sug = useSuggest(debounced)
  const items = sug.data ?? []
  return (
    <Group header={t.t('d.search.suggestions')} headerRight={sug.isFetching ? <Spinner size="sm" /> : null}>
      <Cell
        onClick={onSubmit}
        icon={<SearchIcon size={20} strokeWidth={2.2} className="g1-row-icon" />}
        title={<b className="g1-sug-q">{text}</b>}
        sep={52}
        className="g1-sug"
      />
      {items.map((s, i) => (
        <Cell
          key={`${s.kind}-${s.categoryId ?? s.productId ?? ''}-${i}`}
          onClick={() => onPick(s)}
          icon={
            s.kind === 'category' && s.categoryId ? (
              <Squircle color={CATEGORY_COLOR[s.categoryId]}>
                <CategoryIcon id={s.categoryId} size={17} strokeWidth={2.3} />
              </Squircle>
            ) : s.kind === 'product' ? (
              <Package size={20} strokeWidth={2} className="g1-row-icon" />
            ) : (
              <SearchIcon size={20} strokeWidth={2} className="g1-row-icon" />
            )
          }
          title={<Highlight text={t.l(s.text)} q={debounced.trim()} />}
          subtitle={s.kind === 'category' ? t.t('filters.category') : undefined}
          chevron={s.kind !== 'query'}
          sep={52}
          className="g1-sug"
        />
      ))}
    </Group>
  )
}

function LinkResult({ text, onBrowseSource }: { text: string; onBrowseSource: (s: SourceMarket) => void }) {
  const t = useT()
  const r = useResolveLink(text)
  if (r.isPending) {
    return (
      <Group header={t.t('search.byLink')}>
        <Cell icon={<Spinner />} title={t.t('d.search.linkResolving')} sep={51} />
      </Group>
    )
  }
  if (r.isError) {
    return (
      <div className="g1-pad-top">
        <ErrorState error={r.error} onRetry={() => void r.refetch()} />
      </div>
    )
  }
  if (!r.data) {
    return <EmptyView icon={<Link2Off size={44} strokeWidth={1.8} />} title={t.t('search.byLink')} text={t.t('search.linkNotFound')} />
  }
  const { product: p, source } = r.data
  const off = discountPct(p.price, p.oldPrice)
  const SourceIcon = SOURCE_ICON[source]
  return (
    <>
      <Group header={t.t('search.linkFound')} footer={t.t('search.linkDemo')}>
        <Link to={paths.product(p.id)} onIntent={() => prefetchProduct(p.id)} className="d-cell g1-linkcard">
          <Img image={p.image} alt="" sizes="72px" className="d-thumb g1-link-thumb" />
          <span className="d-cell-body">
            <span className="g1-link-src">{t.t('search.linkDetected', { source: t.t(`source.${source}`) })}</span>
            <span className="g1-link-title">{t.l(p.title)}</span>
            <span className="g1-link-price">
              {t.money(p.price)}
              {off && p.oldPrice ? <s>{t.money(p.oldPrice)}</s> : null}
            </span>
          </span>
          <ChevronRight className="d-cell-chevron" size={20} strokeWidth={2.2} aria-hidden="true" />
        </Link>
      </Group>
      <Group>
        <Cell
          onClick={() => onBrowseSource(source)}
          icon={
            <Squircle color={SOURCE_COLOR[source]}>
              <SourceIcon size={17} strokeWidth={2.3} />
            </Squircle>
          }
          title={t.t('d.search.inSource', { source: t.t(`source.${source}`) })}
          chevron
        />
      </Group>
    </>
  )
}
