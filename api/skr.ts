import { fail, isWalletAddress, json, rateLimit } from './_lib/http.js'
import { isSkrName, resolveSkr, reverseSkr } from './_lib/skr.js'

/** GET /api/skr?address=... -> { name } ; GET /api/skr?name=alice.skr -> { address } */
export async function GET(req: Request) {
  const limited = await rateLimit(req, 'skr', 30)
  if (limited) return limited
  const q = new URL(req.url).searchParams
  const address = q.get('address')
  const name = q.get('name')
  if (address) {
    if (!isWalletAddress(address)) return fail('That doesn’t look like a Solana wallet address.')
    return json({ name: await reverseSkr(address) })
  }
  if (name) {
    if (!isSkrName(name)) return fail('Use a name like alice.skr.')
    try {
      const resolved = await resolveSkr(name)
      return resolved ? json({ address: resolved }) : fail(`${name} isn’t registered.`, 404)
    } catch {
      return fail('Couldn’t look up that name right now. Try again.', 503)
    }
  }
  return fail('Missing address or name.')
}
