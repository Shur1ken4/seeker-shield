import { useState } from 'react'
import { Wardy, type WardyMood } from '@/components/Wardy'
import { WardyStage } from '@/components/WardyStage'
import { ScoreBar } from '@/components/ScoreDial'
import { celebrate } from '@/lib/celebrate'
import { ChestSheet } from '@/components/ChestSheet'
import { Button } from '@/components/Button'
import { LookPicker } from '@/components/LookPicker'
import type { WardyState } from '../../api/_lib/types'

const MOODS: WardyMood[] = ['happy', 'calm', 'worried', 'alarmed', 'sleepy', 'eating', 'love', 'excited']

/** Dev-only (?playground): Wardy unlocked with sample data, every mood, for design checks and deck screenshots. */
export function Playground() {
  const [state, setState] = useState<WardyState>({
    xp: 128, level: 2, levelName: 'Scout', levelXp: 50, nextLevelXp: 150, streak: 4, bestStreak: 6,
    patrolledToday: false, sleepy: false, daysToReward: 3, rewards: 1, adopted: true,
  })
  const [eating, setEating] = useState(false)
  const [gained, setGained] = useState<number | null>(null)
  const [chest, setChest] = useState(false)
  return (
    <section className="space-y-6 pt-2">
      <div className="rounded-card border border-border bg-surface-1 p-4"><LookPicker onChosen={() => {}} /></div>
      <ScoreBar score={96} />
      <Button variant="secondary" className="w-full" onClick={() => setChest(true)}>Preview streak chest</Button>
      <ChestSheet prize={chest ? { kind: 'pro', days: 5 } : null} streak={7} onClose={() => setChest(false)} />
      <WardyStage
        compact
        locked={false}
        mood="happy"
        line="All quiet on my patrol."
        state={state}
        eating={eating}
        gained={gained}
        onFeed={() => {
          setEating(true)
          setGained(12)
          setTimeout(() => setEating(false), 2200)
          setState((s) => ({ ...s, xp: s.xp + 12, streak: s.streak + 1, patrolledToday: true, daysToReward: 2 }))
        }}
      />
      <WardyStage compact locked mood="sleepy" line="" state={null} unlockPrice={50} onUnlock={() => celebrate('big')} />
      <div className="flex items-end justify-around rounded-card border border-border bg-surface-1 p-4">
        {(['classic', 'cap', 'party', 'headphones', 'shades', 'wizard', 'scarf'] as const).map((o) => (
          <div key={o} className="flex flex-col items-center gap-1">
            <Wardy mood="happy" size={44} outfit={o} />
            <span className="text-caption text-text-muted">{o}</span>
          </div>
        ))}
      </div>
      <div className="flex items-end justify-around rounded-card border border-border bg-surface-1 p-4">
        {[1, 2, 4, 5, 6].map((lv) => (
          <div key={lv} className="flex flex-col items-center gap-1">
            <Wardy mood="happy" size={48} level={lv} />
            <span className="text-caption text-text-muted">Lv {lv}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3 rounded-card border border-border bg-surface-1 p-4">
        {MOODS.map((m) => (
          <div key={m} className="flex flex-col items-center gap-1">
            <Wardy mood={m} size={56} />
            <span className="text-caption text-text-muted">{m}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
