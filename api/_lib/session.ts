import { kv } from './kv.js'

export interface Session {
  address: string
  sgtMint: string | null
  createdAt: number
}

const TTL = 24 * 60 * 60

export function newToken() {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

export async function createSession(s: Session) {
  const token = newToken()
  await kv.set(`session:${token}`, s, { ex: TTL })
  return token
}

/** The wallet that proved ownership with a signature (Authorization: Bearer <token>), or null. */
export async function getSession(req: Request): Promise<Session | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null
  return kv.get<Session>(`session:${token}`)
}
