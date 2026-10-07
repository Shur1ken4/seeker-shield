import { fail, json, rateLimit } from '../../_lib/http.js'
import { getSession } from '../../_lib/session.js'
import { patrol } from '../../_lib/wardy.js'

/**
 * Wardy's daily patrol (his "meal"): counted once per day for the wallet that proved ownership.
 * Needs a session so nobody can farm someone else's streak, or their own from a script without signing.
 */
export async function POST(req: Request) {
  const limited = await rateLimit(req, 'patrol', 10)
  if (limited) return limited
  const s = await getSession(req)
  if (!s) return fail('Prove it’s your wallet to start Wardy’s patrols.', 401)
  return json(await patrol(s.address))
}
