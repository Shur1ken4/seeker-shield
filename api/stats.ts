import { fail, isWalletAddress, json } from './_lib/http.js'
import { kv } from './_lib/kv.js'
import { getStats } from './_lib/stats.js'

export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get('owner')
  if (!isWalletAddress(owner)) return fail('That doesn’t look like a Solana wallet address.')
  const [stats, history] = await Promise.all([getStats(owner), kv.lrange<{ score: number; at: number }>(`history:${owner}`, 30)])
  return json({ stats, history })
}
