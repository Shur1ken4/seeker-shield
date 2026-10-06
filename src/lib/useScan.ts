import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import type { CheckedToken, Finding, ScanResult } from '../../api/_lib/types'

// Right after a fix, some RPC nodes still report the old state for a few seconds.
// Findings we just fixed (and saw confirmed on-chain) stay hidden for this long.
const FIXED_GRACE_MS = 90_000

export function useScan(owner: string | null) {
  const [data, setData] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)
  const fixedAt = useRef(new Map<string, number>())
  const timers = useRef<number[]>([])

  const withoutFixed = useCallback((r: ScanResult): ScanResult => {
    const now = Date.now()
    for (const [id, at] of fixedAt.current) if (now - at > FIXED_GRACE_MS) fixedAt.current.delete(id)
    if (!fixedAt.current.size) return r
    const isFixed = (f: Finding) => fixedAt.current.has(f.id)
    const findings = r.findings.filter((f) => !isFixed(f))
    // Closed (or burned) accounts no longer exist; revoked ones stay, now clean.
    const closed = new Set(r.findings.filter((f) => isFixed(f) && (f.type === 'empty' || f.type === 'suspicious' || (f.type === 'scam_match' && !f.delegate))).map((f) => f.tokenAccount))
    const rank = { ok: 0, cleanup: 1, warning: 2, critical: 3 } as const
    const tokens = (r.tokens ?? [])
      .filter((t) => !closed.has(t.tokenAccount))
      .map((t) => ({
        ...t,
        status: findings.filter((f) => f.tokenAccount === t.tokenAccount).reduce<CheckedToken['status']>((w, f) => (rank[f.severity] > rank[w] ? f.severity : w), 'ok'),
      }))
    return { ...r, findings, tokens, tokenAccountCount: r.tokenAccountCount - [...closed].filter(Boolean).length }
  }, [])

  const run = useCallback(
    async (fresh = false) => {
      if (!owner) return
      const id = ++seq.current
      setLoading(true)
      setError(null)
      try {
        const r = await api.get<ScanResult>(`/api/scan?owner=${owner}${fresh ? '&fresh=1' : ''}`)
        if (id === seq.current) setData(withoutFixed(r))
      } catch (e) {
        if (id === seq.current) setError((e as Error).message)
      } finally {
        if (id === seq.current) setLoading(false)
      }
    },
    [owner, withoutFixed],
  )

  useEffect(() => {
    setData(null)
    fixedAt.current.clear()
    if (owner) run()
    return () => timers.current.forEach(clearTimeout)
  }, [owner, run])

  /** After a confirmed fix: update the list and score right away, then re-check the chain a few times. */
  const markFixed = useCallback(
    (ids: string[]) => {
      const now = Date.now()
      ids.forEach((i) => fixedAt.current.set(i, now))
      setData((d) => (d ? withoutFixed(d) : d))
      timers.current.forEach(clearTimeout)
      timers.current = [1500, 5000, 12000].map((ms) => window.setTimeout(() => run(true), ms))
    },
    [run, withoutFixed],
  )

  return { data, loading, error, rescan: () => run(true), markFixed }
}

export function useExplanations(findings: Finding[] | undefined) {
  const [map, setMap] = useState<Record<string, string>>({})
  const key = findings?.map((f) => f.id).join('|') ?? ''
  useEffect(() => {
    if (!findings?.length) return
    const missing = findings.filter((f) => !map[f.id]).slice(0, 30)
    if (!missing.length) return
    let cancelled = false
    api
      .post<{ explanations: Record<string, { text: string }> }>('/api/explain', {
        findings: missing.map(({ id, type, severity, mint, symbol, name, reasons, unfixableReason }) => ({ id, type, severity, mint, symbol, name, reasons, unfixableReason })),
      })
      .then((r) => {
        if (!cancelled) setMap((m) => ({ ...m, ...Object.fromEntries(Object.entries(r.explanations).map(([k, v]) => [k, v.text])) }))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return map
}

/** "Hide" is local to this phone: the token stays in the wallet but leaves the list and the score. */
export function useHidden(owner: string | null) {
  const storageKey = `shield.hidden.${owner}`
  const read = () => {
    try {
      return new Set<string>(JSON.parse(localStorage.getItem(storageKey) ?? '[]'))
    } catch {
      return new Set<string>()
    }
  }
  const [hidden, setHidden] = useState<Set<string>>(read)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setHidden(read()), [owner])
  const update = (fn: (s: Set<string>) => void) => {
    setHidden((prev) => {
      const next = new Set(prev)
      fn(next)
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]))
      } catch {
        // Ignore: hiding still works for this session.
      }
      return next
    })
  }
  return {
    hidden,
    hide: (mint: string) => update((s) => s.add(mint)),
    unhideAll: () => update((s) => s.clear()),
  }
}
