import { useState } from 'react'
import { Fingerprint, MessageSquareText, ScanSearch } from 'lucide-react'
import { WardyStage } from './WardyStage'
import { ADOPT_PRICE_SKR } from '../../api/_lib/constants'

export const PENDING_ADOPT = 'wardy.pendingAdopt'
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

  // Unlocking needs the wallet first; the Scan page opens the adopt sheet once it's connected.
  const onUnlock = () => {
    try {
      sessionStorage.setItem(PENDING_ADOPT, '1')
    } catch {
      // Without storage the user just taps Unlock again after connecting.
    }
    onConnect()
  }

  return (
    <section className="space-y-5 pt-4">
      <h1 className="text-center text-heading font-semibold">Meet Wardy, your wallet’s guard</h1>

      <WardyStage locked mood="sleepy" line="" state={null} onUnlock={onUnlock} unlocking={connecting} unlockPrice={ADOPT_PRICE_SKR} />
      {error && <p className="text-center text-body-sm text-critical">{error}</p>}

      <ul className="flex justify-center gap-5 text-caption text-text-secondary">
        {[
          { icon: ScanSearch, label: 'Patrol' },
          { icon: MessageSquareText, label: 'Explain' },
          { icon: Fingerprint, label: 'Fix' },
        ].map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-1.5">
            <Icon size={16} className="text-safe" aria-hidden /> {label}
          </li>
        ))}
      </ul>

      <div className="space-y-1 text-center">
        <Button variant="ghost" className="w-full" onClick={onConnect}>
          Scan my wallet for free
        </Button>
        <p className="text-caption text-text-muted">Wardy can’t move your funds or see your seed phrase.</p>
      </div>

      <div className="text-center">
        {!showLookup ? (
          <button className="min-h-tap text-body-sm text-text-muted underline underline-offset-4" onClick={() => setShowLookup(true)}>
            Check a friend’s wallet
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
              Their Solana wallet address (read-only)
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
              Check this wallet
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
            No wallet app found on this device. Open Wardy on your Seeker or another Android phone, in the app or in Chrome, to connect your wallet.
          </p>
        )}
      </Sheet>
    </section>
  )
}
