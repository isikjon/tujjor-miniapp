import { useEffect, useEffectEvent } from 'react'
import { useIsActiveScreen } from '../nav/context'
import { tg, useTg } from './adapter'
import { MAIN_BUTTON_HIDDEN } from './protocol'

export interface MainButtonOptions {
  text: string
  onClick: () => void
  visible?: boolean
  active?: boolean
  progress?: boolean
  color?: string
  textColor?: string
  shine?: boolean
}

/**
 * Declarative Telegram MainButton. Only the focused screen controls it, so covered screens
 * in the stack never fight over the button. In the lab it is emulated by the phone frame,
 * in a plain browser it is rendered by <FallbackChrome/>.
 */
export function useMainButton(opts: MainButtonOptions | null) {
  const active = useIsActiveScreen()
  const onClick = useEffectEvent(() => opts?.onClick())
  const show = !!opts && opts.visible !== false && active
  const text = opts?.text ?? ''
  const isActive = opts?.active ?? true
  const progress = !!opts?.progress
  const color = opts?.color
  const textColor = opts?.textColor
  const shine = !!opts?.shine
  useEffect(() => {
    if (!show) return
    tg.setMainHandler(() => onClick())
    tg.setMainButton({ visible: true, text, active: isActive, progress, color, textColor, shine })
  }, [show, text, isActive, progress, color, textColor, shine])
  useEffect(() => {
    if (!show) return
    return () => {
      tg.setMainHandler(null)
      tg.setMainButton(MAIN_BUTTON_HIDDEN)
    }
  }, [show])
}

export const useScheme = () => useTg((s) => s.scheme)
export const useHostMode = () => useTg((s) => s.mode)
export const useNetworkProfile = () => useTg((s) => s.network)
export const haptic = tg.haptic
