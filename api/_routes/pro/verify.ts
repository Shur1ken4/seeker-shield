import { env } from '../../_lib/env.js'
import { fail, json, rateLimit, readJson } from '../../_lib/http.js'
import { kv } from '../../_lib/kv.js'
import { checkPayment, extendPro, markAdopted } from '../../_lib/pro.js'
import { ADOPT_PRICE_SKR, PRO_PRICE_SKR } from '../../_lib/constants.js'
import { getSession } from '../../_lib/session.js'

export async function POST(req: Request) {
  const limited = await rateLimit(req, 'proverify', 10)
  if (limited) return limited
  const s = await getSession(req)
  if (!s) return fail('Please verify your wallet first.', 401)
  if (!env.treasury) return fail('Payments aren’t set up yet.', 503)
  const body = await readJson<{ signature?: string; kind?: string }>(req)
  const kind = body?.kind === 'adopt' ? 'adopt' : 'pro'
  const sig = body?.signature
  if (typeof sig !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(sig)) return fail('Missing payment signature.')
  if (await kv.sismember('pro:sigs', sig)) return fail('That payment was already used.', 409)

  const problem = await checkPayment(sig, s.address, env.treasury, kind === 'adopt' ? ADOPT_PRICE_SKR : PRO_PRICE_SKR)
  if (problem) return fail(problem, 402)
  // Mark used before granting, so the same payment can't be redeemed twice in parallel.
  if (!(await kv.set(`pro:sig:${sig}`, s.address, { nx: true }))) return fail('That payment was already used.', 409)
  await kv.sadd('pro:sigs', sig)
  if (kind === 'adopt') {
    await markAdopted(s.address)
    return json({ adopted: true })
  }
  const until = await extendPro(s.address)
  return json({ proUntil: until })
}
