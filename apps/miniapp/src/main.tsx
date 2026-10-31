import './styles/base.css'
import { variantLoaders } from './variants/registry'
import type { VariantId } from './shared/runtime/variant'
import { appPath, variantFromPath, withBase } from './shared/lib/base'

const id = variantFromPath()
if (id) {
  // Start downloading the variant chunk in parallel with the runtime (no waterfall).
  const variant = variantLoaders[id as VariantId]()
  void import('./shared/runtime/boot-app').then(({ bootApp }) => bootApp(variant))
} else {
  if (!appPath().startsWith('/design-lab')) history.replaceState(null, '', withBase('design-lab') + location.search)
  void import('./lab/boot-lab').then(({ bootLab }) => bootLab())
}
