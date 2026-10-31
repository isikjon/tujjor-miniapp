import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export interface ScreenProps {
  params: Record<string, string>
  query: Record<string, string>
}

export interface LazyScreen {
  Component: LazyExoticComponent<ComponentType<ScreenProps>>
  /** Starts downloading the screen chunk (idempotent). Used for intent / idle preloading. */
  preload: () => Promise<unknown>
}

export function lazyScreen(loader: () => Promise<{ default: ComponentType<ScreenProps> }>): LazyScreen {
  let promise: Promise<{ default: ComponentType<ScreenProps> }> | null = null
  const load = () =>
    (promise ??= loader().catch((e) => {
      promise = null
      throw e
    }))
  return { Component: lazy(load), preload: load }
}
