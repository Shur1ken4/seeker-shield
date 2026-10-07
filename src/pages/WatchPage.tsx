import { useCallback, useEffect, useState } from 'react'
import { BellRing, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { SeverityChip } from '@/components/SeverityChip'
import { Skeleton } from '@/components/Skeleton'
import { useToast } from '@/components/Toast'
import { VerifyGate } from '@/components/VerifyGate'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { short, timeAgo } from '@/lib/format'
import type { Alert, Watched } from '../../api/_lib/types'
import { ADOPT_PRICE_SKR } from '../../api/_lib/constants'
import { AdoptSheet } from '@/components/AdoptSheet'
import { Wardy } from '@/components/Wardy'

interface WatchData {
  adopted: boolean
  telegram: { linked: boolean }
  watched: (Watched & { score: number | null; word: string | null })[]
  alerts: Alert[]
  pro: boolean
  limit: number
}

const band = (score: number | null) =>
  score == null ? 'text-text-muted' : score >= 90 ? 'text-safe' : score >= 70 ? 'text-cleanup' : score >= 40 ? 'text-warning' : 'text-critical'

export function WatchPage({ onGoToScan, onUpgrade }: { onGoToScan: () => void; onUpgrade: () => void }) {
  return (
    <section className="space-y-6 pt-2">
      <header>
        <h1 className="text-heading font-semibold">Watch</h1>
        <p className="mt-1 text-body-sm text-text-secondary">Wardy keeps checking after you leave. If a fake token or new app access shows up in your wallet or a friend’s, you get a Telegram message.</p>
      </header>
      <VerifyGate why="So alerts go to you and nobody else." onGoToScan={onGoToScan}>
        <WatchContent onUpgrade={onUpgrade} />
      </VerifyGate>
    </section>
  )
}

function WatchContent({ onUpgrade }: { onUpgrade: () => void }) {
  const [data, setData] = useState<WatchData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)
  const [testing, setTesting] = useState(false)
  const [adoptOpen, setAdoptOpen] = useState(false)
  const toast = useToast()

  const load = useCallback(() => {
    setError(null)
    api.get<WatchData>('/api/watch').then(setData).catch((e) => setError(e.message))
  }, [])
  useEffect(load, [load])

  // Coming back from Telegram after tapping Start: refresh the link status.
  useEffect(() => {
    const onFocus = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onFocus)
    return () => document.removeEventListener('visibilitychange', onFocus)
  }, [load])

  const connectTelegram = async () => {
    setLinking(true)
    try {
      const { url } = await api.post<{ url: string }>('/api/telegram/link')
      window.open(url, '_blank', 'noopener')
    } catch (e) {
      toast('error', (e as Error).message)
    } finally {
      setLinking(false)
    }
  }

  const testAlert = async () => {
    setTesting(true)
    try {
      const r = await api.post<{ telegram: boolean; linked: boolean }>('/api/telegram/test')
      toast(r.telegram ? 'success' : 'info', r.telegram ? 'Test alert sent to Telegram.' : 'Saved to your alerts below. Connect Telegram to get it on your phone.')
      load()
    } catch (e) {
      toast('error', (e as Error).message)
    } finally {
      setTesting(false)
    }
  }

  if (data && !data.adopted) {
    return (
      <>
        <div className="rounded-card border border-border bg-surface-1 p-6 text-center">
          <div className="flex justify-center">
            <Wardy mood="calm" size={72} />
          </div>
          <h3 className="mt-3 text-title font-semibold">Adopt Wardy to get alerts</h3>
          <p className="mt-1 text-body-sm text-text-secondary">He’ll message you on Telegram when something lands in your wallet or a friend’s.</p>
          <Button className="mt-4" onClick={() => setAdoptOpen(true)}>
            Adopt for {ADOPT_PRICE_SKR} SKR
          </Button>
        </div>
        <AdoptSheet open={adoptOpen} onClose={() => setAdoptOpen(false)} onAdopted={load} />
      </>
    )
  }

  if (error) return <EmptyState title="Couldn’t load your alerts" body={error} action={<Button variant="secondary" onClick={load}>Try again</Button>} />
  if (!data)
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-card" />
        <Skeleton className="h-16 w-full rounded-card" />
      </div>
    )

  return (
    <div className="space-y-6">
      <div className="rounded-card border border-border bg-surface-1 p-4">
        <div className="flex items-start gap-3">
          <Send size={20} className={data.telegram.linked ? 'text-safe' : 'text-text-muted'} aria-hidden />
          <div className="flex-1">
            <p className="text-body font-medium">{data.telegram.linked ? 'Telegram connected' : 'Telegram not connected'}</p>
            <p className="text-body-sm text-text-secondary">
              {data.telegram.linked
                ? data.pro
                  ? 'Alerts arrive the moment something happens.'
                  : 'You get a daily digest. Pro sends alerts instantly.'
                : 'Connect once, then alerts come to your Telegram.'}
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {!data.telegram.linked && (
            <Button className="flex-1" onClick={connectTelegram} loading={linking}>
              Connect Telegram
            </Button>
          )}
          <Button className="flex-1" variant="secondary" onClick={testAlert} loading={testing}>
            Send me a test alert
          </Button>
        </div>
      </div>

      <WatchedList data={data} onChange={load} onUpgrade={onUpgrade} />

      <div className="space-y-3">
        <h2 className="text-body-sm font-medium text-text-secondary">Recent alerts</h2>
        {data.alerts.length === 0 ? (
          <EmptyState icon={<BellRing size={24} aria-hidden />} title="No alerts yet" body="When something new and risky shows up, it will be listed here, even if Telegram is off." />
        ) : (
          <ul className="space-y-2">
            {data.alerts.map((a) => (
              <li key={a.id} className="rounded-card border border-border bg-surface-1 p-3">
                <div className="flex items-center gap-2">
                  {a.severity === 'info' ? <SeverityChip kind="safe" /> : <SeverityChip kind={a.severity} />}
                  <span className="text-caption text-text-muted">
                    {a.nickname} · {timeAgo(a.at)}
                  </span>
                </div>
                <p className="mt-1 text-body-sm font-medium">{a.title}</p>
                {a.text && <p className="text-body-sm text-text-secondary">{a.text}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function WatchedList({ data, onChange, onUpgrade }: { data: WatchData; onChange: () => void; onUpgrade: () => void }) {
  const [target, setTarget] = useState('')
  const [nickname, setNickname] = useState('')
  const [adding, setAdding] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const toast = useToast()
  const full = data.watched.length >= data.limit

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setFormError(null)
    try {
      await api.post('/api/watch', { target: target.trim(), nickname: nickname.trim() })
      setTarget('')
      setNickname('')
      toast('success', `Now watching ${nickname.trim() || 'that wallet'}.`)
      onChange()
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setAdding(false)
    }
  }

  const remove = async (address: string) => {
    try {
      await api.del('/api/watch', { address })
      onChange()
    } catch (err) {
      toast('error', (err as Error).message)
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="flex items-baseline gap-2 text-body-sm font-medium text-text-secondary">
        Friends’ wallets <span className="text-caption text-text-muted">{data.watched.length} of {data.limit}</span>
      </h2>
      {data.watched.length > 0 && (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface-1">
          {data.watched.map((w) => (
            <li key={w.address} className="flex items-center gap-3 px-4 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-medium">{w.nickname}</p>
                <p className="font-mono text-caption text-text-muted">{short(w.address, 5)}</p>
              </div>
              <a href={`/?check=${w.address}`} className={cn('text-right', band(w.score))} aria-label={`${w.nickname}: score ${w.score ?? 'unknown'}`}>
                <span className="block text-title font-semibold tabular-nums">{w.score ?? '–'}</span>
                <span className="block text-caption">{w.word ?? ''}</span>
              </a>
              <button aria-label={`Stop watching ${w.nickname}`} onClick={() => remove(w.address)} className="flex min-h-tap min-w-tap items-center justify-center rounded-card text-text-muted active:bg-surface-2">
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {full ? (
        <div className="rounded-card border border-border bg-surface-1 p-4">
          <p className="text-body-sm text-text-secondary">
            {data.pro ? 'You’re watching the maximum number of wallets.' : `Free plan watches ${data.limit} wallets. Pro watches up to 5, with instant alerts.`}
          </p>
          {!data.pro && (
            <Button className="mt-3" variant="secondary" onClick={onUpgrade}>
              See Wardy Pro
            </Button>
          )}
        </div>
      ) : (
        <form onSubmit={add} className="space-y-2 rounded-card border border-border bg-surface-1 p-4">
          <label htmlFor="watch-target" className="text-body-sm text-text-secondary">
            Wallet address or .skr name
          </label>
          <input
            id="watch-target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="alice.skr"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="min-h-tap w-full rounded-card border border-border bg-surface-2 px-3 font-mono text-body-sm placeholder:text-text-muted focus:border-safe focus:outline-none"
          />
          <label htmlFor="watch-nick" className="text-body-sm text-text-secondary">
            Nickname
          </label>
          <input
            id="watch-nick"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Mum"
            maxLength={24}
            className="min-h-tap w-full rounded-card border border-border bg-surface-2 px-3 text-body-sm placeholder:text-text-muted focus:border-safe focus:outline-none"
          />
          {formError && <p className="text-body-sm text-critical">{formError}</p>}
          <Button type="submit" className="w-full" disabled={!target.trim()} loading={adding}>
            Add wallet
          </Button>
          <p className="text-caption text-text-muted">Read-only. Wardy can see risks in their wallet but can never change it.</p>
        </form>
      )}
    </div>
  )
}
