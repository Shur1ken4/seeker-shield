import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Flame, Sparkles, Trash2, X } from 'lucide-react'
import { Button } from './Button'
import { Wardy } from './Wardy'

export const ONBOARDED_KEY = 'wardy.onboarded'
const STEP_MS = 3500

export function shouldShowOnboarding() {
  try {
    return localStorage.getItem(ONBOARDED_KEY) !== '1'
  } catch {
    return false
  }
}

interface Slide {
  title: string
  body: string
  art: ReactNode
}

const SLIDES: Slide[] = [
  {
    title: 'Wardy guards your wallet',
    body: 'He checks for risky app access, fake tokens and stuck SOL.',
    art: (
      <div className="relative">
        <Wardy mood="calm" size={128} look={{ x: 0.6, y: 0 }} />
        {/* scan line sweeping over him */}
        <span aria-hidden className="absolute inset-x-0 h-1 rounded-full bg-safe/70" style={{ animation: 'intro-scan 1.6s ease-in-out infinite' }} />
      </div>
    ),
  },
  {
    title: 'Fix it in one tap',
    body: 'Your fingerprint removes the risk. Stuck SOL comes back to you.',
    art: (
      <div className="relative">
        <Wardy mood="eating" size={128} />
        <span aria-hidden className="absolute -right-8 top-16 text-cleanup" style={{ animation: 'intro-feed 1.4s ease-in infinite' }}>
          <Trash2 size={26} />
        </span>
      </div>
    ),
  },
  {
    title: 'Scan daily, earn rewards',
    body: 'Your daily scan feeds him. Keep the streak, earn free Pro.',
    art: (
      <div className="relative">
        <Wardy mood="happy" size={128} level={4} />
        <span className="absolute -right-10 top-2 text-body font-semibold text-safe" style={{ animation: 'xp-pop 2.4s ease-out infinite' }}>
          +15 XP
        </span>
        <span className="absolute -left-10 top-10 flex items-center gap-1 text-body-sm font-semibold text-warning">
          <Flame size={18} aria-hidden /> 7
        </span>
      </div>
    ),
  },
  {
    title: 'Unlock your Wardy',
    body: 'Telegram alerts, daily patrols and rewards. 50 SKR, once.',
    art: (
      <div className="relative" style={{ animation: 'intro-wake 3.5s ease-out forwards' }}>
        <Wardy mood="excited" size={128} level={2} />
        <Sparkles aria-hidden size={22} className="absolute -right-6 top-0 text-safe" />
      </div>
    ),
  },
]

/** First-run intro: four story-style screens, about 14 seconds, skippable. */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const pressAt = useRef(0)
  const last = i === SLIDES.length - 1

  const finish = () => {
    try {
      localStorage.setItem(ONBOARDED_KEY, '1')
    } catch {
      // It just shows again next time.
    }
    onDone()
  }

  useEffect(() => {
    if (paused || last) return
    const t = window.setTimeout(() => setI((x) => x + 1), STEP_MS)
    return () => window.clearTimeout(t)
  }, [i, paused, last])

  const s = SLIDES[i]
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }} role="dialog" aria-modal="true" aria-label="How Wardy works">
      {/* Story progress bars */}
      <div className="flex gap-1 px-4 pt-3">
        {SLIDES.map((_, j) => (
          <span key={j} className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
            <span
              key={`${j}-${i}`}
              className="block h-full bg-text-primary"
              style={
                j < i
                  ? { width: '100%' }
                  : j === i
                    ? last
                      ? { width: '100%' }
                      : { width: '0%', animation: `intro-progress ${STEP_MS}ms linear forwards`, animationPlayState: paused ? 'paused' : 'running' }
                    : { width: '0%' }
              }
            />
          </span>
        ))}
      </div>
      <div className="flex justify-end px-2">
        <button onClick={finish} aria-label="Skip intro" className="flex min-h-tap min-w-tap items-center justify-center text-text-secondary">
          <X size={22} />
        </button>
      </div>

      {/* Tap left/right to move, hold to pause, like stories */}
      <div
        className="relative flex flex-1 select-none flex-col items-center justify-center px-6 text-center"
        onPointerDown={() => {
          pressAt.current = Date.now()
          setPaused(true)
        }}
        onPointerUp={(e) => {
          setPaused(false)
          // A long press only pauses; a quick tap moves.
          if (Date.now() - pressAt.current > 300) return
          const left = e.clientX < window.innerWidth / 3
          setI((x) => (left ? Math.max(0, x - 1) : Math.min(SLIDES.length - 1, x + 1)))
        }}
      >
        <div key={i} className="flex flex-col items-center" style={{ animation: 'fade-in 300ms ease-out' }}>
          <div className="flex h-[200px] items-end justify-center">{s.art}</div>
          <h2 className="mt-8 font-brand text-heading font-extrabold">{s.title}</h2>
          <p className="mt-2 max-w-xs text-body text-text-secondary">{s.body}</p>
        </div>
      </div>

      <div className="space-y-2 px-4 pb-6">
        {last ? (
          <Button className="w-full" onClick={finish}>
            Get started
          </Button>
        ) : (
          <Button className="w-full" variant="ghost" onClick={finish}>
            Skip
          </Button>
        )}
      </div>
    </div>
  )
}
