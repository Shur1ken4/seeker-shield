import { classify } from './classify.js'
import { computeScore, scoreWord } from './score.js'
import { kv } from './kv.js'
import { loadScamList } from './scamlist.js'
import { getAssetsByOwner, getJupiterInfo, getMints, getTokenAccounts, rpc } from './solana.js'
import { SCAN_CACHE_SECONDS, TOKEN_2022_PROGRAM } from './constants.js'
import type { CheckedToken, ScanResult, Severity } from './types.js'

export async function scanWallet(owner: string, { fresh = false } = {}): Promise<ScanResult> {
  const cacheKey = `scan:${owner}`
  if (!fresh) {
    const cached = await kv.get<ScanResult>(cacheKey)
    if (cached) return { ...cached, cached: true }
  }

  const started = Date.now()
  const [accounts, das, scamList, balance] = await Promise.all([
    getTokenAccounts(owner),
    getAssetsByOwner(owner),
    loadScamList(),
    rpc<{ value: number }>('getBalance', [owner, { commitment: 'confirmed' }]),
  ])
  const mintList = [...new Set(accounts.map((a) => a.mint))]
  const t22Mints = [...new Set(accounts.filter((a) => a.programId === TOKEN_2022_PROGRAM).map((a) => a.mint))]
  const [jup, mints] = await Promise.all([getJupiterInfo(mintList), getMints(t22Mints)])

  const assets = Object.fromEntries(
    mintList.map((m) => {
      const d = das.byMint[m] ?? {}
      const j = jup[m]
      return [
        m,
        {
          ...d,
          name: d.name || j?.name || null,
          symbol: d.symbol || j?.symbol || null,
          image: d.image || j?.icon || null,
          verified: j?.verified ?? false,
          usdPrice: j?.usdPrice ?? d.usdPrice ?? null,
        },
      ]
    }),
  )

  const findings = classify({ accounts, mints, assets, compressed: das.compressed, scamList })
  const score = computeScore(findings)
  const rank: Record<'ok' | Severity, number> = { ok: 0, cleanup: 1, warning: 2, critical: 3 }
  const tokens: CheckedToken[] = accounts
    .map((a) => {
      const meta = assets[a.mint]
      const worst = findings
        .filter((f) => f.tokenAccount === a.pubkey)
        .reduce<'ok' | Severity>((w, f) => (rank[f.severity] > rank[w] ? f.severity : w), 'ok')
      return {
        tokenAccount: a.pubkey,
        mint: a.mint,
        symbol: meta?.symbol ?? null,
        name: meta?.name ?? null,
        uiAmount: a.uiAmount,
        usdValue: meta?.usdPrice != null ? a.uiAmount * meta.usdPrice : null,
        verified: !!meta?.verified,
        status: worst,
      }
    })
    .sort((x, y) => rank[y.status] - rank[x.status] || (y.usdValue ?? 0) - (x.usdValue ?? 0))
    .slice(0, 300)
  const result: ScanResult = {
    owner,
    score,
    word: scoreWord(score),
    findings,
    scannedAt: Date.now(),
    tokenAccountCount: accounts.length,
    cached: false,
    solLamports: balance.value,
    durationMs: Date.now() - started,
    tokens,
  }

  await Promise.all([
    kv.set(cacheKey, result, { ex: SCAN_CACHE_SECONDS }),
    kv.set(`findings:last:${owner}`, findings.map((f) => f.id)),
    kv.lpush(`history:${owner}`, { score, at: result.scannedAt }, 30),
  ])
  return result
}
