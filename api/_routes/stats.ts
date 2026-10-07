import { fail, isWalletAddress, json, rateLimit } from '../_lib/http.js'
import { kv } from '../_lib/kv.js'
import { getStats } from '../_lib/stats.js'
import { getSolUsd } from '../_lib/solana.js'

export async function GET(req: Request) {
  const limited = await rateLimit(req, 'stats', 30)
  if (limited) return limited
  const owner = new URL(req.url).searchParams.get('owner')
  if (!isWalletAddress(owner)) return fail('That doesn’t look like a Solana wallet address.')
  const [stats, history, solUsd] = await Promise.all([getStats(owner), kv.lrange<{ score: number; at: number }>(`history:${owner}`, 30), getSolUsd().catch(() => null)])
  return json({ stats, history, solUsd })
}
