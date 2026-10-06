/**
 * Demo setup for the CLOCK IN video. Creates HARMLESS test risks from a throwaway "burner" wallet:
 *   1. a fake airdrop token named "FREE SKR - claim at fake-claim.example" (worthless, 1 unit sent to you)
 *   2. the burner's address, which the in-app demo button approves as a tiny "permission" on one of your tokens
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/demo-setup.ts            # step 1: creates the burner, tells you what to fund
 *   npx tsx --env-file=.env.local scripts/demo-setup.ts <YOUR_WALLET>   # step 2: mints and sends the fake token
 *
 * The burner key lives in scripts/.burner.json (gitignored). It only ever holds ~0.02 SOL.
 */
import fs from 'node:fs'
import path from 'node:path'
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
  tokenMetadataInitializeWithRentTransfer,
} from '@solana/spl-token'

const BURNER_FILE = path.join(import.meta.dirname, '.burner.json')
const NAME = 'FREE SKR - claim at fake-claim.example'
const SYMBOL = 'FREESKR'
const URI = 'https://fake-claim.example/free-skr-claim.json'
const NEEDED = 0.02

const rpcUrl = process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : 'https://api.mainnet-beta.solana.com'
const connection = new Connection(rpcUrl, 'confirmed')

function loadBurner(): Keypair {
  if (fs.existsSync(BURNER_FILE)) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(BURNER_FILE, 'utf8'))))
  const kp = Keypair.generate()
  fs.writeFileSync(BURNER_FILE, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 })
  return kp
}

async function main() {
  const burner = loadBurner()
  const target = process.argv[2]
  const balance = (await connection.getBalance(burner.publicKey)) / LAMPORTS_PER_SOL
  console.log(`Burner wallet: ${burner.publicKey.toBase58()}`)
  console.log(`Burner balance: ${balance} SOL`)
  console.log(`\nFor the in-app demo button, put this in .env.local and restart:\n  VITE_DEMO_MODE=true\n  VITE_DEMO_DELEGATE=${burner.publicKey.toBase58()}\n`)

  if (!target) {
    if (balance < NEEDED) console.log(`Next: send ${NEEDED} SOL to the burner from your Seeker, then run again with your wallet address.`)
    else console.log('Funded. Run again with your wallet address to create and send the fake token.')
    return
  }
  const owner = new PublicKey(target)
  if (balance < NEEDED) throw new Error(`Burner needs ${NEEDED} SOL first.`)

  // Token-2022 mint with on-chain metadata, so wallets and our scanner see the spammy name.
  const mint = Keypair.generate()
  const mintLen = getMintLen([ExtensionType.MetadataPointer])
  const rent = await connection.getMinimumBalanceForRentExemption(mintLen)
  const tx = new Transaction().add(
    SystemProgram.createAccount({ fromPubkey: burner.publicKey, newAccountPubkey: mint.publicKey, space: mintLen, lamports: rent, programId: TOKEN_2022_PROGRAM_ID }),
    createInitializeMetadataPointerInstruction(mint.publicKey, burner.publicKey, mint.publicKey, TOKEN_2022_PROGRAM_ID),
    createInitializeMintInstruction(mint.publicKey, 0, burner.publicKey, null, TOKEN_2022_PROGRAM_ID),
  )
  await sendAndConfirmTransaction(connection, tx, [burner, mint])
  await tokenMetadataInitializeWithRentTransfer(connection, burner, mint.publicKey, burner.publicKey, burner, NAME, SYMBOL, URI, [], undefined, TOKEN_2022_PROGRAM_ID)

  const ata = getAssociatedTokenAddressSync(mint.publicKey, owner, false, TOKEN_2022_PROGRAM_ID)
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(burner.publicKey, ata, owner, mint.publicKey, TOKEN_2022_PROGRAM_ID),
      createMintToInstruction(mint.publicKey, ata, burner.publicKey, 1, [], TOKEN_2022_PROGRAM_ID),
    ),
    [burner],
  )
  console.log(`\nSent 1 ${SYMBOL} (mint ${mint.publicKey.toBase58()}) to ${target}.`)
  console.log('Open Seeker Shield and tap "Scan again": it should show up as Suspicious.')
}

main().catch((e) => {
  console.error(e.message ?? e)
  process.exit(1)
})
