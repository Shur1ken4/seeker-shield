import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useConnectWallet } from '@/lib/wallet'
import { Button } from './Button'
import { Sheet } from './Sheet'

export function ConnectHero({ onLookup }: { onLookup: (address: string) => void }) {
  const { options, preferred, connectWith, connecting, error } = useConnectWallet()
  const [picker, setPicker] = useState(false)
  const [addr, setAddr] = useState('')
  const [showLookup, setShowLookup] = useState(false)
  const validAddr = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr.trim())

  const onConnect = () => {
    if (preferred) connectWith(preferred.adapter.name)
    else setPicker(true)
  }

  return (
    <section className="space-y-8 pt-8">
      <div className="space-y-3">
        <ShieldCheck size={40} strokeWidth={1.5} className="text-safe" aria-hidden />
        <h1 className="text-heading font-semibold">Your keys are safe. Are your approvals?</h1>
        <p className="text-body text-text-secondary">
          Seeker Shield checks your wallet for risky permissions, spam tokens and clutter, explains each one in plain English, and fixes it with one fingerprint.
        </p>
      </div>
      <div className="space-y-3">
        <Button className="w-full" onClick={onConnect} loading={connecting}>
          Connect wallet
        </Button>
        {error && <p className="text-body-sm text-critical">{error}</p>}
        <p className="text-caption text-text-muted">Scanning is read-only. Nothing is signed until you tap a fix.</p>
      </div>

      <div>
        {!showLookup ? (
          <button className="min-h-tap text-body-sm text-text-secondary underline underline-offset-4" onClick={() => setShowLookup(true)}>
            Check any address instead
          </button>
        ) : (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (validAddr) onLookup(addr.trim())
            }}
          >
            <label htmlFor="lookup" className="text-body-sm text-text-secondary">
              Wallet address
            </label>
            <input
              id="lookup"
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Paste a Solana address"
              className="min-h-tap w-full rounded-card border border-border bg-surface-2 px-3 font-mono text-body-sm text-text-primary placeholder:text-text-muted focus:border-safe focus:outline-none"
            />
            <Button type="submit" variant="secondary" className="w-full" disabled={!validAddr}>
              Check address
            </Button>
          </form>
        )}
      </div>

      <Sheet open={picker} onClose={() => setPicker(false)} title="Choose a wallet">
        {options.length ? (
          <ul className="space-y-2">
            {options.map((w) => (
              <li key={w.adapter.name}>
                <button
                  className="flex min-h-tap w-full items-center gap-3 rounded-card border border-border bg-surface-1 px-3 text-left active:bg-surface-2"
                  onClick={() => {
                    setPicker(false)
                    connectWith(w.adapter.name)
                  }}
                >
                  <img src={w.adapter.icon} alt="" className="h-6 w-6" />
                  {w.adapter.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-sm text-text-secondary">
            No wallet found here. Open Seeker Shield on your Seeker (in the app or in Chrome) to connect the Seed Vault Wallet.
          </p>
        )}
      </Sheet>
    </section>
  )
}
