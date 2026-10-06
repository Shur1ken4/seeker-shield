import { SGT_GROUP_ADDRESS, SGT_METADATA_ADDRESS, SKR_MINT, WSOL_MINT, TOKEN_2022_PROGRAM } from './constants.js'
import type { Finding, Severity } from './types.js'

// ---------- Inputs (already fetched by scan.ts; this file does no I/O) ----------

export interface TokenAccountInput {
  pubkey: string
  programId: string
  lamports: number
  mint: string
  owner: string
  state: string // 'initialized' | 'frozen'
  amount: string
  decimals: number
  uiAmount: number
  delegate?: string | null
  delegatedAmount?: string | null
  /** Token-2022 account extensions as returned by jsonParsed. */
  extensions?: { extension: string; state?: Record<string, unknown> }[]
}

export interface MintInfoInput {
  /** Token-2022 mint extensions (jsonParsed), used to recognise the Seeker Genesis Token. */
  extensions?: { extension: string; state?: Record<string, unknown> }[]
}

export interface AssetInfo {
  name?: string | null
  symbol?: string | null
  image?: string | null
  uri?: string | null
  updateAuthority?: string | null
  verified?: boolean
  usdPrice?: number | null
}

export interface CompressedAsset extends AssetInfo {
  id: string
}

export interface ClassifyInput {
  accounts: TokenAccountInput[]
  mints: Record<string, MintInfoInput>
  assets: Record<string, AssetInfo>
  /** Compressed NFTs (no token account). Only checked for spam. */
  compressed?: CompressedAsset[]
  scamList: Set<string>
}

// ---------- Rules ----------

const LURE_WORDS = ['claim', 'reward', 'airdrop', 'visit', 'free']
const URL_PATTERN = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|io|xyz|net|org|app|site|online|fun|gift|live|pro|top|click|link|me|co|cc|vip|info)\b|t\.me\/)/i

/**
 * True for a mint that is a genuine Seeker Genesis Token, using the official check: the metadata
 * pointer and the token-group membership both point at the SGT group. Group membership can only be
 * written with the group authority's signature, so a look-alike mint can't fake it.
 */
export function isSgtMint(mint: MintInfoInput | undefined): boolean {
  const exts = mint?.extensions ?? []
  const pointer = exts.find((e) => e.extension === 'metadataPointer')
  const member = exts.find((e) => e.extension === 'tokenGroupMember')
  return pointer?.state?.metadataAddress === SGT_METADATA_ADDRESS && member?.state?.group === SGT_GROUP_ADDRESS
}

/** Which lure signals a token's text carries (URL, "claim", ...). Empty array = none. */
export function lureSignals(asset: AssetInfo): string[] {
  const text = [asset.name, asset.symbol].filter(Boolean).join(' ')
  const signals: string[] = []
  if (URL_PATTERN.test(text)) signals.push('link in name')
  const lower = `${text} ${asset.uri ?? ''}`.toLowerCase()
  for (const w of LURE_WORDS) if (new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(lower)) signals.push(`"${w}" in name or metadata`)
  // A metadata URI on an odd domain is common for spam, but URIs are normal for real tokens,
  // so only lure words inside the URI count (handled above).
  return signals
}

/**
 * Never closed or burned: the Seeker Genesis Token, SKR, (wrapped) SOL, and any account
 * that holds a balance or value. Revoking a permission is still allowed on these.
 */
export function isProtected(a: Pick<TokenAccountInput, 'mint' | 'amount'>, opts: { isSgt: boolean; usdValue?: number | null }) {
  if (opts.isSgt) return true
  if (a.mint === SKR_MINT || a.mint === WSOL_MINT) return true
  if (a.amount !== '0') return true
  if ((opts.usdValue ?? 0) > 0) return true
  return false
}

function closeBlocker(a: TokenAccountInput): string | null {
  if (a.state === 'frozen') return 'This account is frozen by its token issuer, so it can’t be closed.'
  if (a.programId === TOKEN_2022_PROGRAM) {
    const fee = a.extensions?.find((e) => e.extension === 'transferFeeAmount')
    const withheld = Number(fee?.state?.withheldAmount ?? 0)
    if (withheld > 0) return 'This token holds back fees in the account, so it can’t be closed until the issuer collects them.'
  }
  return null
}

export function classify(input: ClassifyInput): Finding[] {
  const findings: Finding[] = []

  for (const a of input.accounts) {
    const meta = input.assets[a.mint] ?? {}
    const isSgt = isSgtMint(input.mints[a.mint])
    const price = meta.usdPrice ?? null
    const usdValue = price != null ? a.uiAmount * price : null
    const isProtectedAcct = isProtected(a, { isSgt, usdValue })
    const empty = a.amount === '0'

    const base = {
      tokenAccount: a.pubkey,
      mint: a.mint,
      symbol: meta.symbol ?? null,
      name: meta.name ?? null,
      image: meta.image ?? null,
      uiAmount: a.uiAmount,
      amount: a.amount,
      decimals: a.decimals,
      usdValue,
      delegate: a.delegate ?? null,
      delegatedAmount: a.delegatedAmount ?? null,
      programId: a.programId,
      rentLamports: a.lamports,
      isProtected: isProtectedAcct,
      raw: {
        tokenAccount: a.pubkey,
        mint: a.mint,
        program: a.programId === TOKEN_2022_PROGRAM ? 'Token-2022' : 'Token',
        state: a.state,
        amount: a.amount,
        decimals: a.decimals,
        delegate: a.delegate ?? null,
        delegatedAmount: a.delegatedAmount ?? null,
        rentLamports: a.lamports,
        jupiterVerified: meta.verified ?? false,
        usdPrice: price,
        metadataUri: meta.uri ?? null,
        updateAuthority: meta.updateAuthority ?? null,
        isSeekerGenesisToken: isSgt,
        extensions: a.extensions?.map((e) => e.extension) ?? [],
      } as Record<string, unknown>,
    }

    // Wrapped SOL and old SGT accounts are left completely alone: nothing to report, nothing to touch.
    if (a.mint === WSOL_MINT || (isSgt && empty)) continue

    const scamHits = [
      a.delegate && input.scamList.has(a.delegate) ? 'permission holder is on the scam list' : null,
      input.scamList.has(a.mint) ? 'token is on the scam list' : null,
      meta.updateAuthority && input.scamList.has(meta.updateAuthority) ? 'token creator is on the scam list' : null,
    ].filter((x): x is string => !!x)

    // Rule 1 + 4: an active permission (delegate). On an empty account it can't move anything today,
    // so it is folded into the cleanup below (closing the account removes it too).
    if (a.delegate && !empty) {
      const onScamList = a.delegate !== null && input.scamList.has(a.delegate)
      const severity: Severity = onScamList || (usdValue ?? 0) > 1 ? 'critical' : 'warning'
      findings.push({
        ...base,
        id: `${onScamList ? 'scam_match' : 'delegation'}:${a.pubkey}`,
        type: onScamList ? 'scam_match' : 'delegation',
        severity,
        unfixableReason: null,
        reasons: [
          'another address can move this token',
          ...(onScamList ? ['permission holder is on the scam list'] : []),
          ...((usdValue ?? 0) > 1 ? ['account holds over $1'] : []),
        ],
      })
    }

    // Rule 2 + 4: suspicious (or listed-scam) airdropped tokens.
    if (!empty && !isSgt && a.mint !== SKR_MINT) {
      const listed = scamHits.filter((h) => h !== 'permission holder is on the scam list')
      if (listed.length) {
        findings.push({
          ...base,
          id: `scam_match:asset:${a.pubkey}`,
          type: 'scam_match',
          severity: 'critical',
          // Holding a listed token isn't itself a drain risk, but burning it is the user's call.
          isProtected: false,
          unfixableReason: closeBlocker(a),
          reasons: listed,
        })
      } else if (!meta.verified && (price == null || price === 0)) {
        const signals = lureSignals(meta)
        if (signals.length) {
          findings.push({
            ...base,
            id: `suspicious:${a.pubkey}`,
            type: 'suspicious',
            severity: 'warning',
            // Zero-value spam: hiding is always fine; burning still needs the second confirmation sheet.
            isProtected: false,
            unfixableReason: closeBlocker(a),
            reasons: ['not on Jupiter’s verified list', 'no market price', ...signals],
          })
        }
      }
    }

    // Rule 3: empty account → reclaim the rent.
    if (empty) {
      findings.push({
        ...base,
        id: `empty:${a.pubkey}`,
        type: 'empty',
        severity: 'cleanup',
        unfixableReason: closeBlocker(a),
        reasons: ['zero balance', ...(a.delegate ? ['still had a permission set'] : [])],
      })
    }
  }

  for (const c of input.compressed ?? []) {
    const listed = input.scamList.has(c.id) || (c.updateAuthority ? input.scamList.has(c.updateAuthority) : false)
    const signals = lureSignals(c)
    if (!listed && !signals.length) continue
    findings.push({
      id: `${listed ? 'scam_match' : 'suspicious'}:cnft:${c.id}`,
      type: listed ? 'scam_match' : 'suspicious',
      severity: listed ? 'critical' : 'warning',
      tokenAccount: '',
      mint: c.id,
      symbol: c.symbol ?? null,
      name: c.name ?? null,
      image: c.image ?? null,
      uiAmount: 1,
      amount: '1',
      decimals: 0,
      usdValue: null,
      delegate: null,
      delegatedAmount: null,
      programId: 'compressed',
      rentLamports: 0,
      isProtected: true,
      unfixableReason: 'This is a compressed NFT. You can hide it; burning it isn’t supported yet.',
      reasons: listed ? ['asset is on the scam list'] : signals,
      raw: { assetId: c.id, compressed: true, metadataUri: c.uri ?? null, updateAuthority: c.updateAuthority ?? null },
    })
  }

  const order: Record<Severity, number> = { critical: 0, warning: 1, cleanup: 2 }
  return findings.sort((x, y) => order[x.severity] - order[y.severity] || (y.usdValue ?? 0) - (x.usdValue ?? 0))
}
