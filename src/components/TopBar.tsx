import type { ReactNode } from 'react'

export function TopBar({ right }: { right?: ReactNode }) {
  return (
    <header className="flex min-h-[56px] items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 120 140" width="20" height="24" aria-hidden>
          <path d="M60 0C44 10 26 16 0 16V64C0 104 28 126 60 140C92 126 120 104 120 64V16C94 16 76 10 60 0Z" className="fill-safe" />
          <ellipse cx="41" cy="66" rx="11" ry="15" className="fill-bg" />
          <ellipse cx="79" cy="66" rx="11" ry="15" className="fill-bg" />
        </svg>
        <span className="font-brand text-title font-extrabold tracking-tight">wardy</span>
      </div>
      {right}
    </header>
  )
}
