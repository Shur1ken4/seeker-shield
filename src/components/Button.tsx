import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'reward'

const variants: Record<Variant, string> = {
  primary: 'bg-safe text-on-safe active:bg-safe/80',
  secondary: 'border border-border text-text-primary active:bg-surface-2',
  destructive: 'bg-critical text-on-safe active:bg-critical/80',
  ghost: 'text-text-secondary active:bg-surface-2',
  // Special offers only (Unlock Wardy): mint gradient, slow shine, soft glow. Never for ordinary actions.
  reward: 'btn-reward text-on-safe active:brightness-95',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  size?: 'md' | 'sm'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', loading, size = 'md', disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex min-h-tap items-center justify-center gap-2 rounded-card font-medium',
        'transition-colors duration-fast ease-out select-none',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safe',
        'disabled:cursor-not-allowed disabled:opacity-40',
        size === 'md' ? 'px-4 text-body' : 'px-3 text-body-sm',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {/* Keep the label in the layout while loading so the width doesn't jump. */}
      <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>{children}</span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </span>
      )}
    </button>
  )
})
