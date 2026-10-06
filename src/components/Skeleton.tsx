import { cn } from '@/lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('rounded-chip bg-surface-2', className)} />
}

export function FindingCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-r-card border border-l-[3px] border-border border-l-surface-2 bg-surface-1 p-4">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    </div>
  )
}
