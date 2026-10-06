import { PublicKey } from '@solana/web3.js'
import { kv } from './kv.js'

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(data, { status, headers: { 'cache-control': 'no-store', ...headers } })
}

/** Errors the user can see: always plain English, never a stack trace. */
export function fail(message: string, status = 400) {
  return json({ error: message }, status)
}

export function isAddress(s: unknown): s is string {
  if (typeof s !== 'string' || s.length < 32 || s.length > 44) return false
  try {
    new PublicKey(s)
    return true
  } catch {
    return false
  }
}

/** Wallet (owner) addresses must be on the ed25519 curve; PDAs can't own a phone wallet. */
export function isWalletAddress(s: unknown): s is string {
  if (!isAddress(s)) return false
  return PublicKey.isOnCurve(new PublicKey(s).toBytes())
}

export function clientIp(req: Request) {
  return req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local'
}

/** Fixed-window rate limit. Returns a 429 Response when over the limit, otherwise null. */
export async function rateLimit(req: Request, bucket: string, limit: number, windowSeconds = 60) {
  const key = `rl:${bucket}:${clientIp(req)}:${Math.floor(Date.now() / 1000 / windowSeconds)}`
  const n = await kv.incr(key, windowSeconds + 5)
  return n > limit ? fail('Too many requests. Please wait a minute and try again.', 429) : null
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T
  } catch {
    return null
  }
}

/** Constant-time string compare for shared secrets. */
export function safeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
