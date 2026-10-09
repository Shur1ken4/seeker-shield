import { useState } from 'react'
import { Play } from 'lucide-react'
import { WardyStage } from './WardyStage'
import { ADOPT_PRICE_SKR } from '../../api/_lib/constants'

export const PENDING_ADOPT = 'wardy.pendingAdopt'
import { useConnectWallet } from '@/lib/wallet'
import { Button } from './Button'
import { Sheet } from './Sheet'

export function ConnectHero({ onLookup, onShowIntro }: { onLookup: (address: string) => void; onShowIntro?: () => void }) {
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
    <section className="space-y-6 pt-6">
      <div className="space-y-2 text-center">
        <h1 className="text-heading font-semibold">Keep your Seeker wallet safe</h1>
        <p className="text-body text-text-secondary">Wardy finds risky app access, fake tokens and stuck SOL, and fixes them with one tap.</p>
        {onShowIntro && (
          <button onClick={onShowIntro} className="mx-auto inline-flex min-h-tap items-center gap-2 rounded-full border border-border px-4 text-body-sm text-text-secondary active:bg-surface-2">
            <Play size={14} className="fill-current text-safe" aria-hidden /> How Wardy works · 15s
          </button>
        )}
      </div>

      <div className="space-y-2 text-center">
        <Button className="w-full" onClick={onConnect} loading={connecting}>
          Scan my wallet for free
        </Button>
        {error && <p className="text-body-sm text-critical">{error}</p>}
        <p className="text-caption text-text-muted">Wardy can’t move your funds or see your seed phrase.</p>
      </div>

      <div className="space-y-2">
        <p className="text-center text-body-sm font-medium text-text-secondary">Meet Wardy, your wallet’s guard</p>
        <WardyStage compact locked mood="sleepy" line="" state={null} onUnlock={onUnlock} unlockPrice={ADOPT_PRICE_SKR} />
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
