import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { DeliveryMethod, PaymentMethod } from '../types'
import { scopedStorage } from '../lib/storage'

/** Checkout draft survives app minimisation / reloads (Telegram may kill the WebView). */
interface CheckoutDraft {
  addressId: string | null
  delivery: DeliveryMethod
  payment: PaymentMethod
  promoCode: string | null
  comment: string
  update: (patch: Partial<Omit<CheckoutDraft, 'update' | 'reset'>>) => void
  reset: () => void
}

const initial = { addressId: null, delivery: 'courier' as DeliveryMethod, payment: 'payme' as PaymentMethod, promoCode: null, comment: '' }

export const useCheckoutDraft = create<CheckoutDraft>()(
  persist(
    (set) => ({
      ...initial,
      update: (patch) => set(patch),
      reset: () => set({ promoCode: null, comment: '' }),
    }),
    { name: 'checkout', storage: createJSONStorage(() => scopedStorage), version: 1 },
  ),
)
