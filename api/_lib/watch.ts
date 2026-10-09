import { FREE_WATCH_LIMIT, PRO_WATCH_LIMIT } from './constants.js'
import { kv } from './kv.js'

export type { Alert, Watched } from './types.js'
import type { Alert, Watched } from './types.js'

/** Every address any user watches (their own included), i.e. the Helius webhook's address list. */
export const ALL_WATCHED = 'watch:all'

/** Unlocked Wardy: one purchase includes instant alerts and 5 friends' wallets. */
export async function isPro(address: string) {
  return !!(await kv.get<number>(`adopted:${address}`))
}

export async function watchLimit(address: string) {
  return (await isPro(address)) ? PRO_WATCH_LIMIT : FREE_WATCH_LIMIT
}

export async function getWatched(user: string): Promise<Watched[]> {
  return (await kv.get<Watched[]>(`watch:${user}`)) ?? []
}

export async function setWatched(user: string, list: Watched[]) {
  await kv.set(`watch:${user}`, list)
}

/** Who should hear about activity on `wallet`: each user watching it, plus the owner if they linked Telegram. */
export async function watchersOf(wallet: string) {
  return kv.smembers(`watchers:${wallet}`)
}

export async function addWatcher(wallet: string, user: string) {
  await kv.sadd(`watchers:${wallet}`, user)
  await kv.sadd(ALL_WATCHED, wallet)
}

export async function removeWatcher(wallet: string, user: string) {
  await kv.srem(`watchers:${wallet}`, user)
  if (!(await watchersOf(wallet)).length) await kv.srem(ALL_WATCHED, wallet)
}

export async function getAlerts(user: string) {
  return kv.lrange<Alert>(`alerts:${user}`, 30)
}

export async function pushAlert(user: string, alert: Alert) {
  await kv.lpush(`alerts:${user}`, alert, 50)
}
