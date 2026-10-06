import type { Finding, ScoreWord } from './types.js'

/** Shield Score, exactly as CLAUDE.md defines it. */
export function computeScore(findings: Pick<Finding, 'severity'>[]): number {
  const count = (s: Finding['severity']) => findings.filter((f) => f.severity === s).length
  const penalty =
    Math.min(75, count('critical') * 25) + Math.min(24, count('warning') * 8) + Math.min(10, count('cleanup') * 1)
  return Math.max(0, 100 - penalty)
}

export function scoreWord(score: number): ScoreWord {
  if (score >= 90) return 'Safe'
  if (score >= 70) return 'Okay'
  if (score >= 40) return 'At risk'
  return 'Danger'
}
