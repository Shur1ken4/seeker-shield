export const short = (a: string, n = 4) => (a.length > 2 * n + 1 ? `${a.slice(0, n)}…${a.slice(-n)}` : a)

export const sol = (lamports: number) => {
  const v = lamports / 1e9
  return v === 0 ? '0 SOL' : `${v < 0.001 ? v.toFixed(6) : v.toFixed(4)} SOL`
}

export const usd = (v: number | null | undefined) =>
  v == null ? '' : v < 0.01 ? '<$0.01' : v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: v < 100 ? 2 : 0 })

export const amount = (v: number) =>
  v.toLocaleString(undefined, { maximumFractionDigits: v < 1 ? 6 : v < 1000 ? 2 : 0 })

export function timeAgo(ms: number) {
  const s = Math.round((Date.now() - ms) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}
