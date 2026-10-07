import { useId } from 'react'
import { cn } from '@/lib/cn'

export type WardyMood = 'happy' | 'calm' | 'worried' | 'alarmed' | 'sleepy' | 'eating' | 'love' | 'excited'

/** Mood follows the wallet: the character is a glanceable status, not decoration. */
export function moodForScore(score: number): WardyMood {
  if (score >= 90) return 'happy'
  if (score >= 70) return 'calm'
  if (score >= 40) return 'worried'
  return 'alarmed'
}

// Same silhouette as the logo: 120 x 140 shield with a raised centre on top.
export const SHIELD_PATH = 'M60 0C44 10 26 16 0 16V64C0 104 28 126 60 140C92 126 120 104 120 64V16C94 16 76 10 60 0Z'

const HEART = 'M0 -3C-2 -8 -9 -7 -9 -2C-9 3 -3 6 0 9C3 6 9 3 9 -2C9 -7 2 -8 0 -3Z'

/**
 * Wardy, the shield that lives in the app.
 * `look` moves his face toward a point (-1..1 on each axis) so his eyes can follow a finger.
 */
export function Wardy({
  mood = 'calm',
  size = 96,
  look,
  grey,
  className,
}: {
  mood?: WardyMood
  size?: number
  look?: { x: number; y: number }
  grey?: boolean
  className?: string
}) {
  const tone = grey || mood === 'sleepy' ? 'cleanup' : mood === 'alarmed' ? 'warning' : 'safe'
  const base = `rgb(var(--${tone}))`
  const ink = 'fill-bg stroke-bg'
  const nx = Math.max(-1, Math.min(1, look?.x ?? 0))
  const ny = Math.max(-1, Math.min(1, look?.y ?? 0))
  const lx = nx * 6
  const ly = ny * 5
  // 3D look: unique gradient ids per instance, and a side wall that shifts opposite to where he looks.
  const id = useId().replace(/:/g, '')
  const depthX = -nx * 3
  const depthY = 9 - ny * 2
  return (
    <svg
      viewBox="-10 -14 140 164"
      width={size}
      height={(size * 164) / 140}
      className={cn('wardy shrink-0 overflow-visible', `wardy-${mood}`, className)}
      role="img"
      aria-label={`Wardy looks ${mood === 'eating' ? 'busy eating' : mood === 'love' ? 'loved' : mood}`}
    >
      <defs>
        <radialGradient id={`${id}-body`} cx="32%" cy="22%" r="85%">
          <stop offset="0%" style={{ stopColor: `color-mix(in srgb, ${base} 70%, white)` }} />
          <stop offset="55%" style={{ stopColor: base }} />
          <stop offset="100%" style={{ stopColor: `color-mix(in srgb, ${base} 72%, black)` }} />
        </radialGradient>
        <linearGradient id={`${id}-side`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: `color-mix(in srgb, ${base} 55%, black)` }} />
          <stop offset="100%" style={{ stopColor: `color-mix(in srgb, ${base} 35%, black)` }} />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.55" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g className="wardy-body">
        {/* Thickness: the shield's side wall, peeking out below and beside the face. */}
        <path d={SHIELD_PATH} fill={`url(#${id}-side)`} style={{ transform: `translate(${depthX}px, ${depthY}px)`, transition: 'transform 120ms ease-out' }} />
        <path d={SHIELD_PATH} fill={`url(#${id}-body)`} />
        {/* Rim light along the top edge, then a soft glossy reflection. */}
        <path d="M60 3C45 12 27 18 4 18" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
        <path d="M14 26C14 22 28 20 42 17C34 30 24 44 16 58C14 48 14 36 14 26Z" fill={`url(#${id}-shine)`} />

        {/* The face shifts toward wherever Wardy is looking. */}
        <g style={{ transform: `translate(${lx}px, ${ly}px)`, transition: 'transform 120ms ease-out' }}>
          {mood === 'happy' && (
            <g className={ink} strokeWidth="7" strokeLinecap="round">
              <path d="M31 70 Q41 56 51 70" className="fill-none" />
              <path d="M69 70 Q79 56 89 70" className="fill-none" />
            </g>
          )}

          {mood === 'calm' && (
            <g className="wardy-eyes">
              <g className={ink} strokeWidth="0">
                <ellipse cx="41" cy="66" rx="11" ry="15" />
                <ellipse cx="79" cy="66" rx="11" ry="15" />
              </g>
              <circle cx="45" cy="59" r="3.2" fill="white" opacity="0.9" />
              <circle cx="83" cy="59" r="3.2" fill="white" opacity="0.9" />
            </g>
          )}

          {mood === 'worried' && (
            <g className={ink}>
              <g className="wardy-eyes" strokeWidth="0">
                <ellipse cx="41" cy="70" rx="10" ry="13" />
                <ellipse cx="79" cy="70" rx="10" ry="13" />
                <circle cx="44.5" cy="64" r="2.8" fill="white" opacity="0.9" />
                <circle cx="82.5" cy="64" r="2.8" fill="white" opacity="0.9" />
              </g>
              <path d="M28 50 L50 44" strokeWidth="6" strokeLinecap="round" className="fill-none" />
              <path d="M92 50 L70 44" strokeWidth="6" strokeLinecap="round" className="fill-none" />
            </g>
          )}

          {mood === 'alarmed' && (
            <g className={ink} strokeWidth="0">
              <circle cx="41" cy="64" r="14" />
              <circle cx="79" cy="64" r="14" />
              <circle cx="41" cy="64" r="5" className="fill-warning" />
              <circle cx="79" cy="64" r="5" className="fill-warning" />
              <ellipse cx="60" cy="100" rx="7" ry="9" />
            </g>
          )}

          {mood === 'sleepy' && (
            <g className={ink} strokeWidth="6" strokeLinecap="round">
              <path d="M31 68 Q41 76 51 68" className="fill-none" />
              <path d="M69 68 Q79 76 89 68" className="fill-none" />
            </g>
          )}

          {mood === 'eating' && (
            <g className={ink}>
              <path d="M31 62 Q41 50 51 62" strokeWidth="7" strokeLinecap="round" className="fill-none" />
              <path d="M69 62 Q79 50 89 62" strokeWidth="7" strokeLinecap="round" className="fill-none" />
              <ellipse cx="60" cy="98" rx="16" ry="12" strokeWidth="0" className="wardy-mouth" />
            </g>
          )}

          {mood === 'love' && (
            <g className="fill-critical" strokeWidth="0">
              <path d={HEART} transform="translate(41 66) scale(1.5)" />
              <path d={HEART} transform="translate(79 66) scale(1.5)" />
            </g>
          )}

          {mood === 'excited' && (
            <g className={ink}>
              <path d="M31 66 Q41 52 51 66" strokeWidth="7" strokeLinecap="round" className="fill-none" />
              <path d="M69 66 Q79 52 89 66" strokeWidth="7" strokeLinecap="round" className="fill-none" />
              <path d="M46 92 Q60 110 74 92 Z" strokeWidth="3" strokeLinejoin="round" />
            </g>
          )}
        </g>
      </g>

      {mood === 'sleepy' && (
        <text x="104" y="6" className="wardy-z fill-text-muted font-sans" fontSize="22" fontWeight="600">
          z
        </text>
      )}
    </svg>
  )
}
