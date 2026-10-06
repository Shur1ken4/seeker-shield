import { useCallback, useEffect, useRef, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Check, Fingerprint } from 'lucide-react'
import { api } from '@/lib/api'
import { confirmSignature, describePlan, planFixes, type FixItem, type FixPlan } from '@/lib/fixes'
import { sol } from '@/lib/format'
import { friendlyWalletError } from '@/lib/wallet'
import { Button } from './Button'
import { Sheet } from './Sheet'
import { Spinner } from './Spinner'

type Step = 'planning' | 'review' | 'signing' | 'sending' | 'done' | 'error'

export interface FixResult {
  fixedIds: string[]
  reclaimedLamports: number
}

const PLAN_MAX_AGE_MS = 45_000

/** The plain-English summary sheet shown before every fingerprint prompt (CLAUDE.md safety rule). */
export function FixSheet({ items, onClose, onDone }: { items: FixItem[] | null; onClose: () => void; onDone: (r: FixResult) => void }) {
  const { connection } = useConnection()
  const { publicKey, signAllTransactions, sendTransaction } = useWallet()
  const [step, setStep] = useState<Step>('planning')
  const [plan, setPlan] = useState<FixPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const plannedAt = useRef(0)
  const result = useRef<FixResult>({ fixedIds: [], reclaimedLamports: 0 })

  const makePlan = useCallback(async () => {
    if (!items || !publicKey) return null
    setStep('planning')
    setError(null)
    try {
      const p = await planFixes(connection, publicKey, items)
      plannedAt.current = Date.now()
      setPlan(p)
      setStep('review')
      return p
    } catch (e) {
      setError((e as Error).message || 'Couldn’t prepare the fix. Please try again.')
      setStep('error')
      return null
    }
  }, [items, publicKey, connection])

  useEffect(() => {
    if (items) {
      result.current = { fixedIds: [], reclaimedLamports: 0 }
      makePlan()
    }
  }, [items, makePlan])

  const confirm = async () => {
    if (!publicKey) return
    // Blockhashes expire after about a minute; rebuild (and re-simulate) a stale plan.
    let p = plan
    if (!p || Date.now() - plannedAt.current > PLAN_MAX_AGE_MS) p = await makePlan()
    if (!p || !p.ready.length) return
    setProgress({ done: 0, total: p.ready.length })
    setStep('signing')
    try {
      const owner = publicKey.toBase58()
      const record = async (signature: string, idx: number) => {
        const r = p!.ready[idx]
        await confirmSignature(connection, signature, r.lastValidBlockHeight)
        result.current.fixedIds.push(...r.items.map((i) => i.finding.id))
        result.current.reclaimedLamports += r.items.filter((i) => i.action !== 'revoke').reduce((s, i) => s + i.finding.rentLamports, 0)
        setProgress((x) => ({ ...x, done: x.done + 1 }))
        api.post('/api/fixes/record', { owner, signature }).catch(() => {})
      }
      if (signAllTransactions) {
        // One wallet approval for the whole batch.
        const signed = await signAllTransactions(p.ready.map((r) => r.tx))
        setStep('sending')
        for (let i = 0; i < signed.length; i++) {
          const sig = await connection.sendRawTransaction(signed[i].serialize(), { maxRetries: 3 })
          await record(sig, i)
        }
      } else {
        for (let i = 0; i < p.ready.length; i++) {
          const sig = await sendTransaction(p.ready[i].tx, connection, { maxRetries: 3 })
          setStep('sending')
          await record(sig, i)
        }
      }
      setStep('done')
      onDone(result.current)
    } catch (e) {
      const msg = String((e as Error)?.message ?? e)
      setError(/network|expired|waiting|rejected the transaction/i.test(msg) ? msg : friendlyWalletError(e))
      setStep('error')
      if (result.current.fixedIds.length) onDone(result.current)
    }
  }

  const close = () => {
    if (step === 'signing' || step === 'sending') return
    setPlan(null)
    onClose()
  }

  return (
    <Sheet open={!!items} onClose={close} title={step === 'done' ? 'Done' : 'Review the fix'}>
      {step === 'planning' && (
        <div className="flex items-center gap-3 py-6 text-body-sm text-text-secondary">
          <Spinner /> Preparing and test-running the transaction…
        </div>
      )}

      {step === 'review' && plan && (
        <div className="space-y-4">
          <p className="text-body">{describePlan(plan)}</p>
          {plan.reclaimLamports > 0 && <p className="text-body-sm text-safe">You’ll get back about {sol(plan.reclaimLamports)}.</p>}
          <ul className="space-y-1 text-body-sm text-text-secondary">
            {plan.ready.flatMap((r) => r.items).map((i) => (
              <li key={i.finding.id} className="flex justify-between gap-3">
                <span className="truncate">{actionLabel(i)} {i.finding.symbol || i.finding.name || 'token'}</span>
                {i.action !== 'revoke' && <span className="shrink-0 font-mono text-caption">+{sol(i.finding.rentLamports)}</span>}
              </li>
            ))}
          </ul>
          {plan.skipped.length > 0 && (
            <div className="rounded-chip bg-warning/[.14] p-3 text-body-sm">
              <p className="font-medium text-warning">Skipped {plan.skipped.length}</p>
              <ul className="mt-1 space-y-1 text-text-secondary">
                {plan.skipped.map((s) => (
                  <li key={s.item.finding.id}>
                    {s.item.finding.symbol || s.item.finding.name || 'Token'}: {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-caption text-text-muted">
            Every change was test-run on the network first. Network fee about {sol(plan.feeLamports)}.
            {plan.ready.length > 1 ? ` ${plan.ready.length} transactions.` : ''} Your tokens are not moved.
          </p>
          {/* Sign button only exists when at least one transaction passed simulation. */}
          {plan.ready.length > 0 ? (
            <Button className="w-full" onClick={confirm}>
              <Fingerprint size={20} aria-hidden /> Confirm with fingerprint
            </Button>
          ) : (
            <Button className="w-full" variant="secondary" onClick={close}>
              Close
            </Button>
          )}
        </div>
      )}

      {(step === 'signing' || step === 'sending') && (
        <div className="flex items-center gap-3 py-6 text-body-sm text-text-secondary">
          <Spinner />
          {step === 'signing' ? 'Approve in your wallet…' : `Confirming on the network… ${progress.done}/${progress.total}`}
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 text-safe">
            <Check size={24} aria-hidden />
            <p className="text-body font-medium">Fixed {result.current.fixedIds.length} item{result.current.fixedIds.length === 1 ? '' : 's'}.</p>
          </div>
          {result.current.reclaimedLamports > 0 && <p className="text-body-sm text-text-secondary">{sol(result.current.reclaimedLamports)} is back in your wallet.</p>}
          <Button className="w-full" onClick={close}>
            Done
          </Button>
        </div>
      )}

      {step === 'error' && (
        <div className="space-y-4 py-2">
          <p className="text-body-sm text-critical">{error}</p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={close}>
              Close
            </Button>
            <Button className="flex-1" onClick={makePlan}>
              Try again
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}

function actionLabel(i: FixItem) {
  return i.action === 'revoke' ? 'Revoke permission on' : i.action === 'close' ? 'Close empty' : 'Burn and close'
}
