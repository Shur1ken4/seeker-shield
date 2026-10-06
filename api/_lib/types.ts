// Shared shapes between the /api functions and the React app (type-only imports from the app).

export type FindingType = 'delegation' | 'suspicious' | 'empty' | 'scam_match'
export type Severity = 'critical' | 'warning' | 'cleanup'

export interface Finding {
  id: string
  type: FindingType
  severity: Severity
  tokenAccount: string
  mint: string
  symbol: string | null
  name: string | null
  image: string | null
  uiAmount: number
  /** Raw integer amount as a string (exact; uiAmount is for display only). */
  amount: string
  decimals: number
  usdValue: number | null
  delegate: string | null
  delegatedAmount: string | null
  programId: string
  rentLamports: number
  /** True for SGT, SKR, accounts holding value: never closed or burned. */
  isProtected: boolean
  /** Why a fix isn't offered, in plain English (e.g. Token-2022 withheld fees). */
  unfixableReason: string | null
  /** Short labels for which rule fired, e.g. ["url in name", "no price"]. */
  reasons: string[]
  raw: Record<string, unknown>
}

export type ScoreWord = 'Safe' | 'Okay' | 'At risk' | 'Danger'

export interface ScanResult {
  owner: string
  score: number
  word: ScoreWord
  findings: Finding[]
  scannedAt: number
  tokenAccountCount: number
  cached: boolean
}
