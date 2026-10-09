import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'
import { Wardy } from './Wardy'

const STEPS = [
  { emoji: '🔑', text: 'Checking which apps can move your tokens' },
  { emoji: '🎣', text: 'Sniffing out fake and spam tokens' },
  { emoji: '🪙', text: 'Looking for SOL stuck in old accounts' },
  { emoji: '🕵️', text: 'Comparing with known scammers' },
]
const STEP_MS = 1100 // slow on purpose: people should feel each check happen

/**
 * Shows the scan as it happens: each check ticks off in turn, so people see what Wardy actually looks at.
 * Holds on the last check until the real result is in (`finished`), then calls onDone.
 */
export function ScanProgress({ finished, onDone, readOnly }: { finished: boolean; onDone: () => void; readOnly?: boolean }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (step < STEPS.length - 1) {
      const t = window.setTimeout(() => setStep((s) => s + 1), STEP_MS)
      return () => window.clearTimeout(t)
    }
    if (step === STEPS.length - 1 && finished) {
      const t = window.setTimeout(() => setStep(STEPS.length), STEP_MS)
      return () => window.clearTimeout(t)
    }
    if (step === STEPS.length) {
      const t = window.setTimeout(onDone, 450)
      return () => window.clearTimeout(t)
    }
  }, [step, finished, onDone])

  const pct = Math.round((Math.min(step, STEPS.length) / STEPS.length) * 100)
  return (
    <div className="space-y-4" aria-live="polite" aria-label="Scanning your wallet">
      <div className="flex items-center gap-4">
        <div className="relative flex h-[96px] w-[96px] shrink-0 items-center justify-center">
          <svg viewBox="0 0 96 96" className="absolute inset-0 animate-spin [animation-duration:1.6s]" aria-hidden>
            <circle cx="48" cy="48" r="44" fill="none" strokeWidth="5" className="stroke-surface-2" />
            <circle cx="48" cy="48" r="44" fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray="70 207" className="stroke-safe" />
          </svg>
          <Wardy mood={readOnly ? 'calm' : 'eating'} size={52} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-caption uppercase tracking-wide text-text-muted">Safety score</p>
          <p className="text-body font-medium">{readOnly ? 'Wardy is patrolling…' : 'Wardy is checking your wallet…'}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-safe transition-[width] duration-500 ease-out" style={{ width: `${Math.max(pct, 6)}%` }} />
          </div>
        </div>
      </div>
      <ul className="space-y-2">
        {STEPS.map((s, i) => {
          const done = i < step
          const active = i === step
          return (
            <li
              key={s.text}
              className={cn(
                'flex items-center gap-3 rounded-chip px-3 py-2 text-body-sm transition-all duration-300',
                done ? 'bg-safe/[.08] text-text-primary' : active ? 'bg-surface-2 text-text-primary' : 'text-text-muted opacity-50',
              )}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                {done ? <Check size={18} className="text-safe" style={{ animation: 'fade-in 250ms ease-out' }} aria-hidden /> : active ? <Spinner /> : <span aria-hidden>{s.emoji}</span>}
              </span>
              {s.text}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
