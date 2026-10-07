import { fail, isWalletAddress, json, rateLimit } from '../../_lib/http.js'
import { newToken, sign } from '../../_lib/session.js'
import { signInMessage } from '../../_lib/signin.js'

export async function GET(req: Request) {
  const limited = await rateLimit(req, 'nonce', 10)
  if (limited) return limited
  const address = new URL(req.url).searchParams.get('address')
  if (!isWalletAddress(address)) return fail('That doesn’t look like a Solana wallet address.')
  const nonce = newToken().slice(0, 16)
  const domain = new URL(req.url).host
  const message = signInMessage({ domain, address, nonce, issuedAt: new Date().toISOString() })
  // A signed ticket ties this exact message to this address; verify accepts it within 5 minutes.
  return json({ message, ticket: sign(`${address}\n${message}`) })
}
