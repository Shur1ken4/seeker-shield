import { fail, isWalletAddress, json, rateLimit, readJson } from '../../_lib/http.js'
import { kv } from '../../_lib/kv.js'
import { rpc } from '../../_lib/solana.js'
import { addStats, getStats } from '../../_lib/stats.js'
import { feedSnacks } from '../../_lib/wardy.js'
import { TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from '../../_lib/constants.js'

/**
 * Called after a fix transaction confirms. We read the transaction from the chain ourselves,
 * so the "SOL reclaimed" and "issues fixed" totals can't be inflated by the client.
 */
export async function POST(req: Request) {
  const limited = await rateLimit(req, 'record', 30)
  if (limited) return limited
  const body = await readJson<{ owner?: string; signature?: string }>(req)
  if (!body || !isWalletAddress(body.owner) || typeof body.signature !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(body.signature)) {
    return fail('Missing transaction details.')
  }
  const owner = body.owner
  if (await kv.sismember('fix:sigs', body.signature)) return json({ stats: await getStats(owner), duplicate: true })

  const tx = await rpc<any>('getTransaction', [body.signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }])
  if (!tx) return fail('Transaction not found yet. Try again in a few seconds.', 404)
  if (tx.meta?.err) return fail('That transaction failed on-chain.')
  const keys: { pubkey: string; signer: boolean }[] = tx.transaction.message.accountKeys
  if (!keys.some((k) => k.pubkey === owner && k.signer)) return fail('That transaction wasn’t signed by this wallet.', 403)

  let fixed = 0
  let reclaimed = 0
  for (const ix of tx.transaction.message.instructions as any[]) {
    if (ix.programId !== TOKEN_PROGRAM && ix.programId !== TOKEN_2022_PROGRAM) continue
    const type = ix.parsed?.type
    const info = ix.parsed?.info ?? {}
    if (type === 'revoke' && info.owner === owner) fixed++
    if (type === 'closeAccount' && info.owner === owner && info.destination === owner) {
      fixed++
      const idx = keys.findIndex((k) => k.pubkey === info.account)
      if (idx >= 0) reclaimed += tx.meta.preBalances[idx] ?? 0
    }
  }
  await kv.sadd('fix:sigs', body.signature)
  await addStats(owner, { reclaimedLamports: reclaimed, fixed })
  const snackXp = await feedSnacks(owner, fixed)
  await kv.del(`scan:${owner}`)
  return json({ stats: await getStats(owner), counted: { fixed, reclaimedLamports: reclaimed }, snackXp })
}
