import type { ReactNode } from 'react'

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-surface-1 p-6">
      {icon && <div className="mb-3 text-safe">{icon}</div>}
      <h3 className="text-title font-semibold">{title}</h3>
      <p className="mt-1 text-body-sm text-text-secondary">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
