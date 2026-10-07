import { useState } from 'react'
import { Fingerprint, MessageSquareText, ScanSearch } from 'lucide-react'
import { Wardy } from './Wardy'
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
        <Wardy mood="happy" size={64} />
        <h1 className="text-heading font-semibold">Your keys are safe. Is your wallet?</h1>
        <p className="text-body text-text-secondary">
          Meet Wardy. He finds what drainers use and fixes it with your fingerprint.
        </p>
      </div>

      <ol className="space-y-3">
        {[
          { icon: ScanSearch, title: 'Patrol', text: 'He checks your wallet.' },
          { icon: MessageSquareText, title: 'Explain', text: 'In plain English.' },
          { icon: Fingerprint, title: 'Fix', text: 'One tap, one fingerprint.' },
        ].map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-safe/[.14] text-safe">
              <Icon size={20} aria-hidden />
            </span>
            <p className="text-body-sm">
              <span className="font-medium text-text-primary">
                {i + 1}. {title}:
              </span>{' '}
              <span className="text-text-secondary">{text}</span>
            </p>
          </li>
        ))}
      </ol>

      <div className="space-y-3">
        <Button className="w-full" onClick={onConnect} loading={connecting}>
          Scan my wallet
        </Button>
        {error && <p className="text-body-sm text-critical">{error}</p>}
        <p className="text-caption text-text-muted">Free. Wardy can’t move your funds or see your seed phrase.</p>
      </div>

      <div>
        {!showLookup ? (
          <button className="min-h-tap text-body-sm text-text-secondary underline underline-offset-4" onClick={() => setShowLookup(true)}>
            Check a friend’s wallet instead
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
