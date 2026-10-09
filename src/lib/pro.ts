import { ComputeBudgetProgram, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction, type Connection } from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import { explainSimError } from './fixes'

export interface ProInfo {
  adoptPriceLamports: number
  adoptPriceSkr: number
  adoptPriceUsd: number | null
  adopted: boolean
  testMode: boolean
  mint: string
  decimals: number | null
  treasury: string | null
}

/** A plain SOL transfer to the treasury for the one-time unlock. The server verifies it on-chain afterwards. */
export async function buildSolPayment(connection: Connection, owner: PublicKey, info: ProInfo) {
  if (!info.treasury) throw new Error('Payments aren’t set up yet.')
  const lamports = info.adoptPriceLamports
  const balance = await connection.getBalance(owner, 'confirmed')
  if (balance < lamports + 20_000) throw new Error(`You need about ${(lamports + 20_000) / 1e9} SOL in this wallet.`)
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  const msg = new TransactionMessage({
    payerKey: owner,
    recentBlockhash: blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 10_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 20_000 }),
      SystemProgram.transfer({ fromPubkey: owner, toPubkey: new PublicKey(info.treasury), lamports }),
    ],
  }).compileToV0Message()
  const tx = new VersionedTransaction(msg)
  const sim = await connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true, commitment: 'confirmed' })
  if (sim.value.err) throw new Error(explainSimError(sim.value.err, sim.value.logs ?? []))
  return { tx, lastValidBlockHeight }
}

/** A plain SKR transfer to the treasury (the SKR way to unlock). The server verifies it on-chain afterwards. */
export async function buildProPayment(connection: Connection, owner: PublicKey, info: ProInfo, priceSkr = info.adoptPriceSkr) {
  if (!info.treasury || info.decimals == null) throw new Error('Payments aren’t set up yet.')
  const mint = new PublicKey(info.mint)
  const treasury = new PublicKey(info.treasury)
  const from = getAssociatedTokenAddressSync(mint, owner, false, TOKEN_PROGRAM_ID)
  const to = getAssociatedTokenAddressSync(mint, treasury, true, TOKEN_PROGRAM_ID)
  const amount = BigInt(priceSkr) * 10n ** BigInt(info.decimals)

  const bal = await connection.getTokenAccountBalance(from).catch(() => null)
  if (!bal || BigInt(bal.value.amount) < amount) throw new Error(`You need ${priceSkr} SKR in this wallet.`)

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  const msg = new TransactionMessage({
    payerKey: owner,
    recentBlockhash: blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 60_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 20_000 }),
      // Creates the treasury's SKR account only if it doesn't exist yet (you'd pay its small rent once).
      createAssociatedTokenAccountIdempotentInstruction(owner, to, treasury, mint, TOKEN_PROGRAM_ID),
      createTransferCheckedInstruction(from, mint, to, owner, amount, info.decimals, [], TOKEN_PROGRAM_ID),
    ],
  }).compileToV0Message()
  const tx = new VersionedTransaction(msg)
  const sim = await connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true, commitment: 'confirmed' })
  if (sim.value.err) throw new Error(explainSimError(sim.value.err, sim.value.logs ?? []))
  return { tx, lastValidBlockHeight }
}
