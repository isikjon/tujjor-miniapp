import type { VariantDefinition, VariantId } from '../shared/runtime/variant'

/** Each variant is its own lazily loaded chunk (JS + CSS). */
export const variantLoaders: Record<VariantId, () => Promise<{ default: VariantDefinition }>> = {
  a: () => import('./a-minimal'),
  b: () => import('./b-market'),
  c: () => import('./c-neo'),
  d: () => import('./d-telegram'),
}
