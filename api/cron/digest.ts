import { env } from '../_lib/env.js'
import { safeEqual } from '../_lib/http.js'
import { kv } from '../_lib/kv.js'
import { escapeHtml, sendTelegram } from '../_lib/telegram.js'
import type { Alert } from '../_lib/watch.js'

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
    const html = `<b>Your daily Shield digest</b>\n${lines.join('\n')}${more}\n\nShield Pro sends these the moment they happen.`
    if (await sendTelegram(chatId, html, env.appUrl ? { text: 'Open Seeker Shield', url: env.appUrl } : undefined)) sent++
  }
  return Response.json({ ok: true, users: users.length, sent })
}
