import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SKR_MINT } from '../constants'

const rpcMock = vi.fn()
vi.mock('../solana.js', () => ({ rpc: (...a: unknown[]) => rpcMock(...a) }))
const { checkPayment } = await import('../pro')

const PAYER = 'Payer11111111111111111111111111111111111111'
const TREASURY = 'Treasury111111111111111111111111111111111'
const D = 10n ** 6n

function tx({ payerDelta = -250n * D, treasuryDelta = 250n * D, signer = PAYER, err = null as unknown, mint = SKR_MINT } = {}) {
  const bal = (owner: string, amount: bigint, idx: number) => ({ accountIndex: idx, mint, owner, uiTokenAmount: { amount: amount.toString() } })
  return {
    meta: {
      err,
      preTokenBalances: [bal(PAYER, 1000n * D, 1), bal(TREASURY, 0n, 2)],
      postTokenBalances: [bal(PAYER, 1000n * D + payerDelta, 1), bal(TREASURY, treasuryDelta, 2)],
    },
    transaction: { message: { accountKeys: [{ pubkey: signer, signer: true }] } },
  }
}

beforeEach(() => {
  rpcMock.mockReset()
  rpcMock.mockImplementation(async (method: string) => {
    if (method === 'getAccountInfo') return { value: { data: { parsed: { info: { decimals: 6 } } } } }
    return current
  })
})
let current: unknown

describe('checkPayment', () => {
  it('accepts a confirmed 250 SKR transfer from the payer to the treasury', async () => {
    current = tx()
    expect(await checkPayment('sig', PAYER, TREASURY, 250)).toBeNull()
  })
  it('rejects too little SKR', async () => {
    current = tx({ payerDelta: -249n * D, treasuryDelta: 249n * D })
    expect(await checkPayment('sig', PAYER, TREASURY, 250)).toMatch(/didn’t receive/)
  })
  it('rejects another token', async () => {
    current = tx({ mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' })
    expect(await checkPayment('sig', PAYER, TREASURY, 250)).not.toBeNull()
  })
  it('rejects a payment signed by someone else', async () => {
    current = tx({ signer: 'Someone1111111111111111111111111111111111' })
    expect(await checkPayment('sig', PAYER, TREASURY, 250)).toMatch(/signed/)
  })
  it('rejects a failed transaction and a missing one', async () => {
    current = tx({ err: { InstructionError: [0, 'x'] } })
    expect(await checkPayment('sig', PAYER, TREASURY, 250)).toMatch(/failed/)
    current = null
    expect(await checkPayment('sig', PAYER, TREASURY, 250)).toMatch(/not found/)
  })
  it('rejects SKR that came from a different wallet', async () => {
    current = tx({ payerDelta: 0n })
    expect(await checkPayment('sig', PAYER, TREASURY, 250)).toMatch(/didn’t come from your wallet/)
  })
})
