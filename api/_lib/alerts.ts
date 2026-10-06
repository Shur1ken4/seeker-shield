import { env } from './env.js'
import { explain } from './explain.js'
import { kv } from './kv.js'
import { scanWallet } from './scan.js'
import { escapeHtml, sendTelegram } from './telegram.js'
import { getWatched, isPro, pushAlert, watchersOf, type Alert } from './watch.js'
import type { Finding } from './types.js'

const TITLES: Record<Finding['type'], (f: Finding) => string> = {
  delegation: (f) => `An app now has access to your ${f.symbol || 'tokens'}`,
  scam_match: () => 'Linked to a known scammer',
  suspicious: () => 'Someone sent you a fake token',
  empty: () => 'Old empty account',
}

const appLink = (watcher: string, wallet: string) => (env.appUrl ? `${env.appUrl}/${wallet === watcher ? '' : `?check=${wallet}`}` : '')

async function nicknameFor(watcher: string, wallet: string) {
  if (watcher === wallet) return 'Your wallet'
  return (await getWatched(watcher)).find((w) => w.address === wallet)?.nickname ?? `${wallet.slice(0, 4)}…${wallet.slice(-4)}`
}

/** Deliver one alert: always to the in-app list, then Telegram (instant for Pro, daily digest for free). */
export async function deliver(watcher: string, alert: Alert, { instant = false } = {}) {
  await pushAlert(watcher, alert)
  const chatId = await kv.get<number>(`tg:chat:${watcher}`)
  if (!chatId) return { telegram: false }
  if (instant || (await isPro(watcher))) {
    // At most one Telegram message per watched wallet per 10 minutes.
    if (!instant && !(await kv.set(`tg:rl:${watcher}:${alert.wallet}`, 1, { ex: 600, nx: true }))) return { telegram: false }
    const label = alert.severity === 'critical' ? 'Critical' : alert.severity === 'warning' ? 'Warning' : 'Info'
    const html = `<b>${label} · ${escapeHtml(alert.nickname)}</b>\n${escapeHtml(alert.title)}\n\n${escapeHtml(alert.text)}`
    const url = appLink(watcher, alert.wallet)
    return { telegram: await sendTelegram(chatId, html, url ? { text: 'Open Seeker Shield', url } : undefined) }
  }
  await kv.lpush(`digest:${watcher}`, alert, 20)
  await kv.sadd('digest:users', watcher)
  return { telegram: false, queued: true }
}

/** Rescan a wallet after on-chain activity and alert its watchers about NEW critical/warning findings. */
export async function checkWallet(wallet: string) {
  const prev = await kv.get<string[]>(`findings:last:${wallet}`)
  const result = await scanWallet(wallet, { fresh: true })
  if (!prev) return { wallet, newFindings: 0, baseline: true } // first look: nothing to compare against yet
  const seen = new Set(prev)
  const fresh = result.findings.filter((f) => f.severity !== 'cleanup' && !seen.has(f.id))
  if (!fresh.length) return { wallet, newFindings: 0 }

  const texts = await explain(fresh)
  const watchers = await watchersOf(wallet)
  for (const watcher of watchers) {
    const nickname = await nicknameFor(watcher, wallet)
    for (const f of fresh.slice(0, 3)) {
      await deliver(watcher, {
        id: `${f.id}:${result.scannedAt}`,
        at: result.scannedAt,
        wallet,
        nickname,
        severity: f.severity === 'critical' ? 'critical' : 'warning',
        title: TITLES[f.type](f),
        text: texts[f.id]?.text ?? '',
      })
    }
  }
  return { wallet, newFindings: fresh.length, watchers: watchers.length }
}
