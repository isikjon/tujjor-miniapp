import { ArrowUpDown, Check, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ProductQuery, SortKey, SourceMarket } from '../../../shared/types'
import { formatNumber, useT } from '../../../shared/i18n'
import { cx } from '../../../shared/lib/cx'
import { useDebouncedValue, useProductsCount } from '../../../shared/query/hooks'
import { Sheet } from '../../../shared/ui/Sheet'
import { Tap } from '../../../shared/ui/Tap'
import { countActive, FAST_DAYS, NO_FILTERS, parseAmount, SORTS, SOURCES, toQuery, type FilterState } from '../lib'
import { Btn, Chip, SwitchMark } from './controls'

// ── sort ────────────────────────────────────────────────────────────────────

export function SortSheet({ open, onClose, value, onChange }: { open: boolean; onClose: () => void; value: SortKey; onChange: (s: SortKey) => void }) {
  const t = useT()
  return (
    <Sheet open={open} onClose={onClose} title={t.t('filters.sort')}>
      <div className="a-sheetlist" role="radiogroup" aria-label={t.t('filters.sort')}>
        {SORTS.map((s) => (
          <Tap
            key={s}
            flat
            role="radio"
            aria-checked={s === value}
            className="a-sheetrow"
            onClick={() => {
              onChange(s)
              onClose()
            }}
          >
            <span className="a-sheetrow__text">{t.t(`sort.${s}`)}</span>
            {s === value ? <Check size={20} strokeWidth={2} className="a-sheetrow__check" aria-hidden="true" /> : null}
          </Tap>
        ))}
      </div>
    </Sheet>
  )
}

// ── filters ─────────────────────────────────────────────────────────────────

interface FiltersSheetProps {
  open: boolean
  onClose: () => void
  value: FilterState
  onApply: (v: FilterState) => void
  /** Query the filters are applied to (category / text) — used for the live count. */
  base: ProductQuery
}

export function FiltersSheet({ open, onClose, value, onApply, base }: FiltersSheetProps) {
  const t = useT()
  const [draft, setDraft] = useState(value)
  const [wasOpen, setWasOpen] = useState(open)
  // Re-sync the draft each time the sheet opens (state adjustment during render, no effect).
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setDraft(value)
  }
  const query = useMemo(() => ({ ...base, ...toQuery(draft) }), [base, draft])
  const debounced = useDebouncedValue(query, 200)
  const count = useProductsCount(debounced, open)
  const n = count.data
  const pending = count.isFetching || debounced !== query
  const dirty = countActive(draft) > 0

  const toggleSource = (s: SourceMarket) =>
    setDraft((d) => ({ ...d, sources: d.sources.includes(s) ? d.sources.filter((x) => x !== s) : [...d.sources, s] }))

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t.t('filters.title')}
      header={
        <div className="a-sheethead">
          <h2 className="sheet-title">{t.t('filters.title')}</h2>
          <Tap className="a-sheethead__action" disabled={!dirty} onClick={() => setDraft(NO_FILTERS)}>
            {t.t('action.reset')}
          </Tap>
        </div>
      }
      footer={
        <Btn
          block
          disabled={n === 0 && !pending}
          onClick={() => {
            onApply(draft)
            onClose()
          }}
        >
          {n == null ? t.t('action.apply') : n === 0 ? t.t('filters.showNone') : t.tp('filters.show', n)}
        </Btn>
      }
    >
      <div className="a-filters">
        <fieldset className="a-fset">
          <legend className="a-fset__title">{t.t('filters.source')}</legend>
          <div className="a-chiprow a-chiprow--wrap">
            {SOURCES.map((s) => (
              <Chip key={s} on={draft.sources.includes(s)} onClick={() => toggleSource(s)}>
                {t.t(`source.${s}`)}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="a-fset">
          <legend className="a-fset__title">{t.t('filters.price')}</legend>
          <div className="a-range">
            <label className="a-range__field">
              <span className="a-range__prefix">{t.t('filters.priceFrom')}</span>
              <input
                className="a-range__input"
                inputMode="numeric"
                enterKeyHint="done"
                autoComplete="off"
                placeholder="0"
                value={draft.priceMin != null ? formatNumber(draft.priceMin) : ''}
                onChange={(e) => {
                  const v = parseAmount(e.target.value)
                  setDraft((d) => ({ ...d, priceMin: v }))
                }}
              />
            </label>
            <span className="a-range__dash" aria-hidden="true" />
            <label className="a-range__field">
              <span className="a-range__prefix">{t.t('filters.priceTo')}</span>
              <input
                className="a-range__input"
                inputMode="numeric"
                enterKeyHint="done"
                autoComplete="off"
                placeholder="∞"
                value={draft.priceMax != null ? formatNumber(draft.priceMax) : ''}
                onChange={(e) => {
                  const v = parseAmount(e.target.value)
                  setDraft((d) => ({ ...d, priceMax: v }))
                }}
              />
            </label>
          </div>
        </fieldset>

        <div className="a-fset a-fset--rows">
          <ToggleRow label={t.t('filters.delivery')} hint={t.t('filters.deliveryUpTo', { n: FAST_DAYS })} on={draft.fast} onToggle={() => setDraft((d) => ({ ...d, fast: !d.fast }))} />
          <ToggleRow label={t.t('filters.rating')} on={draft.topRated} onToggle={() => setDraft((d) => ({ ...d, topRated: !d.topRated }))} />
          <ToggleRow label={t.t('filters.discounts')} on={draft.discounts} onToggle={() => setDraft((d) => ({ ...d, discounts: !d.discounts }))} />
        </div>
      </div>
    </Sheet>
  )
}

function ToggleRow({ label, hint, on, onToggle }: { label: string; hint?: string; on: boolean; onToggle: () => void }) {
  return (
    <Tap flat role="switch" aria-checked={on} className="a-togglerow" onClick={onToggle}>
      <span className="a-togglerow__text">
        <span>{label}</span>
        {hint ? <span className="a-togglerow__hint">{hint}</span> : null}
      </span>
      <SwitchMark on={on} />
    </Tap>
  )
}

// ── toolbar above grids ─────────────────────────────────────────────────────

export interface ActiveToken {
  id: string
  label: string
  onRemove: () => void
}

/** Sticky row under the compact title: sort, filters (+count) and removable active-filter tokens. */
export function GridToolbar({ sort, onSort, filtersCount, onFilters, tokens = [], sticky = 'bar' }: { sort: SortKey; onSort: () => void; filtersCount: number; onFilters: () => void; tokens?: ActiveToken[]; sticky?: 'bar' | 'top' }) {
  const t = useT()
  return (
    <div className={cx('a-toolbar', sticky === 'top' && 'a-toolbar--top')}>
      <div className="a-toolbar__scroll">
        <Tap className="a-tool" onClick={onSort} aria-haspopup="dialog">
          <ArrowUpDown size={15} strokeWidth={1.75} aria-hidden="true" />
          <span>{t.t(`sort.${sort}`)}</span>
        </Tap>
        <Tap className="a-tool" data-on={filtersCount > 0 || undefined} onClick={onFilters} aria-haspopup="dialog">
          <SlidersHorizontal size={15} strokeWidth={1.75} aria-hidden="true" />
          <span>{t.t('filters.title')}</span>
          {filtersCount > 0 ? <span className="a-tool__count">{filtersCount}</span> : null}
        </Tap>
        {tokens.map((tk) => (
          <Tap key={tk.id} className="a-tool a-tool--token" onClick={tk.onRemove} aria-label={`${tk.label} — ${t.t('action.reset')}`}>
            <span>{tk.label}</span>
            <X size={14} strokeWidth={2} aria-hidden="true" />
          </Tap>
        ))}
      </div>
    </div>
  )
}

/** Human labels for the active filters (used as removable tokens). */
export function filterTokens(f: FilterState, set: (f: FilterState) => void, t: ReturnType<typeof useT>): ActiveToken[] {
  const out: ActiveToken[] = []
  for (const s of f.sources) out.push({ id: `src-${s}`, label: t.t(`source.${s}`), onRemove: () => set({ ...f, sources: f.sources.filter((x) => x !== s) }) })
  if (f.priceMin != null || f.priceMax != null) {
    const label =
      f.priceMin != null && f.priceMax != null
        ? `${t.compact(f.priceMin)} – ${t.compact(f.priceMax)}`
        : f.priceMax != null
          ? `${t.t('filters.priceTo')} ${t.money(f.priceMax)}`
          : `${t.t('filters.priceFrom')} ${t.money(f.priceMin!)}`
    out.push({ id: 'price', label, onRemove: () => set({ ...f, priceMin: null, priceMax: null }) })
  }
  if (f.fast) out.push({ id: 'fast', label: t.t('filters.deliveryUpTo', { n: FAST_DAYS }), onRemove: () => set({ ...f, fast: false }) })
  if (f.topRated) out.push({ id: 'top', label: '★ 4,5+', onRemove: () => set({ ...f, topRated: false }) })
  if (f.discounts) out.push({ id: 'disc', label: t.t('badge.sale'), onRemove: () => set({ ...f, discounts: false }) })
  return out
}
