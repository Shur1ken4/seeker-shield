import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import type { WardyState } from '../../api/_lib/types'

export interface PatrolResult {
  state: WardyState
  gained: number
  already: boolean
  rewardProDays: number
  napped: boolean
  levelUp: boolean
}

/**
 * Wardy's level, XP and streak for a wallet. `patrol()` is the daily meal: the server counts it
 * once per day, only for the wallet that proved ownership.
 */
export function useWardy(owner: string | null) {
  const [state, setState] = useState<WardyState | null>(null)
  const patrolledFor = useRef<string | null>(null)

  const refresh = useCallback(() => {
    if (!owner) return
    api.get<WardyState>(`/api/wardy?owner=${owner}`).then(setState).catch(() => {})
  }, [owner])

  useEffect(() => {
    setState(null)
    patrolledFor.current = null
    refresh()
  }, [refresh])

  const patrol = useCallback(async (): Promise<PatrolResult | null> => {
    if (!owner || patrolledFor.current === owner) return null
    patrolledFor.current = owner
    try {
      const r = await api.post<PatrolResult>('/api/wardy/patrol')
      setState((prev) => ({ ...r.state, adopted: prev?.adopted ?? true }))
      return r
    } catch {
      patrolledFor.current = null
      return null
    }
  }, [owner])

  return { state, refresh, patrol }
}
