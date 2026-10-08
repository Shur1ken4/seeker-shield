import { env } from '../../_lib/env.js'
import { safeEqual } from '../../_lib/http.js'
import { kv } from '../../_lib/kv.js'
import { escapeHtml, sendTelegram } from '../../_lib/telegram.js'
import type { Alert } from '../../_lib/watch.js'
import { getWardy } from '../../_lib/wardy.js'

/** Daily digest for free users (Vercel Cron sends Authorization: Bearer $CRON_SECRET). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? ''
  if (!secret || !safeEqual(req.headers.get('authorization') ?? '', `Bearer ${secret}`)) return new Response('Forbidden', { status: 403 })
  const users = await kv.smembers('digest:users')
  let sent = 0
  for (const user of users) {
    const items = await kv.lrange<Alert>(`digest:${user}`, 20)
    await kv.del(`digest:${user}`)
    await kv.srem('digest:users', user)
    const chatId = await kv.get<number>(`tg:chat:${user}`)
    if (!chatId || !items.length) continue
    const lines = items.slice(0, 8).map((a) => `• <b>${escapeHtml(a.nickname)}</b>: ${escapeHtml(a.title)}`)
    const more = items.length > 8 ? `\n…and ${items.length - 8} more.` : ''
    const html = `<b>Your daily Wardy digest</b>\n${lines.join('\n')}${more}\n\nWardy Pro sends these the moment they happen.`
    if (await sendTelegram(chatId, html, env.appUrl ? { text: 'Open Wardy', url: env.appUrl } : undefined)) sent++
  }

  // Daily nudge: Wardy reminds people who haven't patrolled today. One message a day, never more.
  let nudged = 0
  const today = new Date().toISOString().slice(0, 10)
  for (const user of await kv.smembers('tg:users')) {
    const chatId = await kv.get<number>(`tg:chat:${user}`)
    if (!chatId) continue
    const w = await getWardy(user)
    if (!w.adopted || w.patrolledToday) continue
    if (!(await kv.set(`tg:nudge:${user}:${today}`, 1, { ex: 2 * 86400, nx: true }))) continue
    const text = w.streak
      ? `Wardy hasn’t patrolled today. Open Wardy to keep your ${w.streak}-day streak${w.daysToReward <= 2 ? ` (chest in ${w.daysToReward} day${w.daysToReward === 1 ? '' : 's'})` : ''}.`
      : 'Wardy is napping. Wake him up for a quick patrol.'
    if (await sendTelegram(chatId, text, env.appUrl ? { text: 'Open Wardy', url: env.appUrl } : undefined)) nudged++
  }
  return Response.json({ ok: true, users: users.length, sent, nudged })
}
