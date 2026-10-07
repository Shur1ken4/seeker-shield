import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { Check, Flame, Lock, Utensils } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'
import { Wardy, type WardyMood } from './Wardy'
import type { WardyState } from '../../api/_lib/types'

const TAP_LINES = ['Boop!', 'On patrol!', 'Hehe.', 'All eyes on your wallet.', 'Nothing gets past me.']
const LOCKED_LINES = ['Let me out! I’ll guard your wallet.', 'I’m ready to patrol…', 'Unlock me and I’ll get to work.']

const buzz = (ms = 12) => {
  try {
    navigator.vibrate?.(ms)
  } catch {
    // Vibration isn't available everywhere; it's only a nicety.
  }
}

interface Props {
  locked: boolean
  /** Mood from the wallet's safety; reactions override it briefly. */
  mood: WardyMood
  /** What Wardy says when nobody is playing with him. */
  line: string
  state: WardyState | null
  eating?: boolean
  gained?: number | null
  onFeed?: () => void
  feeding?: boolean
  onUnlock?: () => void
  unlocking?: boolean
  unlockPrice?: number
  /** Smaller stage when Wardy plays a supporting role on the screen. */
  compact?: boolean
}

/** The pet: tap him, rub him, feed him. He looks at your finger and reacts. */
export function WardyStage({ locked, mood, line, state, eating, gained, onFeed, feeding, onUnlock, unlocking, unlockPrice, compact }: Props) {
  const [reaction, setReaction] = useState<{ mood: WardyMood | null; text: string | null; anim: string }>({ mood: null, text: null, anim: '' })
  const [look, setLook] = useState({ x: 0, y: 0 })
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([])
  const stageRef = useRef<HTMLDivElement>(null)
  const press = useRef<{ x: number; y: number; travel: number; loved: boolean } | null>(null)
  const timer = useRef<number>()

  const react = useCallback((next: { mood: WardyMood | null; text: string | null; anim: string }, ms = 1600) => {
    window.clearTimeout(timer.current)
    setReaction({ ...next, anim: `${next.anim} ${Date.now()}` })
    timer.current = window.setTimeout(() => setReaction({ mood: null, text: null, anim: '' }), ms)
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // When nobody is touching him, Wardy glances around now and then.
  const touching = useRef(false)
  useEffect(() => {
    if (locked) return
    const id = window.setInterval(() => {
      if (touching.current) return
      const r = Math.random()
      setLook(r < 0.33 ? { x: -0.8, y: 0.1 } : r < 0.66 ? { x: 0.8, y: -0.1 } : { x: 0, y: 0 })
    }, 3200)
    return () => window.clearInterval(id)
  }, [locked])

  const burstHearts = () => {
    const now = Date.now()
    setHearts((h) => [...h, ...[0, 1, 2].map((i) => ({ id: now + i, x: -30 + Math.random() * 60 }))])
    window.setTimeout(() => setHearts((h) => h.filter((x) => x.id < now)), 1400)
  }

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    touching.current = true
    const r = stageRef.current?.getBoundingClientRect()
    if (!r) return
    setLook({ x: (e.clientX - (r.left + r.width / 2)) / (r.width / 2), y: (e.clientY - (r.top + r.height / 2)) / (r.height / 2) })
    if (press.current) {
      press.current.travel += Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y)
      press.current.x = e.clientX
      press.current.y = e.clientY
      // Rubbing him: enough finger travel while pressed.
      if (!locked && !press.current.loved && press.current.travel > 120) {
        press.current.loved = true
        buzz(20)
        burstHearts()
        react({ mood: 'love', text: 'Purr…', anim: 'wardy-react-squish' }, 2200)
      }
    }
  }

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    press.current = { x: e.clientX, y: e.clientY, travel: 0, loved: false }
  }

  const onUp = (fromKeyboard = false) => {
    const p = press.current
    press.current = null
    if (!fromKeyboard && (!p || p.loved || p.travel > 20)) return
    buzz()
    if (locked) return react({ mood: null, text: LOCKED_LINES[Math.floor(Math.random() * LOCKED_LINES.length)], anim: 'wardy-react-wiggle' })
    react({ mood: Math.random() < 0.5 ? 'excited' : 'happy', text: TAP_LINES[Math.floor(Math.random() * TAP_LINES.length)], anim: 'wardy-react-jump' }, 1400)
  }

  const shownMood: WardyMood = locked ? 'sleepy' : eating ? 'eating' : (reaction.mood ?? mood)
  const said = reaction.text ?? (eating ? 'Nom. Got it.' : locked ? 'Zzz… I’m locked in here.' : line)
  const span = state?.nextLevelXp ? state.nextLevelXp - state.levelXp : 1
  const progress = state ? (state.nextLevelXp ? Math.min(1, (state.xp - state.levelXp) / span) : 1) : 0

  return (
    <div className="rounded-card border border-border bg-surface-1 p-4">
      {/* Speech bubble */}
      <div className="relative mx-auto w-fit max-w-full rounded-card bg-surface-2 px-4 py-2 text-center" aria-live="polite">
        <p className="text-body-sm text-text-primary">{said}</p>
        <span aria-hidden className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-surface-2" />
      </div>

      {/* Stage: he looks at your finger, reacts to taps, and loves a rub. */}
      <div
        ref={stageRef}
        className={cn('relative mx-auto mt-2 flex touch-none select-none items-end justify-center', compact ? 'h-[170px]' : 'h-[210px]')}
        onPointerMove={onMove}
        onPointerDown={onDown}
        onPointerUp={() => onUp()}
        onPointerLeave={() => {
          touching.current = false
          press.current = null
          setLook({ x: 0, y: 0 })
        }}
        role="button"
        tabIndex={0}
        aria-label={locked ? 'Wardy is locked. Tap to wake him.' : 'Play with Wardy: tap him or rub him'}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onUp(true)}
      >
        <span aria-hidden className="absolute bottom-4 h-2 w-20 rounded-full bg-bg/40" />
        <div key={reaction.anim} className={cn('relative mb-5', reaction.anim.split(' ')[0])} style={{ perspective: 500 }}>
          {/* He leans toward your finger in 3D. */}
          <div
            style={{
              transform: locked ? undefined : `rotateY(${look.x * 16}deg) rotateX(${-look.y * 10}deg)`,
              transition: 'transform 160ms ease-out',
              transformStyle: 'preserve-3d',
            }}
          >
            <Wardy mood={shownMood} size={compact ? 100 : 124} look={locked ? undefined : look} grey={locked} />
          </div>
        </div>

        {locked && (
          <>
            {/* Glass capsule with a little lock */}
            <span aria-hidden className={cn('pointer-events-none absolute bottom-1 rounded-t-full border-2 border-text-muted/30 bg-surface-2/40', compact ? 'h-[160px] w-[146px]' : 'h-[196px] w-[176px]')} />
            <span aria-hidden className={cn('pointer-events-none absolute h-14 w-3 rotate-[20deg] rounded-full bg-text-primary/10', compact ? 'bottom-[96px] left-[calc(50%-52px)]' : 'bottom-[120px] left-[calc(50%-62px)]')} />
            <span className={cn('absolute bottom-4 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2 text-text-secondary', compact ? 'right-[calc(50%-82px)]' : 'right-[calc(50%-96px)]')}>
              <Lock size={16} aria-hidden />
            </span>
          </>
        )}

        {hearts.map((h) => (
          <span key={h.id} aria-hidden className="pointer-events-none absolute bottom-28 text-critical" style={{ left: `calc(50% + ${h.x}px)`, animation: 'heart-up 1.3s ease-out forwards' }}>
            <svg width="16" height="16" viewBox="-10 -10 20 20">
              <path d="M0 -3C-2 -8 -9 -7 -9 -2C-9 3 -3 6 0 9C3 6 9 3 9 -2C9 -7 2 -8 0 -3Z" fill="currentColor" />
            </svg>
          </span>
        ))}

        {gained ? (
          <span key={`xp-${gained}`} className="absolute right-6 top-6 text-body font-semibold text-safe" style={{ animation: 'xp-pop 2.4s ease-out forwards' }}>
            +{gained} XP
          </span>
        ) : null}
      </div>

      {locked ? (
        <div className="space-y-2">
          <Button className="w-full" variant={compact ? 'secondary' : 'primary'} onClick={onUnlock} loading={unlocking}>
            <Lock size={18} aria-hidden /> Unlock Wardy · {unlockPrice} SKR
          </Button>
          <p className="text-center text-caption text-text-muted">One time, about $0.90. Daily patrols, streaks and alerts.</p>
        </div>
      ) : (
        state && (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between text-body-sm">
              <span className="font-medium">
                Lv {state.level} · {state.levelName}
              </span>
              <span className="inline-flex items-center gap-1 text-caption text-text-secondary">
                <Flame size={14} className={state.streak ? 'text-warning' : 'text-text-muted'} aria-hidden />
                {state.streak ? `${state.streak}-day streak` : 'Start a streak'}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next level">
              <div className="h-full rounded-full bg-safe transition-all duration-base" style={{ width: `${progress * 100}%` }} />
            </div>
            {state.patrolledToday ? (
              <p className="flex items-center justify-center gap-1 text-body-sm text-safe">
                <Check size={16} aria-hidden /> Fed with today’s scan · free Pro in {state.daysToReward} day{state.daysToReward === 1 ? '' : 's'}
              </p>
            ) : (
              <Button className="w-full" onClick={onFeed} loading={feeding}>
                <Utensils size={18} aria-hidden /> Scan & feed Wardy
              </Button>
            )}
          </div>
        )
      )}
    </div>
  )
}
