import type { ReactNode } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme'

export function TopBar({ right }: { right?: ReactNode }) {
  const { theme, toggle } = useTheme()
  return (
    <header className="flex min-h-[56px] items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 120 140" width="20" height="24" aria-hidden>
          <path d="M60 0C44 10 26 16 0 16V64C0 104 28 126 60 140C92 126 120 104 120 64V16C94 16 76 10 60 0Z" className="fill-safe" />
          <ellipse cx="41" cy="66" rx="11" ry="15" className="fill-ink" />
          <ellipse cx="79" cy="66" rx="11" ry="15" className="fill-ink" />
        </svg>
        <span className="font-brand text-title font-extrabold tracking-tight">wardy</span>
      </div>
      <div className="flex items-center gap-1">
        {right}
        <button
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex min-h-tap min-w-tap items-center justify-center rounded-full text-text-secondary active:bg-surface-2"
        >
          {theme === 'dark' ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
        </button>
      </div>
    </header>
  )
}
