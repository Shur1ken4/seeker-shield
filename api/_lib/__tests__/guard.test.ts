import { describe, expect, it } from 'vitest'
import { blockReason, defaultAction } from '../guard'
import { SKR_MINT, TOKEN_2022_PROGRAM, TOKEN_PROGRAM, WSOL_MINT } from '../constants'
import type { Finding } from '../types'

function f(p: Partial<Finding>): Finding {
  return {
    id: 'x', type: 'empty', severity: 'cleanup', tokenAccount: 'Acct111', mint: 'Mint111', symbol: null, name: null, image: null,
    uiAmount: 0, amount: '0', decimals: 0, usdValue: null, delegate: null, delegatedAmount: null, programId: TOKEN_PROGRAM,
    rentLamports: 2039280, isProtected: false, unfixableReason: null, reasons: [], raw: {}, ...p,
  }
}

describe('guard: the Seeker Genesis Token and SKR can never be closed or burned', () => {
  const sgt = f({ mint: 'Sgt111', programId: TOKEN_2022_PROGRAM, raw: { isSeekerGenesisToken: true } })
  const skr = f({ mint: SKR_MINT })
  for (const [label, item] of [['SGT', sgt], ['SKR', skr], ['wSOL', f({ mint: WSOL_MINT })]] as const) {
    it(`blocks close and burn on ${label}, even when empty, unprotected and confirmed`, () => {
      expect(blockReason(item, 'close')).not.toBeNull()
      expect(blockReason({ ...item, type: 'suspicious' }, 'burn', { burnConfirmed: true })).not.toBeNull()
    })
  }
})

describe('guard: general rules', () => {
  it('allows closing an empty unprotected account', () => {
    expect(blockReason(f({}), 'close')).toBeNull()
  })
  it('blocks closing any account with a balance', () => {
    expect(blockReason(f({ amount: '1', isProtected: true }), 'close')).not.toBeNull()
    expect(blockReason(f({ amount: '1', isProtected: false }), 'close')).not.toBeNull()
  })
  it('allows revoking on a protected, valued account', () => {
    expect(blockReason(f({ type: 'delegation', amount: '5', isProtected: true, delegate: 'D111' }), 'revoke')).toBeNull()
  })
  it('requires a second confirmation to burn, and never burns valued tokens', () => {
    const spam = f({ type: 'suspicious', amount: '100' })
    expect(blockReason(spam, 'burn')).not.toBeNull()
    expect(blockReason(spam, 'burn', { burnConfirmed: true })).toBeNull()
    expect(blockReason({ ...spam, usdValue: 3 }, 'burn', { burnConfirmed: true })).not.toBeNull()
  })
  it('respects unfixable reasons for close', () => {
    expect(blockReason(f({ unfixableReason: 'withheld fees' }), 'close')).toBe('withheld fees')
  })
  it('never picks burn as a default action', () => {
    expect(defaultAction(f({ type: 'suspicious' }))).toBeNull()
    expect(defaultAction(f({ type: 'delegation', delegate: 'D' }))).toBe('revoke')
    expect(defaultAction(f({}))).toBe('close')
  })
})
