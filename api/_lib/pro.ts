import { SKR_MINT } from './constants.js'
import { kv } from './kv.js'
import { rpc } from './solana.js'

export async function skrDecimals(): Promise<number> {
  const cached = await kv.get<number>('skr:decimals')
  if (cached != null) return cached
  const info = await rpc<{ value: any }>('getAccountInfo', [SKR_MINT, { encoding: 'jsonParsed' }])
  const d = info.value?.data?.parsed?.info?.decimals
  if (typeof d !== 'number') throw new Error('Could not read SKR decimals')
  await kv.set('skr:decimals', d, { ex: 86400 })
  return d
}


interface TokenBalance {
  accountIndex: number
  mint: string
  owner?: string
  uiTokenAmount: { amount: string }
}

/**
 * Checks a payment transaction on-chain: confirmed, no error, signed by `payer`,
 * and moved at least `priceSkr` of the SKR mint from `payer` to `treasury`.
 * Returns null when valid, otherwise a plain-English reason.
 */
export async function checkPayment(signature: string, payer: string, treasury: string, priceSkr: number): Promise<string | null> {
  const tx = await rpc<any>('getTransaction', [signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }])
  if (!tx) return 'Payment not found yet. Wait a few seconds and try again.'
  if (tx.meta?.err) return 'That payment failed on-chain.'
  const keys: { pubkey: string; signer: boolean }[] = tx.transaction.message.accountKeys
  if (!keys.some((k) => k.pubkey === payer && k.signer)) return 'That payment wasn’t signed by your wallet.'

  const decimals = await skrDecimals()
  const price = BigInt(priceSkr) * 10n ** BigInt(decimals)
  const delta = (owner: string) => {
    const sum = (list: TokenBalance[] = []) =>
      list.filter((b) => b.mint === SKR_MINT && b.owner === owner).reduce((s, b) => s + BigInt(b.uiTokenAmount.amount), 0n)
    return sum(tx.meta.postTokenBalances) - sum(tx.meta.preTokenBalances)
  }
  if (delta(treasury) < price) return `The treasury didn’t receive ${priceSkr} SKR in that transaction.`
  if (delta(payer) > -price) return 'That SKR didn’t come from your wallet.'
  return null
}

/**
 * Checks a SOL payment on-chain: confirmed, no error, signed by `payer`, and the treasury's
 * balance went up by at least `lamports`. Returns null when valid, otherwise a plain-English reason.
 */
export async function checkSolPayment(signature: string, payer: string, treasury: string, lamports: number): Promise<string | null> {
  const tx = await rpc<any>('getTransaction', [signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }])
  if (!tx) return 'Payment not found yet. Wait a few seconds and try again.'
  if (tx.meta?.err) return 'That payment failed on-chain.'
  const keys: { pubkey: string; signer: boolean }[] = tx.transaction.message.accountKeys
  if (!keys.some((k) => k.pubkey === payer && k.signer)) return 'That payment wasn’t signed by your wallet.'
  const i = keys.findIndex((k) => k.pubkey === treasury)
  if (i < 0) return 'That payment didn’t go to Wardy.'
  const received = (tx.meta.postBalances[i] ?? 0) - (tx.meta.preBalances[i] ?? 0)
  if (received < lamports) return `The treasury didn’t receive ${lamports / 1e9} SOL in that transaction.`
  return null
}

export async function isAdopted(address: string) {
  return !!(await kv.get<number>(`adopted:${address}`))
}

export async function markAdopted(address: string) {
  await kv.set(`adopted:${address}`, Date.now())
}
