import { json } from '../_lib/http.js'
import { getSession } from '../_lib/session.js'

export async function GET(req: Request) {
  const s = await getSession(req)
  return json(s ? { address: s.address, verified: !!s.sgtMint, sgtMint: s.sgtMint } : { address: null })
}
