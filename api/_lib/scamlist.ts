import { createRequire } from 'node:module'
import { kv } from './kv.js'

const seed = createRequire(import.meta.url)('../../data/scam-seed.json') as { entries: { address: string }[] }
const KEY = 'scam:addresses'

/** Known-bad addresses (delegates, mints, update authorities). Seeded once from data/scam-seed.json. */
export async function loadScamList(): Promise<Set<string>> {
  if (await kv.set('scam:seeded:v1', 1, { nx: true })) {
    const addrs = seed.entries.map((e) => e.address).filter(Boolean)
    if (addrs.length) await kv.sadd(KEY, ...addrs)
  }
  return new Set(await kv.smembers(KEY))
}
