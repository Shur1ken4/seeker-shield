import { useState } from 'react'

export function TokenAvatar({ src, label }: { src: string | null; label: string }) {
  const [broken, setBroken] = useState(false)
  const initials = label.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || '?'
  if (src && !broken) {
    return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="h-10 w-10 shrink-0 rounded-full bg-surface-2 object-cover" />
  }
  return <div aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-caption font-medium text-text-secondary">{initials}</div>
}
