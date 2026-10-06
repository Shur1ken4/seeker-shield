import { env } from './env.js'
import { TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from './constants.js'
import type { AssetInfo, CompressedAsset, MintInfoInput, TokenAccountInput } from './classify.js'

export async function rpc<T = any>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(env.rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  if (!res.ok) throw new Error(`RPC ${method} failed: HTTP ${res.status}`)
  const body = await res.json()
  if (body.error) throw new Error(`RPC ${method} failed: ${body.error.message}`)
  return body.result as T
}

export async function getTokenAccounts(owner: string): Promise<TokenAccountInput[]> {
  const out: TokenAccountInput[] = []
  for (const programId of [TOKEN_PROGRAM, TOKEN_2022_PROGRAM]) {
    const res = await rpc<{ value: any[] }>('getTokenAccountsByOwner', [owner, { programId }, { encoding: 'jsonParsed', commitment: 'confirmed' }])
    for (const { pubkey, account } of res.value) {
      const info = account.data?.parsed?.info
      if (!info) continue
      out.push({
        pubkey,
        programId,
        lamports: account.lamports,
        mint: info.mint,
        owner: info.owner,
        state: info.state,
        amount: info.tokenAmount.amount,
        decimals: info.tokenAmount.decimals,
        uiAmount: Number(info.tokenAmount.uiAmountString ?? info.tokenAmount.uiAmount ?? 0),
        delegate: info.delegate ?? null,
        delegatedAmount: info.delegatedAmount?.amount ?? null,
        extensions: info.extensions,
      })
    }
  }
  return out
}

/** Parsed mint accounts (we only need Token-2022 ones, to recognise the Seeker Genesis Token). */
export async function getMints(mints: string[]): Promise<Record<string, MintInfoInput>> {
  const out: Record<string, MintInfoInput> = {}
  for (let i = 0; i < mints.length; i += 100) {
    const batch = mints.slice(i, i + 100)
    const res = await rpc<{ value: any[] }>('getMultipleAccounts', [batch, { encoding: 'jsonParsed' }])
    res.value.forEach((acc, j) => {
      const info = acc?.data?.parsed?.info
      if (info) out[batch[j]] = { extensions: info.extensions }
    })
  }
  return out
}

/** Helius DAS: names, images, metadata URIs and update authorities. Needs a Helius key. */
export async function getAssetsByOwner(owner: string): Promise<{ byMint: Record<string, AssetInfo>; compressed: CompressedAsset[] }> {
  const byMint: Record<string, AssetInfo> = {}
  const compressed: CompressedAsset[] = []
  if (!env.heliusKey) return { byMint, compressed }
  for (let page = 1; page <= 3; page++) {
    const res = await rpc<{ items: any[]; total: number }>('getAssetsByOwner', {
      ownerAddress: owner,
      page,
      limit: 1000,
      displayOptions: { showFungible: true, showZeroBalance: true },
    } as unknown as unknown[])
    for (const it of res.items ?? []) {
      const meta = it.content?.metadata ?? {}
      const info: AssetInfo = {
        name: meta.name ?? it.token_info?.symbol ?? null,
        symbol: meta.symbol ?? it.token_info?.symbol ?? null,
        image: it.content?.links?.image ?? it.content?.files?.[0]?.cdn_uri ?? null,
        uri: it.content?.json_uri ?? null,
        updateAuthority: it.authorities?.find((a: any) => a.scopes?.includes('full'))?.address ?? it.authorities?.[0]?.address ?? null,
        usdPrice: it.token_info?.price_info?.price_per_token ?? null,
      }
      if (it.compression?.compressed) compressed.push({ id: it.id, ...info })
      else byMint[it.id] = info
    }
    if (!res.items || res.items.length < 1000) break
  }
  return { byMint, compressed }
}

/** Jupiter: verified flag and USD price for each mint (one call per 100 mints). */
export async function getJupiterInfo(mints: string[]): Promise<Record<string, { verified: boolean; usdPrice: number | null; name?: string; symbol?: string; icon?: string }>> {
  const out: Record<string, { verified: boolean; usdPrice: number | null; name?: string; symbol?: string; icon?: string }> = {}
  const base = env.jupiterKey ? 'https://api.jup.ag' : 'https://lite-api.jup.ag'
  const headers: Record<string, string> = env.jupiterKey ? { 'x-api-key': env.jupiterKey } : {}
  for (let i = 0; i < mints.length; i += 100) {
    const batch = mints.slice(i, i + 100)
    try {
      const res = await fetch(`${base}/tokens/v2/search?query=${batch.join(',')}`, { headers })
      if (!res.ok) continue
      for (const t of (await res.json()) as any[]) {
        out[t.id] = { verified: !!t.isVerified, usdPrice: typeof t.usdPrice === 'number' ? t.usdPrice : null, name: t.name, symbol: t.symbol, icon: t.icon }
      }
    } catch {
      // Jupiter being down must not break a scan: unknown tokens just have no price/verification.
    }
  }
  return out
}
