import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { amount, short, sol, usd } from '@/lib/format'
import { Button } from './Button'
import { SeverityChip, type ChipKind } from './SeverityChip'
import { Skeleton } from './Skeleton'
import { TokenAvatar } from './TokenAvatar'
import type { Finding } from '../../api/_lib/types'

const border: Record<Finding['severity'], string> = {
  critical: 'border-l-critical',
  warning: 'border-l-warning',
  cleanup: 'border-l-cleanup',
}

const title: Record<Finding['type'], (f: Finding) => string> = {
  delegation: (f) => `An app can still move your ${label(f)}`,
  scam_match: (f) => (f.delegate ? `A known scammer can move your ${label(f)}` : `Linked to a known scammer: ${label(f)}`),
  suspicious: () => 'Someone sent you a fake token',
  empty: (f) => `Old ${label(f)} account is holding your SOL`,
}

function label(f: Finding) {
  // Spam names can be long or contain links; keep them short on the main screen.
  const s = f.symbol || f.name || short(f.mint)
  return s.length > 18 ? `${s.slice(0, 17)}…` : s
}

export interface FindingAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function FindingCard({
  finding,
  explanation,
  primary,
  secondary,
  busy,
}: {
  finding: Finding
  explanation?: string
  primary?: FindingAction
  secondary?: FindingAction[]
  busy?: boolean
}) {
  const [open, setOpen] = useState(false)
  const chip: ChipKind = finding.type === 'suspicious' ? 'suspicious' : finding.severity
  const details: [string, string][] = [
    ['Token account', finding.tokenAccount || '—'],
    ['Mint', finding.mint],
    ['Program', String(finding.raw.program ?? finding.programId)],
    ['Balance', `${amount(finding.uiAmount)}${finding.usdValue ? ` (${usd(finding.usdValue)})` : ''}`],
    ...(finding.delegate ? ([['Who has access (delegate)', finding.delegate], ['Amount they can move', finding.delegatedAmount ?? '—']] as [string, string][]) : []),
    ['SOL held as rent', sol(finding.rentLamports)],
    ['Why flagged', finding.reasons.join('; ')],
    ...(finding.name && finding.name !== finding.symbol ? ([['Token name (set by the sender, untrusted)', finding.name]] as [string, string][]) : []),
  ]

  return (
    <article className={cn('rounded-r-card border border-l-[3px] border-border bg-surface-1 p-4', border[finding.severity])}>
      <div className="flex gap-3">
        {/* Only verified tokens get remote images: a spam token's image could be a tracking pixel. */}
        <TokenAvatar src={finding.raw.jupiterVerified === true ? finding.image : null} label={finding.symbol || finding.name || finding.mint} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 break-words text-body font-medium">{title[finding.type](finding)}</h3>
            <SeverityChip kind={chip} />
          </div>
          {explanation ? (
            <p className="mt-1 text-body-sm text-text-secondary">{explanation}</p>
          ) : (
            <div className="mt-2 space-y-2" aria-label="Loading explanation">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          )}
          {finding.unfixableReason && <p className="mt-2 text-caption text-text-muted">{finding.unfixableReason}</p>}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="-ml-2 inline-flex min-h-tap items-center gap-1 rounded-card px-2 text-body-sm text-text-muted active:bg-surface-2"
        >
          Details
          <ChevronDown size={16} className={cn('transition-transform duration-fast', open && 'rotate-180')} aria-hidden />
        </button>
        <div className="ml-auto flex items-center gap-2">
          {secondary?.map((a) => (
            <Button key={a.label} size="sm" variant={a.variant ?? 'ghost'} onClick={a.onClick} disabled={busy}>
              {a.label}
            </Button>
          ))}
          {primary && (
            <Button size="sm" variant={primary.variant ?? 'primary'} onClick={primary.onClick} loading={busy}>
              {primary.label}
            </Button>
          )}
        </div>
      </div>

      {open && (
        <dl className="mt-2 space-y-2 rounded-chip bg-surface-2 p-3">
          {details.map(([k, v]) => (
            <div key={k}>
              <dt className="text-caption text-text-muted">{k}</dt>
              <dd className="break-all font-mono text-caption text-text-secondary">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  )
}
