import { Button } from './Button'
import { Sheet } from './Sheet'
import type { Finding } from '../../api/_lib/types'
import { amount } from '@/lib/format'

/** The second, explicit confirmation burning requires. Names the token and says it's permanent. */
export function BurnSheet({ finding, onCancel, onConfirm }: { finding: Finding | null; onCancel: () => void; onConfirm: (f: Finding) => void }) {
  const name = finding ? finding.symbol || finding.name || 'this token' : ''
  return (
    <Sheet open={!!finding} onClose={onCancel} title="Destroy this fake token?">
      {finding && (
        <div className="space-y-4">
          <p className="text-body">
            This permanently destroys <span className="font-semibold">{amount(finding.uiAmount)} {name}</span> and gives you back the SOL its account holds.
          </p>
          <p className="text-body-sm text-text-secondary">This can’t be undone. If you only want it out of sight, Hide is free and reversible.</p>
          <p className="break-all rounded-chip bg-surface-1 p-3 font-mono text-caption text-text-muted">Mint {finding.mint}</p>
          <div className="flex flex-col gap-2">
            <Button variant="destructive" onClick={() => onConfirm(finding)}>
              Destroy {name.length > 16 ? `${name.slice(0, 15)}…` : name} forever
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
