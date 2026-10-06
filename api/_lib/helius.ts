import { env } from './env.js'
import { kv } from './kv.js'
import { ALL_WATCHED } from './watch.js'

const API = 'https://api.helius.xyz/v0/webhooks'

/**
 * Keeps ONE Helius webhook whose address list is every watched wallet.
 * Called whenever a wallet is added or removed. Silently does nothing until keys are configured.
 */
export async function syncHeliusWebhook(): Promise<{ ok: boolean; reason?: string }> {
  if (!env.heliusKey || !env.appUrl || !env.heliusWebhookSecret) return { ok: false, reason: 'Helius webhook not configured yet' }
  const webhookURL = `${env.appUrl}/api/helius-webhook`
  const accountAddresses = (await kv.smembers(ALL_WATCHED)).slice(0, 100_000)
  const body = {
    webhookURL,
    transactionTypes: ['ANY'],
    accountAddresses: accountAddresses.length ? accountAddresses : ['11111111111111111111111111111111'],
    webhookType: 'enhanced',
    authHeader: env.heliusWebhookSecret,
  }
  let id = await kv.get<string>('helius:webhookId')
  if (!id) {
    const list = await fetch(`${API}?api-key=${env.heliusKey}`).then((r) => (r.ok ? r.json() : []))
    id = (list as { webhookID: string; webhookURL: string }[]).find((w) => w.webhookURL === webhookURL)?.webhookID ?? null
  }
  const res = await fetch(id ? `${API}/${id}?api-key=${env.heliusKey}` : `${API}?api-key=${env.heliusKey}`, {
    method: id ? 'PUT' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.error('helius webhook sync failed', res.status, await res.text())
    return { ok: false, reason: `Helius HTTP ${res.status}` }
  }
  const saved = (await res.json()) as { webhookID?: string }
  if (saved.webhookID) await kv.set('helius:webhookId', saved.webhookID)
  return { ok: true }
}
