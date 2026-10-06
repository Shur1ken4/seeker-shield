/**
 * One-time setup: tells Telegram to send bot updates to our /api/telegram/webhook,
 * with our secret header so nobody else can post fake updates.
 *
 *   npx tsx --env-file=.env.local scripts/set-telegram-webhook.ts
 */
const token = process.env.TELEGRAM_BOT_TOKEN
const secret = process.env.TELEGRAM_WEBHOOK_SECRET
const appUrl = process.env.APP_URL?.replace(/\/$/, '')
if (!token || !secret || !appUrl) {
  console.error('Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and APP_URL in .env.local first.')
  process.exit(1)
}
const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ url: `${appUrl}/api/telegram/webhook`, secret_token: secret, allowed_updates: ['message'], drop_pending_updates: true }),
})
console.log(res.status, await res.json())
const me = await fetch(`https://api.telegram.org/bot${token}/getMe`).then((r) => r.json())
console.log('Bot username:', me.result?.username, '-> put it in TELEGRAM_BOT_USERNAME')
