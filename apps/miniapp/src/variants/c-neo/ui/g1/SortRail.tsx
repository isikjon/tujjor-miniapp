import { SlidersHorizontal } from 'lucide-react'
import type { SortKey } from '../../../../shared/types'
import { useT } from '../../../../shared/i18n'
import { Tap } from '../../../../shared/ui/Tap'
import { SORTS } from '../../lib/util'
import '../../styles/g1.css'

/** Filters button (with active count) + sort chips in one scroll-snap rail. */
export function SortRail({ sort, onSort, filters, onFilters }: { sort: SortKey; onSort: (s: SortKey) => void; filters: number; onFilters: () => void }) {
  const t = useT()
  return (
    <div className="c-rail g1-sortrail" role="toolbar" aria-label={t.t('filters.sort')}>
      <Tap className="c-chip g1-filterchip" data-on={filters > 0} onClick={onFilters} aria-label={t.t('filters.title')}>
        <SlidersHorizontal size={16} strokeWidth={2.4} />
        {t.t('filters.title')}
        {filters > 0 ? <span className="c-chip-count">{filters}</span> : null}
      </Tap>
      {SORTS.map((s) => (
        <Tap key={s} className="c-chip" data-on={s === sort} aria-pressed={s === sort} onClick={() => s !== sort && onSort(s)}>
          {t.t(`sort.${s}`)}
        </Tap>
      ))}
    </div>
  )
}
