import { Eye, ScanLine, UserRound, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export type Tab = 'scan' | 'watch' | 'profile'

const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'scan', label: 'Scan', icon: ScanLine },
  { id: 'watch', label: 'Watch', icon: Eye },
  { id: 'profile', label: 'Profile', icon: UserRound },
]

export function BottomTabBar({ active, onChange, badge }: { active: Tab; onChange: (t: Tab) => void; badge?: Partial<Record<Tab, boolean>> }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Main"
    >
      <ul className="mx-auto flex max-w-md">
        {tabs.map(({ id, label, icon: Icon }) => (
          <li key={id} className="flex-1">
            <button
              onClick={() => onChange(id)}
              aria-current={active === id ? 'page' : undefined}
              className={cn(
                'relative flex min-h-[56px] w-full flex-col items-center justify-center gap-1 text-caption transition-colors duration-fast',
                active === id ? 'text-safe' : 'text-text-muted active:text-text-secondary',
              )}
            >
              <Icon size={22} strokeWidth={1.75} aria-hidden />
              {label}
              {badge?.[id] && <span className="absolute right-[calc(50%-18px)] top-2 h-2 w-2 rounded-full bg-critical" aria-label="New" />}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
