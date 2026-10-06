import { env } from './_lib/env.js'
import { safeEqual } from './_lib/http.js'
import { checkWallet } from './_lib/alerts.js'
import { kv } from './_lib/kv.js'
import { ALL_WATCHED } from './_lib/watch.js'

/** Helius calls this when a watched wallet has a transaction. Verified by the shared auth header. */
export async function POST(req: Request) {
  if (!safeEqual(req.headers.get('authorization') ?? '', env.heliusWebhookSecret)) return new Response('Forbidden', { status: 403 })
  const events = (await req.json().catch(() => [])) as any[]
  const touched = new Set<string>()
  for (const e of Array.isArray(events) ? events.slice(0, 50) : []) {
    for (const a of e.accountData ?? []) if (a.account) touched.add(a.account)
    for (const t of e.tokenTransfers ?? []) {
      if (t.toUserAccount) touched.add(t.toUserAccount)
      if (t.fromUserAccount) touched.add(t.fromUserAccount)
    }
    if (e.feePayer) touched.add(e.feePayer)
  }
  const wallets: string[] = []
  for (const a of touched) if (await kv.sismember(ALL_WATCHED, a)) wallets.push(a)
  const results = []
  for (const w of wallets.slice(0, 10)) {
    try {
      results.push(await checkWallet(w))
    } catch (err) {
      console.error('checkWallet failed', w, err)
    }
  }
  return Response.json({ ok: true, checked: results.length })
}
