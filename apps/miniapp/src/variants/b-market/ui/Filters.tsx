import { ArrowUpDown, Check, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useT } from '../../../shared/i18n'
import { useProductsCount } from '../../../shared/query/hooks'
import type { ProductQuery, SortKey } from '../../../shared/types'
import { Sheet } from '../../../shared/ui/Sheet'
import { Tap } from '../../../shared/ui/Tap'
import { activeFilterCount, EMPTY_FILTERS, FAST_DAYS, isOriginalOnly, SORT_KEYS, SOURCES, toProductQuery, type FilterState } from '../lib'
import { Button, Chip } from './kit'

/**
 * Sticky filter bar: sort chip (→ SortSheet), "Фильтры" chip with active count (→ FiltersSheet),
 * quick toggles "Со скидкой" / "Быстрая доставка" / "Оригинал" (POIZON), and the result count line.
 * `base` = fixed part of the query (categoryId / q) used for the live count inside FiltersSheet.
 */
export function FilterBar({ value, onChange, base, total, hideSources, className }: { value: FilterState; onChange: (v: FilterState) => void; base: ProductQuery; total?: number; hideSources?: boolean; className?: string }) {
  const t = useT()
  const [sheet, setSheet] = useState<null | 'sort' | 'filters'>(null)
  const n = activeFilterCount(value)
  const original = isOriginalOnly(value)
  return (
    <div className={`b-filterbar ${className ?? ''}`}>
      <div className="b-filterbar__row">
        <Chip on={n > 0} count={n} icon={<SlidersHorizontal size={15} strokeWidth={2.3} aria-hidden="true" />} onClick={() => setSheet('filters')}>
          {t.t('filters.title')}
        </Chip>
        <Chip icon={<ArrowUpDown size={15} strokeWidth={2.3} aria-hidden="true" />} onClick={() => setSheet('sort')}>
          {t.t(`sort.${value.sort}`)}
          <ChevronDown size={14} strokeWidth={2.4} aria-hidden="true" />
        </Chip>
        <Chip on={value.discounts} onClick={() => onChange({ ...value, discounts: !value.discounts })}>
          {t.t('b.chip.discount')}
        </Chip>
        <Chip on={value.fast} onClick={() => onChange({ ...value, fast: !value.fast })}>
          {t.t('b.chip.fast')}
        </Chip>
        {!hideSources ? (
          <Chip on={original} onClick={() => onChange({ ...value, sources: original ? [] : ['poizon'] })}>
            {t.t('b.chip.original')}
          </Chip>
        ) : null}
      </div>
      {total != null ? <p className="b-filterbar__count">{t.tp('catalog.products', total)}</p> : null}
      <SortSheet open={sheet === 'sort'} onClose={() => setSheet(null)} value={value.sort} onChange={(sort) => onChange({ ...value, sort })} />
      <FiltersSheet open={sheet === 'filters'} onClose={() => setSheet(null)} value={value} onApply={onChange} base={base} hideSources={hideSources} />
    </div>
  )
}

/** Sort options list; picking one applies and closes. */
export function SortSheet({ open, onClose, value, onChange }: { open: boolean; onClose: () => void; value: SortKey; onChange: (k: SortKey) => void }) {
  const t = useT()
  return (
    <Sheet open={open} onClose={onClose} title={t.t('filters.sort')}>
      <div className="b-sheet-list">
        {SORT_KEYS.map((k) => (
          <Tap
            key={k}
            flat
            className="b-sheet-row"
            data-on={k === value}
            aria-pressed={k === value}
            onClick={() => {
              onChange(k)
              onClose()
            }}
          >
            {t.t(`sort.${k}`)}
            {k === value ? <Check className="b-sheet-row__check" size={20} strokeWidth={2.6} aria-hidden="true" /> : null}
          </Tap>
        ))}
      </div>
    </Sheet>
  )
}

const digits = (s: string) => {
  const n = parseInt(s.replace(/\D/g, ''), 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/**
 * Filters: sources, price range, delivery ≤ 14 days, rating ≥ 4.5, discounts. Works on a draft
 * (reset each time it opens); live count via useProductsCount; "Сбросить" + "Показать N товаров".
 */
export function FiltersSheet({ open, onClose, value, onApply, base, hideSources }: { open: boolean; onClose: () => void; value: FilterState; onApply: (v: FilterState) => void; base: ProductQuery; hideSources?: boolean }) {
  const t = useT()
  const [draft, setDraft] = useState(value)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setDraft(value)
  }
  const count = useProductsCount(toProductQuery(draft, base), open)
  const n = count.data
  const set = (p: Partial<FilterState>) => setDraft((d) => ({ ...d, ...p }))
  const toggle = (k: 'fast' | 'topRated' | 'discounts', title: string, sub?: string) => (
    <Tap flat className="b-switch-row" aria-pressed={draft[k]} onClick={() => set({ [k]: !draft[k] })}>
      <span className="b-switch-row__text">
        <span className="b-switch-row__title block">{title}</span>
        {sub ? <span className="b-switch-row__sub block">{sub}</span> : null}
      </span>
      <span className="b-switch" data-on={draft[k]} aria-hidden="true" />
    </Tap>
  )
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t.t('filters.title')}
      footer={
        <div className="b-sheet-foot">
          <Button kind="secondary" size="lg" onClick={() => setDraft({ ...EMPTY_FILTERS, sort: draft.sort })}>
            {t.t('action.reset')}
          </Button>
          <Button
            size="lg"
            loading={count.isFetching && n == null}
            disabled={n === 0}
            onClick={() => {
              onApply(draft)
              onClose()
            }}
          >
            {n === 0 ? t.t('filters.showNone') : n == null ? t.t('action.apply') : t.tp('filters.show', n)}
          </Button>
        </div>
      }
    >
      {!hideSources ? (
        <section className="b-fsec">
          <h3 className="b-fsec__title">{t.t('filters.source')}</h3>
          <div className="b-fsec__chips">
            {SOURCES.map((s) => {
              const on = draft.sources.includes(s)
              return (
                <Chip key={s} tone="tile" on={on} onClick={() => set({ sources: on ? draft.sources.filter((x) => x !== s) : [...draft.sources, s] })}>
                  {t.t(`source.${s}`)}
                </Chip>
              )
            })}
          </div>
        </section>
      ) : null}
      <section className="b-fsec">
        <h3 className="b-fsec__title">{t.t('filters.price')}</h3>
        <div className="b-price-inputs">
          <input
            className="b-input"
            inputMode="numeric"
            placeholder={t.t('filters.priceFrom')}
            aria-label={t.t('filters.priceFrom')}
            value={draft.priceMin != null ? String(draft.priceMin) : ''}
            onChange={(e) => set({ priceMin: digits(e.target.value) })}
          />
          <input
            className="b-input"
            inputMode="numeric"
            placeholder={t.t('filters.priceTo')}
            aria-label={t.t('filters.priceTo')}
            value={draft.priceMax != null ? String(draft.priceMax) : ''}
            onChange={(e) => set({ priceMax: digits(e.target.value) })}
          />
        </div>
      </section>
      <section className="b-fsec">
        {toggle('fast', t.t('b.chip.fast'), t.t('b.fastDesc', { n: FAST_DAYS }))}
        {toggle('topRated', t.t('filters.rating'))}
        {toggle('discounts', t.t('filters.discounts'))}
      </section>
    </Sheet>
  )
}
