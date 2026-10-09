// One Vercel function for every /api route (the Hobby plan allows 12 functions per deployment).
// vercel.json rewrites /api/<path> to /api/router?__path=<path>; handlers live in api/_routes/<path>.ts.

import * as r_auth_nonce from './_routes/auth/nonce.js'
import * as r_auth_session from './_routes/auth/session.js'
import * as r_auth_verify from './_routes/auth/verify.js'
import * as r_cron_digest from './_routes/cron/digest.js'
import * as r_explain from './_routes/explain.js'
import * as r_fixes_record from './_routes/fixes/record.js'
import * as r_health from './_routes/health.js'
import * as r_helius_webhook from './_routes/helius-webhook.js'
import * as r_pro_info from './_routes/pro/info.js'
import * as r_pro_test_unlock from './_routes/pro/test-unlock.js'
import * as r_pro_verify from './_routes/pro/verify.js'
import * as r_rpc from './_routes/rpc.js'
import * as r_scan from './_routes/scan.js'
import * as r_skr from './_routes/skr.js'
import * as r_stats from './_routes/stats.js'
import * as r_telegram_link from './_routes/telegram/link.js'
import * as r_telegram_test from './_routes/telegram/test.js'
import * as r_telegram_webhook from './_routes/telegram/webhook.js'
import * as r_wardy from './_routes/wardy.js'
import * as r_wardy_outfit from './_routes/wardy/outfit.js'
import * as r_wardy_patrol from './_routes/wardy/patrol.js'
import * as r_watch from './_routes/watch.js'

type Handler = (req: Request) => Response | Promise<Response>
const routes: Record<string, Partial<Record<string, Handler>>> = {
  'auth/nonce': r_auth_nonce,
  'auth/session': r_auth_session,
  'auth/verify': r_auth_verify,
  'cron/digest': r_cron_digest,
  'explain': r_explain,
  'fixes/record': r_fixes_record,
  'health': r_health,
  'helius-webhook': r_helius_webhook,
  'pro/info': r_pro_info,
  'pro/test-unlock': r_pro_test_unlock,
  'pro/verify': r_pro_verify,
  'rpc': r_rpc,
  'scan': r_scan,
  'skr': r_skr,
  'stats': r_stats,
  'telegram/link': r_telegram_link,
  'telegram/test': r_telegram_test,
  'telegram/webhook': r_telegram_webhook,
  'wardy': r_wardy,
  'wardy/outfit': r_wardy_outfit,
  'wardy/patrol': r_wardy_patrol,
  'watch': r_watch,
}

async function handle(req: Request) {
  const url = new URL(req.url)
  const path = (url.searchParams.get('__path') ?? url.pathname.replace(/^\/api\//, '')).replace(/^\/+|\/+$/g, '')
  const handler = routes[path]?.[req.method]
  if (!routes[path]) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!handler) return Response.json({ error: 'Method not allowed' }, { status: 405 })
  // Hand the handler a clean URL without our routing parameter.
  url.searchParams.delete('__path')
  url.pathname = `/api/${path}`
  const init: RequestInit & { duplex?: string } = { method: req.method, headers: req.headers, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer() }
  return handler(new Request(url, init))
}

export const GET = handle
export const POST = handle
export const DELETE = handle
