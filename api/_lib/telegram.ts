import { env } from './env.js'

const escape = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)
export { escape as escapeHtml }

/** Sends an HTML-formatted Telegram message. Returns false (never throws) so alerts degrade to in-app only. */
export async function sendTelegram(chatId: number, html: string, button?: { text: string; url: string }): Promise<boolean> {
  if (!env.telegramToken) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        ...(button && button.url.startsWith('https://') ? { reply_markup: { inline_keyboard: [[button]] } } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    })
    return res.ok
  } catch {
    return false
  }
}

let ready: Promise<string> | null = null

/**
 * Finds the bot's username and points Telegram at our webhook, once per server instance.
 * So the only setup needed is TELEGRAM_BOT_TOKEN. Resolves to '' when Telegram isn't configured.
 */
export function telegramBot(): Promise<string> {
  if (!env.telegramToken) return Promise.resolve('')
  ready ??= (async () => {
    const api = `https://api.telegram.org/bot${env.telegramToken}`
    const me = (await fetch(`${api}/getMe`, { signal: AbortSignal.timeout(8000) }).then((r) => r.json())) as { result?: { username?: string } }
    const username = env.telegramBotUsername || me.result?.username || ''
    if (env.appUrl && env.telegramSecret) {
      const url = `${env.appUrl}/api/telegram/webhook`
      const info = (await fetch(`${api}/getWebhookInfo`, { signal: AbortSignal.timeout(8000) }).then((r) => r.json())) as { result?: { url?: string } }
      if (info.result?.url !== url) {
        await fetch(`${api}/setWebhook`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url, secret_token: env.telegramSecret, allowed_updates: ['message'] }),
          signal: AbortSignal.timeout(8000),
        })
      }
    }
    return username
  })().catch(() => {
    ready = null // try again next time
    return env.telegramBotUsername
  })
  return ready
}
