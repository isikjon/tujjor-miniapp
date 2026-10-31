import { defineConfig, type Plugin } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { gzipSync } from 'node:zlib'

/**
 * Emits dist/lab-stats.json: gzip size of the JS/CSS that belongs to each design variant
 * plus the shared runtime, so the Design Lab can show real per-variant bundle cost.
 */
function labStats(): Plugin {
  return {
    name: 'tujjor-lab-stats',
    apply: 'build',
    generateBundle(_, bundle) {
      const stats: Record<string, { js: number; css: number; files: string[] }> = {}
      const bucket = (k: string) => (stats[k] ??= { js: 0, css: 0, files: [] })
      const ownerOf = (ids: string[]) => {
        const v = ids.map((id) => id.match(/src\/variants\/([abcd])-/)?.[1]).find(Boolean)
        if (v) return `variant-${v}`
        if (ids.some((id) => id.includes('/src/lab/'))) return 'lab'
        if (ids.some((id) => id.includes('catalog.json'))) return 'demo-data'
        if (ids.some((id) => id.includes('node_modules'))) return 'vendor'
        return 'shared'
      }
      for (const file of Object.values(bundle)) {
        if (file.type === 'chunk') {
          const b = bucket(ownerOf(file.moduleIds))
          b.js += gzipSync(file.code).length
          b.files.push(file.fileName)
        } else if (file.fileName.endsWith('.css')) {
          const src = typeof file.source === 'string' ? file.source : Buffer.from(file.source).toString()
          const names = [...(file.originalFileNames ?? []), ...(file.names ?? [])].join(' ')
          const v = names.match(/variants\/([abcd])-/)?.[1] ?? src.match(/\.v-([abcd])\b/)?.[1]
          const b = bucket(v ? `variant-${v}` : 'shared')
          b.css += gzipSync(src).length
          b.files.push(file.fileName)
        }
      }
      this.emitFile({ type: 'asset', fileName: 'lab-stats.json', source: JSON.stringify({ builtAt: new Date().toISOString(), stats }, null, 1) })
    },
  }
}

export default defineConfig({
  // GitHub Pages serves the site under /<repo>/ — set BASE_PATH=/tujjor-miniapp/ for that build.
  base: process.env.BASE_PATH || '/',
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss(), labStats()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    // Telegram WebViews: iOS 15+ WKWebView, Android System WebView (Chromium), Telegram Desktop (Qt WebEngine).
    target: ['es2020', 'safari15', 'chrome90', 'firefox90'],
    cssTarget: ['safari15', 'chrome90'],
    assetsInlineLimit: 2048,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor', test: /node_modules[\\/](react|react-dom|scheduler|react-router|@tanstack|zustand|use-sync-external-store)[\\/]/, priority: 20 },
          ],
        },
      },
    },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
})
