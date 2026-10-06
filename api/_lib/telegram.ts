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
