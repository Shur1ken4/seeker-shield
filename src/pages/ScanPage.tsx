import { useEffect, useMemo, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { RefreshCw, ShieldCheck, Wallet } from 'lucide-react'
import { Button } from '@/components/Button'
import { BurnSheet } from '@/components/BurnSheet'
import { EmptyState } from '@/components/EmptyState'
import { FindingCard, type FindingAction } from '@/components/FindingCard'
import { FixSheet } from '@/components/FixSheet'
import { ScoreDial } from '@/components/ScoreDial'
import { FindingCardSkeleton } from '@/components/Skeleton'
import { useToast } from '@/components/Toast'
import { ConnectHero } from '@/components/ConnectHero'
import { ScanReport } from '@/components/ScanReport'
import { DemoPermission } from '@/components/DemoPermission'
import { forgetWallet, useSession } from '@/lib/wallet'
import { useWardy } from '@/lib/useWardy'
import { WardyPatrol } from '@/components/WardyPatrol'
import { Wardy, type WardyMood } from '@/components/Wardy'
import { addLocalStats } from '@/lib/localStats'
import type { FixItem } from '@/lib/fixes'
import { short, sol, timeAgo } from '@/lib/format'
import { useExplanations, useHidden, useScan } from '@/lib/useScan'
import { blockReason, defaultAction } from '../../api/_lib/guard'
import { computeScore } from '../../api/_lib/score'
import type { Finding, Severity } from '../../api/_lib/types'

// Grouped by what to do, not just how bad it is (the coloured chips still carry severity).
const GROUPS: { severity: Severity; label: string; hint: string }[] = [
  { severity: 'critical', label: 'Fix now', hint: 'Could lose you money' },
  { severity: 'warning', label: 'Check this', hint: 'Worth a look' },
  { severity: 'cleanup', label: 'Tidy up', hint: 'Harmless, and gives SOL back' },
]

/** What Wardy says about the wallet, in his own voice. */
function summaryLine(findings: Finding[], readOnly: boolean) {
  const whose = readOnly ? 'this' : 'your'
  if (!findings.length) return `All quiet. Nothing can drain ${whose} wallet.`
  const urgent = findings.filter((f) => f.severity !== 'cleanup').length
  const tidy = findings.length - urgent
  if (urgent) return `I found ${urgent} thing${urgent === 1 ? '' : 's'} to fix.`
  return readOnly ? `Safe. ${tidy} old account${tidy === 1 ? ' is' : 's are'} holding SOL.` : `You’re safe. ${tidy} old account${tidy === 1 ? ' holds' : 's hold'} SOL for you.`
}

export function ScanPage({ onFixed, onGoToWatch }: { onFixed?: () => void; onGoToWatch?: () => void }) {
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
  const { hasSession, signIn, signingIn } = useSession()
  const wardy = useWardy(readOnly ? null : owner)
  const [eating, setEating] = useState(false)
  const [gained, setGained] = useState<number | null>(null)

  // Wardy's daily patrol: once the user's own wallet has been scanned, count today's meal.
  useEffect(() => {
    if (readOnly || !data || !hasSession) return
    wardy.patrol().then((r) => {
      if (!r || r.already) return
      setGained(r.gained)
      toast('success', r.napped ? 'Wardy woke up from his nap and finished his patrol.' : 'Patrol complete. Wardy’s fed for today.')
      if (r.levelUp) toast('success', `Wardy grew to level ${r.state.level}: ${r.state.levelName}.`)
      if (r.rewardProDays) toast('success', `${r.state.streak}-day streak. You earned ${r.rewardProDays} free days of Wardy Pro.`)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, data?.scannedAt, hasSession])

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
      if (canBurn) secondary.push({ label: 'Destroy', onClick: () => setBurnTarget(f), variant: 'ghost' })
      return { primary: { label: 'Hide', variant: 'secondary', onClick: () => hide(f.mint) }, secondary }
    }
    if (readOnly || !act || blockReason(f, act)) return {}
    return { primary: { label: act === 'revoke' ? 'Remove access' : 'Get SOL back', onClick: () => setFixItems([{ finding: f, action: act }]) } }
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
        <div className="flex items-center gap-5" aria-label="Scanning">
          <div className="flex h-[156px] w-[156px] shrink-0 items-center justify-center rounded-full border-[6px] border-surface-2">
            <Wardy mood="calm" size={78} />
          </div>
          <div className="space-y-2">
            <p className="text-body font-medium">Wardy is patrolling…</p>
            
          </div>
        </div>
      ) : data ? (
        <div className="space-y-3">
          <ScoreDial score={score} mood={wardyMood(eating, !readOnly && !!wardy.state?.sleepy && !wardy.state.patrolledToday)} />
          {/* Wardy's speech bubble */}
          <div className="relative rounded-card bg-surface-2 px-4 py-3">
            <span aria-hidden className="absolute -top-1.5 left-14 h-3 w-3 rotate-45 bg-surface-2" />
            <p className="relative text-body text-text-primary">{summaryLine(visible, readOnly)}</p>
          </div>
          {!readOnly && (
            <WardyPatrol
              state={wardy.state}
              needsSession={!hasSession}
              starting={signingIn}
              gained={gained}
              onStart={() => signIn().catch((e) => toast('error', (e as Error).message))}
            />
          )}
        </div>
      ) : null}

      {error && !loading && (
        <EmptyState title="Scan didn’t finish" body={error} action={<Button variant="secondary" onClick={rescan}>Try again</Button>} />
      )}

      {data && !readOnly && fixAll.length > 0 && (
        <div className="space-y-2">
          <Button className="w-full" onClick={() => setFixItems(fixAll)}>
            Fix {fixAll.length} issue{fixAll.length === 1 ? '' : 's'}
          </Button>
          <p className="text-caption text-text-muted">
            {fixAllReclaim > 0 ? `Returns about ${sol(fixAllReclaim)}. ` : ''}Your tokens don’t move.
          </p>
        </div>
      )}

      {data && readOnly && visible.length > 0 && (
        <p className="rounded-chip bg-surface-1 p-3 text-body-sm text-text-secondary">Read-only. Only the owner can fix these.</p>
      )}

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
          body={readOnly ? 'Nothing in this wallet needs fixing right now.' : 'Nothing needs fixing. Turn on alerts and Wardy will tell you if that changes.'}
          action={
            !readOnly && onGoToWatch ? (
              <Button onClick={onGoToWatch}>Turn on alerts</Button>
            ) : (
              <Button variant="secondary" onClick={rescan} loading={loading}>
                Scan again
              </Button>
            )
          }
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

      {/* The work behind the score: open on a clean wallet, tucked below the problems otherwise. */}
      {data && <ScanReport data={data} findings={visible} defaultOpen={visible.length === 0} />}

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
        onAlerts={onGoToWatch}
        onDone={(r) => {
          toast('success', r.reclaimedLamports > 0 ? `Done. ${sol(r.reclaimedLamports)} is back in your wallet.` : 'Done. Your wallet is safer.')
          // Update the score now; markFixed also re-checks the chain a few times in the background.
          markFixed(r.fixedIds)
          // Wardy eats what was fixed; the server adds snack XP once it has verified the fix on-chain.
          setEating(true)
          window.setTimeout(() => setEating(false), 2600)
          r.recorded.then(() => wardy.refresh())
          if (owner) addLocalStats(owner, { fixed: r.fixedIds.length, reclaimedLamports: r.reclaimedLamports })
          onFixed?.()
          r.recorded.then(() => onFixed?.())
        }}
      />
    </section>
  )
}

function wardyMood(eating: boolean, sleepy: boolean): WardyMood | undefined {
  if (eating) return 'eating'
  if (sleepy) return 'sleepy'
  return undefined
}
