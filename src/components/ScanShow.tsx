import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { OutfitId } from '@/lib/outfits'
import { Wardy, type WardyMood } from './Wardy'

/** Each stop: what Wardy inspects, where it sits on stage, where he hovers, and what he says. */
const STOPS = [
  { emoji: '🔑', label: 'App access', obj: { x: -110, y: -130 }, at: { x: -20, y: -40 }, look: { x: -1, y: -0.8 }, line: 'Which apps can move your tokens? Checking every key…' },
  { emoji: '🎣', label: 'Fake tokens', obj: { x: 110, y: -130 }, at: { x: 20, y: -40 }, look: { x: 1, y: -0.8 }, line: 'Sniffing out fake tokens and scam bait…' },
  { emoji: '🪙', label: 'Stuck SOL', obj: { x: -110, y: 130 }, at: { x: -20, y: 30 }, look: { x: -1, y: 0.8 }, line: 'Any SOL stuck in old accounts? I’ll find it!' },
  { emoji: '🕵️', label: 'Scammer list', obj: { x: 110, y: 130 }, at: { x: 20, y: 30 }, look: { x: 1, y: 0.8 }, line: 'Last one: checking the scammer list…' },
]
const STEP_MS = 1500

/**
 * Full-screen "Wardy at work": he flies to each check, looks at it and explains it, then shows the score.
 * Plays on the first scan of a visit; holds on the last check until the real result is in.
 */
export function ScanShow({
  finished,
  onDone,
  readOnly,
  outfit,
  level,
}: {
  finished: boolean
  onDone: () => void
  readOnly?: boolean
  outfit?: OutfitId
  level?: number
}) {
  const [step, setStep] = useState(0)
  const done = step >= STOPS.length

  useEffect(() => {
    if (step < STOPS.length - 1 || (step === STOPS.length - 1 && finished)) {
      const t = window.setTimeout(() => setStep((s) => s + 1), STEP_MS)
      return () => window.clearTimeout(t)
    }
    if (done) {
      const t = window.setTimeout(onDone, 1300)
      return () => window.clearTimeout(t)
    }
  }, [step, finished, done, onDone])

  const stop = STOPS[Math.min(step, STOPS.length - 1)]
  const pos = done ? { x: 0, y: 0 } : stop.at
  const mood: WardyMood = done ? 'excited' : step % 2 ? 'calm' : 'worried'
  const line = done ? (readOnly ? 'Patrol done! Here’s what I found\u00a0🛡️' : 'All done! Here’s your score\u00a0🛡️') : stop.line
  const pct = Math.round((Math.min(step, STOPS.length) / STOPS.length) * 100)

  // Portal to <body> so no transformed parent can clip the full-screen layer.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', animation: 'fade-in 250ms ease-out' }}
      role="dialog"
      aria-modal="true"
      aria-label="Wardy is checking the wallet"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 45% at 50% 48%, rgb(var(--safe) / 0.16), transparent 70%)' }} />

      <div className="relative flex items-center gap-3 px-4 pt-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-safe transition-[width] duration-700 ease-out" style={{ width: `${Math.max(pct, 4)}%` }} />
        </div>
        <span className="text-caption tabular-nums text-text-muted">{done ? 'Done' : `Check ${step + 1} of ${STOPS.length}`}</span>
        <button onClick={onDone} aria-label="Skip" className="flex min-h-tap min-w-tap items-center justify-center text-text-secondary">
          <X size={22} />
        </button>
      </div>

      <div className="relative px-6 pt-6 text-center" aria-live="polite">
        <p key={line} className="mx-auto max-w-xs font-brand text-title font-extrabold" style={{ animation: 'fade-in 300ms ease-out' }}>
          {line}
        </p>
      </div>

      <div className="relative flex flex-1 items-center justify-center">
        {/* The things Wardy inspects: they appear as he reaches them and get a tick once checked. */}
        {STOPS.map((s, i) => {
          const seen = i <= step
          const ok = i < step
          return (
            <div
              key={s.label}
              className={cn('absolute flex flex-col items-center gap-1 transition-all duration-500', seen ? 'opacity-100' : 'scale-50 opacity-0', done && 'opacity-60')}
              style={{ transform: `translate(${s.obj.x}px, ${s.obj.y}px) scale(${seen ? (i === step ? 1.15 : 1) : 0.5})` }}
            >
              <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface-1 text-[34px] shadow-lg">
                {s.emoji}
                {ok && (
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-safe text-on-safe" style={{ animation: 'fade-in 250ms ease-out' }}>
                    <Check size={16} strokeWidth={3} aria-hidden />
                  </span>
                )}
              </span>
              <span className="text-caption text-text-secondary">{s.label}</span>
            </div>
          )
        })}

        {/* Wardy flies between the checks. */}
        <div
          className="absolute flex flex-col items-center"
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${done ? 1.3 : 1})`, transition: 'transform 800ms cubic-bezier(0.34, 1.4, 0.5, 1)' }}
        >
          <div style={{ animation: 'scan-hover 1.3s ease-in-out infinite' }}>
            <Wardy mood={mood} size={done ? 110 : 96} look={done ? undefined : stop.look} outfit={outfit} level={level} />
          </div>
        </div>
      </div>

      <p className="relative px-6 pb-8 text-center text-caption text-text-muted">Live from Solana. Wardy only looks; nothing moves.</p>
    </div>,
    document.body,
  )
}
