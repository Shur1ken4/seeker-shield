import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react'
import { WalletReadyState, type WalletName } from '@solana/wallet-adapter-base'
import {
  SolanaMobileWalletAdapterWalletName,
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
  registerMwa,
} from '@solana-mobile/wallet-standard-mobile'
import bs58 from 'bs58'
import { api, getToken, setToken } from './api'

// Register Mobile Wallet Adapter (Seed Vault Wallet, Phantom, Solflare on Android) as a Wallet Standard wallet.
const g = globalThis as unknown as { __mwa?: boolean }
if (!g.__mwa) {
  g.__mwa = true
  registerMwa({
    appIdentity: { name: 'Wardy', uri: window.location.origin, icon: '/icons/icon-192.png' },
    authorizationCache: createDefaultAuthorizationCache(),
    chains: ['solana:mainnet'],
    chainSelector: createDefaultChainSelector(),
    onWalletNotFound: createDefaultWalletNotFoundHandler(),
  })
}

const CONNECTED_FLAG = 'shield.connected'
function flag(v?: boolean) {
  try {
    if (v === undefined) return localStorage.getItem(CONNECTED_FLAG) === '1'
    if (v) localStorage.setItem(CONNECTED_FLAG, '1')
    else localStorage.removeItem(CONNECTED_FLAG)
  } catch {
    // Storage unavailable: just don't auto-reconnect.
  }
  return false
}

export function WalletProviders({ children }: { children: ReactNode }) {
  // All RPC goes through our /api/rpc proxy, so no API key ever reaches the phone.
  const endpoint = `${window.location.origin}/api/rpc`
  // Only reconnect silently for someone who connected before; never pop a wallet on first visit.
  const [autoConnect] = useState(() => flag())
  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: 'confirmed', disableRetryOnRateLimit: true }}>
      <WalletProvider wallets={[]} autoConnect={autoConnect} onError={(e) => console.error('[wallet-adapter]', e?.name, e?.message, (e as { error?: unknown })?.error ?? '')}>
        <SessionProvider>{children}</SessionProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

const usable = (s: WalletReadyState) => s === WalletReadyState.Installed || s === WalletReadyState.Loadable

/** Connect with a preference for Mobile Wallet Adapter (the Seed Vault on a Seeker). */
export function useConnectWallet() {
  const { wallets, wallet, select, connect, connected, connecting } = useWallet()
  const options = useMemo(() => wallets.filter((w) => usable(w.readyState)), [wallets])
  const preferred = options.find((w) => w.adapter.name === SolanaMobileWalletAdapterWalletName) ?? (options.length === 1 ? options[0] : undefined)
  const [pending, setPending] = useState<WalletName | null>(null)
  const [error, setError] = useState<string | null>(null)
  const preselected = useRef(false)

  // Pre-select the preferred wallet once, so the Connect tap can call connect() directly
  // (wallet apps must be opened from a real tap on Android).
  useEffect(() => {
    if (!wallet && preferred && !preselected.current) {
      preselected.current = true
      select(preferred.adapter.name)
    }
  }, [wallet, preferred, select])

  useEffect(() => {
    if (connected) flag(true)
  }, [connected])

  // After picking a different wallet from the list, connect once it's selected.
  useEffect(() => {
    if (pending && wallet?.adapter.name === pending && !connected && !connecting) {
      setPending(null)
      connect().catch((e) => setError(friendlyWalletError(e)))
    }
  }, [pending, wallet, connected, connecting, connect])

  const connectWith = useCallback(
    async (name?: WalletName) => {
      setError(null)
      if (!name && !wallet) return
      if (name && name !== wallet?.adapter.name) {
        select(name)
        setPending(name)
        return
      }
      try {
        await connect()
      } catch (e) {
        setError(friendlyWalletError(e))
      }
    },
    [wallet, select, connect],
  )

  return { options, preferred, connectWith, connecting, error }
}

/** Call on a user-initiated disconnect so we don't auto-reconnect next time. */
export function forgetWallet() {
  flag(false)
}

export function friendlyWalletError(e: unknown): string {
  const msg = String((e as Error)?.message ?? e)
  // Keep the raw error in the console for debugging; the user sees the plain-English version.
  console.error('[wallet]', (e as Error)?.name, msg, (e as { error?: unknown })?.error ?? '')
  if (/local network access/i.test(msg)) return 'Chrome blocked the connection to your wallet. Tap the icon left of the address bar, allow “Apps on device”, then try again.'
  if (/reject|declin|cancel|denied/i.test(msg)) return 'You cancelled in your wallet, so nothing changed. Tap again whenever you’re ready.'
  if (/not found|no wallet/i.test(msg)) return 'No wallet app found. Open Wardy in Chrome on an Android phone with Seed Vault, Phantom or Solflare.'
  if (/timed out/i.test(msg)) return 'Your wallet didn’t open in time. Make sure you’re using Chrome, then tap again.'
  return 'Your wallet didn’t respond. Make sure you’re using Chrome, then tap again.'
}

// ---------- Seeker Verified session ----------

interface SessionState {
  address: string | null
  verified: boolean
  sgtMint: string | null
}

interface SessionCtx extends SessionState {
  signingIn: boolean
  /** Prove wallet ownership with a free signature, then check for a Seeker Genesis Token. */
  signIn: () => Promise<SessionState>
  /** True when we hold a session for the connected wallet. */
  hasSession: boolean
}

const Ctx = createContext<SessionCtx | null>(null)

function SessionProvider({ children }: { children: ReactNode }) {
  const { publicKey, signMessage } = useWallet()
  const [state, setState] = useState<SessionState>({ address: null, verified: false, sgtMint: null })
  const [signingIn, setSigningIn] = useState(false)
  const address = publicKey?.toBase58() ?? null

  useEffect(() => {
    if (!getToken()) return
    api
      .get<SessionState>('/api/auth/session')
      .then((s) => setState({ address: s.address, verified: !!s.verified, sgtMint: s.sgtMint ?? null }))
      .catch(() => {})
  }, [])

  const signIn = useCallback(async () => {
    if (!address || !signMessage) throw new Error('Connect your wallet first.')
    setSigningIn(true)
    try {
      const { message, ticket } = await api.get<{ message: string; ticket: string }>(`/api/auth/nonce?address=${address}`)
      let signature: Uint8Array
      try {
        signature = await signMessage(new TextEncoder().encode(message))
      } catch (e) {
        throw new Error(friendlyWalletError(e))
      }
      const res = await api.post<{ token: string; verified: boolean; sgtMint: string | null; address: string }>('/api/auth/verify', {
        address,
        signature: bs58.encode(signature),
        message,
        ticket,
      })
      setToken(res.token)
      const next = { address: res.address, verified: res.verified, sgtMint: res.sgtMint }
      setState(next)
      return next
    } finally {
      setSigningIn(false)
    }
  }, [address, signMessage])

  const value: SessionCtx = { ...state, signingIn, signIn, hasSession: !!address && state.address === address }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSession outside WalletProviders')
  return c
}
