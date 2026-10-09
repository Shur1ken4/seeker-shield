import { env } from '../../_lib/env.js'
import { fail, json, rateLimit, readJson } from '../../_lib/http.js'
import { kv } from '../../_lib/kv.js'
import { checkPayment, checkSolPayment, markAdopted } from '../../_lib/pro.js'
import { ADOPT_PRICE_LAMPORTS, ADOPT_PRICE_SKR } from '../../_lib/constants.js'
import { getSession } from '../../_lib/session.js'

/** Verifies the one-time Wardy unlock payment (SOL or SKR) on-chain, then unlocks the wallet that signed in. */
export async function POST(req: Request) {
  const limited = await rateLimit(req, 'proverify', 10)
  if (limited) return limited
  const s = await getSession(req)
  if (!s) return fail('Please verify your wallet first.', 401)
  if (!env.treasury) return fail('Payments aren’t set up yet.', 503)
  const body = await readJson<{ signature?: string; currency?: string }>(req)
  const currency = body?.currency === 'skr' ? 'skr' : 'sol'
  const sig = body?.signature
  if (typeof sig !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(sig)) return fail('Missing payment signature.')
  if (await kv.sismember('pro:sigs', sig)) return fail('That payment was already used.', 409)

  const problem =
    currency === 'skr'
      ? await checkPayment(sig, s.address, env.treasury, ADOPT_PRICE_SKR)
      : await checkSolPayment(sig, s.address, env.treasury, ADOPT_PRICE_LAMPORTS)
  if (problem) return fail(problem, 402)
  // Mark used before granting, so the same payment can't be redeemed twice in parallel.
  if (!(await kv.set(`pro:sig:${sig}`, s.address, { nx: true }))) return fail('That payment was already used.', 409)
  await kv.sadd('pro:sigs', sig)
  await markAdopted(s.address)
  return json({ adopted: true })
}
