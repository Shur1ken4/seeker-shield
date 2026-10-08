import { useEffect, useState } from 'react'
import { celebrate } from '@/lib/celebrate'
import { Button } from './Button'
import { Sheet } from './Sheet'
import type { ChestPrize } from '../../api/_lib/types'

const buzz = () => {
  try {
    navigator.vibrate?.([20, 40, 30])
  } catch {
    // Optional nicety.
  }
}

/** The streak chest: it wiggles, you tap, it pops open and shows what Wardy found. */
export function ChestSheet({ prize, streak, onClose }: { prize: ChestPrize | null; streak: number; onClose: () => void }) {
  const [open, setOpen] = useState(false)
  // The "Nice" button appears where "Open chest" was; ignore taps for a moment so one tap can't do both.
  const [canClose, setCanClose] = useState(false)
  useEffect(() => {
    if (!open) return setCanClose(false)
    const t = window.setTimeout(() => setCanClose(true), 800)
    return () => window.clearTimeout(t)
  }, [open])
  const label = prize?.kind === 'pro' ? `${prize.days} days of Wardy Pro` : prize ? `+${prize.xp} XP boost` : ''

  const pop = () => {
    if (open) return
    setOpen(true)
    buzz()
    celebrate('big')
  }

  return (
    <Sheet
      open={!!prize}
      onClose={() => {
        if (open && !canClose) return
        setOpen(false)
        onClose()
      }}
      title={open ? 'You got' : `${streak}-day streak chest`}
    >
      <div className="flex flex-col items-center gap-4 pb-2">
        <button onClick={pop} aria-label={open ? label : 'Open the chest'} className="relative h-40 w-44">
          <svg viewBox="0 0 120 100" className={open ? '' : 'chest-wiggle'} width="176" height="146" aria-hidden>
            {/* body */}
            <rect x="12" y="44" width="96" height="48" rx="6" fill="#B7793A" />
            <rect x="12" y="44" width="96" height="48" rx="6" fill="none" stroke="#7A4A1E" strokeWidth="3" />
            <rect x="12" y="58" width="96" height="6" fill="#F5D76E" />
            <rect x="52" y="54" width="16" height="18" rx="3" fill="#F5D76E" stroke="#B8901F" strokeWidth="2" />
            {/* lid: swings open */}
            <g style={{ transformOrigin: '60px 44px', transform: open ? 'rotate(-28deg) translateY(-14px)' : 'none', transition: 'transform 380ms cubic-bezier(0.3, 1.6, 0.5, 1)' }}>
              <path d="M12 44 Q12 16 60 16 Q108 16 108 44 Z" fill="#C98A47" stroke="#7A4A1E" strokeWidth="3" />
              <rect x="54" y="16" width="12" height="28" fill="#F5D76E" />
            </g>
            {open && <ellipse cx="60" cy="46" rx="40" ry="10" fill="#FFF3B0" opacity="0.8" />}
          </svg>
          {open && (
            <span className="absolute inset-x-0 -top-7 text-center text-title font-semibold text-safe" style={{ animation: 'chest-prize 600ms ease-out forwards' }}>
              {prize?.kind === 'pro' ? `+${prize.days} Pro days` : `+${prize?.xp ?? 0} XP`}
            </span>
          )}
        </button>

        {open ? (
          <>
            <p className="text-center text-body">{label}. Keep the streak for your next chest in 7 days.</p>
            <Button
              className="w-full"
              onClick={() => {
                if (!canClose) return
                setOpen(false)
                onClose()
              }}
            >
              Nice
            </Button>
          </>
        ) : (
          <>
            <p className="text-center text-body-sm text-text-secondary">Wardy found a chest on his patrol.</p>
            <Button className="w-full" variant="reward" onClick={pop}>
              Open chest
            </Button>
          </>
        )}
      </div>
    </Sheet>
  )
}
