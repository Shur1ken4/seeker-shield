import { Redis } from '@upstash/redis'

/**
 * The small slice of Redis we use. Backed by Upstash when its env vars are set,
 * otherwise by an in-memory map so `npm run dev` works before the database exists.
 */
export interface KV {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: unknown, opts?: { ex?: number; nx?: boolean }): Promise<boolean>
  del(key: string): Promise<void>
  incr(key: string, ttlSeconds?: number): Promise<number>
  sadd(key: string, ...members: string[]): Promise<void>
  srem(key: string, ...members: string[]): Promise<void>
  sismember(key: string, member: string): Promise<boolean>
  smembers(key: string): Promise<string[]>
  lpush(key: string, value: unknown, keep: number): Promise<void>
  lrange<T>(key: string, count: number): Promise<T[]>
}

function upstash(): KV {
  const r = new Redis({ url: KV_URL!, token: KV_TOKEN! })
  return {
    get: (k) => r.get(k),
    async set(k, v, o) {
      const opts = o?.nx ? (o.ex ? { ex: o.ex, nx: true as const } : { nx: true as const }) : o?.ex ? { ex: o.ex } : undefined
      const res = await r.set(k, v, opts as never)
      return res === 'OK'
    },
    async del(k) {
      await r.del(k)
    },
    async incr(k, ttl) {
      const n = await r.incr(k)
      if (n === 1 && ttl) await r.expire(k, ttl)
      return n
    },
    async sadd(k, ...m) {
      if (m.length) await r.sadd(k, m[0], ...m.slice(1))
    },
    async srem(k, ...m) {
      if (m.length) await r.srem(k, ...m)
    },
    async sismember(k, m) {
      return (await r.sismember(k, m)) === 1
    },
    smembers: (k) => r.smembers(k),
    async lpush(k, v, keep) {
      await r.lpush(k, v)
      await r.ltrim(k, 0, keep - 1)
    },
    lrange: (k, count) => r.lrange(k, 0, count - 1),
  }
}

function memory(): KV {
  const store = new Map<string, { v: unknown; exp?: number }>()
  const read = (k: string) => {
    const e = store.get(k)
    if (e?.exp && e.exp < Date.now()) {
      store.delete(k)
      return undefined
    }
    return e?.v
  }
  const write = (k: string, v: unknown, ex?: number) => store.set(k, { v, exp: ex ? Date.now() + ex * 1000 : undefined })
  const setOf = (k: string) => (read(k) as Set<string>) ?? new Set<string>()
  const listOf = (k: string) => (read(k) as unknown[]) ?? []
  return {
    async get<T>(k: string) {
      const v = read(k)
      return v === undefined ? null : (structuredClone(v) as T)
    },
    async set(k, v, o) {
      if (o?.nx && read(k) !== undefined) return false
      write(k, structuredClone(v), o?.ex)
      return true
    },
    async del(k) {
      store.delete(k)
    },
    async incr(k, ttl) {
      const n = Number(read(k) ?? 0) + 1
      if (n === 1) write(k, n, ttl)
      else store.get(k)!.v = n
      return n
    },
    async sadd(k, ...m) {
      const s = setOf(k)
      m.forEach((x) => s.add(x))
      write(k, s)
    },
    async srem(k, ...m) {
      const s = setOf(k)
      m.forEach((x) => s.delete(x))
      write(k, s)
    },
    async sismember(k, m) {
      return setOf(k).has(m)
    },
    async smembers(k) {
      return [...setOf(k)]
    },
    async lpush(k, v, keep) {
      write(k, [structuredClone(v), ...listOf(k)].slice(0, keep))
    },
    async lrange<T>(k: string, count: number) {
      return listOf(k).slice(0, count) as T[]
    },
  }
}

// Upstash's own names, or the ones its Vercel Marketplace integration creates.
const KV_URL = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
const g = globalThis as unknown as { __kv?: KV }
export const kv: KV =
  g.__kv ?? (g.__kv = KV_URL && KV_TOKEN ? upstash() : memory())
