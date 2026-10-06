import { cn } from '@/lib/cn'
import type { Severity } from '../../api/_lib/types'

export type ChipKind = Severity | 'suspicious' | 'safe'

const styles: Record<ChipKind, string> = {
  critical: 'bg-critical/[.14] text-critical',
  warning: 'bg-warning/[.14] text-warning',
  cleanup: 'bg-cleanup/[.14] text-cleanup',
  suspicious: 'bg-warning/[.14] text-warning',
  safe: 'bg-safe/[.14] text-safe',
}

const labels: Record<ChipKind, string> = {
  critical: 'Critical',
  warning: 'Warning',
  cleanup: 'Cleanup',
  suspicious: 'Suspicious',
  safe: 'Safe',
}

export function SeverityChip({ kind, className }: { kind: ChipKind; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-chip px-2 py-px text-caption font-medium', styles[kind], className)}>
      {labels[kind]}
    </span>
  )
}
