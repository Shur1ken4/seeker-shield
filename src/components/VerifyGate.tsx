import { useState, type ReactNode } from 'react'
import { BadgeCheck } from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useSession } from '@/lib/wallet'
import { Button } from './Button'
import { EmptyState } from './EmptyState'

/** Features tied to "your" wallet (alerts, Pro) need a free signature first. Scanning never does. */
export function VerifyGate({ children, why, onGoToScan }: { children: ReactNode; why: string; onGoToScan: () => void }) {
  const { publicKey } = useWallet()
  const { hasSession, signIn, signingIn } = useSession()
  const [error, setError] = useState<string | null>(null)
  if (!publicKey) {
    return <EmptyState title="Connect your wallet first" body={why} action={<Button onClick={onGoToScan}>Go to Scan</Button>} />
  }
  if (!hasSession) {
    return (
      <EmptyState
        icon={<BadgeCheck size={28} aria-hidden />}
        title="Verify it’s your wallet"
        body={`${why} Sign a free message to prove you own this wallet. It sends no transaction and gives no permissions.`}
        action={
          <div className="space-y-2">
            <Button
              onClick={() => signIn().catch((e) => setError((e as Error).message))}
              loading={signingIn}
            >
              Verify wallet
            </Button>
            {error && <p className="text-body-sm text-critical">{error}</p>}
          </div>
        }
      />
    )
  }
  return <>{children}</>
}
