import { RotateCcw, WifiOff } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { isApiError } from '../demo/errors'
import { useT } from '../i18n'
import { cx } from '../lib/cx'
import { useTg } from '../telegram/adapter'

/** Neutral empty-state layout; variants pass their own icon / classes. */
export function EmptyState({ icon, title, text, action, className }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col items-center px-8 py-12 text-center', className)}>
      {icon ? <div className="empty-icon mb-4">{icon}</div> : null}
      <p className="empty-title text-[17px] font-semibold">{title}</p>
      {text ? <p className="empty-text mt-1.5 max-w-[280px] text-[14px] leading-snug text-ink-2">{text}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function errorMessage(err: unknown, t: ReturnType<typeof useT>): { title: string; text: string; offline: boolean } {
  if (isApiError(err) && err.code === 'offline') return { title: t.t('error.offline'), text: t.t('state.errorText'), offline: true }
  if (isApiError(err) && err.code === 'not_found') return { title: t.t('product.notFound'), text: '', offline: false }
  return { title: t.t('state.errorTitle'), text: t.t('state.errorText'), offline: false }
}

/** Error with a retry action. `compact` renders an inline row for sections inside a screen. */
export function ErrorState({ error, onRetry, compact, className }: { error: unknown; onRetry?: () => void; compact?: boolean; className?: string }) {
  const t = useT()
  const m = errorMessage(error, t)
  if (compact) {
    return (
      <div className={cx('flex items-center gap-3 rounded-[var(--radius-card)] bg-surface-2 px-4 py-3 text-[14px]', className)}>
        {m.offline ? <WifiOff size={18} className="shrink-0 text-ink-3" /> : null}
        <span className="flex-1 text-ink-2">{m.title}</span>
        {onRetry ? (
          <button type="button" className="tap inline-flex items-center gap-1.5 font-semibold text-accent" onClick={onRetry}>
            <RotateCcw size={15} /> {t.t('action.retry')}
          </button>
        ) : null}
      </div>
    )
  }
  return (
    <EmptyState
      className={className}
      icon={m.offline ? <WifiOff size={40} strokeWidth={1.6} className="text-ink-3" /> : <RotateCcw size={40} strokeWidth={1.6} className="text-ink-3" />}
      title={m.title}
      text={m.text}
      action={
        onRetry ? (
          <button type="button" className="tap rounded-[var(--radius-button)] bg-accent px-5 py-2.5 text-[15px] font-semibold text-accent-ink" onClick={onRetry}>
            {t.t('action.retry')}
          </button>
        ) : null
      }
    />
  )
}

/** True when the app is (simulated or really) offline. */
export function useOffline() {
  const sim = useTg((s) => s.network === 'offline')
  const [real, setReal] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false)
  useEffect(() => {
    const on = () => setReal(false)
    const off = () => setReal(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return sim || real
}

/** Slim banner shown while offline: cached data stays visible, actions explain why they fail. */
export function OfflineBanner() {
  const t = useT()
  const offline = useOffline()
  return (
    <div className="offline-banner" data-show={offline} role="status" aria-live="polite">
      <WifiOff size={14} strokeWidth={2.2} />
      <span>{t.t('state.offline')}</span>
    </div>
  )
}

/** Small "DEMO" marker every variant shows somewhere persistent. */
export function DemoBadge({ className }: { className?: string }) {
  const t = useT()
  return (
    <span className={cx('demo-badge', className)} title={t.t('demo.note')} aria-label={t.t('demo.note')}>
      {t.t('demo.badge')}
    </span>
  )
}
