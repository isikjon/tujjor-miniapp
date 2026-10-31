/**
 * Domain types shared by every design variant.
 * In Phase A they are served by the in-browser demo API (src/shared/demo/api.ts);
 * later the same shapes become the public contract of the Catalog / Order services.
 * Money is always an integer amount of UZS (soʻm) — never floats.
 */

export type Locale = 'ru' | 'uz'
export type L10n = Record<Locale, string>

export type SourceMarket = '1688' | 'alibaba' | 'poizon'

export type CategoryId = 'electronics' | 'clothing' | 'shoes' | 'bags' | 'watches' | 'beauty' | 'home' | 'sport'

export type Badge = 'hit' | 'new' | 'sale' | 'fast' | 'original' | 'choice' | 'wholesale'

/** A processed demo image: /demo-media/{id}-{w}.{avif|webp|jpg}. Square, transparent background (except jpg). */
export interface ImageRef {
  id: string
  /** Average colour of the product pixels — handy for tinted placeholders / accents. */
  tint: string
}

export interface OptionValue {
  id: string
  label: L10n
  /** Swatch colour for kind === 'color'. */
  hex?: string
  /** Index into Product.images that shows this value. */
  imageIndex?: number
  /** Price difference vs. the base price, UZS. */
  priceDelta?: number
  stock: number
}

export interface ProductOption {
  id: string
  kind: 'color' | 'size' | 'text'
  name: L10n
  values: OptionValue[]
}

export interface Supplier {
  name: string
  city: L10n
  rating: number
  years: number
  verified: boolean
}

export interface Review {
  author: string
  rating: number
  text: L10n
  date: string
}

/** Everything a product card needs. Lists return these; the detail call returns `Product`. */
export interface ProductSummary {
  id: string
  title: L10n
  subtitle: L10n
  categoryId: CategoryId
  source: SourceMarket
  brand: string | null
  price: number
  oldPrice: number | null
  rating: number
  reviews: number
  sold: number
  stock: number
  image: ImageRef
  deliveryDays: [number, number]
  badges: Badge[]
  /** ISO time of the last successful sync with the supplier (data freshness). */
  syncedAt: string
}

export interface Product extends ProductSummary {
  images: ImageRef[]
  description: L10n
  options: ProductOption[]
  specs: { name: L10n; value: L10n }[]
  supplier: Supplier
  weightKg: number
  reviewsPreview: Review[]
}

export interface Category {
  id: CategoryId
  name: L10n
  /** lucide-react icon name */
  icon: string
  productCount: number
  image: ImageRef
}

export interface Banner {
  id: string
  title: L10n
  subtitle: L10n
  cta: L10n
  image: ImageRef
  /** Semantic tone; each variant maps it to its own palette. */
  tone: 'primary' | 'warm' | 'cool' | 'dark'
  link: { kind: 'category'; categoryId: CategoryId } | { kind: 'product'; productId: string } | { kind: 'search'; query: string }
}

export type HomeSectionKind = 'flash' | 'hits' | 'new' | 'poizon' | 'budget'

export interface HomeSection {
  id: string
  kind: HomeSectionKind
  title: L10n
  /** For 'flash': ISO end time of the sale. */
  endsAt?: string
  items: ProductSummary[]
}

export interface HomeData {
  banners: Banner[]
  categories: Category[]
  sections: HomeSection[]
  /** Popular queries for the search screen. */
  trending: L10n[]
}

export type SortKey = 'popular' | 'price_asc' | 'price_desc' | 'rating' | 'new' | 'discount'

export interface ProductFilters {
  categoryId?: CategoryId
  sources?: SourceMarket[]
  priceMin?: number
  priceMax?: number
  /** Only items with deliveryDays[1] <= this value. */
  maxDeliveryDays?: number
  minRating?: number
  onlyDiscounts?: boolean
}

export interface ProductQuery extends ProductFilters {
  q?: string
  sort?: SortKey
}

export interface Page<T> {
  items: T[]
  nextCursor: string | null
  total: number
}

export interface Suggestion {
  kind: 'query' | 'category' | 'product'
  text: L10n
  categoryId?: CategoryId
  productId?: string
}

// ── Cart / checkout / orders ────────────────────────────────────────────────

export interface CartLine {
  /** productId + selected option values — one line per SKU. */
  key: string
  productId: string
  title: L10n
  image: ImageRef
  source: SourceMarket
  /** Selected option value ids, by option id. */
  selection: Record<string, string>
  /** Human readable SKU, e.g. "Чёрный · 42". */
  selectionLabel: L10n
  /** Snapshot for instant rendering; the quote endpoint is the source of truth. */
  unitPrice: number
  oldUnitPrice: number | null
  qty: number
  maxQty: number
  selected: boolean
  addedAt: number
}

export interface Address {
  id: string
  label: L10n
  region: L10n
  city: string
  street: string
  apartment?: string
  recipient: string
  /** +998XXXXXXXXX */
  phone: string
  isDefault: boolean
}

export type DeliveryMethod = 'courier' | 'pickup'
export type PaymentMethod = 'payme' | 'click' | 'card'

export interface QuoteLine {
  key: string
  productId: string
  qty: number
  unitPrice: number
  lineTotal: number
  available: boolean
}

/** Calculated by the "server" (demo API) — the client never computes totals itself. */
export interface Quote {
  lines: QuoteLine[]
  itemsCount: number
  itemsTotal: number
  /** Savings vs. old prices (informational). */
  savings: number
  promoDiscount: number
  promoCode: string | null
  promoError: string | null
  internationalShipping: number
  serviceFee: number
  localDelivery: number
  total: number
  weightKg: number
  etaDays: [number, number]
  rulesVersion: string
  calculatedAt: string
}

export interface QuoteInput {
  lines: { key: string; productId: string; selection: Record<string, string>; qty: number }[]
  addressId: string | null
  delivery: DeliveryMethod
  promoCode?: string | null
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'purchased'
  | 'china_warehouse'
  | 'in_transit'
  | 'customs'
  | 'arrived'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'

export interface OrderItem {
  productId: string
  title: L10n
  image: ImageRef
  selectionLabel: L10n
  qty: number
  unitPrice: number
}

export interface OrderEvent {
  status: OrderStatus
  /** ISO time when reached; null = expected step not reached yet. */
  at: string | null
  note?: L10n
}

export interface Order {
  id: string
  /** Human order number, e.g. "TJ-26-104381". */
  number: string
  createdAt: string
  status: OrderStatus
  items: OrderItem[]
  quote: Quote
  address: Address
  delivery: DeliveryMethod
  payment: PaymentMethod
  timeline: OrderEvent[]
  trackingCode: string | null
  etaDate: string | null
}

export interface PlaceOrderInput {
  quote: QuoteInput
  payment: PaymentMethod
  comment?: string
}

export interface DemoUser {
  id: number
  firstName: string
  lastName: string
  username: string
  phone: string
  /** Telegram profile photo is not available in the lab; variants render initials. */
  photoUrl: null
  memberSince: string
}
