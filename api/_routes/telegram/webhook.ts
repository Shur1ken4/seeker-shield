import { env } from '../../_lib/env.js'
import { safeEqual } from '../../_lib/http.js'
import { kv } from '../../_lib/kv.js'
import { sendTelegram } from '../../_lib/telegram.js'
import { addWatcher, removeWatcher } from '../../_lib/watch.js'
import { syncHeliusWebhook } from '../../_lib/helius.js'

/** Telegram bot updates. Only accepted with our secret header (set via scripts/set-telegram-webhook.ts). */
export async function POST(req: Request) {
  if (!safeEqual(req.headers.get('x-telegram-bot-api-secret-token') ?? '', env.telegramSecret)) {
    return new Response('Forbidden', { status: 403 })
  }
  const update = (await req.json().catch(() => null)) as { message?: { chat?: { id?: number; type?: string }; text?: string } } | null
  const chatId = update?.message?.chat?.id
  const text = update?.message?.text?.trim() ?? ''
  if (!chatId || update?.message?.chat?.type !== 'private') return new Response('ok')

  const start = text.match(/^\/start(?:\s+([0-9a-f]{24}))?$/)
  if (start?.[1]) {
    const address = await kv.get<string>(`tg:code:${start[1]}`)
    if (!address) {
      await sendTelegram(chatId, '⏳ Oops, that link went stale. Open Wardy and tap “Connect Telegram” again, I’ll be waiting! 🛡️')
      return new Response('ok')
    }
    await kv.del(`tg:code:${start[1]}`)
    await kv.set(`tg:chat:${address}`, chatId)
    const linked = new Set((await kv.get<string[]>(`tg:wallets:${chatId}`)) ?? [])
    linked.add(address)
    await kv.set(`tg:wallets:${chatId}`, [...linked])
    await kv.sadd('tg:users', address)
    await addWatcher(address, address) // your own wallet is always watched once Telegram is linked
    await syncHeliusWebhook().catch(() => {})
    await sendTelegram(chatId, `🛡️ <b>We’re linked!</b> I’m now on guard duty for ${address.slice(0, 4)}…${address.slice(-4)}.\n\n🚨 Sneaky tokens or new app access? I’ll ping you here right away.\n🔥 Forget your daily patrol? I’ll give you a friendly nudge.\n\nSend /stop anytime to pause me.`)
  } else if (text === '/stop') {
    // Unlink every wallet that points at this chat.
    const linked = (await kv.get<string[]>(`tg:wallets:${chatId}`)) ?? []
    for (const a of linked) {
      await kv.del(`tg:chat:${a}`)
      await kv.srem('tg:users', a)
      await removeWatcher(a, a)
    }
    await sendTelegram(chatId, '😴 Okay, I’m off duty. Turn me back on anytime from the app. I’ll miss you!')
  } else {
    await sendTelegram(chatId, '👋 Hi, I’m Wardy, your wallet’s guard! Open the Wardy app and tap “Connect Telegram” so I can start watching your back. 🛡️')
  }
  return new Response('ok')
}
