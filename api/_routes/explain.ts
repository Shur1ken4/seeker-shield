import { explain, type ExplainInput } from '../_lib/explain.js'
import { fail, json, rateLimit, readJson } from '../_lib/http.js'

const TYPES = new Set(['delegation', 'suspicious', 'empty', 'scam_match'])
const SEVERITIES = new Set(['critical', 'warning', 'cleanup'])

export async function POST(req: Request) {
  const limited = await rateLimit(req, 'explain', 20)
  if (limited) return limited
  const body = await readJson<{ findings?: unknown[] }>(req)
  if (!body || !Array.isArray(body.findings)) return fail('Missing findings.')
  const findings: ExplainInput[] = []
  for (const raw of body.findings.slice(0, 30)) {
    const f = raw as Record<string, unknown>
    if (typeof f.id !== 'string' || !TYPES.has(f.type as string) || !SEVERITIES.has(f.severity as string) || typeof f.mint !== 'string') continue
    findings.push({
      id: f.id.slice(0, 120),
      type: f.type as ExplainInput['type'],
      severity: f.severity as ExplainInput['severity'],
      mint: f.mint.slice(0, 44),
      symbol: typeof f.symbol === 'string' ? f.symbol.slice(0, 40) : null,
      name: typeof f.name === 'string' ? f.name.slice(0, 80) : null,
      reasons: Array.isArray(f.reasons) ? f.reasons.filter((r): r is string => typeof r === 'string').slice(0, 6).map((r) => r.slice(0, 60)) : [],
      unfixableReason: typeof f.unfixableReason === 'string' ? f.unfixableReason.slice(0, 160) : null,
    })
  }
  return json({ explanations: await explain(findings) })
}
