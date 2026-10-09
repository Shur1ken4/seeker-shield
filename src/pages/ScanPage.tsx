import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { RefreshCw, ShieldCheck, Wallet } from 'lucide-react'
import { Button } from '@/components/Button'
import { BurnSheet } from '@/components/BurnSheet'
import { EmptyState } from '@/components/EmptyState'
import { FindingCard, type FindingAction } from '@/components/FindingCard'
import { FixSheet } from '@/components/FixSheet'
import { ScoreBar, ScoreDial } from '@/components/ScoreDial'
import { useToast } from '@/components/Toast'
import { ConnectHero } from '@/components/ConnectHero'
import { ScanReport } from '@/components/ScanReport'
import { DemoPermission } from '@/components/DemoPermission'
import { forgetWallet, useSession } from '@/lib/wallet'
import { useWardy } from '@/lib/useWardy'
import { LookPicker } from '@/components/LookPicker'
import { Sheet } from '@/components/Sheet'
import { WardyStage } from '@/components/WardyStage'
import { PENDING_ADOPT } from '@/components/ConnectHero'
import { AdoptSheet } from '@/components/AdoptSheet'
import { ScanProgress } from '@/components/ScanProgress'
import { ScanShow } from '@/components/ScanShow'
import { ChestSheet } from '@/components/ChestSheet'
import type { ChestPrize } from '../../api/_lib/types'
import { moodForScore, type WardyMood } from '@/components/Wardy'
import { addLocalStats } from '@/lib/localStats'
import { celebrate } from '@/lib/celebrate'
import type { FixItem } from '@/lib/fixes'
import { lamportsUsd, short, sol, timeAgo } from '@/lib/format'
import { useExplanations, useHidden, useScan } from '@/lib/useScan'
import { blockReason, defaultAction } from '../../api/_lib/guard'
import { computeScore } from '../../api/_lib/score'
import { ADOPT_PRICE_SKR } from '../../api/_lib/constants'
import type { Finding, Severity } from '../../api/_lib/types'

// Grouped by what to do, not just how bad it is (the coloured chips still carry severity).
const GROUPS: { severity: Severity; label: string; hint: string }[] = [
  { severity: 'critical', label: 'Fix now', hint: 'Could lose you money' },
  { severity: 'warning', label: 'Check this', hint: 'Worth a look' },
  { severity: 'cleanup', label: 'Tidy up', hint: 'Harmless, and gives SOL back' },
]

/** The plain status line under the score. */
function summaryLine(findings: Finding[], readOnly: boolean) {
  const whose = readOnly ? 'This' : 'Your'
  if (!findings.length) return `${whose} wallet is safe. Nothing needs fixing.`
  const urgent = findings.filter((f) => f.severity !== 'cleanup').length
  const tidy = findings.length - urgent
  if (urgent) return `${urgent} thing${urgent === 1 ? '' : 's'} to fix${tidy ? `, plus ${tidy} to tidy up` : ''}.`
  return `Safe. ${tidy} old account${tidy === 1 ? ' holds' : 's hold'} SOL ${readOnly ? 'the owner' : 'you'} can get back.`
}

/** Wardy's own short line, by mood. */
function moodLine(mood: WardyMood, fed: boolean) {
  if (!fed) return 'Ooh, a fresh scan! Tap below to feed it to me. 🍖'
  switch (mood) {
    case 'happy':
      return 'All quiet on my patrol.'
    case 'calm':
      return 'Mostly fine. I’m watching.'
    case 'worried':
      return 'Something needs a look.'
    default:
      return 'Fix the urgent ones, please!'
  }
}

export function ScanPage({ onFixed, onGoToWatch, onShowIntro }: { onFixed?: () => void; onGoToWatch?: () => void; onShowIntro?: () => void }) {
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
  const outfit = wardy.state?.outfit ?? 'classic'
  const [eating, setEating] = useState(false)
  const [gained, setGained] = useState<number | null>(null)
  const [adoptOpen, setAdoptOpen] = useState(false)
  const [chest, setChest] = useState<{ prize: ChestPrize; streak: number } | null>(null)
  const adopted = !!wardy.state?.adopted

  // Scanning IS feeding: the day's first scan of your own wallet is Wardy's meal (counted once per day on the server).
  const [feeding, setFeeding] = useState(false)
  const eatScan = async () => {
    const r = await wardy.patrol()
    // null = already eaten in this session (the server also counts only one meal a day).
    if (!r || r.already) return
    setEating(true)
    window.setTimeout(() => setEating(false), 2200)
    setGained(r.gained)
    const urgent = visible.filter((f) => f.severity !== 'cleanup').length
    toast(
      'success',
      r.clean
        ? `Spotless! Wardy ate a clean-wallet treat. +${r.gained} XP`
        : urgent
          ? `Wardy ate your scan and found ${urgent} thing${urgent === 1 ? '' : 's'} to fix. +${r.gained} XP`
          : `Wardy ate your scan. +${r.gained} XP`,
    )
    if (r.napped) toast('info', 'He was napping. Welcome back.')
      if (r.levelUp) {
        celebrate('big')
        toast('success', `Wardy grew to level ${r.state.level}: ${r.state.levelName}.`)
      }
      // Streak chest: a moment of its own, opened by the user.
      if (r.chest) window.setTimeout(() => setChest({ prize: r.chest!, streak: r.state.streak }), 1200)
  }

  /** "Scan & feed Wardy": sign in if needed (needs a tap), then scan, then he eats it. */
  const feed = async () => {
    setFeeding(true)
    try {
      if (!hasSession) await signIn()
      await rescan()
      await eatScan()
    } catch (e) {
      toast('error', (e as Error).message)
    } finally {
      setFeeding(false)
    }
  }

  // Any scan of your own wallet (opening the app, Scan again) feeds a hungry Wardy automatically.
  useEffect(() => {
    if (readOnly || !data || !hasSession || !adopted || feeding || wardy.state?.patrolledToday) return
    eatScan().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, data?.scannedAt, hasSession, adopted, wardy.state?.patrolledToday])

  // Came from "Unlock Wardy" on the first screen: open the adopt flow once the wallet is connected.
  useEffect(() => {
    if (readOnly || !wardy.state || adopted) return
    let pending = false
    try {
      pending = sessionStorage.getItem(PENDING_ADOPT) === '1'
      sessionStorage.removeItem(PENDING_ADOPT)
    } catch {
      pending = false
    }
    if (pending) startAdopt()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, wardy.state, adopted])

  // Just open the sheet; it signs in from the user's tap there (Android only opens the wallet from a real tap).
  const startAdopt = () => setAdoptOpen(true)

  // The animated check plays on every scan you start; results appear once it has finished.
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    if (loading) setRevealed(false)
  }, [loading])
  useEffect(() => setRevealed(false), [owner])
  const showProgress = !error && (loading || (!!data && !revealed))
  const onProgressDone = useCallback(() => setRevealed(true), [])
  // The full-screen show plays on the first scan of each wallet per visit; later scans use the small one.
  const [shownBig, setShownBig] = useState<Set<string | null>>(() => new Set())
  const onBigDone = useCallback(() => {
    setShownBig((s) => new Set(s).add(owner))
    setRevealed(true)
  }, [owner])

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

  if (!owner) return <ConnectHero onLookup={setLookup} onShowIntro={onShowIntro} />

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

      {showProgress && !shownBig.has(owner) && (
        <ScanShow key={`show-${owner}`} data={data} finished={!loading && !!data} onDone={onBigDone} readOnly={readOnly} outfit={readOnly ? 'classic' : outfit} level={readOnly ? 1 : wardy.state?.level} />
      )}
      {showProgress ? (
        // While the full-screen show plays, it alone decides when results appear.
        shownBig.has(owner) ? <ScanProgress key={`progress-${owner}`} finished={!loading && !!data} onDone={onProgressDone} readOnly={readOnly} /> : null
      ) : data ? (
        readOnly ? (
          <div className="space-y-3">
            <ScoreDial score={score} />
            <div className="relative rounded-card bg-surface-2 px-4 py-3">
              <span aria-hidden className="absolute -top-1.5 left-14 h-3 w-3 rotate-45 bg-surface-2" />
              <p className="relative text-body text-text-primary">{summaryLine(visible, readOnly)}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <ScoreBar score={score} />
            <p className="text-body text-text-primary">{summaryLine(visible, readOnly)}</p>
          </div>
        )
      ) : null}

      {error && !loading && (
        <EmptyState title="Scan didn’t finish" body={error} action={<Button variant="secondary" onClick={rescan}>Try again</Button>} />
      )}
      {!showProgress && (
        <>

      {data && !readOnly && fixAll.length > 0 && (
        <div className="space-y-2">
          <Button className="w-full" onClick={() => setFixItems(fixAll)}>
            Fix {fixAll.length} issue{fixAll.length === 1 ? '' : 's'}
          </Button>
          <p className="text-caption text-text-muted">
            {fixAllReclaim > 0 ? `Wardy found you ${lamportsUsd(fixAllReclaim, data.solUsd) || sol(fixAllReclaim)}${data.solUsd ? ` (${sol(fixAllReclaim)})` : ''}. ` : ''}Your tokens don’t move.
          </p>
        </div>
      )}

      {data && !readOnly && visible.length === 0 && (
        <WardyStage
          compact
          locked={!!wardy.state && !adopted}
          mood={wardyMood(false, !!wardy.state?.sleepy && !wardy.state.patrolledToday) ?? moodForScore(score)}
          line={moodLine(moodForScore(score), !!wardy.state?.patrolledToday)}
          state={wardy.state}
          eating={eating}
          gained={gained}
          onFeed={feed}
          feeding={feeding}
          onUnlock={startAdopt}
          unlocking={signingIn}
          unlockPrice={ADOPT_PRICE_SKR}
          outfit={outfit}
        />
      )}

      {data && readOnly && visible.length > 0 && (
        <p className="rounded-chip bg-surface-1 p-3 text-body-sm text-text-secondary">Read-only. Only the owner can fix these.</p>
      )}

      {data && visible.length === 0 && (
        <EmptyState
          icon={<ShieldCheck size={28} aria-hidden />}
          title="You’re all clear"
          body={readOnly ? 'Nothing in this wallet needs fixing right now.' : adopted ? 'Nothing needs fixing. Wardy will tell you if that changes.' : 'Nothing needs fixing right now.'}
          action={
            readOnly ? (
              <Button variant="secondary" onClick={rescan} loading={loading}>
                Scan again
              </Button>
            ) : adopted && onGoToWatch ? (
              <Button variant="secondary" onClick={onGoToWatch}>Turn on alerts</Button>
            ) : undefined
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
              return <FindingCard key={f.id} finding={f} explanation={explanations[f.id]} primary={primary} secondary={secondary} ownWallet={!readOnly} />
            })}
          </div>
        )
      })}

      {/* With problems to fix, Wardy waits below them: purpose first. */}
      {data && !readOnly && visible.length > 0 && (
        <WardyStage
          compact
          locked={!!wardy.state && !adopted}
          mood={wardyMood(false, !!wardy.state?.sleepy && !wardy.state.patrolledToday) ?? moodForScore(score)}
          line={moodLine(moodForScore(score), !!wardy.state?.patrolledToday)}
          state={wardy.state}
          eating={eating}
          gained={gained}
          onFeed={feed}
          feeding={feeding}
          onUnlock={startAdopt}
          unlocking={signingIn}
          unlockPrice={ADOPT_PRICE_SKR}
          outfit={outfit}
        />
      )}

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

        </>
      )}

      <ChestSheet prize={chest?.prize ?? null} streak={chest?.streak ?? 7} onClose={() => setChest(null)} />

      <AdoptSheet
        open={adoptOpen}
        onClose={() => setAdoptOpen(false)}
        onAdopted={() => {
          celebrate('big')
          wardy.refresh()
          toast('success', 'Wardy is yours. First patrol starting.')
        }}
        onLookChosen={wardy.refresh}
      />

      {/* Adopted before looks existed, or closed the sheet before choosing: ask once. */}
      <Sheet open={!readOnly && adopted && wardy.state?.outfit === null && !adoptOpen} onClose={() => {}} title="Choose Wardy’s look">
        <LookPicker onChosen={wardy.refresh} />
      </Sheet>

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
          toast(
            'success',
            r.reclaimedLamports > 0
              ? `Done. Wardy found you ${lamportsUsd(r.reclaimedLamports, data?.solUsd) || sol(r.reclaimedLamports)}, now back in your wallet.`
              : 'Done. Your wallet is safer.',
          )
          // Update the score now; markFixed also re-checks the chain a few times in the background.
          markFixed(r.fixedIds)
          // A perfect wallet deserves a moment.
          if (r.fixedIds.length >= visible.length) celebrate('small')
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
