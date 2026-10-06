import { cn } from '@/lib/cn'

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent', className)}
      style={{ animation: 'spin 700ms linear infinite' }}
    />
  )
}
