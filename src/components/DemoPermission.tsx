import { useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { ComputeBudgetProgram, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, createApproveCheckedInstruction } from '@solana/spl-token'
import { confirmSignature, explainSimError } from '@/lib/fixes'
import { short } from '@/lib/format'
import { friendlyWalletError } from '@/lib/wallet'
import { Button } from './Button'
import { Sheet } from './Sheet'

const DELEGATE = import.meta.env.VITE_DEMO_DELEGATE as string | undefined
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' && !!DELEGATE

/**
 * DEMO ONLY (VITE_DEMO_MODE=true): approves our own burner wallet to move 1 base unit of a token you hold,
 * so the scanner has a real permission to find and revoke on camera. Never shown in normal builds.
 */
export function DemoPermission({ onDone }: { onDone: () => void }) {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  if (!DEMO_MODE || !publicKey) return null

  const run = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID })
      const pick = res.value
        .map((a) => ({ pubkey: a.pubkey, info: a.account.data.parsed.info }))
        .filter((a) => BigInt(a.info.tokenAmount.amount) > 1n && !a.info.delegate)
        .sort((a, b) => Number(b.info.tokenAmount.decimals) - Number(a.info.tokenAmount.decimals))[0]
      if (!pick) throw new Error('Hold a little of any classic SPL token (e.g. USDC) first.')
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      const tx = new VersionedTransaction(
        new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash: blockhash,
          instructions: [
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 20_000 }),
            createApproveCheckedInstruction(pick.pubkey, new PublicKey(pick.info.mint), new PublicKey(DELEGATE!), publicKey, 1n, pick.info.tokenAmount.decimals),
          ],
        }).compileToV0Message(),
      )
      const sim = await connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true })
      if (sim.value.err) throw new Error(explainSimError(sim.value.err, sim.value.logs ?? []))
      const sig = await sendTransaction(tx, connection)
      await confirmSignature(connection, sig, lastValidBlockHeight)
      setOpen(false)
      onDone()
    } catch (e) {
      const m = (e as Error).message
      setMsg(/cancel|reject|declin/i.test(m) ? friendlyWalletError(e) : m)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="w-full border border-dashed border-border" onClick={() => setOpen(true)}>
        Demo: create a test permission
      </Button>
      <Sheet open={open} onClose={() => !busy && setOpen(false)} title="Create a test permission?">
        <div className="space-y-4">
          <p className="text-body">
            Demo only. This lets your own test wallet <span className="font-mono">{short(DELEGATE!)}</span> move the smallest possible unit of one token you hold.
          </p>
          <p className="text-body-sm text-text-secondary">Shield will then find it, and you can revoke it with one tap.</p>
          {msg && <p className="text-body-sm text-critical">{msg}</p>}
          <Button className="w-full" onClick={run} loading={busy}>
            Approve test permission
          </Button>
        </div>
      </Sheet>
    </>
  )
}
