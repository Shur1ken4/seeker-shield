import { useId } from 'react'
import { cn } from '@/lib/cn'
import type { OutfitId } from '@/lib/outfits'

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
  level = 1,
  outfit = 'classic',
  className,
}: {
  mood?: WardyMood
  size?: number
  look?: { x: number; y: number }
  grey?: boolean
  /** Evolution gear: Scout 2+ star badge, Knight 4+ plume, Sentinel 5+ glow, Legend 6 crown. */
  level?: number
  /** Cosmetic outfit; a hat replaces the evolution plume/crown while worn. */
  outfit?: OutfitId
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
        <radialGradient id={`${id}-aura`}>
          <stop offset="55%" style={{ stopColor: base }} stopOpacity="0.35" />
          <stop offset="100%" style={{ stopColor: base }} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.55" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {level >= 5 && <ellipse cx="60" cy="72" rx="78" ry="84" className="wardy-aura" fill={`url(#${id}-aura)`} />}

      <g className="wardy-body">
        {/* Thickness: the shield's side wall, peeking out below and beside the face. */}
        <path d={SHIELD_PATH} fill={`url(#${id}-side)`} style={{ transform: `translate(${depthX}px, ${depthY}px)`, transition: 'transform 120ms ease-out' }} />
        <path d={SHIELD_PATH} fill={`url(#${id}-body)`} />
        {/* Rim light along the top edge, then a soft glossy reflection. */}
        <path d="M60 3C45 12 27 18 4 18" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
        <path d="M14 26C14 22 28 20 42 17C34 30 24 44 16 58C14 48 14 36 14 26Z" fill={`url(#${id}-shine)`} />

        {/* Evolution gear */}
        {level >= 2 && (
          <path d="M60 110l3.2 6.6 7.3 1-5.3 5.1 1.3 7.2-6.5-3.4-6.5 3.4 1.3-7.2-5.3-5.1 7.3-1z" fill="#F5D76E" stroke="#B8901F" strokeWidth="1.2" />
        )}
        {level >= 4 && level < 6 && !HATS.has(outfit) && (
          <path d="M60 2C56 -10 62 -22 74 -24C70 -16 72 -8 66 0Z" fill="#FF7A6B" stroke="#C9483A" strokeWidth="1.2" />
        )}
        {level >= 6 && !HATS.has(outfit) && (
          <path d="M40 2L44 -14L52 -4L60 -18L68 -4L76 -14L80 2Z" fill="#F5D76E" stroke="#B8901F" strokeWidth="1.5" strokeLinejoin="round" />
        )}

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
          {outfit === 'shades' && (
            <g>
              <rect x="24" y="54" width="34" height="22" rx="8" fill="#111412" />
              <rect x="62" y="54" width="34" height="22" rx="8" fill="#111412" />
              <path d="M58 62 H62" stroke="#111412" strokeWidth="4" />
              <path d="M30 59 L40 59" stroke="white" strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" />
              <path d="M68 59 L78 59" stroke="white" strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" />
            </g>
          )}
        </g>
        <OutfitLayer outfit={outfit} />
      </g>

      {mood === 'sleepy' && (
        <text x="104" y="6" className="wardy-z fill-text-muted font-sans" fontSize="22" fontWeight="600">
          z
        </text>
      )}
    </svg>
  )
}

const HATS = new Set<OutfitId>(['cap', 'party', 'wizard', 'headphones'])

/** Hats, headphones and the scarf, drawn in Wardy's 120 x 140 shield space. */
function OutfitLayer({ outfit }: { outfit: OutfitId }) {
  switch (outfit) {
    case 'cap':
      return (
        <g>
          <path d="M22 12 Q60 -36 98 12 Z" fill="#2F6FDE" stroke="#1D4FA8" strokeWidth="2" />
          <path d="M84 8 Q112 2 124 12 L98 14 Z" fill="#1D4FA8" />
          <circle cx="60" cy="-11" r="4" fill="#1D4FA8" />
        </g>
      )
    case 'party':
      return (
        <g>
          <path d="M42 8 L60 -44 L78 8 Z" fill="#FF7A6B" stroke="#C9483A" strokeWidth="2" strokeLinejoin="round" />
          <path d="M48 -8 L72 -8 M53 -24 L67 -24" stroke="#F5D76E" strokeWidth="4" />
          <circle cx="60" cy="-46" r="7" fill="#F5D76E" />
        </g>
      )
    case 'wizard':
      return (
        <g>
          <ellipse cx="60" cy="9" rx="44" ry="8" fill="#5B3FB0" />
          <path d="M32 8 L66 -54 L88 8 Z" fill="#7B5BD6" stroke="#5B3FB0" strokeWidth="2" strokeLinejoin="round" />
          <path d="M58 -18l2 4 4 .6-3 3 .8 4-3.8-2-3.8 2 .8-4-3-3 4-.6z" fill="#F5D76E" />
        </g>
      )
    case 'headphones':
      return (
        <g>
          <path d="M4 44 Q60 -46 116 44" fill="none" stroke="#2A2F2B" strokeWidth="8" strokeLinecap="round" />
          <rect x="-8" y="36" width="18" height="34" rx="8" fill="#2A2F2B" />
          <rect x="110" y="36" width="18" height="34" rx="8" fill="#2A2F2B" />
          <rect x="-4" y="41" width="8" height="24" rx="4" fill="#3DDC97" />
          <rect x="116" y="41" width="8" height="24" rx="4" fill="#3DDC97" />
        </g>
      )
    case 'scarf':
      return (
        <g>
          <path d="M14 96 Q60 116 106 96 L104 110 Q60 130 16 110 Z" fill="#9945FF" stroke="#6B2FC7" strokeWidth="2" />
          <path d="M88 108 L98 136 L84 134 L80 112 Z" fill="#9945FF" stroke="#6B2FC7" strokeWidth="2" />
          <path d="M24 103 Q60 120 96 103" fill="none" stroke="#14F195" strokeWidth="3" />
        </g>
      )
    default:
      return null
  }
}
