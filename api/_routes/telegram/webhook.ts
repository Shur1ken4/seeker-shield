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
      await sendTelegram(chatId, 'That link has expired. Open Wardy and tap “Connect Telegram” again.')
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
    await sendTelegram(chatId, `Linked. Wardy will alert you here about new risks in ${address.slice(0, 4)}…${address.slice(-4)}.\n\nSend /stop to turn alerts off.`)
  } else if (text === '/stop') {
    // Unlink every wallet that points at this chat.
    const linked = (await kv.get<string[]>(`tg:wallets:${chatId}`)) ?? []
    for (const a of linked) {
      await kv.del(`tg:chat:${a}`)
      await kv.srem('tg:users', a)
      await removeWatcher(a, a)
    }
    await sendTelegram(chatId, 'Alerts are off. You can turn them on again from the app.')
  } else {
    await sendTelegram(chatId, 'Open Wardy and tap “Connect Telegram” to link your wallet.')
  }
  return new Response('ok')
}
