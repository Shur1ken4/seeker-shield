import { fail, json, rateLimit } from '../../_lib/http.js'
import { kv } from '../../_lib/kv.js'
import { extendPro } from '../../_lib/pro.js'
import { getSession } from '../../_lib/session.js'
import { findSgtMint } from '../../_lib/sgt.js'

/** First month free, once per Seeker Genesis Token mint (so moving the SGT to another wallet doesn't repeat it). */
export async function POST(req: Request) {
  const limited = await rateLimit(req, 'profree', 5)
  if (limited) return limited
  const s = await getSession(req)
  if (!s?.sgtMint) return fail('This offer is for Seeker Verified wallets.', 403)
  const current = await findSgtMint(s.address).catch(() => null)
  if (current !== s.sgtMint) return fail('We couldn’t find your Seeker Genesis Token in this wallet anymore.', 403)
  if (!(await kv.set(`pro:sgt:${s.sgtMint}`, s.address, { nx: true }))) return fail('This Seeker already used its free month.', 409)
  const until = await extendPro(s.address)
  return json({ proUntil: until })
}
