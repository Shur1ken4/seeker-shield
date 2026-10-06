import { env } from './_lib/env.js'
import { fail, rateLimit, readJson } from './_lib/http.js'

/**
 * Solana RPC proxy for the app, so the Helius key stays on the server.
 * Only the read/simulate/send methods the app needs are allowed.
 */
const ALLOWED = new Set([
  'getLatestBlockhash',
  'isBlockhashValid',
  'simulateTransaction',
  'sendTransaction',
  'getSignatureStatuses',
  'getAccountInfo',
  'getMultipleAccounts',
  'getBalance',
  'getMinimumBalanceForRentExemption',
  'getFeeForMessage',
  'getRecentPrioritizationFees',
  'getTokenAccountsByOwner',
  'getTokenAccountBalance',
  'getBlockHeight',
  'getSlot',
  'getEpochInfo',
  'getGenesisHash',
  'getVersion',
])

export async function POST(req: Request) {
  const limited = await rateLimit(req, 'rpc', 180)
  if (limited) return limited
  const body = await readJson<{ method?: string; id?: unknown; jsonrpc?: string; params?: unknown }>(req)
  if (!body || Array.isArray(body) || typeof body.method !== 'string') return fail('Bad request')
  if (!ALLOWED.has(body.method)) {
    return Response.json({ jsonrpc: '2.0', id: body.id ?? null, error: { code: -32601, message: `Method ${body.method} is not allowed` } })
  }
  const upstream = await fetch(env.rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: body.id ?? 1, method: body.method, params: body.params ?? [] }),
  })
  return new Response(upstream.body, { status: upstream.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
}
