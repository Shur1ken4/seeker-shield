import { kv } from './kv.js'
import { extendPro } from './pro.js'
import type { WardyState } from './types.js'
export type { WardyState } from './types.js'

/** Wardy's growth. Cosmetic only: levels never change what the app checks or allows. */
export const LEVELS: { xp: number; name: string }[] = [
  { xp: 0, name: 'Pup' },
  { xp: 50, name: 'Scout' },
  { xp: 150, name: 'Guard' },
  { xp: 350, name: 'Knight' },
  { xp: 700, name: 'Sentinel' },
  { xp: 1200, name: 'Legend' },
]

export const PATROL_XP = 10
export const SNACK_XP = 5
export const SNACKS_PER_DAY = 6 // so airdropping yourself spam to "feed" Wardy earns nothing extra
export const STREAK_FOR_REWARD = 7
export const REWARD_PRO_DAYS = 3

export interface WardyRecord {
  xp: number
  streak: number
  bestStreak: number
  lastPatrol: string | null
  snackDay: string | null
  snacks: number
  rewards: number
}


const empty = (): WardyRecord => ({ xp: 0, streak: 0, bestStreak: 0, lastPatrol: null, snackDay: null, snacks: 0, rewards: 0 })
const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)

export function levelFor(xp: number) {
  let i = 0
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++
  return { level: i + 1, name: LEVELS[i].name, levelXp: LEVELS[i].xp, nextLevelXp: LEVELS[i + 1]?.xp ?? null }
}

export function toState(r: WardyRecord, now = Date.now()): WardyState {
  const today = dayOf(now)
  const gap = r.lastPatrol ? daysBetween(r.lastPatrol, today) : 0
  const l = levelFor(r.xp)
  const streakAlive = gap <= 1
  const streak = streakAlive ? r.streak : 0
  return {
    xp: r.xp,
    level: l.level,
    levelName: l.name,
    levelXp: l.levelXp,
    nextLevelXp: l.nextLevelXp,
    streak,
    bestStreak: r.bestStreak,
    patrolledToday: gap === 0 && !!r.lastPatrol,
    sleepy: !!r.lastPatrol && gap > 1,
    daysToReward: STREAK_FOR_REWARD - (streak % STREAK_FOR_REWARD),
    rewards: r.rewards,
  }
}

async function load(address: string) {
  return (await kv.get<WardyRecord>(`wardy:${address}`)) ?? empty()
}

export async function getWardy(address: string) {
  return { ...toState(await load(address)), adopted: !!(await kv.get(`adopted:${address}`)) }
}

/** Pure step function for a daily patrol, so the rules are unit-testable. */
export function applyPatrol(r: WardyRecord, now = Date.now()) {
  const today = dayOf(now)
  if (r.lastPatrol === today) return { record: r, gained: 0, already: true, reward: false, napped: false }
  const gap = r.lastPatrol ? daysBetween(r.lastPatrol, today) : null
  const streak = gap === 1 ? r.streak + 1 : 1
  const gained = PATROL_XP + Math.min(streak - 1, 10)
  const reward = streak % STREAK_FOR_REWARD === 0
  const record: WardyRecord = {
    ...r,
    xp: r.xp + gained,
    streak,
    bestStreak: Math.max(r.bestStreak, streak),
    lastPatrol: today,
    rewards: r.rewards + (reward ? 1 : 0),
  }
  return { record, gained, already: false, reward, napped: gap !== null && gap > 1 }
}

export function applySnacks(r: WardyRecord, count: number, now = Date.now()) {
  const today = dayOf(now)
  const used = r.snackDay === today ? r.snacks : 0
  const eaten = Math.max(0, Math.min(count, SNACKS_PER_DAY - used))
  return { record: { ...r, snackDay: today, snacks: used + eaten, xp: r.xp + eaten * SNACK_XP }, gained: eaten * SNACK_XP, eaten }
}

export async function patrol(address: string) {
  const r = await load(address)
  const res = applyPatrol(r)
  if (res.already) return { state: toState(r), gained: 0, already: true, rewardProDays: 0, napped: false, levelUp: false }
  // One patrol per day per wallet, even if two requests race.
  if (!(await kv.set(`wardy:patrol:${address}:${res.record.lastPatrol}`, 1, { ex: 2 * 86400, nx: true }))) {
    return { state: toState(r), gained: 0, already: true, rewardProDays: 0, napped: false, levelUp: false }
  }
  await kv.set(`wardy:${address}`, res.record)
  if (res.reward) await extendPro(address, REWARD_PRO_DAYS)
  return {
    state: toState(res.record),
    gained: res.gained,
    already: false,
    rewardProDays: res.reward ? REWARD_PRO_DAYS : 0,
    napped: res.napped,
    levelUp: levelFor(res.record.xp).level > levelFor(r.xp).level,
  }
}

export async function feedSnacks(address: string, count: number) {
  if (count <= 0 || !(await kv.get(`adopted:${address}`))) return 0
  const r = await load(address)
  const res = applySnacks(r, count)
  if (res.eaten) await kv.set(`wardy:${address}`, res.record)
  return res.gained
}
