import { telegramBot } from '../_lib/telegram.js'

/** Liveness, plus which optional services are on (no secrets). Also connects the Telegram bot on first call. */
export async function GET() {
  const bot = await telegramBot()
  return Response.json({
    ok: true,
    telegram: bot ? `@${bot}` : false,
    storage: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL ? 'upstash' : 'memory',
  })
}
