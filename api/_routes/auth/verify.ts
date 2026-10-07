import bs58 from 'bs58'
import { ed25519 } from '@noble/curves/ed25519.js'
import { PublicKey } from '@solana/web3.js'
import { fail, isWalletAddress, json, rateLimit, readJson } from '../../_lib/http.js'
import { kv } from '../../_lib/kv.js'
import { createSession, verifySigned } from '../../_lib/session.js'
import { findSgtMint } from '../../_lib/sgt.js'

export async function POST(req: Request) {
  const limited = await rateLimit(req, 'verify', 10)
  if (limited) return limited
  const body = await readJson<{ address?: string; signature?: string; message?: string; ticket?: string }>(req)
  if (!body || !isWalletAddress(body.address) || typeof body.signature !== 'string' || typeof body.message !== 'string' || typeof body.ticket !== 'string') {
    return fail('Missing sign-in details.')
  }
  const message = body.message
  // Only messages this server issued for this address, within 5 minutes, and each signature once.
  if (!verifySigned(`${body.address}\n${message}`, body.ticket)) return fail('That sign-in request isn’t valid. Please try again.', 401)
  const issued = Date.parse(message.match(/Issued At: (.+)$/m)?.[1] ?? '')
  if (!issued || Date.now() - issued > 5 * 60 * 1000) return fail('That sign-in request expired. Please try again.', 401)
  if (!(await kv.set(`siws:used:${body.signature.slice(0, 64)}`, 1, { ex: 600, nx: true }))) return fail('That sign-in was already used. Please try again.', 401)

  let ok = false
  try {
    const sig = bs58.decode(body.signature)
    ok = ed25519.verify(sig, new TextEncoder().encode(message), new PublicKey(body.address).toBytes())
  } catch {
    ok = false
  }
  if (!ok) return fail('The signature didn’t match this wallet.', 401)

  let sgtMint: string | null = null
  try {
    sgtMint = await findSgtMint(body.address)
  } catch (err) {
    console.error('sgt check failed', err)
  }
  const token = await createSession({ address: body.address, sgtMint, createdAt: Date.now() })
  return json({ token, address: body.address, verified: !!sgtMint, sgtMint })
}
