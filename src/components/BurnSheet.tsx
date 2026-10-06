import { Button } from './Button'
import { Sheet } from './Sheet'
import type { Finding } from '../../api/_lib/types'
import { amount } from '@/lib/format'

/** The second, explicit confirmation burning requires. Names the token and says it's permanent. */
export function BurnSheet({ finding, onCancel, onConfirm }: { finding: Finding | null; onCancel: () => void; onConfirm: (f: Finding) => void }) {
  const name = finding ? finding.symbol || finding.name || 'this token' : ''
  return (
    <Sheet open={!!finding} onClose={onCancel} title="Burn this token?">
      {finding && (
        <div className="space-y-4">
          <p className="text-body">
            You’re about to permanently destroy <span className="font-semibold">{amount(finding.uiAmount)} {name}</span> and close its account.
          </p>
          <p className="text-body-sm text-text-secondary">This can’t be undone. If you just want it out of sight, hiding it is safer and free.</p>
          <p className="break-all rounded-chip bg-surface-1 p-3 font-mono text-caption text-text-muted">Mint {finding.mint}</p>
          <div className="flex flex-col gap-2">
            <Button variant="destructive" onClick={() => onConfirm(finding)}>
              Burn {name.length > 16 ? `${name.slice(0, 15)}…` : name} forever
            </Button>
            <Button variant="secondary" onClick={onCancel}>
              Keep it
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
