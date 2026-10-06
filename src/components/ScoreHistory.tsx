/** Last 30 scores as simple bars (oldest left). Calm, no axes: the number tells the story. */
export function ScoreHistory({ points }: { points: { score: number; at: number }[] }) {
  const data = [...points].reverse()
  if (data.length < 2) return <p className="text-body-sm text-text-muted">Your score history appears after a few scans.</p>
  const w = 300
  const h = 64
  const gap = 2
  const bw = Math.max(2, (w - gap * (data.length - 1)) / data.length)
  const color = (s: number) => (s >= 90 ? 'fill-safe' : s >= 70 ? 'fill-cleanup' : s >= 40 ? 'fill-warning' : 'fill-critical')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" role="img" aria-label={`Score history, latest ${data.at(-1)!.score}`}>
      {data.map((p, i) => {
        const bh = Math.max(3, (p.score / 100) * h)
        return <rect key={p.at} x={i * (bw + gap)} y={h - bh} width={bw} height={bh} rx={1.5} className={color(p.score)} />
      })}
    </svg>
  )
}
