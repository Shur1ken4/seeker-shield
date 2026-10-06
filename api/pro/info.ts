import { PRO_DAYS, PRO_PRICE_SKR, SKR_MINT } from '../_lib/constants.js'
import { env } from '../_lib/env.js'
import { json, rateLimit } from '../_lib/http.js'
import { kv } from '../_lib/kv.js'
import { skrDecimals } from '../_lib/pro.js'
import { getSession } from '../_lib/session.js'
import { proUntil } from '../_lib/watch.js'

export async function GET(req: Request) {
  const limited = await rateLimit(req, 'proinfo', 30)
  if (limited) return limited
  const s = await getSession(req)
  const [until, decimals, freeUsed] = await Promise.all([
    s ? proUntil(s.address) : null,
    skrDecimals().catch(() => null),
    s?.sgtMint ? kv.get(`pro:sgt:${s.sgtMint}`) : null,
  ])
  return json({
    priceSkr: PRO_PRICE_SKR,
    days: PRO_DAYS,
    mint: SKR_MINT,
    decimals,
    treasury: env.treasury || null,
    proUntil: until && until > Date.now() ? until : null,
    freeMonthAvailable: !!s?.sgtMint && !freeUsed,
  })
}
