# Variant B (b-market) — design system

Import everything from `../ui` (barrel `ui/index.ts`), helpers from `../lib`. Styles live in `theme.css` (already loaded by index.ts) —
your screen CSS goes in `styles/<group>.css`, scoped under `.v-b`. Tokens: `--color-*` (Tailwind: `bg-surface`, `text-ink-2`, `bg-accent`…)
plus `--b-hot` (#FF2D55 discounts), `--b-hot-soft`, `--b-flash` (#FF7A00), `--b-flash-soft`, `--b-sun` (#FFD60A), `--b-ok` (#12B76A),
`--b-ok-soft`, `--b-header`/`--b-header-2` (violet header gradient; dark → surface), `--b-star`, `--b-gutter` 12px, `--b-gap` 8px.
Radius: card 14, tile/button/input 12. Prices: class `b-num` for tabular numbers. Layout helpers: `.b-grid` (2-col, 12px gutters, 8px gap),
`.b-rail` (horizontal scroll-snap row with gutters), `.b-input` (16px input), `.b-sheet-list` + `.b-sheet-row[data-on]` (sheet lists),
`.b-fsec`/`.b-fsec__title` (sheet sections), `.b-switch-row` + `.b-switch[data-on]` (toggle rows).

## Components

- **ProductCard** `{ item: ProductSummary; variant?: 'grid' | 'rail'; sizes?: string }` — memoised core card: image, −% badge, heart
  (useFavoriteToggle), price/old, 2-line title, ★ rating · reviews, delivery chip, source badge, quick-add (cart icon → check when in cart).
- **ProductGridItem** `{ item; index }` — use as `Item` for `VirtualGrid` (`columns=2 gap=8 estimateHeight≈300`, wrap in `className="px-3"`).
- **QuickAddSheet** `{ productId; onDone }` — mount to quick-add: no options → adds instantly (toast), else SKU sheet; `onDone` after close.
- **Price** `{ price; old?; size?: 'sm'|'md'|'lg'; showDiscount? }` — bold 800 tabular price (pink when discounted) + struck old price.
- **DiscountBadge** `{ price?, old? | pct?; size?: 'sm'|'lg' }` — "−23%" pink pill, renders null without a discount.
- **SourceBadge** `{ source: SourceMarket }` — 1688 / Alibaba / POIZON coloured pill.
- **Rating** `{ value; reviews?; long? }` — ★ 4,8 · 1,2K (long → "1 234 отзыва").
- **DeliveryChip** `{ days: [from, to] }` — "12–18 дн", or green "Быстро" when to ≤ 14 (`FAST_DAYS`).
- **SectionHeader** `{ title; sub?; to?; endsAt?; action? }` — 19px/800 title, optional orange countdown cells, "Все ›" link to `to`.
- **CountdownCells** `{ endsAt? }` — orange HH:MM:SS cells (useCountdown).
- **Chip** `TapProps & { on?; count?; icon?; tone?: 'surface'|'tile' }` — pill toggle; `on` = violet, `count` = pink counter.
- **Button** `TapProps & { kind?: 'primary'|'secondary'|'ghost'|'hot'|'success'; size?: 'sm'|'md'|'lg'; block?; loading?; icon? }`
  — 36/44/52px, loading = spinner + disabled.
- **IconButton** `TapProps & { label (aria, required); tone?: 'surface'|'tile'|'onaccent'|'none'; size?: 'sm'|'md'; round? }` — 44px (sm 36).
- **SearchBar** `{ tone?: 'header'|'plain'; placeholder?; category?; showLink? }` — header search entry → `/search`; link button reads
  clipboard → `/search?q=<link>` (toast `b.pasteFail` otherwise). `header` = white field for the violet header.
- **FilterBar** `{ value: FilterState; onChange; base: ProductQuery; total?; hideSources? }` — sticky: "Фильтры" (count) → FiltersSheet,
  sort chip → SortSheet, quick toggles Со скидкой / Быстрая доставка / Оригинал (= POIZON); count line "N товаров" when `total` given.
- **SortSheet** `{ open; onClose; value: SortKey; onChange }` — sort list, applies + closes.
- **FiltersSheet** `{ open; onClose; value; onApply; base; hideSources? }` — draft: sources, price from/to, ≤14 days, rating ≥4.5,
  discounts; live count via useProductsCount; Сбросить / Показать N товаров.
- **EmptyView** `{ icon?; title; text?; action? }` — violet icon tile + title + text + action (e.g. `<Button>`).
- **CardSkeleton** `{ variant?: 'grid'|'rail' }`, **GridSkeleton** `{ count?=6 }`, **RailSkeleton** `{ count?=4 }` — exact card layout.
- **QuickAddSkeleton** — 76px image + 2 lines (sheet header placeholder).
- **TabBar** (`../TabBar.tsx`) — 5 tabs, violet active, pink cart badge with bump animation.

## lib.ts

`discountPct(price, old)`, `isFast(p)`, `FAST_DAYS=14`, `SORT_KEYS`, `SOURCES`, `searchPath({ q, category, sort, source })`,
`FilterState` + `EMPTY_FILTERS`, `toProductQuery(state, base)`, `filtersFromParams(query)` (reads `sort`, `source`),
`activeFilterCount`, `isOriginalOnly`, orders: `OrderGroup` ('all'|'active'|'done'), `ORDER_GROUPS`, `orderGroupOf`, `parseOrderGroup`,
`filterOrders`, `countOrders`, `statusTone(status)` → 'accent'|'flash'|'ok'|'hot'|'muted'.

Typical category screen:
```tsx
const [f, setF] = useState(() => filtersFromParams(query))
const base = { categoryId }
const list = useProductsInfinite(toProductQuery(f, base))
<FilterBar value={f} onChange={setF} base={base} total={list.total} />
{list.isPending ? <GridSkeleton /> : <VirtualGrid className="px-3" items={list.items} Item={ProductGridItem} getKey={(p) => p.id}
  columns={2} gap={8} estimateHeight={300} hasMore={list.hasNextPage} loadingMore={list.isFetchingNextPage} onEndReached={list.fetchNextPage} />}
```
