import { describe, expect, it } from 'vitest'
import { classify, isProtected, isSgtMint, lureSignals, type ClassifyInput, type TokenAccountInput } from '../classify'
import { computeScore, scoreWord } from '../score'
import { SGT_GROUP_ADDRESS, SGT_METADATA_ADDRESS, SKR_MINT, TOKEN_2022_PROGRAM, TOKEN_PROGRAM, WSOL_MINT } from '../constants'

const OWNER = 'Owner1111111111111111111111111111111111111'
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const SPAM = 'Spam111111111111111111111111111111111111111'
const SGT = 'Sgt1111111111111111111111111111111111111111'
const DRAINER = 'Drainer11111111111111111111111111111111111'

function acct(p: Partial<TokenAccountInput> & { pubkey: string; mint: string }): TokenAccountInput {
  return { programId: TOKEN_PROGRAM, lamports: 2039280, owner: OWNER, state: 'initialized', amount: '0', decimals: 6, uiAmount: 0, ...p }
}

const sgtMintInfo = {
  extensions: [
    { extension: 'metadataPointer', state: { metadataAddress: SGT_METADATA_ADDRESS } },
    { extension: 'tokenGroupMember', state: { group: SGT_GROUP_ADDRESS, mint: SGT, memberNumber: 20 } },
  ],
}

function input(p: Partial<ClassifyInput>): ClassifyInput {
  return { accounts: [], mints: {}, assets: {}, scamList: new Set(), ...p }
}

describe('classify', () => {
  it('flags a delegation on a valued account as critical', () => {
    const f = classify(
      input({
        accounts: [acct({ pubkey: 'A1', mint: USDC, amount: '50000000', uiAmount: 50, delegate: DRAINER, delegatedAmount: '18446744073709551615' })],
        assets: { [USDC]: { symbol: 'USDC', verified: true, usdPrice: 1 } },
      }),
    )
    expect(f).toHaveLength(1)
    expect(f[0]).toMatchObject({ type: 'delegation', severity: 'critical', delegate: DRAINER, isProtected: true })
  })

  it('flags a low-value delegation as a warning', () => {
    const f = classify(input({ accounts: [acct({ pubkey: 'A1', mint: USDC, amount: '500000', uiAmount: 0.5, delegate: DRAINER })], assets: { [USDC]: { verified: true, usdPrice: 1 } } }))
    expect(f[0]).toMatchObject({ type: 'delegation', severity: 'warning' })
  })

  it('marks a delegation to a listed drainer as scam_match critical', () => {
    const f = classify(input({ accounts: [acct({ pubkey: 'A1', mint: USDC, amount: '1', uiAmount: 0.000001, delegate: DRAINER })], scamList: new Set([DRAINER]) }))
    expect(f[0]).toMatchObject({ type: 'scam_match', severity: 'critical' })
  })

  it('flags an unverified, unpriced token with a URL in its name as suspicious (never "scam")', () => {
    const f = classify(
      input({
        accounts: [acct({ pubkey: 'S1', mint: SPAM, amount: '1000', uiAmount: 1000 })],
        assets: { [SPAM]: { name: 'Visit claim-sol.xyz to claim', symbol: 'GIFT', verified: false, usdPrice: null } },
      }),
    )
    expect(f).toHaveLength(1)
    expect(f[0]).toMatchObject({ type: 'suspicious', severity: 'warning' })
    expect(f[0].reasons).toContain('link in name')
  })

  it('does not flag a verified token even with promo words', () => {
    const f = classify(input({ accounts: [acct({ pubkey: 'S1', mint: SPAM, amount: '1', uiAmount: 1 })], assets: { [SPAM]: { name: 'Free reward token', verified: true, usdPrice: null } } }))
    expect(f).toHaveLength(0)
  })

  it('flags an empty account as cleanup with its rent', () => {
    const f = classify(input({ accounts: [acct({ pubkey: 'E1', mint: USDC })] }))
    expect(f[0]).toMatchObject({ type: 'empty', severity: 'cleanup', rentLamports: 2039280, isProtected: false, unfixableReason: null })
  })

  it('explains why a Token-2022 account with withheld fees cannot be closed', () => {
    const f = classify(
      input({
        accounts: [acct({ pubkey: 'E2', mint: SPAM, programId: TOKEN_2022_PROGRAM, extensions: [{ extension: 'transferFeeAmount', state: { withheldAmount: 5 } }] })],
      }),
    )
    expect(f[0].unfixableReason).toMatch(/fees/)
  })

  it('protects the Seeker Genesis Token and never reports it', () => {
    const f = classify(
      input({
        accounts: [acct({ pubkey: 'G1', mint: SGT, programId: TOKEN_2022_PROGRAM, amount: '1', decimals: 0, uiAmount: 1 })],
        mints: { [SGT]: sgtMintInfo },
        // Even if someone gives it a spammy name, it must not be flagged.
        assets: { [SGT]: { name: 'Seeker Genesis claim free', verified: false } },
      }),
    )
    expect(f).toHaveLength(0)
    expect(isSgtMint(sgtMintInfo)).toBe(true)
    expect(isProtected({ mint: SGT, amount: '0' }, { isSgt: true })).toBe(true)
  })

  it('leaves an old zero-balance SGT account alone', () => {
    const f = classify(input({ accounts: [acct({ pubkey: 'G0', mint: SGT, programId: TOKEN_2022_PROGRAM })], mints: { [SGT]: sgtMintInfo } }))
    expect(f).toHaveLength(0)
  })

  it('rejects look-alike SGTs with the wrong group', () => {
    expect(isSgtMint({ extensions: [{ extension: 'metadataPointer', state: { metadataAddress: SGT_METADATA_ADDRESS } }, { extension: 'tokenGroupMember', state: { group: DRAINER } }] })).toBe(false)
  })

  it('protects SKR, wrapped SOL and any account with a balance', () => {
    expect(isProtected({ mint: SKR_MINT, amount: '0' }, { isSgt: false })).toBe(true)
    expect(isProtected({ mint: WSOL_MINT, amount: '0' }, { isSgt: false })).toBe(true)
    expect(isProtected({ mint: USDC, amount: '1' }, { isSgt: false })).toBe(true)
    expect(isProtected({ mint: USDC, amount: '0' }, { isSgt: false })).toBe(false)
  })

  it('never flags SKR as suspicious', () => {
    const f = classify(input({ accounts: [acct({ pubkey: 'K1', mint: SKR_MINT, amount: '5', uiAmount: 5 })], assets: { [SKR_MINT]: { name: 'claim free airdrop', verified: false } } }))
    expect(f).toHaveLength(0)
  })

  it('sorts critical before warning before cleanup', () => {
    const f = classify(
      input({
        accounts: [
          acct({ pubkey: 'E1', mint: USDC }),
          acct({ pubkey: 'S1', mint: SPAM, amount: '1', uiAmount: 1 }),
          acct({ pubkey: 'A1', mint: USDC, amount: '9000000', uiAmount: 9, delegate: DRAINER }),
        ],
        assets: { [SPAM]: { name: 'airdrop.com', verified: false }, [USDC]: { verified: true, usdPrice: 1 } },
      }),
    )
    expect(f.map((x) => x.severity)).toEqual(['critical', 'warning', 'cleanup'])
  })
})

describe('score', () => {
  it('follows the CLAUDE.md formula with caps and floor', () => {
    const n = (severity: 'critical' | 'warning' | 'cleanup', k: number) => Array.from({ length: k }, () => ({ severity }))
    expect(computeScore([])).toBe(100)
    expect(computeScore(n('critical', 1))).toBe(75)
    expect(computeScore(n('critical', 5))).toBe(25)
    expect(computeScore(n('warning', 10))).toBe(76)
    expect(computeScore(n('cleanup', 30))).toBe(90)
    expect(computeScore([...n('critical', 9), ...n('warning', 9), ...n('cleanup', 99)])).toBe(0)
  })
  it('maps bands to words', () => {
    expect([95, 90, 89, 70, 69, 40, 39, 0].map(scoreWord)).toEqual(['Safe', 'Safe', 'Okay', 'Okay', 'At risk', 'At risk', 'Danger', 'Danger'])
  })
})

describe('lure words', () => {
  it('matches whole words only', () => {
    expect(lureSignals({ name: 'Freedom Cat #12' })).toEqual([])
    expect(lureSignals({ name: 'FREE SKR - claim now' }).length).toBeGreaterThan(0)
  })
})
