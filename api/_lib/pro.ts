import { PRO_DAYS, PRO_PRICE_SKR, SKR_MINT } from './constants.js'
import { kv } from './kv.js'
import { rpc } from './solana.js'

const DAY_MS = 24 * 60 * 60 * 1000

export async function skrDecimals(): Promise<number> {
  const cached = await kv.get<number>('skr:decimals')
  if (cached != null) return cached
  const info = await rpc<{ value: any }>('getAccountInfo', [SKR_MINT, { encoding: 'jsonParsed' }])
  const d = info.value?.data?.parsed?.info?.decimals
  if (typeof d !== 'number') throw new Error('Could not read SKR decimals')
  await kv.set('skr:decimals', d, { ex: 86400 })
  return d
}

export async function extendPro(address: string, days = PRO_DAYS) {
  const current = (await kv.get<number>(`pro:${address}`)) ?? 0
  const until = Math.max(Date.now(), current) + days * DAY_MS
  await kv.set(`pro:${address}`, until)
  return until
}

interface TokenBalance {
  accountIndex: number
  mint: string
  owner?: string
  uiTokenAmount: { amount: string }
}

/**
 * Checks a payment transaction on-chain: confirmed, no error, signed by `payer`,
 * and moved at least PRO_PRICE_SKR of the SKR mint from `payer` to `treasury`.
 * Returns null when valid, otherwise a plain-English reason.
 */
export async function checkPayment(signature: string, payer: string, treasury: string): Promise<string | null> {
  const tx = await rpc<any>('getTransaction', [signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }])
  if (!tx) return 'Payment not found yet. Wait a few seconds and try again.'
  if (tx.meta?.err) return 'That payment failed on-chain.'
  const keys: { pubkey: string; signer: boolean }[] = tx.transaction.message.accountKeys
  if (!keys.some((k) => k.pubkey === payer && k.signer)) return 'That payment wasn’t signed by your wallet.'

  const decimals = await skrDecimals()
  const price = BigInt(PRO_PRICE_SKR) * 10n ** BigInt(decimals)
  const delta = (owner: string) => {
    const sum = (list: TokenBalance[] = []) =>
      list.filter((b) => b.mint === SKR_MINT && b.owner === owner).reduce((s, b) => s + BigInt(b.uiTokenAmount.amount), 0n)
    return sum(tx.meta.postTokenBalances) - sum(tx.meta.preTokenBalances)
  }
  if (delta(treasury) < price) return `The treasury didn’t receive ${PRO_PRICE_SKR} SKR in that transaction.`
  if (delta(payer) > -price) return 'That SKR didn’t come from your wallet.'
  return null
}
