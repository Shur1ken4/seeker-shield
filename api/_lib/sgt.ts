import { TOKEN_2022_PROGRAM } from './constants.js'
import { isSgtMint } from './classify.js'
import { getMints, rpc } from './solana.js'

/**
 * Returns the mint address of the Seeker Genesis Token the wallet holds right now, or null.
 * Follows the official check: skip zero-balance accounts (an SGT moved away leaves one behind),
 * then confirm the mint's metadata pointer and group membership.
 */
export async function findSgtMint(owner: string): Promise<string | null> {
  const res = await rpc<{ value: any[] }>('getTokenAccountsByOwner', [owner, { programId: TOKEN_2022_PROGRAM }, { encoding: 'jsonParsed' }])
  const mints = res.value
    .map((v) => v.account?.data?.parsed?.info)
    .filter((info) => info?.mint && info.tokenAmount?.amount !== '0')
    .map((info) => info.mint as string)
  if (!mints.length) return null
  const parsed = await getMints([...new Set(mints)])
  return mints.find((m) => isSgtMint(parsed[m])) ?? null
}
