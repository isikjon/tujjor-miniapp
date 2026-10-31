import type { ProductQuery, QuoteInput } from '../types'

export const qk = {
  home: () => ['home'] as const,
  categories: () => ['categories'] as const,
  products: (q: ProductQuery) => ['products', q] as const,
  count: (q: ProductQuery) => ['products-count', q] as const,
  product: (id: string) => ['product', id] as const,
  similar: (id: string) => ['similar', id] as const,
  suggest: (q: string, locale: string) => ['suggest', q, locale] as const,
  link: (url: string) => ['link', url] as const,
  quote: (input: QuoteInput) => ['quote', input] as const,
  orders: () => ['orders'] as const,
  order: (id: string) => ['order', id] as const,
  addresses: () => ['addresses'] as const,
  me: () => ['me'] as const,
}
