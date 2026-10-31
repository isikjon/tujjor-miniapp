import { ChevronLeft } from 'lucide-react'
import { useEffect } from 'react'
import { useT } from '../i18n'
import { tg, useTg } from '../telegram/adapter'

/**
 * Plain-browser host only: renders the Telegram BackButton / MainButton in-page so every flow
 * stays usable outside Telegram and outside the Design Lab.
 */
export function FallbackChrome() {
  const mode = useTg((s) => s.mode)
  const back = useTg((s) => s.backVisible)
  const main = useTg((s) => s.mainButton)
  const theme = useTg((s) => s.theme)
  const t = useT()
  const mainShown = mode === 'web' && main.visible
  useEffect(() => {
    document.documentElement.style.setProperty('--main-btn-h', mainShown ? '70px' : '0px')
  }, [mainShown])
  if (mode !== 'web') return null
  return (
    <>
      {back ? (
        <button
          type="button"
          className="tap fixed left-3 z-[95] grid h-10 w-10 place-items-center rounded-full bg-black/55 text-white shadow-lg"
          style={{ top: 'calc(var(--safe-top) + 10px)' }}
          onClick={() => {
            tg.haptic('light')
            tg.pressBack()
          }}
          aria-label={t.t('action.close')}
        >
          <ChevronLeft size={22} />
        </button>
      ) : null}
      {main.visible ? (
        <div className="fixed inset-x-0 bottom-0 z-[95] px-4 pt-2" style={{ paddingBottom: 'calc(var(--safe-bottom) + 10px)', background: 'var(--color-bg)' }}>
          <button
            type="button"
            className="tap flex h-[50px] w-full items-center justify-center rounded-xl text-[16px] font-semibold"
            style={{ background: main.color ?? theme.button_color, color: main.textColor ?? theme.button_text_color, opacity: main.active ? 1 : 0.55 }}
            disabled={!main.active || main.progress}
            onClick={() => tg.pressMain()}
          >
            {main.progress ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : main.text}
          </button>
        </div>
      ) : null}
    </>
  )
}
