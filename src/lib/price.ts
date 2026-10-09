import { ADOPT_PRICE_LAMPORTS, ADOPT_PRICE_SKR } from '../../api/_lib/constants'

/** One unlock, everything included. Shown in SOL; SKR is the alternative. */
export const UNLOCK_SOL = `${ADOPT_PRICE_LAMPORTS / 1e9} SOL`
export const UNLOCK_SKR = `${ADOPT_PRICE_SKR} SKR`

export const UNLOCK_BENEFITS = [
  { emoji: '🔔', text: 'Instant Telegram alerts' },
  { emoji: '👀', text: 'Guards 5 friends’ wallets too' },
  { emoji: '🔥', text: 'Daily patrols, streaks and chests' },
  { emoji: '🎩', text: 'Pick his outfit; he grows with you' },
] as const
