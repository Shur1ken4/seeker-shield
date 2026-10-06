import { classify } from './classify.js'
import { computeScore, scoreWord } from './score.js'
import { kv } from './kv.js'
import { loadScamList } from './scamlist.js'
import { getAssetsByOwner, getJupiterInfo, getMints, getTokenAccounts } from './solana.js'
import { SCAN_CACHE_SECONDS, TOKEN_2022_PROGRAM } from './constants.js'
import type { ScanResult } from './types.js'

export async function scanWallet(owner: string, { fresh = false } = {}): Promise<ScanResult> {
  const cacheKey = `scan:${owner}`
  if (!fresh) {
    const cached = await kv.get<ScanResult>(cacheKey)
    if (cached) return { ...cached, cached: true }
  }

  const [accounts, das, scamList] = await Promise.all([getTokenAccounts(owner), getAssetsByOwner(owner), loadScamList()])
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
  const result: ScanResult = { owner, score, word: scoreWord(score), findings, scannedAt: Date.now(), tokenAccountCount: accounts.length, cached: false }

  await Promise.all([
    kv.set(cacheKey, result, { ex: SCAN_CACHE_SECONDS }),
    kv.set(`findings:last:${owner}`, findings.map((f) => f.id)),
    kv.lpush(`history:${owner}`, { score, at: result.scannedAt }, 30),
  ])
  return result
}
