import { fail, isWalletAddress, json, rateLimit } from '../_lib/http.js'
import { scanWallet } from '../_lib/scan.js'

export async function GET(req: Request) {
  const limited = await rateLimit(req, 'scan', 20)
  if (limited) return limited
  const url = new URL(req.url)
  const owner = url.searchParams.get('owner')
  if (!isWalletAddress(owner)) return fail('That doesn’t look like a Solana wallet address.')
  try {
    return json(await scanWallet(owner, { fresh: url.searchParams.get('fresh') === '1' }))
  } catch (err) {
    console.error('scan failed', err)
    return fail('We couldn’t reach the Solana network. Check your connection and try again.', 502)
  }
}
