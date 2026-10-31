import type { VariantId } from './variant'

/** Lab-facing description of a design variant (Russian copy, shown in the Design Lab panels). */
export interface VariantMeta {
  id: VariantId
  letter: 'A' | 'B' | 'C' | 'D'
  name: string
  title: string
  tagline: string
  concept: string
  strengths: string[]
  tradeoffs: string[]
  bestFor: string
  palette: Array<{ name: string; hex: string }>
  typography: { display: string; body: string; cost: string }
  motion: string
  telegram: string
}
