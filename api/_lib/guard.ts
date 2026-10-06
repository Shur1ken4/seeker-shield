import { SKR_MINT, WSOL_MINT } from './constants.js'
import type { Finding } from './types.js'

export type FixAction = 'revoke' | 'close' | 'burn'

/** Every fix the app can build. Burn is never part of "Fix all". */
export function defaultAction(f: Finding): FixAction | null {
  if ((f.type === 'delegation' || f.type === 'scam_match') && f.delegate) return 'revoke'
  if (f.type === 'empty') return 'close'
  return null
}

/**
 * The single gate in front of every instruction builder. Returns null if allowed,
 * or a plain-English reason if not. Called again right before signing.
 */
export function blockReason(f: Finding, action: FixAction, opts: { burnConfirmed?: boolean } = {}): string | null {
  const isSgt = f.raw?.isSeekerGenesisToken === true
  if (!f.tokenAccount || f.programId === 'compressed') return 'This item has no token account to change.'
  if (f.unfixableReason && action !== 'revoke') return f.unfixableReason

  if (action === 'revoke') {
    // Revoking only removes someone else's permission; it never moves tokens, so it's allowed on any account.
    return f.delegate ? null : 'There is no permission to revoke.'
  }

  // Close and burn: the Seeker Genesis Token, SKR and SOL are untouchable.
  if (isSgt) return 'Your Seeker Genesis Token is never touched.'
  if (f.mint === SKR_MINT) return 'SKR is never closed or burned.'
  if (f.mint === WSOL_MINT) return 'SOL accounts are never closed or burned.'

  if (action === 'close') {
    if (f.isProtected || f.amount !== '0') return 'This account still holds tokens, so it won’t be closed.'
    return null
  }

  // burn
  if (f.type !== 'suspicious' && f.type !== 'scam_match') return 'Only suspicious tokens can be burned.'
  if ((f.usdValue ?? 0) > 0) return 'This token has a market value, so it won’t be burned.'
  if (!opts.burnConfirmed) return 'Burning needs your second confirmation.'
  return null
}
