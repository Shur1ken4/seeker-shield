import { useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { BadgeCheck, Check, Fingerprint } from 'lucide-react'
import { api } from '@/lib/api'
import { confirmSignature } from '@/lib/fixes'
import { buildProPayment, type ProInfo } from '@/lib/pro'
import { friendlyWalletError, useSession } from '@/lib/wallet'
import { Button } from './Button'
import { Sheet } from './Sheet'
import { Spinner } from './Spinner'

type Step = 'info' | 'review' | 'paying' | 'verifying' | 'done'

const BENEFITS = ['Instant alerts, not a daily digest', 'Watch up to 5 friends’ wallets', 'Score history']

export function ProSheet({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged: () => void }) {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const { hasSession, verified } = useSession()
  const [info, setInfo] = useState<ProInfo | null>(null)
  const [step, setStep] = useState<Step>('info')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [built, setBuilt] = useState<Awaited<ReturnType<typeof buildProPayment>> | null>(null)
  const [until, setUntil] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    setStep('info')
    setError(null)
    api.get<ProInfo>('/api/pro/info').then(setInfo).catch((e) => setError(e.message))
  }, [open, hasSession])

  const prepare = async () => {
    if (!publicKey || !info) return
    setBusy(true)
    setError(null)
    try {
      setBuilt(await buildProPayment(connection, publicKey, info))
      setStep('review')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const pay = async () => {
    if (!built) return
    setStep('paying')
    setError(null)
    try {
      const sig = await sendTransaction(built.tx, connection, { maxRetries: 3 })
      setStep('verifying')
      await confirmSignature(connection, sig, built.lastValidBlockHeight)
      // The server re-checks the payment on-chain before turning Pro on.
      let res: { proUntil: number } | null = null
      for (let i = 0; i < 5 && !res; i++) {
        try {
          res = await api.post<{ proUntil: number }>('/api/pro/verify', { signature: sig })
        } catch (e) {
          if (i === 4) throw e
          await new Promise((r) => setTimeout(r, 2000))
        }
      }
      setUntil(res!.proUntil)
      setStep('done')
      onChanged()
    } catch (e) {
      const msg = (e as Error).message
      setError(/wallet|cancel|reject|declin/i.test(msg) ? friendlyWalletError(e) : msg)
      setStep('review')
    }
  }

  const claimFree = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await api.post<{ proUntil: number }>('/api/pro/claim-free')
      setUntil(r.proUntil)
      setStep('done')
      onChanged()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const fmt = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <Sheet open={open} onClose={() => step !== 'paying' && step !== 'verifying' && onClose()} title={step === 'done' ? 'Wardy Pro is on' : 'Wardy Pro'}>
      {!info && !error && (
        <div className="flex items-center gap-3 py-6 text-body-sm text-text-secondary">
          <Spinner /> Loading…
        </div>
      )}

      {info && step === 'info' && (
        <div className="space-y-4">
          <p className="text-body">
            <span className="text-heading font-semibold">{info.priceSkr} SKR</span>
            <span className="text-text-secondary"> for {info.days} days</span>
          </p>
          <ul className="space-y-2">
            {BENEFITS.map((b) => (
              <li key={b} className="flex gap-2 text-body-sm">
                <Check size={18} className="shrink-0 text-safe" aria-hidden /> {b}
              </li>
            ))}
          </ul>
          <p className="text-caption text-text-muted">Scans and fixes stay free.</p>
          {info.proUntil && <p className="text-body-sm text-safe">Pro is active until {fmt(info.proUntil)}. Paying adds {info.days} days.</p>}
          {!hasSession ? (
            <p className="text-body-sm text-text-secondary">Verify your wallet on the Watch or Profile tab first.</p>
          ) : (
            <div className="space-y-2">
              {info.freeMonthAvailable && verified && (
                <Button className="w-full" onClick={claimFree} loading={busy}>
                  <BadgeCheck size={20} aria-hidden /> Claim free month (Seeker Verified)
                </Button>
              )}
              <Button className="w-full" variant={info.freeMonthAvailable && verified ? 'secondary' : 'primary'} onClick={prepare} loading={busy} disabled={!info.treasury}>
                Unlock with SKR
              </Button>
              {!info.treasury && <p className="text-caption text-text-muted">SKR payments open soon.</p>}
            </div>
          )}
        </div>
      )}

      {info && step === 'review' && (
        <div className="space-y-4">
          <p className="text-body">
            This sends <span className="font-semibold">{info.priceSkr} SKR</span> from your wallet to the Wardy treasury and turns on Pro for {info.days} days.
          </p>
          <p className="break-all font-mono text-caption text-text-muted">Treasury {info.treasury}</p>
          <p className="text-caption text-text-muted">Test-run on the network first: it passed. Network fee under 0.0001 SOL. No other tokens are touched.</p>
          <Button className="w-full" onClick={pay}>
            <Fingerprint size={20} aria-hidden /> Pay with fingerprint
          </Button>
          <Button className="w-full" variant="ghost" onClick={() => setStep('info')}>
            Back
          </Button>
        </div>
      )}

      {(step === 'paying' || step === 'verifying') && (
        <div className="flex items-center gap-3 py-6 text-body-sm text-text-secondary">
          <Spinner /> {step === 'paying' ? 'Approve in your wallet…' : 'Checking the payment on-chain…'}
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-body text-safe">
            <Check size={22} aria-hidden /> Pro is active{until ? ` until ${fmt(until)}` : ''}.
          </p>
          <p className="text-body-sm text-text-secondary">Alerts are now instant, and you can watch up to 5 wallets.</p>
          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      )}

      {error && <p className="mt-3 text-body-sm text-critical">{error}</p>}
    </Sheet>
  )
}
