import { describe, expect, it } from 'vitest'
import { applyPatrol, applySnacks, drawChest, levelFor, toState, SNACKS_PER_DAY, SNACK_XP, type WardyRecord } from '../wardy'

const day = (d: string) => Date.parse(`${d}T12:00:00Z`)
const fresh: WardyRecord = { xp: 0, streak: 0, bestStreak: 0, lastPatrol: null, snackDay: null, snacks: 0, rewards: 0 }

describe('Wardy patrols', () => {
  it('counts one patrol per day', () => {
    const a = applyPatrol(fresh, day('2026-10-07'))
    expect(a.gained).toBe(10)
    expect(applyPatrol(a.record, day('2026-10-07')).already).toBe(true)
  })

  it('grows the streak on consecutive days and pays 3 Pro days every 7', () => {
    let r = fresh
    const rewards: boolean[] = []
    for (let i = 1; i <= 14; i++) {
      const res = applyPatrol(r, day(`2026-10-${String(i).padStart(2, '0')}`))
      rewards.push(res.reward)
      r = res.record
    }
    expect(r.streak).toBe(14)
    expect(rewards.filter(Boolean).length).toBe(2)
    expect(rewards[6]).toBe(true)
  })

  it('naps after a missed day, never dies, and restarts the streak', () => {
    const a = applyPatrol(fresh, day('2026-10-01')).record
    const b = applyPatrol(a, day('2026-10-02')).record
    expect(toState(b, day('2026-10-05')).sleepy).toBe(true)
    expect(toState(b, day('2026-10-05')).streak).toBe(0)
    const c = applyPatrol(b, day('2026-10-05'))
    expect(c.napped).toBe(true)
    expect(c.record.streak).toBe(1)
    expect(c.record.xp).toBeGreaterThan(b.xp) // XP is never taken away
  })

  it('caps snacks per day so self-airdropped spam earns nothing extra', () => {
    const a = applySnacks(fresh, 50, day('2026-10-07'))
    expect(a.eaten).toBe(SNACKS_PER_DAY)
    expect(a.gained).toBe(SNACKS_PER_DAY * SNACK_XP)
    expect(applySnacks(a.record, 3, day('2026-10-07')).eaten).toBe(0)
    expect(applySnacks(a.record, 3, day('2026-10-08')).eaten).toBe(3)
  })

  it('gives a bonus treat when the day’s scan is clean', () => {
    const plain = applyPatrol(fresh, day('2026-10-07'))
    const clean = applyPatrol(fresh, day('2026-10-07'), true)
    expect(clean.gained - plain.gained).toBe(5)
    expect(clean.clean).toBe(true)
  })

  it('opens a chest on every 7th streak day with a prize from the table', () => {
    let r = fresh
    const chests = []
    for (let i = 1; i <= 7; i++) {
      const res = applyPatrol(r, day(`2026-10-0${i}`), false, 0.95)
      if (res.chest) chests.push(res.chest)
      r = res.record
    }
    expect(chests).toEqual([{ kind: 'xp', xp: 150 }])
    expect(drawChest(0.1)).toEqual({ kind: 'xp', xp: 30 })
    expect(drawChest(0.5)).toEqual({ kind: 'xp', xp: 50 })
    expect(drawChest(0.8)).toEqual({ kind: 'xp', xp: 80 })
  })

  it('maps XP to levels', () => {
    expect(levelFor(0).name).toBe('Pup')
    expect(levelFor(50).name).toBe('Scout')
    expect(levelFor(5000).name).toBe('Legend')
    expect(levelFor(5000).nextLevelXp).toBeNull()
  })
})
