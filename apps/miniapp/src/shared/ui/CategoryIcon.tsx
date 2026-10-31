import { CookingPot, Dumbbell, Footprints, Handbag, Shirt, Smartphone, Sparkles, Watch, type LucideProps } from 'lucide-react'
import type { CategoryId } from '../types'

const ICONS = { electronics: Smartphone, clothing: Shirt, shoes: Footprints, bags: Handbag, watches: Watch, beauty: Sparkles, home: CookingPot, sport: Dumbbell }

/** Category glyph (8 selectively imported lucide icons). */
export function CategoryIcon({ id, ...props }: { id: CategoryId } & LucideProps) {
  const I = ICONS[id] ?? Sparkles
  return <I aria-hidden="true" {...props} />
}
