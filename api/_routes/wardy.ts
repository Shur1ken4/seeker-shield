import { fail, isWalletAddress, json, rateLimit } from '../_lib/http.js'
import { getWardy } from '../_lib/wardy.js'

/** Wardy's public state for a wallet (XP, level, streak). Read-only. */
export async function GET(req: Request) {
  const limited = await rateLimit(req, 'wardy', 30)
  if (limited) return limited
  const owner = new URL(req.url).searchParams.get('owner')
  if (!isWalletAddress(owner)) return fail('That doesn’t look like a Solana wallet address.')
  return json(await getWardy(owner))
}
