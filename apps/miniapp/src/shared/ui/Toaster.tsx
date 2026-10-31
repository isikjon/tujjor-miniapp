import { cx } from '../lib/cx'
import { useToasts } from '../store/toast'

/** Renders the toast queue. Variants style `.toast-card` (and `[data-tone]`) in their theme. */
export function Toaster({ position }: { position: 'top' | 'bottom' }) {
  const items = useToasts((s) => s.items)
  const dismiss = useToasts((s) => s.dismiss)
  return (
    <div className="toast-host" data-pos={position} role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast" data-leaving={t.leaving || undefined}>
          <div className={cx('toast-card')} data-tone={t.tone}>
            <span className="toast-text">{t.text}</span>
            {t.action ? (
              <button
                type="button"
                className="tap toast-action"
                onClick={() => {
                  t.action!.onClick()
                  dismiss(t.id)
                }}
              >
                {t.action.label}
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
