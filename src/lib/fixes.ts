import {
  ComputeBudgetProgram,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  type Connection,
  type TransactionInstruction,
} from '@solana/web3.js'
import { createBurnCheckedInstruction, createCloseAccountInstruction, createRevokeInstruction } from '@solana/spl-token'
import { blockReason, type FixAction } from '../../api/_lib/guard'
import type { Finding } from '../../api/_lib/types'

export interface FixItem {
  finding: Finding
  action: FixAction
  burnConfirmed?: boolean
}

export interface PreparedTx {
  items: FixItem[]
  tx: VersionedTransaction
  lastValidBlockHeight: number
}

export interface FixPlan {
  ready: PreparedTx[]
  skipped: { item: FixItem; reason: string }[]
  revokes: number
  closes: number
  burns: number
  /** Rent the user gets back from closed accounts. */
  reclaimLamports: number
  feeLamports: number
}

const MAX_FIX_IX_PER_TX = 8 // + 2 compute-budget instructions = 10, the cap in CLAUDE.md
const PRIORITY_MICROLAMPORTS = 20_000
const CU_PER_IX = 12_000

function buildIx(item: FixItem, owner: PublicKey): TransactionInstruction[] {
  // The guard runs again here, right before any instruction exists. Nothing bypasses it.
  const reason = blockReason(item.finding, item.action, { burnConfirmed: item.burnConfirmed })
  if (reason) throw new Error(reason)
  const f = item.finding
  const account = new PublicKey(f.tokenAccount)
  const program = new PublicKey(f.programId)
  switch (item.action) {
    case 'revoke':
      return [createRevokeInstruction(account, owner, [], program)]
    case 'close':
      return [createCloseAccountInstruction(account, owner, owner, [], program)]
    case 'burn':
      return [
        createBurnCheckedInstruction(account, new PublicKey(f.mint), owner, BigInt(f.amount), f.decimals, [], program),
        createCloseAccountInstruction(account, owner, owner, [], program),
      ]
  }
}

async function compile(connection: Connection, owner: PublicKey, items: FixItem[]) {
  const ixs = items.flatMap((i) => buildIx(i, owner))
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  const msg = new TransactionMessage({
    payerKey: owner,
    recentBlockhash: blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 20_000 + ixs.length * CU_PER_IX }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_MICROLAMPORTS }),
      ...ixs,
    ],
  }).compileToV0Message()
  return { tx: new VersionedTransaction(msg), lastValidBlockHeight, ixCount: ixs.length }
}

async function simulate(connection: Connection, tx: VersionedTransaction): Promise<string | null> {
  const sim = await connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true, commitment: 'confirmed' })
  if (!sim.value.err) return null
  return explainSimError(sim.value.err, sim.value.logs ?? [])
}

export function explainSimError(err: unknown, logs: string[]): string {
  const text = `${JSON.stringify(err)} ${logs.join(' ')}`
  if (/insufficient (funds|lamports)|InsufficientFundsForFee|AccountNotFound/i.test(text)) return 'You need a little SOL (about 0.001) to pay the network fee.'
  if (/non-native account can only be closed if its balance is zero|NonNativeHasBalance/i.test(text)) return 'This account has tokens again, so it can’t be closed. Scan again.'
  if (/withheld/i.test(text)) return 'This token holds back fees, so the account can’t be closed yet.'
  if (/frozen/i.test(text)) return 'The token issuer froze this account, so it can’t be changed.'
  if (/owner does not match|OwnerMismatch/i.test(text)) return 'This account is no longer yours or has changed. Scan again.'
  return 'The network rejected this change in a test run, so we skipped it.'
}

/** Build, batch and simulate. Only transactions that pass simulation are returned as ready to sign. */
export async function planFixes(connection: Connection, owner: PublicKey, items: FixItem[]): Promise<FixPlan> {
  const skipped: FixPlan['skipped'] = []
  const allowed: FixItem[] = []
  for (const item of items) {
    const reason = blockReason(item.finding, item.action, { burnConfirmed: item.burnConfirmed })
    if (reason) skipped.push({ item, reason })
    else allowed.push(item)
  }

  // Burns use 2 instructions; everything else 1.
  const batches: FixItem[][] = []
  let cur: FixItem[] = []
  let n = 0
  for (const item of allowed) {
    const size = item.action === 'burn' ? 2 : 1
    if (n + size > MAX_FIX_IX_PER_TX) {
      batches.push(cur)
      cur = []
      n = 0
    }
    cur.push(item)
    n += size
  }
  if (cur.length) batches.push(cur)

  const ready: PreparedTx[] = []
  for (const batch of batches) {
    const built = await compile(connection, owner, batch)
    const err = await simulate(connection, built.tx)
    if (!err) {
      ready.push({ items: batch, tx: built.tx, lastValidBlockHeight: built.lastValidBlockHeight })
      continue
    }
    // Isolate the failing item(s): retry one by one, keep the ones that pass.
    for (const item of batch) {
      const one = await compile(connection, owner, [item])
      const e = batch.length === 1 ? err : await simulate(connection, one.tx)
      if (e) skipped.push({ item, reason: e })
      else ready.push({ items: [item], tx: one.tx, lastValidBlockHeight: one.lastValidBlockHeight })
    }
  }

  const readyItems = ready.flatMap((r) => r.items)
  const feePerTx = 5000 + Math.ceil(((20_000 + MAX_FIX_IX_PER_TX * CU_PER_IX) * PRIORITY_MICROLAMPORTS) / 1e6)
  return {
    ready,
    skipped,
    revokes: readyItems.filter((i) => i.action === 'revoke').length,
    closes: readyItems.filter((i) => i.action === 'close').length,
    burns: readyItems.filter((i) => i.action === 'burn').length,
    reclaimLamports: readyItems.filter((i) => i.action !== 'revoke').reduce((s, i) => s + i.finding.rentLamports, 0),
    feeLamports: ready.length * feePerTx,
  }
}

/** Plain-English one-liner for the summary sheet. */
export function describePlan(p: Pick<FixPlan, 'revokes' | 'closes' | 'burns'>) {
  const parts: string[] = []
  if (p.revokes) parts.push(`revoke ${p.revokes} permission${p.revokes > 1 ? 's' : ''}`)
  if (p.closes) parts.push(`close ${p.closes} empty account${p.closes > 1 ? 's' : ''}`)
  if (p.burns) parts.push(`permanently burn ${p.burns} token${p.burns > 1 ? 's' : ''}`)
  if (!parts.length) return 'Nothing to change.'
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]
  return `This will ${list}.`
}

export async function confirmSignature(connection: Connection, signature: string, lastValidBlockHeight: number) {
  for (let i = 0; i < 60; i++) {
    const { value } = await connection.getSignatureStatuses([signature])
    const s = value[0]
    if (s?.err) throw new Error('The network rejected the transaction. Nothing was changed.')
    if (s && (s.confirmationStatus === 'confirmed' || s.confirmationStatus === 'finalized')) return
    if (i % 5 === 4 && (await connection.getBlockHeight('confirmed')) > lastValidBlockHeight) {
      throw new Error('The transaction expired before it was confirmed. Please try again.')
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error('Still waiting for the network. Check again in a minute.')
}
