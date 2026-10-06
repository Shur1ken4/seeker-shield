import { Connection, PublicKey } from '@solana/web3.js'
// @onsol/tldparser's ESM build has extensionless imports that Node can't load, so we import its
// CommonJS build by path. A static import (not createRequire) lets Vercel bundle it with the function.
// @ts-ignore -- no types for the deep path; typed via the cast below
import tldCjs from '../../node_modules/@onsol/tldparser/dist/cjs/index.js'
import { env } from './env.js'
import { kv } from './kv.js'

const { TldParser } = tldCjs as typeof import('@onsol/tldparser')

const parser = () => new TldParser(new Connection(env.rpcUrl, 'confirmed'))
const DAY = 24 * 60 * 60

export const isSkrName = (s: string) => /^[a-z0-9-_]{1,63}\.skr$/i.test(s.trim())

/** alice.skr -> wallet address, or null if the name isn't registered. Throws if the RPC fails. */
export async function resolveSkr(name: string): Promise<string | null> {
  const n = name.trim().toLowerCase()
  const cached = await kv.get<string>(`skr:fwd:${n}`)
  if (cached) return cached === '-' ? null : cached
  let owner: string | null = null
  try {
    const o = await parser().getOwnerFromDomainTld(n)
    owner = o ? new PublicKey(o).toBase58() : null
  } catch (e) {
    // The library throws "reading 'owner'" for an unregistered name; anything else is a real failure.
    if (!/owner/.test(String((e as Error).message))) throw e
  }
  await kv.set(`skr:fwd:${n}`, owner ?? '-', { ex: DAY })
  return owner
}

/** wallet address -> its .skr name (alphabetically first if it owns several), or null. */
export async function reverseSkr(address: string): Promise<string | null> {
  const cached = await kv.get<string>(`skr:rev:${address}`)
  if (cached) return cached === '-' ? null : cached
  let name: string | null = null
  try {
    const domains = await parser().getParsedAllUserDomainsFromTld(new PublicKey(address), 'skr')
    name = domains.map((d) => (d.domain.endsWith('.skr') ? d.domain : `${d.domain}.skr`)).sort()[0] ?? null
  } catch {
    return null // Display-only: fall back to the short address, and don't cache a failure.
  }
  await kv.set(`skr:rev:${address}`, name ?? '-', { ex: DAY })
  return name
}
