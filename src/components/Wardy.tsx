import { cn } from '@/lib/cn'

export type WardyMood = 'happy' | 'calm' | 'worried' | 'alarmed' | 'sleepy' | 'eating'

/** Mood follows the wallet: the character is a glanceable status, not decoration. */
export function moodForScore(score: number): WardyMood {
  if (score >= 90) return 'happy'
  if (score >= 70) return 'calm'
  if (score >= 40) return 'worried'
  return 'alarmed'
}

// Same silhouette as the logo: 120 x 140 shield with a raised centre on top.
const SHIELD = 'M60 0C44 10 26 16 0 16V64C0 104 28 126 60 140C92 126 120 104 120 64V16C94 16 76 10 60 0Z'

/** Wardy, the shield that lives in the app. Moods animate gently and respect reduced motion. */
export function Wardy({ mood = 'calm', size = 96, className }: { mood?: WardyMood; size?: number; className?: string }) {
  const body = mood === 'alarmed' ? 'fill-warning' : mood === 'sleepy' ? 'fill-cleanup' : 'fill-safe'
  const ink = 'fill-bg stroke-bg'
  return (
    <svg
      viewBox="-10 -14 140 164"
      width={size}
      height={(size * 164) / 140}
      className={cn('wardy shrink-0 overflow-visible', `wardy-${mood}`, className)}
      role="img"
      aria-label={`Wardy looks ${mood === 'eating' ? 'busy eating' : mood}`}
    >
      <g className="wardy-body">
        <path d={SHIELD} className={cn(body, 'transition-colors duration-base')} />

        {mood === 'happy' && (
          <g className={ink} strokeWidth="7" strokeLinecap="round" fill="none">
            <path d="M31 70 Q41 56 51 70" className="fill-none" />
            <path d="M69 70 Q79 56 89 70" className="fill-none" />
          </g>
        )}

        {mood === 'calm' && (
          <g className={cn(ink, 'wardy-eyes')} strokeWidth="0">
            <ellipse cx="41" cy="66" rx="11" ry="15" />
            <ellipse cx="79" cy="66" rx="11" ry="15" />
          </g>
        )}

        {mood === 'worried' && (
          <g className={ink}>
            <ellipse cx="41" cy="70" rx="10" ry="13" strokeWidth="0" className="wardy-eyes" />
            <ellipse cx="79" cy="70" rx="10" ry="13" strokeWidth="0" className="wardy-eyes" />
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
          <g className={ink} strokeWidth="6" strokeLinecap="round" fill="none">
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
      </g>

      {mood === 'sleepy' && (
        <text x="104" y="6" className="wardy-z fill-text-muted font-sans" fontSize="22" fontWeight="600">
          z
        </text>
      )}
    </svg>
  )
}
