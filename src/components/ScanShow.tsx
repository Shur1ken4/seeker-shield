import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { OutfitId } from '@/lib/outfits'
import type { Finding, ScanResult } from '../../api/_lib/types'
import { Spinner } from './Spinner'
import { Wardy, type WardyMood } from './Wardy'

/** Each stop: what Wardy inspects, where it sits on stage, where he hovers, and the caption. */
const STOPS = [
  { emoji: '🔑', label: 'App access', obj: { x: -110, y: -85 }, at: { x: -25, y: -25 }, look: { x: -1, y: -0.8 }, line: 'Which apps can move your tokens?' },
  { emoji: '🎣', label: 'Fake tokens', obj: { x: 110, y: -85 }, at: { x: 25, y: -25 }, look: { x: 1, y: -0.8 }, line: 'Sniffing out fake tokens…' },
  { emoji: '🪙', label: 'Stuck SOL', obj: { x: -110, y: 85 }, at: { x: -25, y: 20 }, look: { x: -1, y: 0.8 }, line: 'Any SOL stuck in old accounts?' },
  { emoji: '🕵️', label: 'Scammers', obj: { x: 110, y: 85 }, at: { x: 25, y: 20 }, look: { x: 1, y: 0.8 }, line: 'Checking the scammer list…' },
]
const LINE_MS = 1150 // slow enough to read each line and feel the work

type Tone = 'info' | 'ok' | 'warn' | 'crit' | 'coin' | 'score'
interface LogLine {
  step: number
  tone: Tone
  text: string
}

const nameOf = (f: Pick<Finding, 'symbol' | 'name'>) => f.symbol || f.name || 'Unknown token'
const quote = (s: string) => (s.length > 26 ? `${s.slice(0, 24)}…` : s)

/** Turns a real scan result into the step-by-step story Wardy tells: what he read, checked and found. */
function buildLog(d: ScanResult, readOnly: boolean): LogLine[] {
  const whose = readOnly ? 'this wallet' : 'your'
  const out: LogLine[] = []
  const tokens = d.tokens ?? []
  const named = tokens.map((t) => t.symbol).filter((s): s is string => !!s)
  const shown = [...new Set(named)].slice(0, 3)
  const more = Math.max(0, tokens.length - shown.length)

  // 1. App access
  out.push({ step: 0, tone: 'info', text: `Read ${d.tokenAccountCount} token account${d.tokenAccountCount === 1 ? '' : 's'} live from Solana` })
  if (shown.length) out.push({ step: 0, tone: 'info', text: `Checked ${shown.join(', ')}${more ? ` +${more} more` : ''}` })
  const access = d.findings.filter((f) => f.delegate && (f.type === 'delegation' || f.type === 'scam_match'))
  if (access.length) access.slice(0, 3).forEach((f) => out.push({ step: 0, tone: f.severity === 'critical' ? 'crit' : 'warn', text: `${quote(nameOf(f))}: an app can still move it` }))
  else out.push({ step: 0, tone: 'ok', text: readOnly ? 'No app can move this wallet’s tokens' : 'No app can move your tokens' })

  // 2. Fake tokens
  const verified = tokens.filter((t) => t.verified).length
  out.push({ step: 1, tone: 'info', text: `Compared with Jupiter’s verified list: ${verified} verified, ${tokens.length - verified} unknown` })
  const fake = d.findings.filter((f) => f.type === 'suspicious' || (f.type === 'scam_match' && !f.delegate))
  if (fake.length) fake.slice(0, 3).forEach((f) => out.push({ step: 1, tone: 'warn', text: `“${quote(nameOf(f))}” looks like a fake token` }))
  else out.push({ step: 1, tone: 'ok', text: 'No fake or spam tokens' })

  // 3. Stuck SOL
  const empty = d.findings.filter((f) => f.type === 'empty')
  const lamports = empty.reduce((s, f) => s + f.rentLamports, 0)
  if (empty.length) {
    const sol = (lamports / 1e9).toFixed(4)
    const usd = d.solUsd ? ` (≈ $${((lamports / 1e9) * d.solUsd).toFixed(2)})` : ''
    out.push({ step: 2, tone: 'coin', text: `${empty.length} old account${empty.length === 1 ? '' : 's'} hold ${sol} SOL${usd} ${readOnly ? 'the owner' : 'you'} can get back` })
  } else out.push({ step: 2, tone: 'ok', text: 'No SOL stuck in old accounts' })

  // 4. Scammers
  const scams = d.findings.filter((f) => f.type === 'scam_match')
  if (scams.length) scams.slice(0, 3).forEach((f) => out.push({ step: 3, tone: 'crit', text: `${quote(nameOf(f))}: linked to a known scammer` }))
  else out.push({ step: 3, tone: 'ok', text: `No links to known scammers in ${whose === 'your' ? 'your' : 'this'} wallet` })

  out.push({ step: 4, tone: 'score', text: `Safety score: ${d.score}/100 · ${d.word}` })
  return out
}

const ICON: Record<Tone, string> = { info: '•', ok: '✓', warn: '⚠️', crit: '🚨', coin: '🪙', score: '🛡️' }
const TONE: Record<Tone, string> = {
  info: 'text-text-secondary',
  ok: 'text-text-primary',
  warn: 'text-warning',
  crit: 'text-critical',
  coin: 'text-text-primary',
  score: 'font-semibold text-safe',
}

/**
 * Full-screen "Wardy at work": he flies to each check while a live feed shows what he read, checked
 * and found, built from the real scan. Plays on the first scan of a visit; skippable.
 */
export function ScanShow({
  data,
  finished,
  onDone,
  readOnly = false,
  outfit,
  level,
}: {
  data: ScanResult | null
  finished: boolean
  onDone: () => void
  readOnly?: boolean
  outfit?: OutfitId
  level?: number
}) {
  const log = useMemo(() => (finished && data ? buildLog(data, readOnly) : []), [finished, data, readOnly])
  const [shown, setShown] = useState(0)
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!log.length) return
    if (shown < log.length) {
      const t = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 900 : LINE_MS)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(onDone, 2400)
    return () => window.clearTimeout(t)
  }, [log, shown, onDone])

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
  }, [shown])

  const visible = log.slice(0, shown)
  const step = visible.length ? visible[visible.length - 1].step : 0
  const done = step >= STOPS.length
  const stop = STOPS[Math.min(step, STOPS.length - 1)]
  const pos = done ? { x: 0, y: 0 } : stop.at
  const worst = visible.some((l) => l.tone === 'crit') ? 'alarmed' : visible.some((l) => l.tone === 'warn') ? 'worried' : null
  const mood: WardyMood = done ? (worst ?? 'excited') : (worst ?? 'calm')
  const caption = !log.length ? 'Reading the wallet live from Solana…' : done ? (readOnly ? 'Patrol done!' : 'All done! Here’s your score') : stop.line

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', animation: 'fade-in 250ms ease-out' }}
      role="dialog"
      aria-modal="true"
      aria-label="Wardy is checking the wallet"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 35% at 50% 32%, rgb(var(--safe) / 0.16), transparent 70%)' }} />

      <div className="relative flex items-center gap-3 px-4 pt-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-safe transition-[width] duration-700 ease-out" style={{ width: `${log.length ? Math.max(6, Math.round((shown / log.length) * 100)) : 4}%` }} />
        </div>
        <span className="text-caption tabular-nums text-text-muted">{done ? 'Done' : `Check ${step + 1} of ${STOPS.length}`}</span>
        <button onClick={onDone} aria-label="Skip" className="flex min-h-tap min-w-tap items-center justify-center text-text-secondary">
          <X size={22} />
        </button>
      </div>

      <p key={caption} className="relative px-6 pt-3 text-center font-brand text-title font-extrabold" style={{ animation: 'fade-in 300ms ease-out' }}>
        {caption}
      </p>

      {/* Stage: the four checks, and Wardy flying between them. */}
      <div className="relative flex h-[290px] shrink-0 items-center justify-center">
        {STOPS.map((s, i) => {
          const seen = i <= step || !log.length
          const ok = i < step
          return (
            <div
              key={s.label}
              className={cn('absolute flex flex-col items-center gap-1 transition-all duration-500', !seen && 'opacity-30', done && 'opacity-70')}
              style={{ transform: `translate(${s.obj.x}px, ${s.obj.y}px) scale(${i === step && !done && log.length ? 1.12 : 1})` }}
            >
              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface-1 text-[28px] shadow-lg">
                {s.emoji}
                {(ok || done) && (
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-safe text-on-safe" style={{ animation: 'fade-in 250ms ease-out' }}>
                    <Check size={16} strokeWidth={3} aria-hidden />
                  </span>
                )}
              </span>
              <span className="text-caption text-text-secondary">{s.label}</span>
            </div>
          )
        })}
        <div style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${done ? 1.2 : 1})`, transition: 'transform 800ms cubic-bezier(0.34, 1.4, 0.5, 1)' }} className="absolute">
          <div style={{ animation: 'scan-hover 1.3s ease-in-out infinite' }}>
            <Wardy mood={mood} size={88} look={done ? undefined : stop.look} outfit={outfit} level={level} />
          </div>
        </div>
      </div>

      {/* Live activity feed: what Wardy read, checked and found, one line at a time. */}
      <div ref={feedRef} className="relative mx-4 mb-3 flex-1 space-y-2 overflow-y-auto rounded-card border border-border bg-surface-1 p-4" aria-live="polite">
        {!log.length && (
          <p className="flex items-center gap-2 text-body-sm text-text-secondary">
            <Spinner /> Reading {readOnly ? 'the wallet' : 'your wallet'} live from Solana…
          </p>
        )}
        {visible.map((l, i) => (
          <p key={i} className={cn('flex gap-2 text-body-sm', TONE[l.tone])} style={{ animation: 'fade-in 300ms ease-out' }}>
            <span className="w-5 shrink-0 text-center" aria-hidden>
              {ICON[l.tone]}
            </span>
            <span>{l.text}</span>
          </p>
        ))}
        {log.length > 0 && shown < log.length && (
          <p className="flex items-center gap-2 text-body-sm text-text-muted">
            <Spinner /> Thinking…
          </p>
        )}
      </div>

      <p className="relative px-6 pb-4 text-center text-caption text-text-muted">Wardy only looks. Nothing moves without your fingerprint.</p>
    </div>,
    document.body,
  )
}
