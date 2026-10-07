import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Sessions and sign-in tickets are signed with SESSION_SECRET instead of stored, so sign-in works
 * on every server instance (no database needed) and can't be forged without the secret.
 */
export interface Session {
  address: string
  sgtMint: string | null
  createdAt: number
}

const TTL_MS = 30 * 24 * 60 * 60 * 1000

function secret() {
  const s = process.env.SESSION_SECRET
  if (s) return s
  if (process.env.VERCEL_ENV === 'production') throw new Error('SESSION_SECRET is not set')
  return 'local-dev-only-secret'
}

const b64 = (s: string) => Buffer.from(s).toString('base64url')
const unb64 = (s: string) => Buffer.from(s, 'base64url').toString()
export const sign = (data: string) => createHmac('sha256', secret()).update(data).digest('base64url')

export function verifySigned(data: string, mac: string) {
  const expected = Buffer.from(sign(data))
  const got = Buffer.from(mac)
  return expected.length === got.length && timingSafeEqual(expected, got)
}

export function newToken() {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

export async function createSession(s: Session) {
  const body = b64(JSON.stringify({ ...s, exp: Date.now() + TTL_MS }))
  return `${body}.${sign(body)}`
}

/** The wallet that proved ownership with a signature (Authorization: Bearer <token>), or null. */
export async function getSession(req: Request): Promise<Session | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token || token.length > 2000) return null
  const [body, mac] = token.split('.')
  if (!body || !mac || !verifySigned(body, mac)) return null
  try {
    const s = JSON.parse(unb64(body)) as Session & { exp: number }
    if (!s.exp || s.exp < Date.now()) return null
    return { address: s.address, sgtMint: s.sgtMint ?? null, createdAt: s.createdAt }
  } catch {
    return null
  }
}
