import { describe, expect, it } from 'vitest'
import { POST } from '../../_routes/wardy/outfit'
import { markAdopted } from '../pro'
import { createSession } from '../session'

const A = 'Fv5mXLmW1QZt1nBqYQ3rC9a3VqR2bHcJx8kTz4wWv7uN'
const B = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'

async function choose(address: string, outfit: string, sgtMint: string | null = null) {
  const token = await createSession({ address, sgtMint, createdAt: Date.now() })
  const req = new Request('http://x/api/wardy/outfit', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify({ outfit }),
  })
  return POST(req)
}

describe('Wardy look', () => {
  it('needs adoption, then can be chosen once and never changed', async () => {
    expect((await choose(A, 'cap')).status).toBe(402)
    await markAdopted(A)
    expect((await choose(A, 'crown')).status).toBe(400)
    expect((await choose(A, 'cap')).status).toBe(200)
    expect((await choose(A, 'wizard')).status).toBe(409)
  })

  it('keeps the Seeker scarf for Genesis Token holders', async () => {
    await markAdopted(B)
    expect((await choose(B, 'scarf')).status).toBe(403)
    expect((await choose(B, 'scarf', 'SgtMint111')).status).toBe(200)
  })
})
