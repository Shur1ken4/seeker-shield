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
  /** Native SOL in the wallet (lamports). */
  solLamports: number
  /** USD price of SOL at scan time (null if unknown). */
  solUsd: number | null
  /** How long the scan took, for the "what we checked" report. */
  durationMs: number
  /** Every token the scan looked at, so users can see the work, not just the problems. */
  tokens: CheckedToken[]
}

export interface CheckedToken {
  tokenAccount: string
  mint: string
  symbol: string | null
  name: string | null
  uiAmount: number
  usdValue: number | null
  verified: boolean
  /** Worst severity among this token's findings, or 'ok'. */
  status: 'ok' | Severity
}

export interface Watched {
  address: string
  nickname: string
  addedAt: number
}

export interface Alert {
  id: string
  at: number
  wallet: string
  nickname: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  text: string
}

export interface WardyState {
  xp: number
  level: number
  levelName: string
  levelXp: number
  nextLevelXp: number | null
  streak: number
  bestStreak: number
  patrolledToday: boolean
  /** Missed at least one day since the last patrol. Wardy naps; he never dies. */
  sleepy: boolean
  daysToReward: number
  rewards: number
  /** Paid the one-time adoption. Only present on GET /api/wardy. */
  adopted?: boolean
}

/** What a streak chest holds (see api/_lib/wardy.ts). */
export type ChestPrize = { kind: 'pro'; days: number } | { kind: 'xp'; xp: number }
