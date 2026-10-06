import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

/** Bottom sheet: the one surface with a shadow, per the design system. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-bg/70" style={{ animation: 'fade-in 150ms ease-out' }} onClick={onClose} />
      <div
        className="relative max-h-[85vh] overflow-y-auto rounded-t-sheet border-t border-border bg-surface-2 px-4 pt-4 shadow-sheet"
        style={{ animation: 'sheet-up 250ms cubic-bezier(0.16, 1, 0.3, 1)', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="pt-3 text-title font-semibold">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="-mr-2 flex min-h-tap min-w-tap items-center justify-center rounded-card text-text-secondary active:bg-surface-1">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
