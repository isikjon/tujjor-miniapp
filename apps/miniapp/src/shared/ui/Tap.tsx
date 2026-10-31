import type { ButtonHTMLAttributes, MouseEvent } from 'react'
import { cx } from '../lib/cx'
import { tg } from '../telegram/adapter'
import type { HapticKind } from '../telegram/protocol'

export interface TapProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Haptic feedback on activation (Telegram). Default: 'selection'. */
  haptic?: HapticKind | false
  /** Disable the scale-down press effect (e.g. list rows that use a background highlight). */
  flat?: boolean
}

/**
 * Button primitive: native <button>, instant CSS press feedback (.tap), Telegram haptics.
 * Variants style it entirely through className.
 */
export function Tap({ haptic = 'selection', flat, className, onClick, type = 'button', ...rest }: TapProps) {
  return (
    <button
      type={type}
      {...rest}
      className={cx('tap', flat && 'tap-flat', className)}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        if (haptic) tg.haptic(haptic)
        onClick?.(e)
      }}
    />
  )
}
