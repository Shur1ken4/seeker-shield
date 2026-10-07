import { useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Check, Fingerprint } from 'lucide-react'
import { api } from '@/lib/api'
import { confirmSignature } from '@/lib/fixes'
import { buildProPayment, type ProInfo } from '@/lib/pro'
import { friendlyWalletError } from '@/lib/wallet'
import { Button } from './Button'
import { Sheet } from './Sheet'
import { Spinner } from './Spinner'
import { Wardy } from './Wardy'

type Step = 'info' | 'paying' | 'verifying' | 'done'

/** One-time "Adopt Wardy": a small SKR payment that unlocks the pet, patrols, streaks and alerts. */
export function AdoptSheet({ open, onClose, onAdopted }: { open: boolean; onClose: () => void; onAdopted: () => void }) {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const [info, setInfo] = useState<ProInfo | null>(null)
  const [step, setStep] = useState<Step>('info')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setStep('info')
    setError(null)
    api.get<ProInfo>('/api/pro/info').then(setInfo).catch((e) => setError(e.message))
  }, [open])

  const adopt = async () => {
    if (!publicKey || !info) return
    setBusy(true)
    setError(null)
    try {
      // Build and test-run the payment first; only then ask for the fingerprint.
      const built = await buildProPayment(connection, publicKey, info, info.adoptPriceSkr)
      setStep('paying')
      const sig = await sendTransaction(built.tx, connection, { maxRetries: 3 })
      setStep('verifying')
      await confirmSignature(connection, sig, built.lastValidBlockHeight)
      for (let i = 0; i < 5; i++) {
        try {
          await api.post('/api/pro/verify', { signature: sig, kind: 'adopt' })
          break
        } catch (e) {
          if (i === 4) throw e
          await new Promise((r) => setTimeout(r, 2000))
        }
      }
      setStep('done')
      onAdopted()
    } catch (e) {
      const msg = (e as Error).message
      setError(/wallet|cancel|reject|declin/i.test(msg) ? friendlyWalletError(e) : msg)
      setStep('info')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={() => step !== 'paying' && step !== 'verifying' && onClose()} title={step === 'done' ? 'Wardy is yours' : 'Adopt Wardy'}>
      <div className="space-y-4">
        <div className="flex justify-center py-2">
          <Wardy mood={step === 'done' ? 'happy' : step === 'info' ? 'calm' : 'eating'} size={80} />
        </div>

        {step === 'info' && (
          <>
            <p className="text-center text-body">
              <span className="font-semibold">{info?.adoptPriceSkr ?? 50} SKR</span>
              <span className="text-text-secondary">, one time</span>
            </p>
            <ul className="space-y-2 text-body-sm">
              {['Daily patrols and streaks', 'Free Pro days every 7-day streak', 'Telegram alerts and friends’ wallets'].map((b) => (
                <li key={b} className="flex gap-2">
                  <Check size={18} className="shrink-0 text-safe" aria-hidden /> {b}
                </li>
              ))}
            </ul>
            <p className="text-center text-caption text-text-muted">Scans and fixes stay free.</p>
            <Button className="w-full" onClick={adopt} loading={busy} disabled={!info?.treasury}>
              <Fingerprint size={20} aria-hidden /> Adopt with fingerprint
            </Button>
            {info && !info.treasury && <p className="text-center text-caption text-text-muted">SKR payments open soon.</p>}
          </>
        )}

        {(step === 'paying' || step === 'verifying') && (
          <p className="flex items-center justify-center gap-3 py-2 text-body-sm text-text-secondary">
            <Spinner /> {step === 'paying' ? 'Approve in Seed Vault…' : 'Checking the payment…'}
          </p>
        )}

        {step === 'done' && (
          <>
            <p className="text-center text-body">He’s on patrol. Come back tomorrow to keep him fed.</p>
            <Button className="w-full" onClick={onClose}>
              Done
            </Button>
          </>
        )}

        {error && <p className="text-center text-body-sm text-critical">{error}</p>}
      </div>
    </Sheet>
  )
}
