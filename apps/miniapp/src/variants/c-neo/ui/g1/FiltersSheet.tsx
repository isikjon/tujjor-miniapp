import { useEffect, useMemo, useState } from 'react'
import type { CategoryId, ProductQuery, SourceMarket } from '../../../../shared/types'
import { formatNumber, useT } from '../../../../shared/i18n'
import { useCategories, useProductsCount } from '../../../../shared/query/hooks'
import { Sheet } from '../../../../shared/ui/Sheet'
import { Tap } from '../../../../shared/ui/Tap'
import { activeCount, EMPTY_FILTERS, SOURCES, toQuery, type FilterState } from '../../lib/util'
import { SOURCE_NAME, Spinner, Switch } from '../bits'
import '../../styles/g1.css'

const PRESETS: Array<{ min?: number; max?: number }> = [{ max: 150_000 }, { min: 150_000, max: 500_000 }, { min: 500_000, max: 2_000_000 }, { min: 2_000_000 }]

const digits = (s: string) => {
  const d = s.replace(/\D/g, '').slice(0, 10)
  return d ? Number(d) : undefined
}

interface Props {
  open: boolean
  onClose: () => void
  value: FilterState
  onApply: (f: FilterState) => void
  /** Query parts the sheet does not edit (search text, sort, a fixed category). */
  base: ProductQuery
  /** Show the category picker (search screen). */
  withCategory?: boolean
}

/** Filters sheet: draft state, live result count from the server, reset + apply. */
export function FiltersSheet({ open, onClose, value, onApply, base, withCategory }: Props) {
  const t = useT()
  const [draft, setDraft] = useState<FilterState>(value)
  const cats = useCategories()

  useEffect(() => {
    if (open) setDraft(value)
    // the draft restarts from the applied filters every time the sheet opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const invalid = draft.priceMin != null && draft.priceMax != null && draft.priceMin > draft.priceMax
  const query = useMemo<ProductQuery>(() => ({ ...base, ...toQuery(draft) }), [base, draft])
  const count = useProductsCount(query, open && !invalid)
  const n = typeof count.data === 'number' ? count.data : null

  const set = (patch: Partial<FilterState>) => setDraft((d) => ({ ...d, ...patch }))
  const toggleSource = (s: SourceMarket) => set({ sources: draft.sources.includes(s) ? draft.sources.filter((x) => x !== s) : [...draft.sources, s] })
  const reset = () => setDraft({ ...EMPTY_FILTERS, categoryId: withCategory ? undefined : draft.categoryId })
  const dirty = activeCount(draft, withCategory) > 0

  const presetLabel = (p: { min?: number; max?: number }) =>
    p.min == null ? t.t('c.g1.priceUpTo', { v: formatNumber(p.max!) }) : p.max == null ? t.t('c.g1.priceFrom', { v: formatNumber(p.min) }) : `${formatNumber(p.min)} – ${formatNumber(p.max)}`

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t.t('filters.title')}
      footer={
        <div className="g1-sheetfoot">
          <Tap className="c-btn2" onClick={reset} disabled={!dirty} aria-disabled={!dirty}>
            {t.t('action.reset')}
          </Tap>
          <Tap
            className="c-cta g1-apply"
            haptic="light"
            disabled={invalid}
            onClick={() => {
              onApply(draft)
              onClose()
            }}
          >
            {count.isFetching && n == null ? <Spinner /> : null}
            <span className="truncate" data-busy={count.isFetching || undefined}>
              {invalid ? t.t('c.g1.priceInvalid') : n == null ? t.t('action.apply') : n === 0 ? t.t('filters.showNone') : t.tp('filters.show', n)}
            </span>
          </Tap>
        </div>
      }
    >
      <div className="g1-filters">
        {withCategory ? (
          <section>
            <h3 className="c-kicker g1-fh">{t.t('filters.category')}</h3>
            <div className="g1-wrap">
              <Tap className="c-chip" data-on={!draft.categoryId} onClick={() => set({ categoryId: undefined })}>
                {t.t('filters.all')}
              </Tap>
              {(cats.data ?? []).map((c) => (
                <Tap key={c.id} className="c-chip" data-on={draft.categoryId === c.id} onClick={() => set({ categoryId: draft.categoryId === c.id ? undefined : (c.id as CategoryId) })}>
                  {t.l(c.name)}
                </Tap>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <h3 className="c-kicker g1-fh">{t.t('filters.source')}</h3>
          <div className="g1-wrap">
            {SOURCES.map((s) => (
              <Tap key={s} className="c-chip" data-on={draft.sources.includes(s)} aria-pressed={draft.sources.includes(s)} onClick={() => toggleSource(s)}>
                {SOURCE_NAME[s]}
              </Tap>
            ))}
          </div>
        </section>

        <section>
          <h3 className="c-kicker g1-fh">{t.t('filters.price')}</h3>
          <div className="g1-price">
            <label className="c-field" data-invalid={invalid || undefined}>
              <span className="g1-fieldpre">{t.t('filters.priceFrom')}</span>
              <input
                inputMode="numeric"
                enterKeyHint="next"
                placeholder="0"
                value={draft.priceMin != null ? formatNumber(draft.priceMin) : ''}
                onChange={(e) => set({ priceMin: digits(e.target.value) })}
                aria-label={`${t.t('filters.price')} ${t.t('filters.priceFrom')}`}
              />
            </label>
            <label className="c-field" data-invalid={invalid || undefined}>
              <span className="g1-fieldpre">{t.t('filters.priceTo')}</span>
              <input
                inputMode="numeric"
                enterKeyHint="done"
                placeholder="∞"
                value={draft.priceMax != null ? formatNumber(draft.priceMax) : ''}
                onChange={(e) => set({ priceMax: digits(e.target.value) })}
                aria-label={`${t.t('filters.price')} ${t.t('filters.priceTo')}`}
              />
            </label>
          </div>
          {invalid ? <p className="c-err">{t.t('c.g1.priceInvalid')}</p> : null}
          <div className="g1-wrap mt-2.5">
            {PRESETS.map((p) => {
              const on = draft.priceMin === p.min && draft.priceMax === p.max
              return (
                <Tap key={presetLabel(p)} className="c-chip" data-on={on} onClick={() => set(on ? { priceMin: undefined, priceMax: undefined } : { priceMin: p.min, priceMax: p.max })}>
                  {presetLabel(p)}
                </Tap>
              )
            })}
          </div>
        </section>

        <section className="g1-toggles">
          {(
            [
              ['fast', 'c.filters.fast', 'c.filters.fastHint'],
              ['topRated', 'filters.rating', 'c.filters.ratingHint'],
              ['deals', 'filters.discounts', 'c.filters.dealsHint'],
            ] as const
          ).map(([k, title, hint]) => (
            <Tap key={k} className="g1-toggle" role="switch" aria-checked={draft[k]} onClick={() => set({ [k]: !draft[k] } as Partial<FilterState>)}>
              <span className="g1-toggle-txt">
                <b>{t.t(title)}</b>
                <small>{t.t(hint)}</small>
              </span>
              <Switch on={draft[k]} />
            </Tap>
          ))}
        </section>
      </div>
    </Sheet>
  )
}
