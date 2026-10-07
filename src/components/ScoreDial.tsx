import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { scoreWord } from '../../api/_lib/score'
import { Wardy, moodForScore, type WardyMood } from './Wardy'

function band(score: number) {
  if (score >= 90) return 'text-safe'
  if (score >= 70) return 'text-cleanup'
  if (score >= 40) return 'text-warning'
  return 'text-critical'
}

function useCountUp(target: number, ms = 600) {
  const [value, setValue] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = from.current
    if (reduce || start === target) {
      from.current = target
      setValue(target)
      return
    }
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(start + (target - start) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      from.current = target
    }
  }, [target, ms])
  return value
}

/** The score ring with Wardy living inside it. His mood mirrors the score unless overridden (eating, sleepy). */
export function ScoreDial({ score, size = 156, mood }: { score: number; size?: number; mood?: WardyMood }) {
  const shown = useCountUp(score)
  const stroke = 6
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-2" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - shown / 100)}
            className={cn('stroke-current transition-colors duration-base', band(shown))}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Wardy mood={mood ?? moodForScore(score)} size={size * 0.5} />
        </div>
      </div>
      <div>
        <p className="text-caption uppercase tracking-wide text-text-muted">Safety score</p>
        <p className="text-heading font-semibold tabular-nums" aria-label={`Safety score ${score} out of 100`}>
          <span className="text-[44px] leading-none">{shown}</span>
          <span className="text-body text-text-muted">/100</span>
        </p>
        <p className={cn('text-title font-semibold', band(score))}>{scoreWord(score)}</p>
      </div>
    </div>
  )
}
