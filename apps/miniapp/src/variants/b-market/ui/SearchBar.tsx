import { Link2, Search } from 'lucide-react'
import { useT } from '../../../shared/i18n'
import { useNav } from '../../../shared/nav/context'
import { looksLikeLink } from '../../../shared/query/hooks'
import { toast } from '../../../shared/store/toast'
import { Tap } from '../../../shared/ui/Tap'
import { searchPath } from '../lib'

/**
 * Header search entry (not an input): tap → search screen. The link button reads the clipboard and
 * opens search with the pasted 1688/Alibaba/POIZON link (falls back to the empty search + toast).
 * tone 'header' = white field on the violet header; 'plain' = tile field on a white/grey surface.
 */
export function SearchBar({ tone = 'header', placeholder, category, showLink = true, className }: { tone?: 'header' | 'plain'; placeholder?: string; category?: string; showLink?: boolean; className?: string }) {
  const t = useT()
  const nav = useNav()
  const pasteLink = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (text && looksLikeLink(text)) {
        nav.push(searchPath({ q: text }))
        return
      }
    } catch {
      /* clipboard blocked */
    }
    toast({ text: t.t('b.pasteFail') })
    nav.push(searchPath({ category }))
  }
  return (
    <div className={`b-search ${className ?? ''}`} data-tone={tone}>
      <Tap flat className="b-search__field" onClick={() => nav.push(searchPath({ category }))} aria-label={t.t('search.placeholderShort')}>
        <Search size={19} strokeWidth={2.3} aria-hidden="true" className="flex-none" style={{ color: 'var(--color-accent)' }} />
        <span className="b-search__text">{placeholder ?? t.t('search.placeholder')}</span>
      </Tap>
      {showLink ? (
        <Tap className="b-search__link" onClick={pasteLink} aria-label={t.t('search.byLink')} title={t.t('search.byLink')}>
          <Link2 size={20} strokeWidth={2.3} aria-hidden="true" />
        </Tap>
      ) : null}
    </div>
  )
}
