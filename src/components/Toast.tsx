import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Kind = 'success' | 'error' | 'info'
interface ToastItem { id: number; kind: Kind; text: string }

const ToastCtx = createContext<(kind: Kind, text: string) => void>(() => {})

export function useToast() {
  return useContext(ToastCtx)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((kind: Kind, text: string) => {
    const id = Date.now() + Math.random()
    setItems((xs) => [...xs, { id, kind, text }])
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4000)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4"
        style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}
        role="status"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto w-full max-w-md rounded-card border px-4 py-3 text-body-sm',
              t.kind === 'success' && 'border-safe/40 bg-surface-2 text-safe',
              t.kind === 'error' && 'border-critical/40 bg-surface-2 text-critical',
              t.kind === 'info' && 'border-border bg-surface-2 text-text-primary',
            )}
            style={{ animation: 'fade-in 150ms ease-out' }}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
