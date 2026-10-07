import { describe, expect, it } from 'vitest'
import { createSession, getSession, sign, verifySigned } from '../session'

const req = (token: string) => new Request('http://x', { headers: { authorization: `Bearer ${token}` } })

describe('signed sessions', () => {
  it('round-trips a session', async () => {
    const t = await createSession({ address: 'Addr1', sgtMint: null, createdAt: 1 })
    expect(await getSession(req(t))).toMatchObject({ address: 'Addr1' })
  })
  it('rejects a tampered token', async () => {
    const t = await createSession({ address: 'Addr1', sgtMint: null, createdAt: 1 })
    const [body, mac] = t.split('.')
    const forged = Buffer.from(JSON.stringify({ address: 'Victim', sgtMint: 'X', createdAt: 1, exp: Date.now() + 1e9 })).toString('base64url')
    expect(await getSession(req(`${forged}.${mac}`))).toBeNull()
    expect(await getSession(req(`${body}.AAAA`))).toBeNull()
  })
  it('rejects an expired token', async () => {
    const body = Buffer.from(JSON.stringify({ address: 'A', sgtMint: null, createdAt: 1, exp: Date.now() - 1 })).toString('base64url')
    expect(await getSession(req(`${body}.${sign(body)}`))).toBeNull()
  })
  it('signs sign-in tickets per address and message', () => {
    const mac = sign('A\nmsg')
    expect(verifySigned('A\nmsg', mac)).toBe(true)
    expect(verifySigned('B\nmsg', mac)).toBe(false)
  })
})
