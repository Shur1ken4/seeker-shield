import { fail, isWalletAddress, json, rateLimit, readJson } from '../_lib/http.js'
import { kv } from '../_lib/kv.js'
import { getSession } from '../_lib/session.js'
import { isSkrName, resolveSkr } from '../_lib/skr.js'
import { syncHeliusWebhook } from '../_lib/helius.js'
import { isAdopted } from '../_lib/pro.js'
import { scanWallet } from '../_lib/scan.js'
import { addWatcher, getAlerts, getWatched, isPro, removeWatcher, setWatched, watchLimit } from '../_lib/watch.js'

/** Everything the Watch tab needs, for the verified wallet. */
export async function GET(req: Request) {
  const limited = await rateLimit(req, 'watchget', 30)
  if (limited) return limited
  const s = await getSession(req)
  if (!s) return fail('Please verify your wallet first.', 401)
  const [watched, alerts, chatId, pro, limit] = await Promise.all([
    getWatched(s.address),
    getAlerts(s.address),
    kv.get<number>(`tg:chat:${s.address}`),
    isPro(s.address),
    watchLimit(s.address),
  ])
  const withScores = await Promise.all(
    watched.map(async (w) => {
      try {
        const r = await scanWallet(w.address)
        return { ...w, score: r.score, word: r.word }
      } catch {
        return { ...w, score: null, word: null }
      }
    }),
  )
  return json({ telegram: { linked: !!chatId }, watched: withScores, alerts, pro, limit, adopted: await isAdopted(s.address) })
}

export async function POST(req: Request) {
  const limited = await rateLimit(req, 'watch', 10)
  if (limited) return limited
  const s = await getSession(req)
  if (!s) return fail('Please verify your wallet first.', 401)
  if (!(await isAdopted(s.address))) return fail('Adopt Wardy to watch friends’ wallets.', 402)
  const body = await readJson<{ target?: string; nickname?: string }>(req)
  const target = body?.target?.trim() ?? ''
  const nickname = (body?.nickname ?? '').trim().replace(/[<>]/g, '').slice(0, 24) || 'Friend'

  let address = target
  if (isSkrName(target)) {
    try {
      const resolved = await resolveSkr(target)
      if (!resolved) return fail(`${target} isn’t registered.`, 404)
      address = resolved
    } catch {
      return fail('Couldn’t look up that .skr name right now. Try again.', 503)
    }
  } else if (!isWalletAddress(target)) {
    return fail('Enter a wallet address or a .skr name.')
  }
  if (address === s.address) return fail('Your own wallet is already watched once Telegram is linked.')

  const list = await getWatched(s.address)
  if (list.some((w) => w.address === address)) return fail('You’re already watching that wallet.')
  const limit = await watchLimit(s.address)
  if (list.length >= limit) {
    return fail(limit < 5 ? `Free plan watches up to ${limit} wallets. Wardy Pro raises it to 5.` : `You’re watching the maximum of ${limit} wallets.`, 403)
  }
  list.push({ address, nickname, addedAt: Date.now() })
  await setWatched(s.address, list)
  await addWatcher(address, s.address)
  // Baseline scan so the first alert only fires for something new.
  await scanWallet(address, { fresh: true }).catch(() => {})
  const sync = await syncHeliusWebhook().catch(() => ({ ok: false }))
  return json({ ok: true, address, webhookSynced: sync.ok })
}

export async function DELETE(req: Request) {
  const limited = await rateLimit(req, 'watchdel', 20)
  if (limited) return limited
  const s = await getSession(req)
  if (!s) return fail('Please verify your wallet first.', 401)
  const body = await readJson<{ address?: string }>(req)
  if (!isWalletAddress(body?.address)) return fail('Missing wallet address.')
  await setWatched(s.address, (await getWatched(s.address)).filter((w) => w.address !== body!.address))
  await removeWatcher(body!.address!, s.address)
  await syncHeliusWebhook().catch(() => {})
  return json({ ok: true })
}

