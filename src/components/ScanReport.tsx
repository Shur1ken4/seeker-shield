import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, Coins } from 'lucide-react'
import { cn } from '@/lib/cn'
import { amount, short, sol, usd } from '@/lib/format'
import { SeverityChip } from './SeverityChip'
import type { Finding, ScanResult } from '../../api/_lib/types'

interface Row {
  label: string
  ok: boolean
  okText: string
  badText: string
  tone: 'critical' | 'warning' | 'cleanup'
}

const toneText = { critical: 'text-critical', warning: 'text-warning', cleanup: 'text-cleanup' }

/** Shows the work behind the score: every check that ran, and every token that was looked at. */
export function ScanReport({ data, findings }: { data: ScanResult; findings: Finding[] }) {
  const [open, setOpen] = useState(false)
  const permissions = findings.filter((f) => f.delegate && (f.type === 'delegation' || f.type === 'scam_match'))
  const spam = findings.filter((f) => f.type === 'suspicious' || (f.type === 'scam_match' && !f.delegate))
  const empty = findings.filter((f) => f.type === 'empty')
  const scamLinks = findings.filter((f) => f.type === 'scam_match')
  const emptyRent = empty.reduce((s, f) => s + f.rentLamports, 0)
  const tokens = data.tokens ?? []
  const n = data.tokenAccountCount
  const plural = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`

  const rows: Row[] = [
    {
      label: 'App permissions',
      ok: !permissions.length,
      okText: 'No app can move your tokens',
      badText: `${plural(permissions.length, 'app')} can move your tokens`,
      tone: permissions.some((f) => f.severity === 'critical') ? 'critical' : 'warning',
    },
    {
      label: 'Spam and fake tokens',
      ok: !spam.length,
      okText: 'None found',
      badText: `${plural(spam.length, 'suspicious token')} found`,
      tone: 'warning',
    },
    {
      label: 'Empty accounts',
      ok: !empty.length,
      okText: 'None, no SOL is stuck',
      badText: `${plural(empty.length, 'empty account')} holding ${sol(emptyRent)} you can get back`,
      tone: 'cleanup',
    },
    {
      label: 'Known scam addresses',
      ok: !scamLinks.length,
      okText: 'No links found',
      badText: `${plural(scamLinks.length, 'link')} found`,
      tone: 'critical',
    },
  ]

  return (
    <div className="rounded-card border border-border bg-surface-1">
      <div className="px-4 pb-2 pt-4">
        <h2 className="text-body font-medium">What Shield checked</h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          {plural(n, 'token account')} and your SOL balance, read live from Solana
          {data.durationMs ? ` in ${(data.durationMs / 1000).toFixed(1)} s` : ''}.
        </p>
      </div>

      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.label} className="flex items-start gap-3 px-4 py-3">
            {r.ok ? (
              <CheckCircle2 size={20} className="mt-px shrink-0 text-safe" aria-hidden />
            ) : (
              <AlertTriangle size={20} className={cn('mt-px shrink-0', toneText[r.tone])} aria-hidden />
            )}
            <div className="min-w-0">
              <p className="text-body-sm font-medium">{r.label}</p>
              <p className={cn('text-body-sm', r.ok ? 'text-text-secondary' : toneText[r.tone])}>{r.ok ? r.okText : r.badText}</p>
            </div>
          </li>
        ))}
        <li className="flex items-start gap-3 px-4 py-3">
          <Coins size={20} className="mt-px shrink-0 text-text-muted" aria-hidden />
          <div>
            <p className="text-body-sm font-medium">SOL balance</p>
            <p className="text-body-sm text-text-secondary">
              <span className="font-mono">{sol(data.solLamports ?? 0)}</span> · never touched by any fix
            </p>
          </div>
        </li>
      </ul>

      {tokens.length > 0 && (
        <div className="border-t border-border">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex min-h-tap w-full items-center justify-between px-4 text-body-sm text-text-secondary active:bg-surface-2"
          >
            {open ? 'Hide tokens' : `See all ${plural(tokens.length, 'token')}`}
            <ChevronDown size={16} className={cn('transition-transform duration-fast', open && 'rotate-180')} aria-hidden />
          </button>
          {open && (
            <ul className="divide-y divide-border pb-1">
              {tokens.map((t) => (
                <li key={t.tokenAccount} className="flex items-center gap-3 px-4 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-medium">
                      {(t.symbol || t.name || short(t.mint)).slice(0, 24)}
                      {t.verified && <span className="ml-1 text-caption text-text-muted">· verified</span>}
                    </p>
                    <p className="font-mono text-caption text-text-muted">
                      {amount(t.uiAmount)}
                      {t.usdValue ? ` · ${usd(t.usdValue)}` : ''}
                    </p>
                  </div>
                  {t.status === 'ok' ? (
                    <span className="inline-flex items-center gap-1 text-caption text-safe">
                      <CheckCircle2 size={14} aria-hidden /> OK
                    </span>
                  ) : (
                    <SeverityChip kind={t.status} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
