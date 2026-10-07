import { env } from '../../_lib/env.js'
import { fail, json, rateLimit } from '../../_lib/http.js'
import { markAdopted } from '../../_lib/pro.js'
import { getSession } from '../../_lib/session.js'

/** Test mode only: unlock Wardy without a payment, for the wallet that proved ownership. */
export async function POST(req: Request) {
  const limited = await rateLimit(req, 'testunlock', 5)
  if (limited) return limited
  if (!env.paymentsTestMode) return fail('Test mode is off.', 403)
  const s = await getSession(req)
  if (!s) return fail('Please verify your wallet first.', 401)
  await markAdopted(s.address)
  return json({ adopted: true, testMode: true })
}
