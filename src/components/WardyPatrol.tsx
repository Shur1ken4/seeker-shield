import { Flame, Gift } from 'lucide-react'
import { Button } from './Button'
import type { WardyState } from '../../api/_lib/types'

/** Level, XP and streak under the score. The daily patrol is Wardy's meal. */
export function WardyPatrol({
  state,
  needsAdoption,
  adoptPrice,
  onAdopt,
  starting,
  gained,
}: {
  state: WardyState | null
  needsAdoption: boolean
  adoptPrice: number
  onAdopt: () => void
  starting: boolean
  gained: number | null
}) {
  if (needsAdoption) {
    return (
      <div className="flex items-center gap-3 rounded-card border border-border bg-surface-1 p-4">
        <div className="flex-1">
          <p className="text-body-sm font-medium">Adopt Wardy</p>
          <p className="text-caption text-text-secondary">Daily patrols, streaks and free Pro days.</p>
        </div>
        <Button size="sm" onClick={onAdopt} loading={starting}>
          {adoptPrice} SKR
        </Button>
      </div>
    )
  }
  if (!state) return null

  const span = state.nextLevelXp ? state.nextLevelXp - state.levelXp : 1
  const progress = state.nextLevelXp ? Math.min(1, (state.xp - state.levelXp) / span) : 1
  return (
    <div className="relative rounded-card border border-border bg-surface-1 p-4">
      {gained ? (
        <span className="absolute right-4 top-3 text-body-sm font-semibold text-safe" style={{ animation: 'xp-pop 2.4s ease-out forwards' }}>
          +{gained} XP
        </span>
      ) : null}
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-body-sm font-medium">
          Level {state.level} · {state.levelName}
        </p>
        <p className="font-mono text-caption text-text-muted">
          {state.xp}
          {state.nextLevelXp ? ` / ${state.nextLevelXp}` : ''} XP
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next level">
        <div className="h-full rounded-full bg-safe transition-all duration-base" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-caption">
        <span className="inline-flex items-center gap-1 text-text-secondary">
          <Flame size={14} className={state.streak ? 'text-warning' : 'text-text-muted'} aria-hidden />
          {state.streak ? `${state.streak}-day streak` : 'No streak yet'}
        </span>
        <span className="inline-flex items-center gap-1 text-text-muted">
          <Gift size={14} aria-hidden /> Free Pro in {state.daysToReward} day{state.daysToReward === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  )
}
