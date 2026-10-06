import { useMemo, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { RefreshCw, ShieldCheck, Wallet } from 'lucide-react'
import { Button } from '@/components/Button'
import { BurnSheet } from '@/components/BurnSheet'
import { EmptyState } from '@/components/EmptyState'
import { FindingCard, type FindingAction } from '@/components/FindingCard'
import { FixSheet } from '@/components/FixSheet'
import { ScoreDial } from '@/components/ScoreDial'
import { FindingCardSkeleton, Skeleton } from '@/components/Skeleton'
import { useToast } from '@/components/Toast'
import { ConnectHero } from '@/components/ConnectHero'
import { ScanReport } from '@/components/ScanReport'
import { DemoPermission } from '@/components/DemoPermission'
import { forgetWallet } from '@/lib/wallet'
import { addLocalStats } from '@/lib/localStats'
import type { FixItem } from '@/lib/fixes'
import { short, sol, timeAgo } from '@/lib/format'
import { useExplanations, useHidden, useScan } from '@/lib/useScan'
import { blockReason, defaultAction } from '../../api/_lib/guard'
import { computeScore } from '../../api/_lib/score'
import type { Finding, Severity } from '../../api/_lib/types'

const GROUPS: { severity: Severity; label: string }[] = [
  { severity: 'critical', label: 'Critical' },
  { severity: 'warning', label: 'Warning' },
  { severity: 'cleanup', label: 'Cleanup' },
]

export function ScanPage({ onFixed }: { onFixed?: () => void }) {
  const { publicKey, disconnect } = useWallet()
  // ?check=<address> opens a read-only scan (used by Telegram alert links for friends' wallets).
  const [lookup, setLookup] = useState<string | null>(() => {
    const a = new URLSearchParams(window.location.search).get('check')
    return a && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a) ? a : null
  })
  const owner = publicKey?.toBase58() ?? lookup
  const readOnly = !publicKey
  const { data, loading, error, rescan, markFixed } = useScan(owner)
  const explanations = useExplanations(data?.findings)
  const { hidden, hide, unhideAll } = useHidden(owner)
  const [fixItems, setFixItems] = useState<FixItem[] | null>(null)
  const [burnTarget, setBurnTarget] = useState<Finding | null>(null)
  const toast = useToast()

  const visible = useMemo(() => data?.findings.filter((f) => !hidden.has(f.mint)) ?? [], [data, hidden])
  const hiddenCount = (data?.findings.length ?? 0) - visible.length
  const score = data ? computeScore(visible) : 0
  const fixAll: FixItem[] = useMemo(
    () =>
      visible
        .map((f) => ({ finding: f, action: defaultAction(f) }))
        .filter((x): x is FixItem => !!x.action && !blockReason(x.finding, x.action)),
    [visible],
  )
  const fixAllReclaim = fixAll.filter((i) => i.action === 'close').reduce((s, i) => s + i.finding.rentLamports, 0)

  if (!owner) return <ConnectHero onLookup={setLookup} />

  const actionsFor = (f: Finding): { primary?: FindingAction; secondary?: FindingAction[] } => {
    const act = defaultAction(f)
    const canBurn = !readOnly && !blockReason(f, 'burn', { burnConfirmed: true })
    const secondary: FindingAction[] = []
    if (f.type === 'suspicious' || (f.type === 'scam_match' && !f.delegate)) {
      if (canBurn) secondary.push({ label: 'Burn', onClick: () => setBurnTarget(f), variant: 'ghost' })
      return { primary: { label: 'Hide', variant: 'secondary', onClick: () => hide(f.mint) }, secondary }
    }
    if (readOnly || !act || blockReason(f, act)) return {}
    return { primary: { label: act === 'revoke' ? 'Revoke' : 'Close', onClick: () => setFixItems([{ finding: f, action: act }]) } }
  }

  return (
    <section className="space-y-6 pt-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-body-sm text-text-secondary">
          <Wallet size={16} aria-hidden />
          <span className="truncate font-mono">{short(owner, 5)}</span>
          {readOnly && <span className="rounded-chip bg-surface-2 px-2 py-px text-caption">Read-only</span>}
        </div>
        <Button size="sm" variant="ghost" onClick={() => {
            if (readOnly) return setLookup(null)
            forgetWallet()
            disconnect()
          }}>
          {readOnly ? 'Change' : 'Disconnect'}
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex items-center gap-6" aria-label="Scanning">
          <Skeleton className="h-[168px] w-[168px] rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-28" />
          </div>
        </div>
      ) : data ? (
        <ScoreDial score={score} />
      ) : null}

      {error && !loading && (
        <EmptyState title="Scan didn’t finish" body={error} action={<Button variant="secondary" onClick={rescan}>Try again</Button>} />
      )}

      {data && !readOnly && fixAll.length > 0 && (
        <div className="space-y-2">
          <Button className="w-full" onClick={() => setFixItems(fixAll)}>
            Fix all safe items ({fixAll.length})
          </Button>
          <p className="text-caption text-text-muted">
            Revokes permissions and closes empty accounts{fixAllReclaim > 0 ? `, returning about ${sol(fixAllReclaim)}` : ''}. Never burns anything.
          </p>
        </div>
      )}

      {data && readOnly && visible.length > 0 && (
        <p className="rounded-chip bg-surface-1 p-3 text-body-sm text-text-secondary">This is a read-only check. Connect this wallet on its phone to fix these.</p>
      )}

      {data && <ScanReport data={data} findings={visible} />}

      {loading && !data && (
        <div className="space-y-3">
          <FindingCardSkeleton />
          <FindingCardSkeleton />
          <FindingCardSkeleton />
        </div>
      )}

      {data && visible.length === 0 && (
        <EmptyState
          icon={<ShieldCheck size={28} aria-hidden />}
          title="You’re all clear"
          body="Nothing needs fixing. Turn on alerts in Watch and Shield will tell you if that changes."
          action={<Button variant="secondary" onClick={rescan} loading={loading}>Scan again</Button>}
        />
      )}

      {GROUPS.map(({ severity, label }) => {
        const items = visible.filter((f) => f.severity === severity)
        if (!items.length) return null
        return (
          <div key={severity} className="space-y-3">
            <h2 className="flex items-baseline gap-2 text-body-sm font-medium text-text-secondary">
              {label} <span className="text-caption text-text-muted">{items.length}</span>
            </h2>
            {items.map((f) => {
              const { primary, secondary } = actionsFor(f)
              return <FindingCard key={f.id} finding={f} explanation={explanations[f.id]} primary={primary} secondary={secondary} />
            })}
          </div>
        )
      })}

      {data && (
        <div className="flex items-center justify-between text-caption text-text-muted">
          <span>
            Scanned {timeAgo(data.scannedAt)}
            {hiddenCount > 0 && (
              <>
                {' · '}
                <button className="underline underline-offset-2" onClick={unhideAll}>
                  Show {hiddenCount} hidden
                </button>
              </>
            )}
          </span>
          {visible.length > 0 && (
            <Button size="sm" variant="ghost" onClick={rescan} loading={loading}>
              <RefreshCw size={16} aria-hidden /> Scan again
            </Button>
          )}
        </div>
      )}

      {!readOnly && data && <DemoPermission onDone={rescan} />}

      <BurnSheet
        finding={burnTarget}
        onCancel={() => setBurnTarget(null)}
        onConfirm={(f) => {
          setBurnTarget(null)
          setFixItems([{ finding: f, action: 'burn', burnConfirmed: true }])
        }}
      />
      <FixSheet
        items={fixItems}
        onClose={() => setFixItems(null)}
        onDone={(r) => {
          toast('success', r.reclaimedLamports > 0 ? `Fixed. ${sol(r.reclaimedLamports)} reclaimed.` : 'Fixed. Your wallet is safer.')
          // Update the score now; markFixed also re-checks the chain a few times in the background.
          markFixed(r.fixedIds)
          if (owner) addLocalStats(owner, { fixed: r.fixedIds.length, reclaimedLamports: r.reclaimedLamports })
          onFixed?.()
          r.recorded.then(() => onFixed?.())
        }}
      />
    </section>
  )
}
