import { Minus, Plus } from 'lucide-react'
import { cx } from '../lib/cx'
import { tg } from '../telegram/adapter'

export interface QtyStepperProps {
  value: number
  min?: number
  max: number
  onChange: (v: number) => void
  /** Called when the user taps "+" at the maximum (show "only N available"). */
  onLimit?: () => void
  className?: string
  buttonClassName?: string
  valueClassName?: string
  iconSize?: number
  label?: string
}

/** Quantity control. Visuals come from className props; behaviour (bounds, haptics, a11y) is shared. */
export function QtyStepper({ value, min = 1, max, onChange, onLimit, className, buttonClassName, valueClassName, iconSize = 16, label }: QtyStepperProps) {
  const set = (v: number) => {
    if (v > max) {
      tg.haptic('warning')
      onLimit?.()
      return
    }
    if (v < min) return
    tg.haptic('selection')
    onChange(v)
  }
  return (
    <div className={cx('inline-flex items-center', className)} role="group" aria-label={label}>
      <button type="button" className={cx('tap grid place-items-center', buttonClassName)} onClick={() => set(value - 1)} disabled={value <= min} aria-label="−1">
        <Minus size={iconSize} strokeWidth={2.2} />
      </button>
      <span className={cx('min-w-[2ch] text-center tabular-nums', valueClassName)} aria-live="polite">
        {value}
      </span>
      <button type="button" className={cx('tap grid place-items-center', buttonClassName)} onClick={() => set(value + 1)} aria-disabled={value >= max} aria-label="+1">
        <Plus size={iconSize} strokeWidth={2.2} />
      </button>
    </div>
  )
}
