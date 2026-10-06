import { kv } from './kv.js'

export interface Stats {
  reclaimedLamports: number
  fixed: number
}

export async function getStats(owner: string): Promise<Stats> {
  return (await kv.get<Stats>(`stats:${owner}`)) ?? { reclaimedLamports: 0, fixed: 0 }
}

export async function addStats(owner: string, d: Stats) {
  const s = await getStats(owner)
  await kv.set(`stats:${owner}`, { reclaimedLamports: s.reclaimedLamports + d.reclaimedLamports, fixed: s.fixed + d.fixed })
}
