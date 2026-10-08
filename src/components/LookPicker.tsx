import { useState } from 'react'
import { Lock } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { OUTFITS, type OutfitId } from '@/lib/outfits'
import { useSession } from '@/lib/wallet'
import { Button } from './Button'
import { Wardy } from './Wardy'

/** Pick Wardy's look, once. Shown right after adopting him. */
export function LookPicker({ onChosen }: { onChosen: (id: OutfitId) => void }) {
  const { verified } = useSession()
  const [pick, setPick] = useState<OutfitId>('classic')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const choose = async () => {
    setBusy(true)
    setError(null)
    try {
      await api.post('/api/wardy/outfit', { outfit: pick })
      onChosen(pick)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Wardy mood="excited" size={96} outfit={pick} />
      </div>
      <ul className="grid grid-cols-4 gap-2">
        {OUTFITS.map((o) => {
          const open = !o.seekerOnly || verified
          return (
            <li key={o.id}>
              <button
                onClick={() => open && setPick(o.id)}
                aria-pressed={pick === o.id}
                aria-label={open ? o.name : `${o.name}, Seeker owners only`}
                className={cn(
                  'flex w-full flex-col items-center gap-1 rounded-chip border p-2 transition-colors duration-fast',
                  pick === o.id ? 'border-safe bg-safe/[.08]' : 'border-border active:bg-surface-2',
                  !open && 'opacity-40',
                )}
              >
                <Wardy mood="happy" size={40} outfit={o.id} grey={!open} />
                <span className="flex items-center gap-0.5 text-caption leading-tight text-text-secondary">
                  {!open && <Lock size={10} aria-hidden />} {o.name}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <Button className="w-full" onClick={choose} loading={busy}>
        This is his look
      </Button>
      <p className="text-center text-caption text-text-muted">You choose once. It’s his for good.</p>
      {error && <p className="text-center text-body-sm text-critical">{error}</p>}
    </div>
  )
}
