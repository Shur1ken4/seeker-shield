import type { ReactNode } from 'react'

export function TopBar({ right }: { right?: ReactNode }) {
  return (
    <header className="flex min-h-[56px] items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <img src="/icons/icon-192.png" alt="" className="h-6 w-6 rounded-chip" />
        <span className="text-body font-semibold">Seeker Shield</span>
      </div>
      {right}
    </header>
  )
}
