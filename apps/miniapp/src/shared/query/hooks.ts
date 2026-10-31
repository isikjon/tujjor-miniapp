import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Address, Order, Page, Product, ProductQuery, ProductSummary, QuoteInput } from '../types'
import { api } from '../demo/api'
import { isApiError } from '../demo/errors'
import { looksLikeLink } from '../demo/catalog'
import { selectionLabel } from '../demo/orders'
import { useT } from '../i18n'
import { scopedKey, session } from '../lib/storage'
import { uid } from '../lib/id'
import { useNav } from '../nav/context'
import { paths } from '../nav/routes'
import { useVariant } from '../runtime/variant'
import { priceFor, useCart } from '../store/cart'
import { useCheckoutDraft } from '../store/checkout'
import { useFavorites } from '../store/favorites'
import { toast } from '../store/toast'
import { tg } from '../telegram/adapter'
import { queryClient } from './client'
import { qk } from './keys'

// ── catalog ──────────────────────────────────────────────────────────────

export function useHome() {
  return useQuery({ queryKey: qk.home(), queryFn: ({ signal }) => api.home(signal), staleTime: 5 * 60_000 })
}

export function useCategories() {
  return useQuery({ queryKey: qk.categories(), queryFn: ({ signal }) => api.categories(signal), staleTime: 30 * 60_000 })
}

/** Cursor-paginated product list. Keeps the previous result on screen while filters change. */
export function useProductsInfinite(query: ProductQuery, opts: { enabled?: boolean; limit?: number } = {}) {
  const limit = opts.limit ?? 20
  const q = useInfiniteQuery({
    queryKey: qk.products(query),
    queryFn: ({ pageParam, signal }) => api.products(query, pageParam, limit, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last: Page<ProductSummary>) => last.nextCursor,
    placeholderData: keepPreviousData,
    enabled: opts.enabled ?? true,
  })
  const items = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data])
  return { ...q, items, total: q.data?.pages[0]?.total ?? 0 }
}

export function useProductsCount(query: ProductQuery, enabled = true) {
  return useQuery({ queryKey: qk.count(query), queryFn: ({ signal }) => api.count(query, signal), enabled, placeholderData: keepPreviousData })
}

/** Finds a summary for `id` in any cached list (instant product header while details load). */
export function findCachedSummary(id: string): ProductSummary | undefined {
  for (const [, data] of queryClient.getQueriesData<InfiniteData<Page<ProductSummary>>>({ queryKey: ['products'] })) {
    const hit = data?.pages.flatMap((p) => p.items).find((p) => p.id === id)
    if (hit) return hit
  }
  const home = queryClient.getQueryData<Awaited<ReturnType<typeof api.home>>>(qk.home())
  return home?.sections.flatMap((s) => s.items).find((p) => p.id === id)
}

export function prefetchProduct(id: string) {
  void queryClient.prefetchQuery({ queryKey: qk.product(id), queryFn: ({ signal }) => api.product(id, signal), staleTime: 60_000 })
}

export function useProduct(id: string) {
  const q = useQuery({ queryKey: qk.product(id), queryFn: ({ signal }) => api.product(id, signal) })
  const summary = useMemo(() => q.data ?? findCachedSummary(id), [q.data, id])
  return { ...q, product: q.data, summary }
}

export function useSimilar(id: string, enabled = true) {
  return useQuery({ queryKey: qk.similar(id), queryFn: ({ signal }) => api.similar(id, signal), enabled, staleTime: 5 * 60_000 })
}

export function useDebouncedValue<T>(value: T, ms = 220): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/** Suggestions for a (debounced) query; stale requests are aborted via the query signal. */
export function useSuggest(q: string) {
  const { locale } = useT()
  const text = q.trim()
  return useQuery({
    queryKey: qk.suggest(text, locale),
    queryFn: ({ signal }) => api.suggest(text, locale, signal),
    enabled: text.length >= 2 && !looksLikeLink(text),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  })
}

export function useResolveLink(input: string) {
  const text = input.trim()
  return useQuery({ queryKey: qk.link(text), queryFn: ({ signal }) => api.resolveLink(text, signal), enabled: looksLikeLink(text), staleTime: Infinity })
}

export { looksLikeLink }

// ── product SKU selection & cart ─────────────────────────────────────────

/**
 * SKU selection state for a product: colour/memory/volume are preselected (first in stock),
 * sizes must be chosen explicitly. Price and stock follow the selection.
 */
export function useProductSelection(product: Product | undefined) {
  const [picked, setPicked] = useState<Record<string, string>>({})
  const selection = useMemo(() => {
    if (!product) return {}
    const sel: Record<string, string> = { ...picked }
    for (const o of product.options) {
      if (!sel[o.id] && o.kind !== 'size') {
        const v = o.values.find((x) => x.stock > 0)
        if (v) sel[o.id] = v.id
      }
    }
    return sel
  }, [product, picked])
  const missing = product?.options.find((o) => !selection[o.id]) ?? null
  const price = product ? priceFor(product, selection) : { unit: 0, old: null, stock: 0 }
  const imageIndex = product?.options
    .flatMap((o) => o.values.filter((v) => selection[o.id] === v.id && v.imageIndex != null))
    .map((v) => v.imageIndex!)[0]
  const select = useCallback((optionId: string, valueId: string) => {
    tg.haptic('selection')
    setPicked((s) => ({ ...s, [optionId]: valueId }))
  }, [])
  return {
    selection,
    select,
    missing,
    complete: !missing,
    unitPrice: price.unit,
    oldPrice: price.old,
    stock: price.stock,
    imageIndex,
    label: product ? selectionLabel(product, selection) : null,
  }
}

/** Adds to cart with haptic + toast ("Go to cart"). Returns the cart line. */
export function useAddToCart() {
  const add = useCart((s) => s.add)
  const t = useT()
  const nav = useNav()
  const variant = useVariant()
  return useCallback(
    (product: Product, selection: Record<string, string>, qty = 1, opts: { silent?: boolean } = {}) => {
      const res = add(product, selection, qty)
      tg.haptic('success')
      if (!opts.silent) {
        const cartTab = variant.tabs.find((x) => x.screen === 'cart')
        toast({
          text: t.t('product.addedToCart'),
          tone: 'success',
          action: { label: t.t('action.goToCart'), onClick: () => (cartTab ? nav.switchTab(cartTab.id) : nav.push(paths.cart())) },
        })
      }
      return res
    },
    [add, t, nav, variant],
  )
}

/** Remove with undo (optimistic, local). */
export function useRemoveFromCart() {
  const t = useT()
  return useCallback(
    (key: string) => {
      const removed = useCart.getState().remove(key)
      if (!removed) return
      tg.haptic('light')
      toast({ text: t.t('cart.removed'), action: { label: t.t('action.undo'), onClick: () => useCart.getState().restore(removed.line, removed.index) } })
    },
    [t],
  )
}

/** Optimistic favourite toggle with rollback when the sync request fails (try "offline" in the lab). */
export function useFavoriteToggle() {
  const t = useT()
  const m = useMutation({
    networkMode: 'always',
    mutationFn: ({ id, on }: { id: string; on: boolean }) => api.setFavorite(id, on),
    onMutate: ({ id, on }) => {
      useFavorites.getState().set(id, on)
      tg.haptic(on ? 'light' : 'selection')
      return { prev: !on }
    },
    onError: (err, { id }, ctx) => {
      useFavorites.getState().set(id, !!ctx?.prev)
      tg.haptic('error')
      toast({ text: isApiError(err) && err.code === 'offline' ? t.t('state.offlineAction') : t.t('error.server'), tone: 'error' })
    },
  })
  return useCallback((id: string) => m.mutate({ id, on: !useFavorites.getState().ids.includes(id) }), [m])
}

// ── checkout ─────────────────────────────────────────────────────────────

export function useAddresses() {
  return useQuery({ queryKey: qk.addresses(), queryFn: ({ signal }) => api.addresses(signal), staleTime: Infinity })
}

export function useSaveAddress() {
  const qc = useQueryClient()
  const t = useT()
  return useMutation({
    networkMode: 'always',
    mutationFn: (a: Address) => api.saveAddress(a),
    onSuccess: (list, a) => {
      qc.setQueryData(qk.addresses(), list)
      useCheckoutDraft.getState().update({ addressId: a.id })
      toast({ text: t.t('toast.addressSaved'), tone: 'success' })
    },
    onError: (err) => toast({ text: isApiError(err) && err.code === 'offline' ? t.t('state.offlineAction') : t.t('error.server'), tone: 'error' }),
  })
}

function useQuoteInput(): { input: QuoteInput; address: Address | null; addresses: Address[]; addressesLoading: boolean } {
  const lines = useCart((s) => s.lines)
  const delivery = useCheckoutDraft((s) => s.delivery)
  const promoCode = useCheckoutDraft((s) => s.promoCode)
  const addressId = useCheckoutDraft((s) => s.addressId)
  const addressesQ = useAddresses()
  const addresses = useMemo(() => addressesQ.data ?? [], [addressesQ.data])
  const address = addresses.find((a) => a.id === addressId) ?? addresses.find((a) => a.isDefault) ?? addresses[0] ?? null
  const input = useMemo<QuoteInput>(
    () => ({
      lines: lines.filter((l) => l.selected).map((l) => ({ key: l.key, productId: l.productId, selection: l.selection, qty: l.qty })),
      addressId: address?.id ?? null,
      delivery,
      promoCode,
    }),
    [lines, address?.id, delivery, promoCode],
  )
  return { input, address, addresses, addressesLoading: addressesQ.isPending }
}

/** Server-calculated totals for the selected cart lines (cart & checkout show the same numbers). */
export function useCartQuote() {
  const { input, address } = useQuoteInput()
  const q = useQuery({
    queryKey: qk.quote(input),
    queryFn: ({ signal }) => api.quote(input, signal),
    enabled: input.lines.length > 0 && !!input.addressId,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })
  return { ...q, quote: input.lines.length ? q.data : undefined, input, address, recalculating: q.isFetching }
}

const IDEM = () => scopedKey('checkout-idem')

/**
 * Checkout: draft (persisted), addresses, server quote and idempotent order placement.
 * The idempotency key survives reloads so a resubmit after Telegram was minimised mid-request
 * returns the same order instead of creating a duplicate.
 */
export function useCheckout() {
  const { input, address, addresses, addressesLoading } = useQuoteInput()
  const draft = useCheckoutDraft()
  const quoteQ = useQuery({
    queryKey: qk.quote(input),
    queryFn: ({ signal }) => api.quote(input, signal),
    enabled: input.lines.length > 0 && !!input.addressId,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })
  const qc = useQueryClient()
  const nav = useNav()
  const t = useT()
  const keyRef = useRef<string | null>(null)
  const idemKey = () => {
    keyRef.current ??= session.get(IDEM()) ?? uid('idem-')
    session.set(IDEM(), keyRef.current)
    return keyRef.current
  }

  const place = useMutation({
    networkMode: 'always',
    mutationFn: () => api.placeOrder({ quote: input, payment: draft.payment, comment: draft.comment }, idemKey()),
    onSuccess: (order: Order) => {
      session.remove(IDEM())
      keyRef.current = null
      useCart.getState().removeKeys(input.lines.map((l) => l.key))
      useCheckoutDraft.getState().reset()
      qc.setQueryData(qk.order(order.id), order)
      void qc.invalidateQueries({ queryKey: qk.orders() })
      tg.haptic('success')
      nav.replace(paths.checkoutSuccess(order.id))
    },
    onError: () => tg.haptic('error'),
  })

  const quote = input.lines.length ? quoteQ.data : undefined
  const unavailable = quote?.lines.some((l) => !l.available) ?? false
  const canSubmit = !!address && input.lines.length > 0 && !!quote && !quoteQ.isPlaceholderData && !unavailable && !place.isPending

  const submit = useCallback(() => {
    if (place.isPending || !canSubmit) return
    place.mutate()
  }, [place, canSubmit])

  const errorText = place.error
    ? isApiError(place.error) && place.error.code === 'out_of_stock'
      ? t.t('checkout.errorStock')
      : isApiError(place.error) && place.error.code === 'offline'
        ? t.t('error.offline')
        : t.t('checkout.errorGeneric')
    : null

  return {
    lines: useCart((s) => s.lines).filter((l) => l.selected),
    input,
    draft,
    setDraft: draft.update,
    address,
    addresses,
    addressesLoading,
    quote,
    quoteQuery: quoteQ,
    recalculating: quoteQ.isFetching,
    unavailable,
    canSubmit,
    submit,
    submitting: place.isPending,
    submitError: errorText,
    retry: () => place.mutate(),
  }
}

// ── orders & profile ─────────────────────────────────────────────────────

export function useOrders() {
  return useQuery({ queryKey: qk.orders(), queryFn: ({ signal }) => api.orders(signal) })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: qk.order(id),
    queryFn: ({ signal }) => api.order(id, signal),
    placeholderData: () => queryClient.getQueryData<Order[]>(qk.orders())?.find((o) => o.id === id),
  })
}

export function useMe() {
  return useQuery({ queryKey: qk.me(), queryFn: ({ signal }) => api.me(signal), staleTime: Infinity })
}

/** Puts an order's items back into the cart (fetches fresh product data first). */
export function useRepeatOrder() {
  const t = useT()
  const nav = useNav()
  const variant = useVariant()
  return useMutation({
    networkMode: 'always',
    mutationFn: async (order: Order) => {
      const products = await Promise.all(order.items.map((i) => queryClient.fetchQuery({ queryKey: qk.product(i.productId), queryFn: ({ signal }) => api.product(i.productId, signal) })))
      return { order, products }
    },
    onSuccess: ({ order, products }) => {
      order.items.forEach((item, i) => {
        const p = products[i]
        const sel: Record<string, string> = {}
        for (const o of p.options) {
          const match = o.values.find((v) => item.selectionLabel.ru.split(' · ').includes(v.label.ru)) ?? o.values.find((v) => v.stock > 0)
          if (match) sel[o.id] = match.id
        }
        useCart.getState().add(p, sel, item.qty)
      })
      tg.haptic('success')
      toast({ text: t.t('order.repeatDone'), tone: 'success' })
      const cartTab = variant.tabs.find((x) => x.screen === 'cart')
      if (cartTab) nav.switchTab(cartTab.id)
      else nav.push(paths.cart())
    },
    onError: (err) => toast({ text: isApiError(err) && err.code === 'offline' ? t.t('state.offlineAction') : t.t('error.server'), tone: 'error' }),
  })
}

export const ACTIVE_STATUSES = ['pending_payment', 'paid', 'purchased', 'china_warehouse', 'in_transit', 'customs', 'arrived', 'out_for_delivery'] as const
export const isActiveOrder = (o: Order) => (ACTIVE_STATUSES as readonly string[]).includes(o.status)
