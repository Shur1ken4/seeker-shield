import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import type { Finding, ScanResult } from '../../api/_lib/types'

export function useScan(owner: string | null) {
  const [data, setData] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)

  const run = useCallback(
    async (fresh = false) => {
      if (!owner) return
      const id = ++seq.current
      setLoading(true)
      setError(null)
      try {
        const r = await api.get<ScanResult>(`/api/scan?owner=${owner}${fresh ? '&fresh=1' : ''}`)
        if (id === seq.current) setData(r)
      } catch (e) {
        if (id === seq.current) setError((e as Error).message)
      } finally {
        if (id === seq.current) setLoading(false)
      }
    },
    [owner],
  )

  useEffect(() => {
    setData(null)
    if (owner) run()
  }, [owner, run])

  return { data, loading, error, rescan: () => run(true) }
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
