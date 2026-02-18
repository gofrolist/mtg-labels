import { useId } from 'react'

interface NumFieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  step?: number
  integer?: boolean
}

export const inputClasses =
  'w-full h-9 px-2.5 py-1.5 border border-mtg-border rounded-lg bg-mtg-input-bg text-mtg-text text-sm focus:outline-none focus:ring-2 focus:ring-mtg-accent'

export function NumField({ label, value, onChange, min = 0, step = 0.01, integer }: NumFieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs text-mtg-text-muted">{label}</label>
      <input
        id={id}
        type="number"
        value={value}
        min={min}
        step={step}
        onChange={(e) => {
          const v = integer ? parseInt(e.target.value, 10) : parseFloat(e.target.value)
          if (!isNaN(v)) onChange(v)
        }}
        className={inputClasses}
      />
    </div>
  )
}
