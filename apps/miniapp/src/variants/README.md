# Design variants — contract

Four design variants of the TUJJOR Telegram Mini App share **one runtime** (navigation, data, cart,
checkout logic, Telegram integration, i18n) and differ only in **visual composition and design tokens**.

```
src/variants/
  a-minimal/    Premium Minimal        ← owned by variant A
  b-market/     Modern Marketplace     ← owned by variant B
  c-neo/        Neo Commerce           ← owned by variant C
  d-telegram/   Native Telegram        ← owned by variant D
```

**Ownership rule:** a variant may create/modify files **only inside its own folder**. Never edit
`src/shared/**`, `src/lab/**`, `src/styles/**`, other variants or config files. If the shared core has a bug or
misses something, work around it locally and report it in your final message.

## Required files

| File | Purpose |
|---|---|
| `index.ts` | `export default` a `VariantDefinition` (see `src/shared/runtime/variant.ts`). Import `./theme.css` and fonts here. |
| `meta.ts` | `export const meta: VariantMeta` (`src/shared/runtime/meta.ts`) — Russian copy for the Design Lab: honest strengths **and** trade-offs, palette (first swatch = brand colour, used for the lab badge), fonts + their KB cost, motion, Telegram integration. |
| `theme.css` | Tokens + variant CSS, scoped under `.v-<id>` (light) and `.v-<id>[data-scheme='dark']` (dark). |
| `screens/*.tsx` | One default-exported component per screen (lazy-loaded chunks). |
| `TabBar.tsx` + components | Variant visuals. |
| `i18n.ts` (optional) | Variant-only strings `{ ru: {...}, uz: {...} }` passed as `messages` in index.ts. |

### Screens (all 12 must be real, working screens)

| ScreenId | Path | Params | Notes |
|---|---|---|---|
| `home` | `/` | | tab root |
| `catalog` | `/catalog` | | categories + marketplaces |
| `category` | `/catalog/:categoryId` | `categoryId` (CategoryId), query `sort` | product grid with sort + filters |
| `search` | `/search` | query `q`, `category`, `sort` | input autofocus, recent/trending, suggestions, link search, filters sheet, results |
| `product` | `/product/:id` | `id` | gallery, price, SKU selection, add to cart, delivery, supplier, reviews, similar |
| `cart` | `/cart` | | tab root |
| `checkout` | `/checkout` | | address, delivery, payment, promo, summary, place order |
| `checkoutSuccess` | `/checkout/success/:orderId` | `orderId` | reached by `nav.replace` from checkout (done by `useCheckout`) |
| `profile` | `/profile` | | tab root |
| `orders` | `/orders` | query `status` (optional) | filter: all / active / done |
| `order` | `/orders/:id` | `id` | detail + tracking timeline |
| `favorites` | `/favorites` | | grid of favourites |

Screen component signature: `export default function X({ params, query }: ScreenProps)`; wrap content in
`<Screen header? footer?>` from `shared/nav/Screen` (it owns the scroll container, safe-area/tab-bar padding).

## Shared API cheat-sheet (read the source — it is short and documented)

- **Navigation** `shared/nav/*`: `useNav()` → `push(path)`, `replace(path)`, `back()`, `switchTab(id)`, `canGoBack`, `activeTab`;
  `paths.*` builders (`paths.product(id)`, `paths.category(id)`, `paths.search({ q })`, …); `<Link to onIntent>` (anchor with
  intent preloading — use for product cards/rows); `useScreenContext()`; `useBackHandler(enabled, fn)` for custom overlays.
  Tab roots are switched with `nav.switchTab(tabId)` (pushing a tab-root path also switches tabs).
  The Telegram BackButton (rendered by Telegram / the lab) is the back control — **do not draw in-app back arrows**.
- **Data** `shared/query/hooks.ts`: `useHome`, `useCategories`, `useProductsInfinite(query)` (cursor pages → `items`, `total`,
  `fetchNextPage`, `hasNextPage`, `isFetchingNextPage`), `useProductsCount`, `useProduct(id)` (`product`, `summary` = cached card
  data for an instant header), `prefetchProduct(id)`, `useSimilar`, `useSuggest(debouncedQ)`, `useDebouncedValue`,
  `useResolveLink(text)` + `looksLikeLink`, `useProductSelection(product)` (SKU state, price, stock, `missing` option),
  `useAddToCart()`, `useRemoveFromCart()` (undo toast), `useFavoriteToggle()` (optimistic + rollback), `useCartQuote()`
  (server totals for selected lines), `useCheckout()` (draft, addresses, quote, `submit()` — idempotent, navigates to success),
  `useAddresses`, `useSaveAddress`, `useOrders`, `useOrder(id)`, `useRepeatOrder()`, `useMe()`, `isActiveOrder`.
- **Stores** `shared/store/*`: `useCart` (lines, setQty, toggle, setAllSelected…), `useCartCount`, `useFavorites`/`useIsFavorite`,
  `useCheckoutDraft`, `useRecentSearches`, `useSettings` (locale + `setLocale`), `toast({ text, tone, action })`.
- **UI primitives** `shared/ui/*` (behaviour shared, look via className/tokens): `Img` (AVIF/WebP/JPEG srcset — always pass a
  correct `sizes`), `Tap` (button + haptics + press feedback), `Sheet` (bottom sheet: drag-dismiss, Back/Escape), `QtyStepper`,
  `Skeleton`, `VirtualGrid` (row virtualisation inside the screen scroller — pass a memoised `Item` component),
  `EmptyState`, `ErrorState` (+ `compact`), `useOffline`, `DemoBadge`, `useCountdown`, `CategoryIcon`.
- **Telegram** `shared/telegram/*`: `useMainButton({ text, onClick, active, progress, color, textColor })` (only the focused
  screen controls it), `tg.haptic(kind)`, `useScheme()`, `useNetworkProfile()`. Variant D uses the MainButton for primary CTAs;
  the others may use in-app CTAs (then do not also show a MainButton).
- **i18n** `shared/i18n`: `const t = useT()` → `t.t(key, vars)`, `t.tp(key, n)` (plural), `t.l(l10n)` (data text),
  `t.money(n)`, `t.compact(n)`, `t.date(iso)`, `t.ago(iso)`. All UI text must come from `t` (shared keys in `ru.ts`, or your
  variant `i18n.ts`) — RU and UZ must both work. Uzbek: oʻ/gʻ with U+02BB, tutuq belgisi U+02BC.
- **Types** `shared/types.ts`; demo backend `shared/demo/api.ts` (never call it directly from screens — use the hooks).

## Quality bar (acceptance)

1. **No dead controls.** Every visible button/row/link does its real job (navigates, opens a sheet, changes state).
   No `href="#"`, no `onClick={() => {}}`, no "coming soon". If something cannot work (photo search), do not show it.
2. **States everywhere data is loaded:** skeleton with the exact final size (no layout shift) → content / empty / error with
   retry. Offline: cached data stays visible (the shared `OfflineBanner` explains); failed actions show a toast.
3. **Performance:** animate only `transform`/`opacity`; no `backdrop-filter`, no animated shadows/blur, no JS animation loops,
   no auto-advancing carousels; `VirtualGrid` for long product lists (category, search results, home recommendations,
   favourites); memoised cards; `Img` with honest `sizes` (+ `priority` only for the first hero image); scroll-snap carousels
   with `overflow-x: auto` instead of JS sliders; no new npm dependencies; lucide icons via named imports only.
4. **Telegram-native ergonomics:** primary actions reachable by thumb at the bottom; ≥ 44 px tap targets; safe areas handled by
   `Screen`; inputs ≥ 16 px font; `Tap`/`Link` everywhere for press feedback + haptics.
5. **Light and dark** look intentional (check both). **RU and UZ** both fit (Uzbek strings are ~20% longer).
6. Visible **DEMO** marker (use `<DemoBadge/>`) somewhere persistent (e.g. home header) — data is demo.
7. `npx tsc -p tsconfig.json --noEmit` passes with zero errors (from `apps/miniapp`).

## Verify visually (dev server runs at http://localhost:5173)

```
node scripts/shots.mjs --variant <a|b|c|d> [--scheme dark] [--lang uz] [--screens home,product] [--scroll] [--reset]
```
Writes phone screenshots to `.shots/<variant>/…png` (open them with the Read tool) and prints console errors.
For custom interactions (open a sheet, add to cart, place an order) write a small script with `scripts/lib/lab-driver.mjs`
(`openLab`, `go`, `shot`, `scroll`, `back`, `mainButton`, and `frame` — a Playwright FrameLocator for the app iframe).
Store such scratch scripts under `scripts/.scratch/` (git-ignored). Run Playwright with your own `--out`-free variant folder only.
