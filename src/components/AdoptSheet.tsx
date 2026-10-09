import { useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Fingerprint } from 'lucide-react'
import { api } from '@/lib/api'
import { confirmSignature } from '@/lib/fixes'
import { buildProPayment, buildSolPayment, type ProInfo } from '@/lib/pro'
import { UNLOCK_BENEFITS, UNLOCK_SKR, UNLOCK_SOL } from '@/lib/price'
import { friendlyWalletError, useSession } from '@/lib/wallet'
import { Button } from './Button'
import { Sheet } from './Sheet'
import { Spinner } from './Spinner'
import { Wardy } from './Wardy'
import { LookPicker } from './LookPicker'

type Step = 'info' | 'paying' | 'verifying' | 'done'
type Currency = 'sol' | 'skr'

/** One-time "Unlock Wardy", everything included. Paid in SOL by default, or SKR. */
export function AdoptSheet({ open, onClose, onAdopted, onLookChosen }: { open: boolean; onClose: () => void; onAdopted: () => void; onLookChosen?: () => void }) {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const { hasSession, signIn } = useSession()
  const [info, setInfo] = useState<ProInfo | null>(null)
  const [step, setStep] = useState<Step>('info')
  const [currency, setCurrency] = useState<Currency>('sol')
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
      // The unlock is credited to the wallet that proved ownership: sign in first, from this tap.
      if (!hasSession) await signIn()
      if (info.testMode) {
        // No payment in test mode; the server only allows this while PAYMENTS_TEST_MODE is on.
        await api.post('/api/pro/test-unlock')
        setStep('done')
        onAdopted()
        return
      }
      // Build and test-run the payment first; only then ask for the fingerprint.
      const built = currency === 'sol' ? await buildSolPayment(connection, publicKey, info) : await buildProPayment(connection, publicKey, info)
      setStep('paying')
      const sig = await sendTransaction(built.tx, connection, { maxRetries: 3 })
      setStep('verifying')
      await confirmSignature(connection, sig, built.lastValidBlockHeight)
      for (let i = 0; i < 5; i++) {
        try {
          await api.post('/api/pro/verify', { signature: sig, currency })
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

  const price = currency === 'sol' ? UNLOCK_SOL : UNLOCK_SKR
  const usd = info?.adoptPriceUsd ? `≈ $${info.adoptPriceUsd.toFixed(2)}` : '≈ $0.90'

  return (
    <Sheet open={open} onClose={() => step !== 'paying' && step !== 'verifying' && onClose()} title={step === 'done' ? 'Wardy is yours!' : 'Unlock Wardy'}>
      <div className="space-y-4">
        {step !== 'done' && (
          <div className="flex justify-center py-1">
            <Wardy mood={step === 'info' ? 'excited' : 'eating'} size={76} />
          </div>
        )}

        {step === 'info' && (
          <>
            <div className="text-center">
              <p className="font-mono text-heading font-semibold">{price}</p>
              <p className="text-caption text-text-muted">{usd} · once, no subscription</p>
            </div>
            <ul className="space-y-2 rounded-card bg-surface-2 p-3 text-body-sm">
              {UNLOCK_BENEFITS.map((b) => (
                <li key={b.text} className="flex items-center gap-2">
                  <span aria-hidden>{b.emoji}</span> {b.text}
                </li>
              ))}
            </ul>
            <p className="text-center text-caption text-text-muted">Scans and fixes are always free.</p>
            {info?.testMode ? (
              <>
                <Button className="w-full" variant="reward" onClick={adopt} loading={busy}>
                  Unlock free (test mode)
                </Button>
                <p className="text-center text-caption text-warning">Test mode: nothing is charged.</p>
              </>
            ) : (
              <>
                <Button className="w-full" variant="reward" onClick={adopt} loading={busy} disabled={!info?.treasury}>
                  <Fingerprint size={20} aria-hidden /> Unlock for {price}
                </Button>
                {info && !info.treasury && <p className="text-center text-caption text-text-muted">Payments open soon.</p>}
              </>
            )}
            <button
              onClick={() => setCurrency(currency === 'sol' ? 'skr' : 'sol')}
              className="mx-auto block min-h-tap text-body-sm text-text-muted underline underline-offset-4"
            >
              {currency === 'sol' ? `Pay ${UNLOCK_SKR} instead` : `Pay ${UNLOCK_SOL} instead`}
            </button>
          </>
        )}

        {(step === 'paying' || step === 'verifying') && (
          <p className="flex items-center justify-center gap-3 py-2 text-body-sm text-text-secondary">
            <Spinner /> {step === 'paying' ? 'Approve in Seed Vault…' : 'Checking the payment…'}
          </p>
        )}

        {step === 'done' && (
          <>
            <p className="text-center text-body">Choose his look.</p>
            <LookPicker
              onChosen={() => {
                onLookChosen?.()
                onClose()
              }}
            />
          </>
        )}

        {error && <p className="text-center text-body-sm text-critical">{error}</p>}
      </div>
    </Sheet>
  )
}
