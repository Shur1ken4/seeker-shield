import { fail, json, rateLimit } from '../../_lib/http.js'
import { kv } from '../../_lib/kv.js'
import { isAdopted } from '../../_lib/pro.js'
import { getSession } from '../../_lib/session.js'
import { OUTFIT_IDS, type OutfitId } from '../../_lib/types.js'

/** Chooses Wardy's look. Once per wallet, at adoption: it can never be changed afterwards. */
export async function POST(req: Request) {
  const limited = await rateLimit(req, 'outfit', 10)
  if (limited) return limited
  const s = await getSession(req)
  if (!s) return fail('Please verify your wallet first.', 401)
  if (!(await isAdopted(s.address))) return fail('Adopt Wardy first.', 402)
  const body = (await req.json().catch(() => null)) as { outfit?: string } | null
  const outfit = body?.outfit as OutfitId
  if (!OUTFIT_IDS.includes(outfit)) return fail('Unknown look.')
  if (outfit === 'scarf' && !s.sgtMint) return fail('The Seeker scarf is for wallets holding a Seeker Genesis Token.', 403)
  // nx: only the first choice is ever stored, even if two requests race.
  const saved = await kv.set(`outfit:${s.address}`, outfit, { nx: true })
  if (!saved) return fail('Wardy’s look is already chosen. It’s his for good.', 409)
  return json({ outfit })
}
