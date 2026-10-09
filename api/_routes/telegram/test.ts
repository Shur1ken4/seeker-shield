import { fail, json, rateLimit } from '../../_lib/http.js'
import { deliver } from '../../_lib/alerts.js'
import { getSession } from '../../_lib/session.js'
import { kv } from '../../_lib/kv.js'

export async function POST(req: Request) {
  const limited = await rateLimit(req, 'tgtest', 3)
  if (limited) return limited
  const s = await getSession(req)
  if (!s) return fail('Please verify your wallet first.', 401)
  const linked = !!(await kv.get<number>(`tg:chat:${s.address}`))
  const r = await deliver(
    s.address,
    {
      id: `test:${Date.now()}`,
      at: Date.now(),
      wallet: s.address,
      nickname: 'Your wallet',
      severity: 'info',
      title: 'Test alert 🧪',
      text: 'Woof! This is what my alerts look like. If anything sneaky lands in a wallet I guard, I’ll bark right here. 🐾',
    },
    { instant: true },
  )
  return json({ telegram: r.telegram, linked })
}
