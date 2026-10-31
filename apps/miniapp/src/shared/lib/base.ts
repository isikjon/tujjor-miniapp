/**
 * Deploy base path: '/' locally, e.g. '/tujjor-miniapp/' on GitHub Pages (set BASE_PATH at build time).
 * Every absolute URL the app builds goes through these helpers.
 */
export const BASE: string = import.meta.env.BASE_URL || '/'

/** URL inside the deployment, e.g. withBase('app/a') → '/tujjor-miniapp/app/a'. */
export const withBase = (p: string) => BASE + p.replace(/^\//, '')

/** Current pathname without the base prefix, always starting with '/'. */
export const appPath = (pathname: string = location.pathname) => (pathname.startsWith(BASE) ? `/${pathname.slice(BASE.length)}` : pathname)

/** Variant id when running as /app/<id>, else null (Design Lab). */
export const variantFromPath = (pathname?: string) => (appPath(pathname).match(/^\/app\/([abcd])(?:\/|$)/)?.[1] as 'a' | 'b' | 'c' | 'd' | undefined) ?? null
