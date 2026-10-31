import { ArrowDownUp, BadgeCheck, ChevronDown, Factory, Globe, SearchX, SlidersHorizontal } from 'lucide-react'
import { useCallback, useState, type PointerEvent, type ReactNode } from 'react'
import { useT } from '../../../../shared/i18n'
import { useProductsCount, useProductsInfinite } from '../../../../shared/query/hooks'
import { useMainButton } from '../../../../shared/telegram/hooks'
import type { ProductQuery, SortKey, SourceMarket } from '../../../../shared/types'
import { Sheet } from '../../../../shared/ui/Sheet'
import { Skeleton } from '../../../../shared/ui/Skeleton'
import { ErrorState } from '../../../../shared/ui/States'
import { Tap } from '../../../../shared/ui/Tap'
import { VirtualGrid } from '../../../../shared/ui/VirtualGrid'
import { Cell, CheckCell, Group } from '../Cell'
import { EmptyView, SheetBar, SheetClose, Spinner, Squircle, Switch } from '../controls'
import { SORTS, SOURCES, SOURCE_COLOR, filterCount } from '../lib'
import { GridItem, GridSkeleton, productKey } from './ProductCard'

export type FilterValue = Pick<ProductQuery, 'sources' | 'priceMin' | 'priceMax' | 'maxDeliveryDays' | 'minRating' | 'onlyDiscounts'>

export const SOURCE_ICON: Record<SourceMarket, typeof Factory> = { '1688': Factory, alibaba: Globe, poizon: BadgeCheck }

const digits = (s: string) => {
  const d = s.replace(/\D/g, '').slice(0, 10)
  return d ? Number(d) : undefined
}
const group = (n: number | undefined) => (n == null ? '' : n.toLocaleString('ru-RU').replace(/ /g, ' '))

/**
 * The shared Sheet captures the pointer on its header (drag-to-dismiss), which retargets the click away from
 * buttons placed in the header. Stopping pointerdown here keeps SheetBar buttons clickable.
 */
const stopDrag = (e: PointerEvent) => e.stopPropagation()
export function NoDrag({ children }: { children: ReactNode }) {
  return (
    <span className="g1-nodrag" onPointerDown={stopDrag}>
      {children}
    </span>
  )
}

/** Drops empty values so filterCount() and query keys stay canonical. */
function clean(f: FilterValue): FilterValue {
  const out: FilterValue = {}
  if (f.sources?.length) out.sources = f.sources
  if (f.priceMin) out.priceMin = f.priceMin
  if (f.priceMax) out.priceMax = f.priceMax
  if (f.maxDeliveryDays) out.maxDeliveryDays = f.maxDeliveryDays
  if (f.minRating) out.minRating = f.minRating
  if (f.onlyDiscounts) out.onlyDiscounts = true
  return out
}

/** Sticky toolbar: sort + filters sheets and one-tap marketplace toggles (44 px targets, pills inside). */
export function Toolbar({
  sort,
  onSort,
  filters,
  onFilters,
  base,
  lead,
}: {
  sort: SortKey
  onSort: (s: SortKey) => void
  filters: FilterValue
  onFilters: (f: FilterValue) => void
  /** Query part the sheet does not control (q, category) — used for the live count. */
  base: ProductQuery
  lead?: ReactNode
}) {
  const t = useT()
  const [sortOpen, setSortOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const n = filterCount(filters)
  const toggleSource = (s: SourceMarket) => {
    const cur = filters.sources ?? []
    onFilters(clean({ ...filters, sources: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s] }))
  }
  return (
    <>
      <div className="d-sticky">
        <div className="g1-toolbar">
          <Tap flat className="g1-chip" onClick={() => setSortOpen(true)} aria-haspopup="dialog">
            <span className="d-pill" data-on={sort !== 'popular'}>
              <ArrowDownUp size={15} strokeWidth={2.2} aria-hidden="true" />
              {t.t(`sort.${sort}`)}
              <ChevronDown size={15} strokeWidth={2.2} aria-hidden="true" className="g1-chev" />
            </span>
          </Tap>
          <Tap flat className="g1-chip" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
            <span className="d-pill" data-on={n > 0}>
              <SlidersHorizontal size={15} strokeWidth={2.2} aria-hidden="true" />
              {t.t('filters.title')}
              {n ? <span className="g1-pill-count">{n}</span> : null}
            </span>
          </Tap>
          {lead}
          {SOURCES.map((s) => {
            const on = !!filters.sources?.includes(s)
            return (
              <Tap key={s} flat className="g1-chip" aria-pressed={on} onClick={() => toggleSource(s)}>
                <span className="d-pill" data-on={on}>
                  {t.t(`source.${s}`)}
                </span>
              </Tap>
            )
          })}
        </div>
      </div>
      <SortSheet open={sortOpen} onClose={() => setSortOpen(false)} value={sort} onChange={onSort} />
      <FiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} value={filters} onApply={onFilters} base={base} />
    </>
  )
}

export function SortSheet({ open, onClose, value, onChange }: { open: boolean; onClose: () => void; value: SortKey; onChange: (s: SortKey) => void }) {
  const t = useT()
  return (
    <Sheet open={open} onClose={onClose} title={t.t('filters.sort')} header={
        <SheetBar
          title={t.t('filters.sort')}
          right={
            <NoDrag>
              <SheetClose onClose={onClose} />
            </NoDrag>
          }
        />
      }>
      <Group>
        {SORTS.map((s) => (
          <CheckCell
            key={s}
            title={t.t(`sort.${s}`)}
            checked={s === value}
            onClick={() => {
              if (s !== value) onChange(s)
              onClose()
            }}
          />
        ))}
      </Group>
    </Sheet>
  )
}

/**
 * Filters sheet: edits a draft, shows the live result count and applies through the Telegram MainButton
 * ("Показать N товаров") — the screen has no other primary CTA while the sheet is open.
 */
export function FiltersSheet({ open, onClose, value, onApply, base }: { open: boolean; onClose: () => void; value: FilterValue; onApply: (f: FilterValue) => void; base: ProductQuery }) {
  const t = useT()
  const [draft, setDraft] = useState<FilterValue>(value)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setDraft(value)
  }
  const countQ = useProductsCount({ ...base, ...clean(draft) }, open)
  const count = countQ.data
  const set = (patch: Partial<FilterValue>) => setDraft((d) => ({ ...d, ...patch }))
  const apply = () => {
    onApply(clean(draft))
    onClose()
  }
  useMainButton(
    open
      ? {
          text: count == null ? t.t('action.apply') : count > 0 ? t.tp('filters.show', count) : t.t('filters.showNone'),
          onClick: apply,
          active: count !== 0,
          progress: countQ.isFetching && count == null,
        }
      : null,
  )
  const sources = draft.sources ?? []
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t.t('filters.title')}
      header={
        <SheetBar
          title={t.t('filters.title')}
          left={
            filterCount(clean(draft)) > 0 ? (
              <NoDrag>
                <Tap className="d-sheetbar-btn" haptic="light" onClick={() => setDraft({})}>
                  {t.t('d.filters.reset')}
                </Tap>
              </NoDrag>
            ) : null
          }
          right={
            <NoDrag>
              <SheetClose onClose={onClose} />
            </NoDrag>
          }
        />
      }
    >
      <Group header={t.t('filters.source')}>
        {SOURCES.map((s) => {
          const Icon = SOURCE_ICON[s]
          return (
            <CheckCell
              key={s}
              icon={
                <Squircle color={SOURCE_COLOR[s]}>
                  <Icon size={17} strokeWidth={2.3} />
                </Squircle>
              }
              title={t.t(`source.${s}`)}
              subtitle={t.t(`source.${s}.desc`)}
              checked={sources.includes(s)}
              onClick={() => set({ sources: sources.includes(s) ? sources.filter((x) => x !== s) : [...sources, s] })}
            />
          )
        })}
      </Group>

      <Group header={t.t('d.filters.priceRange')}>
        <label className="d-cell g1-field">
          <span className="g1-field-label">{t.t('filters.priceFrom')}</span>
          <input className="d-input" inputMode="numeric" enterKeyHint="done" placeholder="0" value={group(draft.priceMin)} onChange={(e) => set({ priceMin: digits(e.target.value) })} aria-label={`${t.t('filters.price')} ${t.t('filters.priceFrom')}`} />
          <span className="g1-field-unit">{t.t('currency.uzs')}</span>
        </label>
        <label className="d-cell g1-field">
          <span className="g1-field-label">{t.t('filters.priceTo')}</span>
          <input className="d-input" inputMode="numeric" enterKeyHint="done" placeholder={t.t('filters.any')} value={group(draft.priceMax)} onChange={(e) => set({ priceMax: digits(e.target.value) })} aria-label={`${t.t('filters.price')} ${t.t('filters.priceTo')}`} />
          <span className="g1-field-unit">{t.t('currency.uzs')}</span>
        </label>
      </Group>

      <Group header={t.t('d.filters.quality')} footer={t.t('d.g1.filtersFooter')}>
        <Cell title={t.t('d.filters.deliveryFast')} after={<Switch label={t.t('d.filters.deliveryFast')} checked={draft.maxDeliveryDays === 14} onChange={(v) => set({ maxDeliveryDays: v ? 14 : undefined })} />} />
        <Cell title={t.t('filters.rating')} after={<Switch label={t.t('filters.rating')} checked={draft.minRating === 4.5} onChange={(v) => set({ minRating: v ? 4.5 : undefined })} />} />
        <Cell title={t.t('filters.discounts')} after={<Switch label={t.t('filters.discounts')} checked={!!draft.onlyDiscounts} onChange={(v) => set({ onlyDiscounts: v || undefined })} />} />
      </Group>
    </Sheet>
  )
}

function ListFooter({ loading, end }: { loading: boolean; end: boolean }) {
  const t = useT()
  return <div className="g1-end">{loading ? <Spinner /> : end ? t.t('d.end') : null}</div>
}

/** Product results: skeleton → grid (virtualised, infinite) / empty / error, previous page dimmed while refetching. */
export function ProductResults({ query, onReset, showCount = true }: { query: ProductQuery; onReset?: () => void; showCount?: boolean }) {
  const t = useT()
  const q = useProductsInfinite(query)
  const { items, total, fetchNextPage } = q
  const onEnd = useCallback(() => void fetchNextPage(), [fetchNextPage])
  if (q.isPending || (q.isPlaceholderData && !items.length)) {
    return (
      <>
        {showCount ? (
          <p className="g1-count">
            <Skeleton style={{ display: 'inline-block', width: 128, height: 12 }} />
          </p>
        ) : null}
        <GridSkeleton />
      </>
    )
  }
  if (q.isError && !items.length) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />
  if (!items.length) {
    return (
      <EmptyView
        icon={<SearchX size={44} strokeWidth={1.8} />}
        title={t.t('search.nothing')}
        text={t.t('search.nothingHint')}
        action={
          onReset ? (
            <Tap className="d-btn d-btn-tinted" onClick={onReset}>
              {t.t('d.search.clearFilters')}
            </Tap>
          ) : null
        }
      />
    )
  }
  return (
    <div className="d-dim" data-on={q.isPlaceholderData}>
      {showCount ? <p className="g1-count">{t.tp('search.results', total)}</p> : null}
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
        footer={<ListFooter loading={q.isFetchingNextPage} end={!q.hasNextPage} />}
      />
    </div>
  )
}
