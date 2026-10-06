import { fail, isWalletAddress, json, rateLimit } from '../../_lib/http.js'
import { kv } from '../../_lib/kv.js'
import { newToken } from '../../_lib/session.js'
import { signInMessage } from '../../_lib/signin.js'

export async function GET(req: Request) {
  const limited = await rateLimit(req, 'nonce', 10)
  if (limited) return limited
  const address = new URL(req.url).searchParams.get('address')
  if (!isWalletAddress(address)) return fail('That doesn’t look like a Solana wallet address.')
  const nonce = newToken().slice(0, 16)
  const domain = new URL(req.url).host
  const message = signInMessage({ domain, address, nonce, issuedAt: new Date().toISOString() })
  // The message is stored server-side: verify only accepts this exact text, once, within 5 minutes.
  await kv.set(`nonce:${address}`, message, { ex: 300 })
  return json({ message })
}
