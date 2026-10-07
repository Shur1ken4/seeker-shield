import { useCallback, useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { BadgeCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { ScoreHistory } from '@/components/ScoreHistory'
import { api } from '@/lib/api'
import { short, sol } from '@/lib/format'
import type { ProInfo } from '@/lib/pro'
import { useSession } from '@/lib/wallet'
import { readLocalStats } from '@/lib/localStats'
import { useWardy } from '@/lib/useWardy'
import { Wardy } from '@/components/Wardy'
import { Flame } from 'lucide-react'

interface StatsData {
  stats: { reclaimedLamports: number; fixed: number }
  history: { score: number; at: number }[]
}

export function ProfilePage({ onGoToScan, onUpgrade, refreshKey }: { onGoToScan: () => void; onUpgrade: () => void; refreshKey: number }) {
  const { publicKey } = useWallet()
  const { hasSession, verified, signIn, signingIn } = useSession()
  const owner = publicKey?.toBase58()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [pro, setPro] = useState<ProInfo | null>(null)
  const [skr, setSkr] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const wardy = useWardy(owner ?? null)

  const load = useCallback(() => {
    if (!owner) return
    api.get<StatsData>(`/api/stats?owner=${owner}`).then(setStats).catch(() => {})
    api.get<ProInfo>('/api/pro/info').then(setPro).catch(() => {})
    api.get<{ name: string | null }>(`/api/skr?address=${owner}`).then((r) => setSkr(r.name)).catch(() => {})
  }, [owner])
  useEffect(load, [load, refreshKey, hasSession])

  // Server totals are verified on-chain; the local tally covers the seconds before the server catches up.
  const local = owner ? readLocalStats(owner) : { fixed: 0, reclaimedLamports: 0 }
  const reclaimed = Math.max(stats?.stats.reclaimedLamports ?? 0, local.reclaimedLamports)
  const fixed = Math.max(stats?.stats.fixed ?? 0, local.fixed)

  if (!owner) return <EmptyState title="Connect your wallet" body="Your score history, SOL reclaimed and Pro status live here." action={<Button onClick={onGoToScan}>Go to Scan</Button>} />

  return (
    <section className="space-y-6 pt-2">
      <header className="space-y-1">
        <h1 className="text-heading font-semibold">{skr ?? short(owner, 5)}</h1>
        {skr && <p className="font-mono text-caption text-text-muted">{short(owner, 6)}</p>}
        {hasSession && verified ? (
          <span className="inline-flex items-center gap-1 rounded-chip bg-safe/[.14] px-2 py-px text-caption font-medium text-safe">
            <BadgeCheck size={14} aria-hidden /> Seeker Verified
          </span>
        ) : hasSession ? (
          <p className="text-body-sm text-text-secondary">No Seeker Genesis Token found in this wallet.</p>
        ) : (
          <div className="pt-2">
            <Button size="sm" variant="secondary" onClick={() => signIn().catch((e) => setError(e.message))} loading={signingIn}>
              <BadgeCheck size={16} aria-hidden /> Verify my Seeker (free)
            </Button>
            {error && <p className="mt-2 text-body-sm text-critical">{error}</p>}
          </div>
        )}
      </header>

      {wardy.state && (
        <div className="flex items-center gap-4 rounded-card border border-border bg-surface-1 p-4">
          <Wardy mood={wardy.state.sleepy ? 'sleepy' : 'happy'} size={72} />
          <div className="min-w-0 flex-1">
            <p className="font-brand text-title font-extrabold">Wardy</p>
            <p className="text-body-sm text-text-secondary">
              Level {wardy.state.level} · {wardy.state.levelName} · {wardy.state.xp} XP
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-caption text-text-muted">
              <Flame size={14} className={wardy.state.streak ? 'text-warning' : ''} aria-hidden />
              {wardy.state.streak}-day streak · best {wardy.state.bestStreak}
              {wardy.state.rewards ? ` · ${wardy.state.rewards * 3} free Pro days earned` : ''}
            </p>
          </div>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-card border border-border bg-surface-1 p-4">
          <dt className="text-caption text-text-muted">SOL reclaimed</dt>
          <dd className="mt-1 font-mono text-title font-medium">{sol(reclaimed).replace(' SOL', '')}</dd>
        </div>
        <div className="rounded-card border border-border bg-surface-1 p-4">
          <dt className="text-caption text-text-muted">Issues fixed</dt>
          <dd className="mt-1 font-mono text-title font-medium">{fixed}</dd>
        </div>
      </dl>

      <div className="space-y-2 rounded-card border border-border bg-surface-1 p-4">
        <h2 className="text-body-sm font-medium text-text-secondary">Score history</h2>
        <ScoreHistory points={stats?.history ?? []} />
      </div>

      <div className="rounded-card border border-border bg-surface-1 p-4">
        <div className="flex items-start gap-3">
          <Sparkles size={20} className={pro?.proUntil ? 'text-safe' : 'text-text-muted'} aria-hidden />
          <div className="flex-1">
            <p className="text-body font-medium">{pro?.proUntil ? 'Wardy Pro' : 'Free plan'}</p>
            <p className="text-body-sm text-text-secondary">
              {pro?.proUntil
                ? `Active until ${new Date(pro.proUntil).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}.`
                : pro?.freeMonthAvailable
                  ? 'Seeker Verified: your first month of Pro is free.'
                  : `Instant alerts and 5 friends for ${pro?.priceSkr ?? 150} SKR a month.`}
            </p>
          </div>
        </div>
        <Button className="mt-4 w-full" variant={pro?.proUntil ? 'secondary' : 'primary'} onClick={onUpgrade}>
          {pro?.proUntil ? 'Extend Pro' : pro?.freeMonthAvailable ? 'Claim free month' : 'Unlock Pro'}
        </Button>
      </div>
    </section>
  )
}
