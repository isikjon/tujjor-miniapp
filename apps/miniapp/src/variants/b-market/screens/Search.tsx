import { ArrowUpRight, CircleAlert, ClipboardPaste, Clock, Link2, Search as SearchIcon, SearchX, ShoppingBag, TrendingUp, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useT } from '../../../shared/i18n'
import { useNav } from '../../../shared/nav/context'
import type { ScreenProps } from '../../../shared/nav/lazyScreen'
import { paths } from '../../../shared/nav/routes'
import { Screen } from '../../../shared/nav/Screen'
import { looksLikeLink, prefetchProduct, useCategories, useDebouncedValue, useHome, useProductsInfinite, useResolveLink, useSuggest } from '../../../shared/query/hooks'
import { useRecentSearches } from '../../../shared/store/recent'
import { toast } from '../../../shared/store/toast'
import type { CategoryId, ProductQuery, Suggestion } from '../../../shared/types'
import { CategoryIcon } from '../../../shared/ui/CategoryIcon'
import { Img } from '../../../shared/ui/Img'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { ErrorState } from '../../../shared/ui/States'
import { Tap } from '../../../shared/ui/Tap'
import { activeFilterCount, EMPTY_FILTERS, filtersFromParams, SOURCES, toProductQuery } from '../lib'
import { Button, Chip, EmptyView, FilterBar, Price, Rating, SourceBadge } from '../ui'
import { FeedGrid, VioletHead } from '../ui/g1/parts'
import '../styles/g1.css'

/** Bold the first occurrence of `q` inside `text`. */
function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

function SecHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="b1-ssec__head">
      <h2 className="b1-ssec__title">{title}</h2>
      {action}
    </div>
  )
}

export default function Search({ query }: ScreenProps) {
  const t = useT()
  const initialQ = (query.q ?? '').trim()
  const browse = !!(query.category || query.source || query.sort)

  const [text, setText] = useState(initialQ)
  const [submitted, setSubmitted] = useState(looksLikeLink(initialQ) ? '' : initialQ)
  const [scopeCat, setScopeCat] = useState<CategoryId | undefined>((query.category as CategoryId) || undefined)
  const [scoped, setScoped] = useState(browse)
  const [f, setF] = useState(() => filtersFromParams(query))
  const inputRef = useRef<HTMLInputElement>(null)
  const addRecent = useRecentSearches((s) => s.add)

  const trimmed = text.trim()
  const isLink = looksLikeLink(trimmed)
  const typing = trimmed !== submitted
  const mode: 'link' | 'suggest' | 'idle' | 'results' = isLink ? 'link' : typing ? (trimmed.length >= 2 ? 'suggest' : 'idle') : submitted || scoped ? 'results' : 'idle'

  // Autofocus (after the slide-in, so the keyboard doesn't fight the transition) when there is nothing to show yet.
  useEffect(() => {
    if (initialQ || browse) return
    const id = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 300)
    return () => clearTimeout(id)
  }, [initialQ, browse])

  useEffect(() => {
    if (initialQ && !looksLikeLink(initialQ)) addRecent(initialQ)
  }, [initialQ, addRecent])

  const submit = (raw: string) => {
    const v = raw.trim()
    if (!v) return
    setText(v)
    if (looksLikeLink(v)) return
    setSubmitted(v)
    addRecent(v)
    inputRef.current?.blur()
  }

  const clear = () => {
    setText('')
    setSubmitted('')
    if (!scopeCat && !f.sources.length) setScoped(false)
    inputRef.current?.focus({ preventScroll: true })
  }

  const paste = async () => {
    try {
      const v = (await navigator.clipboard.readText()).trim()
      if (v) {
        setText(v)
        if (!looksLikeLink(v)) submit(v)
        return
      }
    } catch {
      /* clipboard blocked */
    }
    toast({ text: t.t('b.pasteFail') })
    inputRef.current?.focus({ preventScroll: true })
  }

  const header = (
    <VioletHead>
      <form
        className="b1-sform"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          submit(text)
        }}
      >
        <label className="b1-sfield">
          <SearchIcon size={19} strokeWidth={2.3} aria-hidden="true" className="flex-none" style={{ color: 'var(--color-accent)' }} />
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.t('search.placeholder')}
            aria-label={t.t('search.placeholderShort')}
          />
          {text ? (
            <Tap className="b1-sclear" onClick={clear} aria-label={t.t('b.g1.clearInput')}>
              <X size={18} strokeWidth={2.4} aria-hidden="true" />
            </Tap>
          ) : null}
        </label>
        {trimmed && typing && !isLink ? (
          <Tap type="submit" className="b1-ssubmit">
            {t.t('b.g1.searchSubmit')}
          </Tap>
        ) : (
          <Tap className="b1-pastebtn" onClick={() => void paste()} aria-label={t.t('b.paste')} title={t.t('b.paste')}>
            <ClipboardPaste size={20} strokeWidth={2.2} aria-hidden="true" />
          </Tap>
        )}
      </form>
    </VioletHead>
  )

  return (
    <Screen header={header}>
      {mode === 'link' ? (
        <LinkResult text={trimmed} onSimilar={submit} />
      ) : mode === 'suggest' ? (
        <Suggestions q={trimmed} onSubmit={submit} />
      ) : mode === 'results' ? (
        <Results
          q={submitted}
          scopeCat={scopeCat}
          onClearScope={() => {
            setScopeCat(undefined)
            if (!submitted && !f.sources.length) setScoped(false)
          }}
          f={f}
          setF={setF}
        />
      ) : (
        <Idle onSubmit={submit} onPaste={() => void paste()} />
      )}
    </Screen>
  )
}

// ── idle: link hint, recents, trending, categories ─────────────────────────
function Idle({ onSubmit, onPaste }: { onSubmit: (q: string) => void; onPaste: () => void }) {
  const t = useT()
  const nav = useNav()
  const recent = useRecentSearches((s) => s.items)
  const remove = useRecentSearches((s) => s.remove)
  const clearAll = useRecentSearches((s) => s.clear)
  const home = useHome()
  const cats = useCategories()
  const trending = home.data?.trending ?? []
  return (
    <div className="pb-2">
      <div className="b1-ssec">
        <Tap flat className="b1-hint w-full text-left" onClick={onPaste}>
          <span className="b1-hint__icon">
            <Link2 size={20} strokeWidth={2.3} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="b1-hint__title block">{t.t('b.linkHintTitle')}</span>
            <span className="b1-hint__text block">{t.t('b.linkHintText')}</span>
            <span className="b1-hint__srcs">
              {SOURCES.map((s) => (
                <SourceBadge key={s} source={s} />
              ))}
            </span>
          </span>
        </Tap>
      </div>

      {recent.length ? (
        <div className="b1-ssec">
          <SecHead
            title={t.t('search.recent')}
            action={
              <Tap className="b1-ssec__action" onClick={clearAll}>
                {t.t('search.clearRecent')}
              </Tap>
            }
          />
          <div className="b1-rows">
            {recent.map((r) => (
              <div key={r} className="b1-row">
                <Clock size={18} strokeWidth={2.2} className="b1-row__icon" aria-hidden="true" />
                <Tap flat className="b1-row__text h-12 text-left" onClick={() => onSubmit(r)}>
                  {r}
                </Tap>
                <Tap className="b1-row__x" onClick={() => remove(r)} aria-label={t.t('b.g1.removeRecent')}>
                  <X size={17} strokeWidth={2.3} aria-hidden="true" />
                </Tap>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="b1-ssec">
        <SecHead title={t.t('search.trending')} />
        {home.isPending ? (
          <div className="b1-chips" aria-hidden="true">
            {[96, 120, 80, 132, 104, 88].map((w, i) => (
              <Skeleton key={i} style={{ height: 36, width: w, borderRadius: 999 }} />
            ))}
          </div>
        ) : (
          <div className="b1-chips">
            {trending.map((q, i) => {
              const v = t.l(q)
              return (
                <Chip key={i} icon={<TrendingUp size={14} strokeWidth={2.4} aria-hidden="true" style={{ color: 'var(--b-hot)' }} />} onClick={() => onSubmit(v)}>
                  {v}
                </Chip>
              )
            })}
          </div>
        )}
      </div>

      <div className="b1-ssec">
        <SecHead title={t.t('search.categories')} />
        <div className="b1-chips">
          {cats.data?.map((c) => (
            <Chip key={c.id} icon={<CategoryIcon id={c.id} size={15} strokeWidth={2.3} />} onClick={() => nav.push(paths.category(c.id))}>
              {t.l(c.name)}
            </Chip>
          )) ?? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} style={{ height: 36, width: 110, borderRadius: 999 }} />)}
        </div>
      </div>
    </div>
  )
}

// ── suggestions ────────────────────────────────────────────────────────────
function Suggestions({ q, onSubmit }: { q: string; onSubmit: (q: string) => void }) {
  const t = useT()
  const nav = useNav()
  const dq = useDebouncedValue(q)
  const sug = useSuggest(dq)
  const items: Suggestion[] = sug.data ?? []
  const pick = (s: Suggestion) => {
    if (s.kind === 'category' && s.categoryId) nav.push(paths.category(s.categoryId))
    else if (s.kind === 'product' && s.productId) nav.push(paths.product(s.productId))
    else onSubmit(t.l(s.text))
  }
  return (
    <div className="b1-ssec">
      <div className="b1-rows">
        <Tap flat className="b1-row" data-kind="submit" onClick={() => onSubmit(q)}>
          <SearchIcon size={18} strokeWidth={2.4} className="b1-row__icon" aria-hidden="true" />
          <span className="b1-row__text">{t.t('b.searchFor', { q })}</span>
        </Tap>
        {items.map((s, i) => {
          const label = t.l(s.text)
          return (
            <Tap
              key={`${s.kind}-${s.categoryId ?? s.productId ?? ''}-${i}`}
              flat
              className="b1-row"
              onClick={() => pick(s)}
              onPointerDown={s.productId ? () => prefetchProduct(s.productId!) : undefined}
            >
              {s.kind === 'category' && s.categoryId ? (
                <CategoryIcon id={s.categoryId} size={18} strokeWidth={2.2} className="b1-row__icon" />
              ) : s.kind === 'product' ? (
                <ShoppingBag size={18} strokeWidth={2.2} className="b1-row__icon" aria-hidden="true" />
              ) : (
                <SearchIcon size={18} strokeWidth={2.2} className="b1-row__icon" aria-hidden="true" />
              )}
              <span className="b1-row__text">
                <Highlight text={label} q={dq} />
              </span>
              {s.kind === 'category' ? <span className="b1-row__meta">{t.t('b.suggestCategory')}</span> : <ArrowUpRight size={17} strokeWidth={2.2} className="b1-row__icon mr-3" aria-hidden="true" />}
            </Tap>
          )
        })}
      </div>
    </div>
  )
}

// ── pasted link ────────────────────────────────────────────────────────────
function LinkResult({ text, onSimilar }: { text: string; onSimilar: (q: string) => void }) {
  const t = useT()
  const nav = useNav()
  const link = useResolveLink(text)
  if (link.isPending) {
    return (
      <div className="b1-link" aria-busy="true">
        <p className="b1-link__label" style={{ color: 'var(--color-ink-3)' }}>
          {t.t('b.linkChecking')}
        </p>
        <div className="b1-link__body">
          <Skeleton className="b1-link__img" style={{ aspectRatio: '1 / 1' }} />
          <div className="flex-1">
            <Skeleton style={{ height: 14, width: '90%' }} />
            <Skeleton style={{ height: 14, width: '70%', marginTop: 6 }} />
            <Skeleton style={{ height: 20, width: '50%', marginTop: 10 }} />
          </div>
        </div>
      </div>
    )
  }
  if (link.isError) {
    return (
      <div className="px-3 pt-3">
        <ErrorState compact error={link.error} onRetry={() => void link.refetch()} />
      </div>
    )
  }
  const hit = link.data
  if (!hit) {
    return (
      <div className="b1-link">
        <div className="b1-link__err">
          <CircleAlert size={20} strokeWidth={2.2} className="flex-none" style={{ color: 'var(--b-hot)' }} aria-hidden="true" />
          <span>{t.t('search.linkNotFound')}</span>
        </div>
      </div>
    )
  }
  const p = hit.product
  const title = t.l(p.title)
  return (
    <div className="b1-link">
      <p className="b1-link__label">
        <Link2 size={15} strokeWidth={2.4} aria-hidden="true" />
        {t.t('search.linkFound')}
      </p>
      <div className="b1-link__body">
        <Img className="b1-link__img" image={p.image} alt={title} sizes="96px" />
        <div className="min-w-0 flex-1">
          <SourceBadge source={hit.source} />
          <p className="b1-link__title">{title}</p>
          <Price price={p.price} old={p.oldPrice} size="md" showDiscount />
          <div className="mt-1">
            <Rating value={p.rating} reviews={p.reviews} />
          </div>
        </div>
      </div>
      <div className="b1-link__actions">
        <Button kind="secondary" onClick={() => onSimilar(title)}>
          {t.t('b.g1.findSimilar')}
        </Button>
        <Button onPointerDown={() => prefetchProduct(p.id)} onClick={() => nav.push(paths.product(p.id))}>
          {t.t('b.openProduct')}
        </Button>
      </div>
      <p className="b1-link__note">{t.t('search.linkDemo')}</p>
    </div>
  )
}

// ── results ────────────────────────────────────────────────────────────────
function Results({ q, scopeCat, onClearScope, f, setF }: { q: string; scopeCat?: CategoryId; onClearScope: () => void; f: ReturnType<typeof filtersFromParams>; setF: (v: ReturnType<typeof filtersFromParams>) => void }) {
  const t = useT()
  const nav = useNav()
  const cats = useCategories()
  const base = useMemo<ProductQuery>(() => ({ q: q || undefined, categoryId: scopeCat }), [q, scopeCat])
  const list = useProductsInfinite(toProductQuery(f, base))
  const cat = scopeCat ? cats.data?.find((c) => c.id === scopeCat) : undefined
  const filtered = activeFilterCount(f) > 0
  return (
    <>
      {scopeCat ? (
        <div className="b1-scope">
          <Chip on icon={<CategoryIcon id={scopeCat} size={15} strokeWidth={2.3} />} onClick={onClearScope} aria-label={t.t('b.g1.removeFilter')}>
            {cat ? t.l(cat.name) : t.t('filters.category')}
            <X size={14} strokeWidth={2.6} aria-hidden="true" />
          </Chip>
        </div>
      ) : null}
      <FilterBar value={f} onChange={setF} base={base} total={list.isPending ? undefined : list.total} />
      <FeedGrid
        list={list}
        empty={
          <EmptyView
            icon={<SearchX size={30} strokeWidth={2} aria-hidden="true" />}
            title={t.t('search.nothing')}
            text={t.t('search.nothingHint')}
            action={
              filtered ? (
                <Button kind="secondary" onClick={() => setF({ ...EMPTY_FILTERS, sort: f.sort })}>
                  {t.t('b.resetFilters')}
                </Button>
              ) : (
                <Button kind="secondary" onClick={() => nav.switchTab('catalog')}>
                  {t.t('action.toCatalog')}
                </Button>
              )
            }
          />
        }
      />
    </>
  )
}
