import { fail, json, rateLimit } from '../../_lib/http.js'
import { kv } from '../../_lib/kv.js'
import { getSession, newToken } from '../../_lib/session.js'
import { isAdopted } from '../../_lib/pro.js'
import { telegramBot } from '../../_lib/telegram.js'

/** One-time code for linking this wallet to a Telegram chat: t.me/<bot>?start=<code>. */
export async function POST(req: Request) {
  const limited = await rateLimit(req, 'tglink', 10)
  if (limited) return limited
  const s = await getSession(req)
  if (!s) return fail('Please verify your wallet first.', 401)
  if (!(await isAdopted(s.address))) return fail('Adopt Wardy to turn on alerts.', 402)
  const bot = await telegramBot()
  if (!bot) return fail('Telegram alerts aren’t set up yet.', 503)
  const code = newToken().slice(0, 24)
  await kv.set(`tg:code:${code}`, s.address, { ex: 600 })
  return json({ url: `https://t.me/${bot}?start=${code}` })
}
