import { describe, expect, it } from 'vitest'
import { acceptable, template } from '../explain'

describe('explanation guard', () => {
  it('rejects "scam" unless the finding is on the scam list', () => {
    expect(acceptable('This scam token wants you to visit a site.', 'suspicious')).toBe(false)
    expect(acceptable('This token is on our scam list; hiding it is safe.', 'scam_match')).toBe(true)
  })
  it('rejects links and overly long text', () => {
    expect(acceptable('Visit claim.xyz now to get your reward.', 'suspicious')).toBe(false)
    expect(acceptable(Array(40).fill('word').join(' '), 'empty')).toBe(false)
  })
  it('has a safe template for every type', () => {
    for (const type of ['delegation', 'suspicious', 'empty', 'scam_match'] as const) {
      const t = template({ type, severity: 'warning', symbol: 'ABC', name: null })
      expect(acceptable(t, type)).toBe(true)
    }
  })
})
