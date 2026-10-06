/**
 * A per-phone tally of fixes, shown alongside the server's on-chain-verified totals.
 * The server stays the source of truth; this only covers the seconds before it catches up
 * (or a server without a database yet). Profile shows the larger of the two.
 */
export interface LocalStats {
  fixed: number
  reclaimedLamports: number
}

const key = (owner: string) => `shield.stats.${owner}`

export function readLocalStats(owner: string): LocalStats {
  try {
    return { fixed: 0, reclaimedLamports: 0, ...JSON.parse(localStorage.getItem(key(owner)) ?? '{}') }
  } catch {
    return { fixed: 0, reclaimedLamports: 0 }
  }
}

export function addLocalStats(owner: string, d: LocalStats) {
  const s = readLocalStats(owner)
  try {
    localStorage.setItem(key(owner), JSON.stringify({ fixed: s.fixed + d.fixed, reclaimedLamports: s.reclaimedLamports + d.reclaimedLamports }))
  } catch {
    // Storage unavailable: the server totals still apply.
  }
}
