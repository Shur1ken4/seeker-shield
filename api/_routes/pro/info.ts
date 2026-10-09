import { ADOPT_PRICE_LAMPORTS, ADOPT_PRICE_SKR, SKR_MINT } from '../../_lib/constants.js'
import { env } from '../../_lib/env.js'
import { json, rateLimit } from '../../_lib/http.js'
import { isAdopted, skrDecimals } from '../../_lib/pro.js'
import { getSession } from '../../_lib/session.js'
import { getSolUsd } from '../../_lib/solana.js'

/** What unlocking Wardy costs (SOL by default, or SKR) and whether this wallet already has. */
export async function GET(req: Request) {
  const limited = await rateLimit(req, 'proinfo', 30)
  if (limited) return limited
  const s = await getSession(req)
  const [decimals, adopted, solUsd] = await Promise.all([
    skrDecimals().catch(() => null),
    s ? isAdopted(s.address) : false,
    getSolUsd().catch(() => null),
  ])
  return json({
    adoptPriceLamports: ADOPT_PRICE_LAMPORTS,
    adoptPriceSkr: ADOPT_PRICE_SKR,
    adoptPriceUsd: solUsd ? (ADOPT_PRICE_LAMPORTS / 1e9) * solUsd : null,
    adopted,
    testMode: env.paymentsTestMode,
    mint: SKR_MINT,
    decimals,
    treasury: env.treasury || null,
  })
}
