import { ArrowUpLeft, Clock, LayoutGrid, Link2, Search as SearchIcon, X } from 'lucide-react'
import { memo, useMemo, useRef, useState, type FormEvent } from 'react'
import type { CategoryId, ProductQuery, SortKey, Suggestion } from '../../../shared/types'
import { useT } from '../../../shared/i18n'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { useNav } from '../../../shared/nav/context'
import { Link } from '../../../shared/nav/Link'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import {
  looksLikeLink,
  prefetchProduct,
  useCategories,
  useDebouncedValue,
  useHome,
  useProductsInfinite,
  useResolveLink,
  useSuggest,
} from '../../../shared/query/hooks'
import { useRecentSearches } from '../../../shared/store/recent'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { EmptyState, ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { countActive, filtersFromParams, isCategory, isSort, NO_FILTERS, toQuery, type FilterState } from '../lib'
import { Btn, Chip, Price } from '../ui/controls'
import { FiltersSheet, filterTokens, GridToolbar, SortSheet, type ActiveToken } from '../ui/FilterSheets'
import { ProductGrid } from '../ui/ProductGrid'
import '../styles/g1.css'

export default function Search({ query }: ScreenProps) {
  const t = useT()
  const nav = useNav()
  const inputRef = useRef<HTMLInputElement>(null)
  const addRecent = useRecentSearches((s) => s.add)

  const initialQ = (query.q ?? '').trim()
  const [text, setText] = useState(initialQ)
  const [committed, setCommitted] = useState(initialQ)
  const [category, setCategory] = useState<CategoryId | null>(isCategory(query.category) ? query.category : null)
  const [sort, setSort] = useState<SortKey>(isSort(query.sort) ? query.sort : 'popular')
  const [sortSet, setSortSet] = useState(isSort(query.sort))
  const [filters, setFilters] = useState<FilterState>(() => filtersFromParams(query))
  const [sheet, setSheet] = useState<'sort' | 'filters' | null>(null)

  const trimmed = text.trim()
  const isLink = looksLikeLink(trimmed)
  const hasScope = !!category || countActive(filters) > 0 || sortSet
  const mode: 'link' | 'typing' | 'results' | 'idle' = isLink
    ? 'link'
    : trimmed && trimmed !== committed
      ? 'typing'
      : committed || hasScope
        ? 'results'
        : 'idle'

  const commit = (value: string) => {
    const v = value.trim()
    if (!v) return
    setText(v)
    setCommitted(v)
    addRecent(v)
    inputRef.current?.blur()
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (isLink) {
      inputRef.current?.blur()
      return
    }
    commit(text)
  }
  const clear = () => {
    setText('')
    setCommitted('')
    inputRef.current?.focus()
  }
  const cancel = () => (nav.canGoBack ? nav.back() : nav.switchTab('home'))

  const header = (
    <form className="a-g1-sbar" role="search" onSubmit={onSubmit}>
      <label className="a-g1-sfield">
        <SearchIcon size={18} strokeWidth={1.75} aria-hidden="true" className="a-g1-sfield__icon" />
        <input
          ref={inputRef}
          className="a-g1-sfield__input"
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={!initialQ && !hasScope}
          placeholder={t.t('search.placeholderShort')}
          aria-label={t.t('search.placeholderShort')}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {text ? (
          <Tap flat className="a-g1-sfield__clear" onClick={clear} aria-label={t.t('a.g1.clear')}>
            <X size={14} strokeWidth={2.5} aria-hidden="true" />
          </Tap>
        ) : null}
      </label>
      <Tap flat className="a-g1-sbar__cancel" onClick={cancel}>
        {t.t('action.cancel')}
      </Tap>
    </form>
  )

  return (
    <Screen header={header}>
      {mode === 'link' ? (
        <LinkResult text={trimmed} />
      ) : mode === 'typing' ? (
        <Suggestions text={trimmed} onCommit={commit} />
      ) : mode === 'results' ? (
        <Results
          q={committed}
          category={category}
          setCategory={setCategory}
          sort={sort}
          setSort={(s) => {
            setSort(s)
            setSortSet(true)
          }}
          filters={filters}
          setFilters={setFilters}
          sheet={sheet}
          setSheet={setSheet}
        />
      ) : (
        <Idle onCommit={commit} />
      )}
    </Screen>
  )
}

// ── idle: recent + trending + categories ───────────────────────────────────

function Idle({ onCommit }: { onCommit: (q: string) => void }) {
  const t = useT()
  const recent = useRecentSearches((s) => s.items)
  const remove = useRecentSearches((s) => s.remove)
  const clearAll = useRecentSearches((s) => s.clear)
  const home = useHome()
  const cats = useCategories()
  const trending = home.data?.trending ?? []

  return (
    <div className="a-g1-idle">
      {recent.length ? (
        <section className="a-g1-block a-gutter">
          <div className="a-sechead">
            <h2 className="a-h3">{t.t('search.recent')}</h2>
            <Tap flat className="a-g1-textbtn" onClick={clearAll}>
              {t.t('search.clearRecent')}
            </Tap>
          </div>
          <ul className="a-g1-list">
            {recent.map((r) => (
              <li key={r} className="a-g1-row">
                <Tap flat className="a-g1-row__main" onClick={() => onCommit(r)}>
                  <Clock size={18} strokeWidth={1.5} aria-hidden="true" className="a-g1-row__icon" />
                  <span className="a-g1-row__text">{r}</span>
                </Tap>
                <Tap flat className="a-g1-row__x" onClick={() => remove(r)} aria-label={`${t.t('action.delete')}: ${r}`}>
                  <X size={16} strokeWidth={1.75} aria-hidden="true" />
                </Tap>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="a-g1-block a-gutter">
        <h2 className="a-h3 a-g1-blockhead">{t.t('search.trending')}</h2>
        {home.data ? (
          <div className="a-chiprow a-chiprow--wrap">
            {trending.map((q) => {
              const label = t.l(q)
              return (
                <Chip key={label} onClick={() => onCommit(label)}>
                  {label}
                </Chip>
              )
            })}
          </div>
        ) : home.isError ? (
          <ErrorState compact error={home.error} onRetry={() => void home.refetch()} />
        ) : (
          <div className="a-chiprow a-chiprow--wrap" aria-hidden="true">
            {[96, 120, 80, 140, 104, 88].map((w, i) => (
              <Skeleton key={i} className="a-g1-chipskel" style={{ width: w }} />
            ))}
          </div>
        )}
      </section>

      <section className="a-g1-block a-gutter">
        <h2 className="a-h3 a-g1-blockhead">{t.t('search.categories')}</h2>
        {cats.data ? (
          <div className="a-g1-catgrid">
            {cats.data.map((c) => (
              <Link key={c.id} to={paths.category(c.id)} className="a-g1-cat">
                <Img image={c.image} alt="" sizes="72px" className="a-g1-cat__img" />
                <span className="a-g1-cat__name">{t.l(c.name)}</span>
              </Link>
            ))}
          </div>
        ) : cats.isError ? (
          <ErrorState compact error={cats.error} onRetry={() => void cats.refetch()} />
        ) : (
          <div className="a-g1-catgrid" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="a-g1-cat">
                <Skeleton className="a-g1-cat__img" />
                <Skeleton style={{ width: '60%', height: 13 }} />
              </div>
            ))}
          </div>
        )}
        <p className="a-note">{t.t('search.hint')}</p>
      </section>
    </div>
  )
}

// ── typing: debounced suggestions ──────────────────────────────────────────

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

function Suggestions({ text, onCommit }: { text: string; onCommit: (q: string) => void }) {
  const t = useT()
  const nav = useNav()
  const debounced = useDebouncedValue(text, 200)
  const sug = useSuggest(debounced)
  const items = debounced.length >= 2 ? (sug.data ?? []) : []

  const open = (s: Suggestion) => {
    const label = t.l(s.text)
    if (s.kind === 'category' && s.categoryId) nav.push(paths.category(s.categoryId))
    else if (s.kind === 'product' && s.productId) nav.push(paths.product(s.productId))
    else onCommit(label)
  }

  return (
    <ul className="a-g1-list a-g1-sugs a-gutter" data-busy={sug.isFetching || debounced !== text || undefined}>
      <li className="a-g1-row">
        <Tap flat className="a-g1-row__main" onClick={() => onCommit(text)}>
          <SearchIcon size={18} strokeWidth={1.5} aria-hidden="true" className="a-g1-row__icon" />
          <span className="a-g1-row__text">{t.t('a.g1.searchFor', { q: text })}</span>
        </Tap>
      </li>
      {items.map((s, i) => {
        const label = t.l(s.text)
        return (
          <li key={`${s.kind}-${label}-${i}`} className="a-g1-row">
            <Tap
              flat
              className="a-g1-row__main"
              onClick={() => open(s)}
              onPointerDown={s.kind === 'product' && s.productId ? () => prefetchProduct(s.productId!) : undefined}
            >
              {s.kind === 'category' ? (
                <LayoutGrid size={18} strokeWidth={1.5} aria-hidden="true" className="a-g1-row__icon" />
              ) : (
                <SearchIcon size={18} strokeWidth={1.5} aria-hidden="true" className="a-g1-row__icon" />
              )}
              <span className="a-g1-row__text">
                <Highlight text={label} q={text} />
              </span>
              {s.kind === 'category' ? <span className="a-g1-row__kind">{t.t('filters.category')}</span> : null}
            </Tap>
            {s.kind === 'query' ? (
              <Tap flat className="a-g1-row__x" onClick={() => onCommit(label)} aria-label={label}>
                <ArrowUpLeft size={16} strokeWidth={1.75} aria-hidden="true" />
              </Tap>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

// ── pasted supplier link ───────────────────────────────────────────────────

function LinkResult({ text }: { text: string }) {
  const t = useT()
  const res = useResolveLink(text)
  return (
    <section className="a-gutter a-g1-link">
      <p className="a-eyebrow a-g1-link__eyebrow">
        <Link2 size={14} strokeWidth={1.75} aria-hidden="true" /> {t.t('search.byLink')}
      </p>
      {res.isPending ? (
        <div className="a-g1-found" aria-hidden="true">
          <Skeleton className="a-g1-found__img" />
          <span className="a-g1-found__body">
            <Skeleton style={{ width: '40%', height: 11 }} />
            <Skeleton style={{ width: '90%', height: 15, marginTop: 10 }} />
            <Skeleton style={{ width: '50%', height: 17, marginTop: 12 }} />
          </span>
        </div>
      ) : res.isError ? (
        <ErrorState compact error={res.error} onRetry={() => void res.refetch()} />
      ) : res.data ? (
        <>
          <h2 className="a-h2 a-g1-link__title">{t.t('search.linkFound')}</h2>
          <Link to={paths.product(res.data.product.id)} onIntent={() => prefetchProduct(res.data!.product.id)} className="a-g1-found">
            <Img image={res.data.product.image} alt="" sizes="112px" className="a-g1-found__img" />
            <span className="a-g1-found__body">
              <span className="a-card__eyebrow">{t.t('search.linkDetected', { source: t.t(`source.${res.data.source}`) })}</span>
              <span className="a-g1-found__title">{t.l(res.data.product.title)}</span>
              <Price value={res.data.product.price} old={res.data.product.oldPrice} size="md" />
            </span>
          </Link>
          <p className="a-note">{t.t('search.linkDemo')}</p>
        </>
      ) : (
        <EmptyState icon={<Link2 size={36} strokeWidth={1.5} />} title={t.t('a.g1.linkUnknown')} text={t.t('search.linkNotFound')} className="a-state" />
      )}
    </section>
  )
}

// ── results ────────────────────────────────────────────────────────────────

interface ResultsProps {
  q: string
  category: CategoryId | null
  setCategory: (c: CategoryId | null) => void
  sort: SortKey
  setSort: (s: SortKey) => void
  filters: FilterState
  setFilters: (f: FilterState) => void
  sheet: 'sort' | 'filters' | null
  setSheet: (s: 'sort' | 'filters' | null) => void
}

const Results = memo(function Results({ q, category, setCategory, sort, setSort, filters, setFilters, sheet, setSheet }: ResultsProps) {
  const t = useT()
  const cats = useCategories()
  const base = useMemo<ProductQuery>(() => ({ q: q || undefined, categoryId: category ?? undefined }), [q, category])
  const productQuery = useMemo<ProductQuery>(() => ({ ...base, sort, ...toQuery(filters) }), [base, sort, filters])
  const products = useProductsInfinite(productQuery)
  const active = countActive(filters)

  const tokens: ActiveToken[] = []
  if (category) {
    const c = cats.data?.find((x) => x.id === category)
    tokens.push({ id: 'cat', label: c ? t.l(c.name) : t.t('filters.category'), onRemove: () => setCategory(null) })
  }
  tokens.push(...filterTokens(filters, setFilters, t))

  return (
    <>
      <GridToolbar sticky="top" sort={sort} onSort={() => setSheet('sort')} filtersCount={active} onFilters={() => setSheet('filters')} tokens={tokens} />
      <p className="a-g1-total a-gutter" aria-live="polite">
        {products.isPending ? <Skeleton className="a-g1-countskel" /> : t.tp('search.results', products.total)}
      </p>
      <div className="a-gutter a-g1-results">
        <ProductGrid
          q={products}
          skeletonRows={3}
          empty={
            <EmptyState
              className="a-state"
              icon={<SearchIcon size={36} strokeWidth={1.5} />}
              title={t.t('search.nothing')}
              text={t.t('search.nothingHint')}
              action={
                active || category ? (
                  <Btn
                    size="md"
                    onClick={() => {
                      setFilters(NO_FILTERS)
                      setCategory(null)
                    }}
                  >
                    {t.t('a.g1.resetFilters')}
                  </Btn>
                ) : null
              }
            />
          }
        />
      </div>
      <SortSheet open={sheet === 'sort'} onClose={() => setSheet(null)} value={sort} onChange={setSort} />
      <FiltersSheet open={sheet === 'filters'} onClose={() => setSheet(null)} value={filters} onApply={setFilters} base={base} />
    </>
  )
})
